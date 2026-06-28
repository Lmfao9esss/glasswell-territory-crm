# RC1 Deployment Handoff

Release target: Release Candidate 1  
Branch: `codex/release-candidate-1-rc1`  
Commit: `162f6d2`  
Commit message: `chore: prepare release candidate 1`

Feature development is frozen. Only critical bug fixes, security fixes, performance improvements, and UX improvements discovered during real-world testing should be accepted.

## 1. Vercel Deployment Steps

Official references:

- Vercel Git deployments: `https://vercel.com/docs/git`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`

Steps:

1. Confirm the local branch is `codex/release-candidate-1-rc1`.
2. Confirm the commit is `162f6d2`.
3. Push the branch to GitHub.
4. Open Vercel.
5. Choose `Add New` > `Project`.
6. Import the GitHub repository.
7. Confirm the framework preset is `Next.js`.
8. Keep the default build command unless Vercel changes it:
   - Build command: `npm run build`
   - Install command: `npm install`
9. Add the required environment variables listed below.
10. Do not add a Supabase service role key.
11. Deploy.
12. Open the generated Vercel URL.
13. Run the post-deploy smoke test below.
14. After smoke test passes, attach the production domain if desired.

## 2. Supabase Setup Steps

Official references:

- Supabase deployment overview: `https://supabase.com/docs/guides/deployment`
- Supabase database migrations: `https://supabase.com/docs/guides/deployment/database-migrations`

Steps:

1. Create a Supabase account or sign in.
2. Create a new project.
3. Choose a project name, database password, and region close to Ottawa or the expected users.
4. Wait for provisioning to finish.
5. Open `Authentication` > `Providers`.
6. Enable Email/Password auth.
7. Open `Project Settings` > `API`.
8. Copy:
   - Project URL
   - anon public key
9. Do not copy the service role key into this app.
10. Install or run Supabase CLI through `npx`.
11. Log in:

```bash
npx supabase login
```

12. Link the hosted project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

13. Push migrations:

```bash
npx supabase db push
```

14. Confirm migration status:

```bash
npx supabase migration list
```

15. Seed only if starter cloud data is intentionally desired. For RC1, use the Supabase SQL Editor and run `supabase/seed.sql` after migrations. Do not run a destructive reset against a real production database.
16. Create real Auth users for owner, manager, and employee testing.
17. Connect Auth user UUIDs to matching `profiles` records if using seeded profile rows.
18. Log in through the app and run `/admin/cloud-test` as owner.

## 3. Required Environment Variables

Required in Vercel and local `.env.local` for Cloud Mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

Optional diagnostics, disabled by default:

```bash
NEXT_PUBLIC_ENABLE_ERROR_LOGGING=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
```

Never add:

```bash
SUPABASE_SERVICE_ROLE_KEY
```

The service role key bypasses RLS and must not be exposed to the browser app.

## 4. Post-Deploy Smoke Test Checklist

Run this on the Vercel deployment URL:

1. Open `/`.
2. Confirm the map renders.
3. Confirm Demo Mode is available.
4. Confirm no missing Supabase env crash occurs.
5. Open `/login`.
6. Sign in as owner.
7. Return to `/`.
8. Switch to Cloud Mode.
9. Confirm the app loads cloud data or shows a clear setup message.
10. Open `/admin/beta-readiness`.
11. Confirm readiness checks render.
12. Open `/admin/cloud-test`.
13. Run the cloud test as owner.
14. Confirm employee/manager access rules:
    - Employee cannot access owner-only cloud test.
    - Owner/manager can access employee setup where expected.
15. Create one test lead.
16. Refresh the page.
17. Confirm the lead persists in Cloud Mode.
18. Mark the test lead lost or clean it up according to RLS-safe app behavior.
19. Open `/feedback`.
20. Submit one low-priority deployment feedback item.
21. Confirm no browser console errors during the smoke test.

## 5. Phone and PWA Install Test

Test on the actual phones planned for beta.

### iPhone

1. Open the deployed URL in Safari.
2. Confirm the map loads.
3. Tap Share.
4. Tap `Add to Home Screen`.
5. Open the installed app from the home screen.
6. Confirm it opens full-screen enough for field use.
7. Confirm Demo Mode works.
8. Sign in and confirm Cloud Mode works.
9. Start a shift in a safe test territory.
10. Refresh or close/reopen the installed app.
11. Confirm the active shift resumes if testing Demo Mode persistence.

### Android

1. Open the deployed URL in Chrome.
2. Confirm the map loads.
3. Tap browser menu.
4. Tap `Install app` or `Add to Home screen`.
5. Open the installed app.
6. Confirm map, login, Demo Mode, and Cloud Mode work.
7. Run the same shift resume check used on iPhone.

## 6. First Real Field Test Checklist

Run with one owner and one employee for 60 to 90 minutes.

Before leaving:

1. Owner signs in.
2. Owner confirms `/admin/beta-readiness`.
3. Owner confirms `/admin/cloud-test`.
4. Owner creates or selects one small test territory.
5. Owner imports or mock-imports streets.
6. Owner assigns the employee.
7. Employee signs in on phone.
8. Employee installs the PWA.
9. Employee confirms assigned territory appears.

In the field:

1. Employee starts shift.
2. Employee starts route.
3. Employee starts one street.
4. Employee knocks 10 houses.
5. Employee creates one quick lead.
6. Employee schedules one follow-up.
7. Employee books one job only if it is a real booking.
8. Employee completes the street.
9. Employee ends shift.
10. Owner checks `/dashboard`.
11. Owner exports a backup.
12. Both users submit feedback.

Stop the test if:

- Cloud changes disappear after refresh.
- Employee cannot see assigned work.
- Street locks look wrong.
- Leads, jobs, or follow-ups attach to the wrong person.
- The app becomes hard to use while walking.

## 7. Rollback Instructions

Vercel rollback:

1. Open the Vercel project.
2. Go to `Deployments`.
3. Select the previous known-good deployment.
4. Promote or redeploy that deployment.
5. Confirm `/`, `/login`, and Demo Mode still work.
6. Tell testers to close and reopen the installed PWA.

Git rollback:

1. Keep `162f6d2` as the RC1 checkpoint.
2. If a later deployment fails, redeploy commit `162f6d2`.
3. Do not rewrite RC1 history.
4. Put fixes on a new branch from RC1.

Supabase rollback:

1. Do not run destructive resets against production data.
2. If only app deployment failed, roll back Vercel first.
3. If schema migration rollback is required, stop field testing.
4. Export or back up data before any database rollback.
5. Create an explicit corrective migration instead of editing already-applied migrations.
6. Re-run `/admin/cloud-test` after any database fix.

## 8. Known RC1 Limitations

- Route planning is simple geometry-based ordering, not turn-by-turn navigation.
- OSM import depends on public Overpass availability; demo/manual import remains the fallback.
- Cloud persistence must be verified on the deployed Supabase project before replacing Demo Mode in the field.
- Offline conflict resolution is not production-ready.
- Photo support is local/mock only.
- Error logging and performance monitoring are abstractions only; no third-party provider is connected.
- Dashboard can render Demo Mode data without login when Supabase is absent or intentionally in demo fallback. This does not expose cloud data.
- Leaflet internal 24 px visual elements were reported by the RC1 browser audit as small targets; they are not app controls.
