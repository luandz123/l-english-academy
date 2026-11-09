# L-English API (NestJS)

Backend for [L-English Academy](../README.md): a modular monolith with 7 modules (`auth`, `catalog`, `learning`, `assessment`, `payments`, `admin`, `media`), each laid out as `controller → service → repository`, plus DTOs (`class-validator`) and mappers.

## Commands

| | |
|---|---|
| `npm run start:dev` | API on `http://localhost:3000`, Swagger at `/api/docs` |
| `npm test` | unit tests (Jest) |
| `npm run test:e2e` | e2e tests against a real Postgres 18 started by Testcontainers (needs Docker) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npx prisma migrate deploy` | apply migrations (`prisma/migrations`) |

Configuration is validated at startup by `src/config/env.schema.ts`; see `.env.example` for every variable.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/copy-content.mjs` | Copy the 15 content tables from Supabase to the new DB in one transaction; refuses a Supabase target and rolls back on any row-count mismatch |
| `scripts/verify-content.mjs` | Compare row counts and MD5 per table between source and target |
| `scripts/grant-admin.mjs` | Grant the admin role to one verified account (`--confirm <email>` required) |

## Layout

```
src/
  config/          env schema (zod)
  common/          exception filter, transforms
  prisma/          PrismaService
  modules/<name>/  controller, service, repository, mapper, dto/, *.spec.ts
test/              e2e specs + Testcontainers global setup
prisma/            schema.prisma, migrations/
```

## Deploy

Render builds `backend/Dockerfile` on every push to `main` (`autoDeploy: true` in `render.yaml`). On startup the container runs `prisma migrate deploy` against `DATABASE_URL_UNPOOLED` (falls back to `DATABASE_URL`) and only then starts the app (`docker-entrypoint.sh`). If a migration fails the container exits, the health check never passes and Render keeps the previous deploy running. Set `SKIP_MIGRATIONS=true` to start the image without touching the database. Deploys do not depend on GitHub Actions.
