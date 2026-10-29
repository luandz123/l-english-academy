#!/usr/bin/env node
/**
 * Chặn thay đổi giao diện trong lúc refactor (AGENTS.md luật 1, REFACTOR_PLAN §5).
 *
 * Quét diff các file .tsx trong src/ so với nhánh gốc và báo lỗi nếu dòng thêm/xóa có:
 *   - className=
 *   - thẻ JSX mở/đóng (<Button, </div>, <p ...)
 *   - chữ tiếng Việt có dấu (câu chữ hiển thị, toast)
 *   - queryKey (phải giữ nguyên query key của TanStack Query)
 *
 * Dùng: node scripts/check-ui-diff.mjs [base-ref] [head-ref]   (mặc định: refactor/nestjs-backend, HEAD)
 * Heuristic, có thể báo nhầm — khi đó reviewer xem tay và ghi lý do vào file task.
 */
import { execFileSync } from "node:child_process";

const base = process.argv[2] ?? "refactor/nestjs-backend";
const head = process.argv[3] ?? "HEAD";

const HTML_TAGS =
  "div|span|p|a|button|img|h[1-6]|ul|ol|li|section|article|aside|main|header|footer|nav|" +
  "form|input|label|textarea|select|option|table|thead|tbody|tr|td|th|svg|path|video|audio|source|iframe|br|hr|strong|em|small";

const RULES = [
  { name: "className", re: /className\s*=/ },
  // Thẻ JSX: đứng sau khoảng trắng/dấu mở, không phải generic (useState<Course>)
  { name: "thẻ JSX (component)", re: /(^|[\s({>?:&|,])<\/?[A-Z][\w.]*(\s|\/?>|$)/ },
  { name: "thẻ JSX (HTML)", re: new RegExp(`(^|[\\s({>?:&|,])<\\/?(${HTML_TAGS})(\\s|\\/?>|$)`) },
  { name: "chữ tiếng Việt", re: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i },
  { name: "queryKey", re: /queryKey/ },
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

let diff;
try {
  diff = git(["diff", "--unified=0", "--no-color", `${base}...${head}`, "--", "src/**/*.tsx", "src/*.tsx"]);
} catch (err) {
  console.error(`Không lấy được diff so với "${base}". Kiểm tra ref có tồn tại (git fetch).`);
  console.error(err.message);
  process.exit(2);
}

const violations = [];
let file = null;
let oldLine = 0;
let newLine = 0;

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    file = line.slice(4).replace(/^b\//, "");
    continue;
  }
  if (line.startsWith("--- ")) continue;

  const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunk) {
    oldLine = Number(hunk[1]);
    newLine = Number(hunk[2]);
    continue;
  }
  if (!file || !(line.startsWith("+") || line.startsWith("-"))) continue;

  const added = line.startsWith("+");
  const content = line.slice(1);
  const lineNo = added ? newLine++ : oldLine++;
  const trimmed = content.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

  for (const rule of RULES) {
    if (rule.re.test(content)) {
      violations.push(`${file}:${lineNo} [${added ? "+" : "-"}] ${rule.name}: ${trimmed.slice(0, 120)}`);
      break;
    }
  }
}

if (violations.length > 0) {
  console.error(`check-ui-diff: ${violations.length} thay đổi nằm ngoài vùng được sửa (so với ${base}):\n`);
  for (const v of violations) console.error("  " + v);
  console.error("\nChỉ được sửa phần gọi dữ liệu (import, queryFn, mutationFn). Xem REFACTOR_PLAN.md §5.");
  process.exit(1);
}

console.log(`check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với ${base}).`);
