#!/usr/bin/env node
/**
 * Copy dữ liệu NỘI DUNG từ Supabase (nguồn) sang Postgres mới (đích) — DECISIONS D-05.
 * Không copy tài khoản/kết quả học/đơn thanh toán (users, profiles, user_roles, enrollments,
 * user_*, payment_orders, admin_*): seed lại tài khoản test.
 *
 * An toàn:
 *  - Nguồn mở transaction READ ONLY.
 *  - Đích ghi trong MỘT transaction; lệch số dòng ở bất kỳ bảng nào → ROLLBACK toàn bộ.
 *  - Từ chối nếu đích là host Supabase; đích phải rỗng các bảng nội dung trừ khi có --truncate.
 *
 * Dùng (chạy trong thư mục backend):
 *   SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon direct> \
 *     node scripts/copy-content.mjs [--dry-run] [--truncate]
 */
import pg from 'pg';

// Giữ nguyên chuỗi thời gian gốc: mặc định node-pg đổi sang Date của JS (chỉ tới mili giây)
// làm mất phần micro giây (.933037 → .933). 1082 date, 1114 timestamp, 1184 timestamptz.
for (const oid of [1082, 1114, 1184]) pg.types.setTypeParser(oid, (v) => v);

// Thứ tự theo khóa ngoại: bảng cha trước
const TABLES = [
  'course_categories',
  'courses',
  'modules',
  'quizzes',
  'lessons',
  'lesson_practices',
  'questions',
  'answers',
  'materials',
  'full_tests',
  'full_test_sections',
  'vocab_categories',
  'vocab_quizzes',
  'vocab_questions',
  'platform_settings',
];
const MAX_PARAMS = 60_000; // Postgres giới hạn 65 535 tham số mỗi câu lệnh

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const TRUNCATE = args.has('--truncate');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Thiếu biến môi trường ${name}`);
    process.exit(2);
  }
  return v;
}

const sourceUrl = requireEnv('SOURCE_DATABASE_URL');
const targetUrl = requireEnv('TARGET_DATABASE_URL');
const targetHost = new URL(targetUrl).hostname;
if (targetHost.includes('supabase')) {
  console.error(`Từ chối: đích (${targetHost}) là Supabase — script chỉ ghi vào DB mới.`);
  process.exit(2);
}

const ssl = (url) => (/localhost|127\.0\.0\.1/.test(new URL(url).hostname) ? false : { rejectUnauthorized: false });
const source = new pg.Client({ connectionString: sourceUrl, ssl: ssl(sourceUrl) });
const target = new pg.Client({ connectionString: targetUrl, ssl: ssl(targetUrl) });

async function columnsOf(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function primaryKeyOf(client, table) {
  const { rows } = await client.query(
    `SELECT a.attname FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [`public.${table}`],
  );
  return rows[0]?.attname;
}

const count = async (client, table) =>
  Number((await client.query(`SELECT count(*) AS n FROM public."${table}"`)).rows[0].n);

async function copyTable(table) {
  const [srcCols, dstCols] = await Promise.all([columnsOf(source, table), columnsOf(target, table)]);
  const missing = srcCols.filter((c) => !dstCols.includes(c));
  if (missing.length) throw new Error(`${table}: đích thiếu cột ${missing.join(', ')}`);
  const cols = srcCols;
  const pk = await primaryKeyOf(source, table);
  const batchSize = Math.floor(MAX_PARAMS / cols.length);
  const colList = cols.map((c) => `"${c}"`).join(', ');

  let offset = 0;
  let copied = 0;
  for (;;) {
    const { rows } = await source.query(
      `SELECT ${colList} FROM public."${table}" ORDER BY "${pk}" LIMIT ${batchSize} OFFSET ${offset}`,
    );
    if (rows.length === 0) break;
    const values = [];
    const tuples = rows.map((row, r) => {
      const ph = cols.map((c, i) => {
        const v = row[c];
        // json/jsonb: node-pg không tự stringify mảng → stringify mọi object không phải Date
        values.push(v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
        return `$${r * cols.length + i + 1}`;
      });
      return `(${ph.join(', ')})`;
    });
    await target.query(`INSERT INTO public."${table}" (${colList}) VALUES ${tuples.join(', ')}`, values);
    copied += rows.length;
    offset += rows.length;
  }
  return copied;
}

/** Bảng có id tự tăng: đặt sequence = max(id) để insert mới không trùng khóa. */
async function resetSequence(table) {
  // platform_settings dùng khóa chính "key", không có cột id
  if (!(await columnsOf(target, table)).includes('id')) return;
  const { rows } = await target.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [`public.${table}`]);
  if (!rows[0]?.seq) return;
  await target.query(
    `SELECT setval($1, COALESCE((SELECT max(id) FROM public."${table}"), 1),
                   (SELECT max(id) IS NOT NULL FROM public."${table}"))`,
    [rows[0].seq],
  );
}

async function main() {
  await source.connect();
  await target.connect();
  await source.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

  const report = [];
  for (const t of TABLES) {
    report.push({ table: t, source: await count(source, t), targetBefore: await count(target, t) });
  }
  console.table(report);

  const nonEmpty = report.filter((r) => r.targetBefore > 0);
  if (DRY_RUN) {
    console.log('--dry-run: không ghi gì.');
    return;
  }
  if (nonEmpty.length && !TRUNCATE) {
    throw new Error(`Đích đã có dữ liệu (${nonEmpty.map((r) => r.table).join(', ')}). Thêm --truncate để xóa rồi copy lại.`);
  }

  await target.query('BEGIN');
  try {
    if (TRUNCATE) {
      await target.query(`TRUNCATE ${TABLES.map((t) => `public."${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }
    for (const r of report) {
      const t0 = Date.now();
      r.copied = await copyTable(r.table);
      await resetSequence(r.table);
      r.targetAfter = await count(target, r.table);
      r.ok = r.targetAfter === r.source;
      console.log(`  ${r.table.padEnd(22)} ${String(r.copied).padStart(7)} dòng  ${Date.now() - t0} ms`);
    }
    const bad = report.filter((r) => !r.ok);
    if (bad.length) throw new Error(`Lệch số dòng: ${bad.map((r) => `${r.table} ${r.source}≠${r.targetAfter}`).join('; ')}`);
    await target.query('COMMIT');
  } catch (err) {
    await target.query('ROLLBACK');
    throw err;
  }
  console.table(report.map(({ table, source: s, targetAfter, ok }) => ({ table, source: s, target: targetAfter, ok })));
  console.log('Hoàn tất: mọi bảng khớp số dòng.');
}

main()
  .catch((err) => {
    console.error('LỖI:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  });
