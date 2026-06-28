# RC1 Vercel Deployment Steps

Use these steps after the RC1 branch has been pushed to GitHub.

## 1. Push The GitHub Branch

This repo does not include secrets in git. Do not commit `.env.local`.

If no GitHub remote exists yet, create a new empty repository on GitHub, then run:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin codex/release-candidate-1-rc1
```

Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPOSITORY_NAME` with your actual GitHub account and repository name.

## 2. Import Into Vercel

1. Go to the Vercel dashboard.
2. Choose **Add New**.
3. Choose **Project**.
4. Import the GitHub repository.
5. Keep the framework preset as **Next.js**.
6. If Vercel asks for a branch, choose `codex/release-candidate-1-rc1`.

## 3. Add Environment Variables

In Vercel project settings, add these environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase anon key
NEXT_PUBLIC_ENABLE_ERROR_LOGGING=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
```

Do not add a Supabase service role key. Service role keys bypass RLS and must never be exposed to the browser.

## 4. Deploy

1. Click **Deploy**.
2. Wait for the build to finish.
3. Open the generated Vercel deployment URL.

## 5. Smoke Test

1. Open `/login`.
2. Log in with the owner account.
3. Open `/admin/cloud-test`.
4. Run the cloud smoke test.
5. Confirm every check passes.
6. Open the map.
7. Confirm Cloud Mode data loads when logged in.
8. Log out.
9. Confirm Demo Mode still works when logged out.

## 6. Phone / PWA Install Test

1. Open the Vercel URL on an iPhone or Android phone.
2. Log in.
3. Use the browser share/install menu.
4. Install the app to the home screen.
5. Open the installed app.
6. Confirm `/login`, the map, and `/admin/cloud-test` still work.

## 7. First Field Test

1. Bring one owner account and one employee account.
2. Test in Cloud Mode.
3. Start a shift.
4. Start a route.
5. Start a street.
6. Knock a few houses.
7. Create a quick lead.
8. Schedule a follow-up.
9. Book a test job if appropriate.
10. Complete the street.
11. End the shift.
12. Record notes in `FIELD_NOTES.md`.

## 8. Rollback

If the Vercel deployment fails:

1. Open the Vercel project.
2. Go to **Deployments**.
3. Find the last working deployment.
4. Use **Promote to Production** or **Redeploy**.
5. If a Supabase migration caused the issue, stop field testing and review the migration before making more database changes.
