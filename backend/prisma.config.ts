import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // CLI (migrate/pull) cần kết nối trực tiếp: advisory lock không chạy qua pooler của Neon.
    // App chạy dùng DATABASE_URL (pooled) qua PrismaService.
    // `prisma generate` không cần DB nên cho phép rỗng (CI).
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '',
  },
});
