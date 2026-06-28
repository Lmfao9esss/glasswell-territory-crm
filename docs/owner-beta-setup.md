# Owner Beta Setup Guide

Use this guide to prepare Glasswell Territory CRM for the first owner plus 1-2 employee beta.

## 1. Supabase Setup

1. Create a free Supabase project.
2. Open SQL Editor or use the Supabase CLI.
3. Run all migrations in `supabase/migrations`.
4. Run seed data only if you want starter demo cloud records.
5. Enable Email/Password auth in Supabase Authentication settings.
6. Copy the project URL and anon key.

## 2. Local Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never place the Supabase service role key in the browser app.

## 3. Vercel Deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the same two env vars in Vercel Project Settings.
4. Deploy.
5. Open the deployed app on a phone.
6. Install it as a PWA.

## 4. Create The First Owner

1. Sign up or log in with the owner email.
2. Use the organization bootstrap if no profile exists.
3. Confirm the owner profile is active.
4. Open `/admin/beta-readiness`.
5. Open `/admin/cloud-test` and run the RLS smoke test.

## 5. Add Employees

1. Open `/admin/employees`.
2. Add each employee email, name, and role.
3. If true email invites are not configured, manually create the Auth user in Supabase.
4. Confirm the employee can log in.
5. Confirm the employee cannot access owner-only pages.

## 6. Create Territories

1. Open the map in Cloud Mode.
2. Tap create territory.
3. Choose a preset polygon for beta.
4. Import streets.
5. Review the street preview.
6. Remove streets that should not be knocked.
7. Assign an employee.
8. Save the territory.

## 7. Test Cloud Mode

1. Log in as owner.
2. Confirm Cloud Mode loads.
3. Create a test lead.
4. Refresh the page.
5. Confirm the lead remains.
6. Log in as employee.
7. Confirm the employee only sees assigned work.

## 8. First Field Day Test

Test only one small territory first:

1. Employee installs the PWA.
2. Employee starts a shift.
3. Employee starts a route.
4. Employee starts one street.
5. Employee records house knocks.
6. Employee creates one lead.
7. Employee schedules one follow-up.
8. Employee completes the street.
9. Owner reviews `/dashboard`.
10. Owner exports a backup after the test.

## Stop Conditions

Stop using Cloud Mode in the field if:

- The app shows repeated connection warnings.
- Leads disappear after refresh.
- Street locks appear wrong.
- Employee cannot see assigned territory.
- Follow-ups or jobs save to the wrong customer.

Use Demo Mode and the feedback form to record the issue.
