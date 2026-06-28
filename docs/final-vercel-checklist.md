# Final Vercel Deployment Checklist

Use this checklist for the RC1 production deployment.

## GitHub

- Confirm the repository is pushed to GitHub.
- Confirm `main` points at the final RC1 commit.
- Confirm `codex/release-candidate-1-rc1` also exists on GitHub.

## Vercel Import

1. Open Vercel.
2. Choose **Add New**.
3. Choose **Project**.
4. Import the GitHub repository.
5. Select the `main` branch.
6. Keep the framework preset as **Next.js**.

## Environment Variables

Add these Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase anon key
NEXT_PUBLIC_ENABLE_ERROR_LOGGING=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
```

Do not add a Supabase service role key. Service role keys bypass RLS and must never be exposed to the browser.

## Deploy

1. Click **Deploy**.
2. Wait for the Vercel build to finish.
3. Open the production deployment URL.

## Smoke Test

1. Open `/login`.
2. Log in with the owner account.
3. Open `/admin/cloud-test`.
4. Run the cloud smoke test.
5. Confirm every check passes.
6. Open the map.
7. Confirm Cloud Mode loads while logged in.
8. Log out.
9. Confirm Demo Mode still works while logged out.

## Phone PWA Test

1. Open the production URL on a phone.
2. Install the app to the home screen.
3. Open the installed PWA.
4. Log in.
5. Confirm the map loads.
6. Confirm `/admin/cloud-test` still passes for the owner account.

## First Field Test

1. Use Cloud Mode.
2. Start a shift.
3. Start a route.
4. Start a street.
5. Knock a few houses.
6. Create a quick lead.
7. Schedule a follow-up.
8. Book a job if appropriate.
9. Complete the street.
10. End the shift.
11. Record results in `FIELD_NOTES.md`.
