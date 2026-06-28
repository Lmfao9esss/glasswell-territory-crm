# Supabase Setup Guide

This guide is written for a beginner setting up the Phase 2 database.

## 1. Create a Supabase Project

1. Go to `https://supabase.com`.
2. Create a free account or sign in.
3. Create a new project.
4. Choose a project name, database password, and region close to Ottawa or your users.
5. Wait for the project to finish provisioning.

## 2. Add Environment Keys

In Supabase:

1. Open the project.
2. Go to Project Settings.
3. Open API.
4. Copy the Project URL.
5. Copy the anon public key.

In this repo:

```bash
cp .env.example .env.local
```

Paste the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Never paste the service role key into frontend code.

## 3. Install Supabase CLI

The simplest option is to run it through `npx`:

```bash
npx supabase --version
```

If that works, you can run Supabase commands with:

```bash
npx supabase <command>
```

The npm scripts in this project assume a `supabase` command is available. If it is not globally installed, use `npx supabase` directly.

## 4. Run Migrations Locally

Start local Supabase:

```bash
npx supabase start
```

Reset the local database and apply migrations plus seed data:

```bash
npx supabase db reset
```

This applies:

```text
supabase/migrations/202606270001_initial_schema.sql
supabase/migrations/202606270002_rls_policies.sql
supabase/seed.sql
```

## 5. Push Migrations to Hosted Supabase

Login:

```bash
npx supabase login
```

Link your local repo to the hosted project:

```bash
npx supabase link --project-ref your-project-ref
```

Push migrations:

```bash
npx supabase db push
```

Seed data is usually for local development. If you want the sample data in the hosted project, paste `supabase/seed.sql` into the Supabase SQL Editor after migrations are applied.

## 6. Create Real Auth Users for RLS Testing

The seed file creates sample profiles:

```text
owner@glasswell.local
manager@glasswell.local
employee@glasswell.local
```

For real RLS testing, create three Auth users in Supabase Authentication. Then update the seeded profile IDs to match the Auth user UUIDs.

Example:

```sql
update public.profiles
set id = 'AUTH_USER_UUID_FROM_SUPABASE'
where email = 'employee@glasswell.local';
```

Do this for the owner, manager, and employee sample users.

## 7. Test RLS

In Supabase SQL Editor, impersonation is easiest with JWT testing from the API or Supabase client. For a quick sanity check:

1. Sign in as the employee user from the app or an API client.
2. Select from `territories`.
3. The employee should see assigned territories only.
4. Select from `streets`.
5. The employee should see assigned streets or streets inside assigned territories.
6. Try deleting a territory as employee or manager.
7. The request should fail.
8. Sign in as owner.
9. The owner should have full access inside the Glasswell organization.

Example client-side test query:

```ts
const { data, error } = await supabase.from("streets").select("*");
```

Expected behavior:

- Owner: sees organization streets.
- Manager: sees organization streets.
- Employee: sees assigned streets and streets in assigned territories.
- Unauthenticated user: sees nothing.

## 8. Generate TypeScript Types

After migrations are applied locally:

```bash
npx supabase gen types typescript --local > src/lib/db/database.types.ts
```

For hosted Supabase:

```bash
npx supabase gen types typescript --project-id your-project-ref > src/lib/db/database.types.ts
```

Commit the generated `database.types.ts` file whenever the schema changes.
