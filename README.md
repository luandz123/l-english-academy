# Welcome to your Lovable project

TODO: Document your project here

## Deploy via Vercel (Private Repo Friendly)

This project is configured to deploy with GitHub Actions using Vercel.

### 1) Create Vercel project

1. Import this GitHub repository into Vercel.
2. In Vercel project settings, add required environment variables (for example Supabase keys).

### 2) Add GitHub Actions secrets

In GitHub repo settings, add these secrets:

1. `VERCEL_TOKEN`
2. `VERCEL_ORG_ID`
3. `VERCEL_PROJECT_ID`

Get values from local Vercel linking:

```bash
npm i -g vercel
vercel login
vercel link
cat .vercel/project.json
```

Then copy `orgId` and `projectId` into GitHub Secrets.

### 3) Trigger deploy

1. Push to `main` for production deploy.
2. Open a pull request for preview deploy.

Workflow file: `.github/workflows/deploy-vercel.yml`
