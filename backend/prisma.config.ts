import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // `prisma generate` không cần DB nên cho phép rỗng (CI); migrate/pull sẽ báo lỗi rõ nếu thiếu
    url: process.env.DATABASE_URL ?? '',
  },
});
