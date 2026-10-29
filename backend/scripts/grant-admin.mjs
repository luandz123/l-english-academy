#!/usr/bin/env node
/**
 * Cấp vai trò admin cho MỘT tài khoản đã đăng ký (theo email) — dùng sau cutover để tạo admin
 * đầu tiên trên DB production (D-05: không chuyển tài khoản từ Supabase).
 *
 * An toàn:
 *  - Chỉ thêm một dòng `user_roles (user_id, 'admin')`, không sửa/xóa gì khác; chạy lại không nhân đôi.
 *  - Từ chối nếu đích là host Supabase. Phải gõ đúng email ở --confirm.
 *  - Tài khoản phải tồn tại và đã xác nhận email (đăng ký qua trang /register trước).
 *
 * Dùng (trong thư mục backend):
 *   DATABASE_URL=<neon direct> node scripts/grant-admin.mjs <email> --confirm <email>
 */
import pg from 'pg';

const [email, flag, confirm] = process.argv.slice(2);
if (!email || flag !== '--confirm' || confirm !== email) {
  console.error('Dùng: node scripts/grant-admin.mjs <email> --confirm <email>');
  process.exit(2);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Thiếu biến môi trường DATABASE_URL');
  process.exit(2);
}
const host = new URL(url).hostname;
if (host.includes('supabase')) {
  console.error(`Từ chối: ${host} là Supabase — script chỉ ghi vào DB mới.`);
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query(
    'SELECT id, email_verified_at FROM public.users WHERE lower(email) = lower($1)',
    [email],
  );
  if (rows.length !== 1) throw new Error(`Không tìm thấy đúng 1 tài khoản với email ${email}`);
  if (!rows[0].email_verified_at) throw new Error('Tài khoản chưa xác nhận email');
  const res = await client.query(
    `INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [rows[0].id],
  );
  await client.query('COMMIT');
  console.log(res.rowCount === 1 ? `Đã cấp admin cho ${email} (${host})` : `${email} đã là admin`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`Lỗi: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
