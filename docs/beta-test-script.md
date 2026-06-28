# Beta Test Script

Run this script in Demo Mode first. Use Cloud Mode only after `/admin/beta-readiness` and `/admin/cloud-test` are acceptable.

## Owner Script

1. Deploy app
   - Push the latest project to GitHub.
   - Deploy through Vercel.
   - Confirm the deployed site opens on desktop and phone.

2. Create account
   - Open `/login`.
   - Sign in or create the owner account.
   - Confirm the app returns to the map.

3. Create organization
   - If prompted, create or join the organization.
   - Confirm the organization name appears in Cloud Mode screens.

4. Add employee
   - Open `/admin/employees`.
   - Add one employee profile.
   - Confirm the employee is active and assigned the employee role.

5. Create territory
   - Open the map.
   - Tap create territory.
   - Name the territory.
   - Assign the employee if available.

6. Import streets
   - Use OSM import in Cloud Mode, or mock import in Demo Mode.
   - Review the imported street list.
   - Uncheck at least one street that should not be tracked.
   - Save the territory.

7. Check dashboard
   - Open `/dashboard`.
   - Confirm command center cards render.
   - Confirm employee activity appears.

8. Check beta readiness
   - Open `/admin/beta-readiness`.
   - Review failing checks.
   - Confirm Demo/PWA checks render.

9. Export backup
   - Return to the map.
   - Tap `Export JSON`.
   - Confirm a backup file downloads.

## Employee Script

1. Log in
   - Open the app.
   - Tap `Login`.
   - Sign in as the employee.

2. Install PWA
   - iPhone: Safari -> Share -> Add to Home Screen.
   - Android: Chrome -> Install app or Add to Home screen.

3. Start shift
   - Open the map.
   - Tap `Start Shift`.
   - Allow location permission if prompted.

4. Start route
   - Tap the route/navigation button.
   - Confirm the route list and next recommended street appear.

5. Start street
   - Tap `Start next street`.
   - Confirm the active street panel appears.

6. Knock 5 houses
   - Tap the large `+` house counter five times.
   - Confirm houses knocked and remaining houses update.

7. Create quick lead
   - Tap `Lead` or an interested quick result.
   - Enter a phone number and optional name.
   - Save the lead.

8. Schedule follow-up
   - Open the lead.
   - Choose a follow-up preset.
   - Confirm the follow-up is scheduled.

9. Book job
   - Open the lead/customer.
   - Tap `Book Job`.
   - Add date, time, service, price, employee, and notes.
   - Save the job.

10. Complete street
    - Return to the active street.
    - Tap `Complete Street`.
    - Confirm the route refreshes.

11. End shift
    - Tap `End Shift`.
    - Confirm the shift summary appears.
    - Add notes if useful.

12. Submit feedback
    - Open `More`.
    - Choose bug, idea, confusing, or urgent.
    - Add page/area and description.
    - Submit feedback.

## Pass Criteria

- No console errors.
- Demo Mode still works after refresh.
- Active shift resumes after refresh.
- Route refreshes after completing a street.
- Backup export/import works.
- Feedback can be submitted in Demo Mode.
