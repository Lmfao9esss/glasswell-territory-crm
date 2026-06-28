# Glasswell Territory CRM Deployment Readiness

This checklist is written for a beginner. Complete it in order.

## Supabase Setup Checklist

1. Create a Supabase account at `supabase.com`.
2. Create a new project.
3. Choose a project name, database password, and region close to Ottawa or your users.
4. Wait for the project to finish provisioning.
5. Open the project dashboard.
6. Go to `Authentication` > `Providers`.
7. Enable `Email` login.
8. For early testing, decide whether email confirmations should be on or off.
   - On is safer.
   - Off is easier for quick local testing.
9. Go to `Project Settings` > `API`.
10. Copy the `Project URL`.
11. Copy the `anon public` key.
12. Do not copy the service role key into this app.

## Local Env File

1. In the project folder, create `.env.local`.
2. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

3. Restart the dev server after changing `.env.local`.
4. Run:

```bash
npm run dev
```

## Run Migrations

Use one of these options.

### Option A: Supabase CLI

1. Install the Supabase CLI.
2. Log in:

```bash
supabase login
```

3. Link the project:

```bash
supabase link --project-ref your-project-ref
```

4. Push migrations:

```bash
supabase db push
```

5. Add seed data:

```bash
supabase db reset
```

### Option B: SQL Editor

1. Open Supabase dashboard.
2. Go to `SQL Editor`.
3. Run files in this order:
   - `supabase/migrations/202606270001_initial_schema.sql`
   - `supabase/migrations/202606270002_rls_policies.sql`
   - any later migration files
   - `supabase/seed.sql`

## Test Login

1. Open `/login`.
2. Create an account with email/password.
3. If email confirmation is enabled, confirm the email.
4. Log in.
5. If no profile exists yet, use the manual onboarding flow below.

## Test RLS

1. Log in as an owner.
2. Open `/admin/cloud-test`.
3. Run the smoke test.
4. Confirm these checks pass:
   - current auth user
   - profile loaded
   - organization loaded
   - can read territories
   - can read streets
   - can create a test lead
   - can update the test lead
   - can mark the test lead lost
5. Log in as an employee.
6. Confirm `/admin/cloud-test` says owner access is required.
7. Confirm Cloud Mode only shows work allowed by that employee's RLS policies.

## Manual Employee Invite Flow

True email invitations require an admin server endpoint and secure service-role handling. This phase intentionally avoids that.

Use this manual flow for now:

1. Employee opens `/login`.
2. Employee creates an email/password account.
3. Owner opens Supabase dashboard.
4. Owner goes to `Authentication` > `Users`.
5. Owner copies the employee Auth user ID.
6. Owner opens `/admin/employees`.
7. Owner enters:
   - employee email
   - Auth user ID
   - role
8. Owner creates the profile.
9. Employee logs in again.

## Vercel Deployment Checklist

1. Push the project to GitHub.
2. Open `vercel.com`.
3. Choose `Add New` > `Project`.
4. Import the GitHub repository.
5. Confirm framework preset is `Next.js`.
6. Add environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

7. Do not add the service role key to Vercel for this app.
8. Click `Deploy`.
9. After deploy, open the production URL.
10. Test:
    - `/`
    - `/login`
    - `/admin/cloud-test`
    - Demo Mode
    - Cloud Mode

## Mobile PWA Install Test

### iPhone

1. Open the deployed URL in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.
4. Open the installed app.
5. Confirm map loads and Demo Mode works.

### Android

1. Open the deployed URL in Chrome.
2. Tap the browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Open the installed app.
5. Confirm map loads and Demo Mode works.

## Environment Safety

- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` belong in this app.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- If env vars are missing, the app should say:
  `Supabase is not configured. Demo Mode is available.`
- Demo Mode must remain usable without Supabase.
