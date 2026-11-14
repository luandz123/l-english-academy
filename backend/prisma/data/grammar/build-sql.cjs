/**
 * Kiểm tra nội dung ngữ pháp mẫu và in SQL nạp dữ liệu (dùng khi tạo migration 20261114000000_grammar).
 *   node prisma/data/grammar/build-sql.cjs > /tmp/grammar-seed.sql
 * Có thể nhập lại cùng nội dung qua POST /grammar/admin/import với file JSON: node build-sql.cjs --json
 */
const topics = [
  ...require('./topics-1.cjs'),
  ...require('./topics-2.cjs'),
  ...require('./topics-3.cjs'),
];

const errors = [];
const slugs = new Set();
for (const t of topics) {
  if (slugs.has(t.slug)) errors.push(`Trùng slug ${t.slug}`);
  slugs.add(t.slug);
  t.exercises.forEach((x, i) => {
    const where = `${t.slug} #${i + 1}`;
    if (x.kind === 'choice') {
      if (x.options.length < 2 || x.options.length > 4) errors.push(`${where}: số lựa chọn`);
      if (!(x.answer_index >= 0 && x.answer_index < x.options.length)) errors.push(`${where}: đáp án`);
      if (!x.prompt.includes('___')) errors.push(`${where}: thiếu ___`);
    } else if (x.kind === 'fill') {
      if (!x.prompt.includes('___')) errors.push(`${where}: thiếu ___`);
      if (!x.accepted_answers.length) errors.push(`${where}: thiếu đáp án`);
    } else if (x.kind === 'error') {
      const n = [...x.prompt.matchAll(/\[\[(.+?)\]\]/g)].length;
      if (n !== 4) errors.push(`${where}: cần 4 phần [[...]] (có ${n})`);
      if (!(x.answer_index >= 0 && x.answer_index <= 3)) errors.push(`${where}: phần sai`);
    } else errors.push(`${where}: loại ${x.kind}`);
  });
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ topics, replace: false }, null, 2));
  process.exit(0);
}

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => (a.length ? `ARRAY[${a.map(q).join(', ')}]::text[]` : `ARRAY[]::text[]`);
const json = (o) => `${q(JSON.stringify(o))}::jsonb`;

const out = ['', '-- Nội dung mẫu 18 chủ điểm (D16) — nguồn: prisma/data/grammar/*.cjs'];
for (const t of topics) {
  out.push(
    `INSERT INTO "grammar_topics" ("slug", "name", "group_name", "level", "sort_order", "summary", "lesson", "toeic_categories", "roadmap_labels", "updated_at") VALUES (${q(t.slug)}, ${q(t.name)}, ${q(t.group_name)}, ${q(t.level)}, ${t.sort_order}, ${q(t.summary)}, ${json(t.lesson)}, ${arr(t.toeic_categories)}, ${arr(t.roadmap_labels)}, now()) ON CONFLICT ("slug") DO NOTHING;`,
  );
  const tid = `(SELECT "id" FROM "grammar_topics" WHERE "slug" = ${q(t.slug)})`;
  const frows = t.formulas.map(
    (f, i) => `(${tid}, ${i}, ${q(f.pattern)}, ${q(f.usage)}, ${json(f.examples.filter((e) => e.en))}, now())`,
  );
  out.push(
    `INSERT INTO "grammar_formulas" ("topic_id", "sort_order", "pattern", "usage", "examples", "updated_at") SELECT * FROM (VALUES\n  ${frows.join(',\n  ')}\n) AS v WHERE NOT EXISTS (SELECT 1 FROM "grammar_formulas" WHERE "topic_id" = ${tid});`,
  );
  const rows = t.exercises.map(
    (x) =>
      `(${tid}, ${q(x.kind)}, ${q(x.level)}, ${q(x.prompt)}, ${arr(x.options ?? [])}, ${x.kind === 'fill' ? 'NULL' : x.answer_index}::int, ${arr(x.accepted_answers ?? [])}, ${q(x.explanation)}, ${q(x.lesson_section)}, now())`,
  );
  out.push(
    `INSERT INTO "grammar_exercises" ("topic_id", "kind", "level", "prompt", "options", "answer_index", "accepted_answers", "explanation", "lesson_section", "updated_at") SELECT * FROM (VALUES\n  ${rows.join(',\n  ')}\n) AS v WHERE NOT EXISTS (SELECT 1 FROM "grammar_exercises" WHERE "topic_id" = ${tid});`,
  );
}
console.log(out.join('\n'));
