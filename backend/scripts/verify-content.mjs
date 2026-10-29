#!/usr/bin/env node
/**
 * So nội dung từng bảng giữa nguồn (Supabase) và đích bằng md5 của toàn bộ hàng
 * (mỗi hàng chuyển thành text theo đúng thứ tự cột của nguồn, sắp theo khóa chính).
 * Dùng sau scripts/copy-content.mjs; cùng biến SOURCE_DATABASE_URL, TARGET_DATABASE_URL.
 */
import pg from 'pg';

const TABLES = [
  'course_categories', 'courses', 'modules', 'quizzes', 'lessons', 'lesson_practices',
  'questions', 'answers', 'materials', 'full_tests', 'full_test_sections',
  'vocab_categories', 'vocab_quizzes', 'vocab_questions', 'platform_settings',
];

const ssl = (url) => (/localhost|127\.0\.0\.1/.test(new URL(url).hostname) ? false : { rejectUnauthorized: false });
const source = new pg.Client({ connectionString: process.env.SOURCE_DATABASE_URL, ssl: ssl(process.env.SOURCE_DATABASE_URL) });
const target = new pg.Client({ connectionString: process.env.TARGET_DATABASE_URL, ssl: ssl(process.env.TARGET_DATABASE_URL) });

async function columns(table) {
  const { rows } = await source.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function checksum(client, table, cols, orderBy) {
  // Ép mọi cột về text: bỏ khác biệt kiểu (bigint→int) nhưng vẫn bắt khác giá trị
  const row = cols.map((c) => `coalesce("${c}"::text, '∅')`).join(` || '~' || `);
  const { rows } = await client.query(
    `SELECT md5(coalesce(string_agg(${row}, '|' ORDER BY "${orderBy}"), '')) AS h FROM public."${table}"`,
  );
  return rows[0].h;
}

async function main() {
  await source.connect();
  await target.connect();
  // timestamptz::text hiển thị theo TimeZone của session (Supabase và Neon mặc định khác nhau)
  await source.query(`SET TIME ZONE 'UTC'`);
  await target.query(`SET TIME ZONE 'UTC'`);
  let bad = 0;
  for (const t of TABLES) {
    const cols = await columns(t);
    const orderBy = cols.includes('id') ? 'id' : cols[0];
    const [a, b] = await Promise.all([checksum(source, t, cols, orderBy), checksum(target, t, cols, orderBy)]);
    if (a !== b) bad += 1;
    console.log(`${t.padEnd(20)} ${a === b ? 'KHỚP' : 'LỆCH'}  ${a.slice(0, 12)}  ${b.slice(0, 12)}`);
  }
  console.log(bad ? `${bad} bảng LỆCH` : 'Tất cả bảng khớp nội dung.');
  process.exitCode = bad ? 1 : 0;
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
