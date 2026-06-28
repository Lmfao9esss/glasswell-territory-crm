# Release Candidate 1 Report

Release target: RC1  
Branch: `codex/release-candidate-1-rc1`  
Status: Feature frozen

## Release Boundary

RC1 accepts only:

- Critical bug fixes
- Security fixes
- Performance improvements
- UX improvements found during real-world testing

No new product features should be added without explicit approval.

## Completed Features

- Mobile-first Ottawa map shell with Leaflet and OpenStreetMap.
- Demo Mode with local persistence, backup export/import, and reset.
- Cloud Mode repository layer with Supabase auth/profile loading.
- Multi-organization database schema, Supabase migrations, seed data, and RLS policies.
- Territory, street, lead, customer, job, follow-up, lock, activity, session, route, and feedback workflows.
- Owner command center, beta readiness page, cloud smoke test page, employee setup screen, and feedback form.
- PWA manifest, service worker registration, and mobile install guidance.
- OSM street import flow with demo/manual fallback.

## RC1 Changes

- Added disabled-by-default error logging abstraction in `src/lib/observability/error-logger.ts`.
- Added disabled-by-default performance monitoring hooks in `src/lib/observability/performance-monitor.ts`.
- Timed repository operations, route calculation, and first map render through the new performance abstraction.
- Captured existing map load, backup import, and territory save errors through the new error logging interface.
- Improved the header Login touch target to meet mobile field-use expectations.
- Removed unused offline sync type scaffolding that was not imported by the app.

## Performance Summary

Measured against a production build served locally on `localhost:3002`.

| Metric | Desktop | Mobile |
| --- | ---: | ---: |
| DOM content loaded | 72 ms | 16 ms |
| Load event | 152 ms | 85 ms |
| Largest Contentful Paint | 444 ms | 404 ms |
| Map container ready | 385 ms | 393 ms |
| Map renderable | 405 ms | 436 ms |
| Transferred JS | 286.5 KB | 286.5 KB |
| Transferred CSS | 9.5 KB | 9.5 KB |
| Total transferred resources | 354.8 KB | 359.5 KB |
| Built JS/CSS assets, uncompressed | 1,277.4 KB | 1,277.4 KB |

Notes:

- No browser console errors were reported during the production audit.
- No horizontal overflow was detected at 390 px mobile width.
- Largest chunks are expected to include Leaflet, React/Next runtime, and the field workflow bundle.
- Further JavaScript reduction should focus on splitting owner/admin screens away from the map bundle only after field testing confirms a real load-time issue.

## Accessibility Summary

Checked:

- Keyboard navigation
- Touch target size
- Contrast sampling
- Focus visibility
- Screen reader labels for buttons

Findings:

- No unnamed buttons were found.
- No sampled contrast failures were found.
- Login touch target was expanded to a 48 px high target.
- Remaining small target warnings were Leaflet-rendered internal `DIV` markers at 24 px. These are visual map elements, not app controls.
- First keyboard focus lands on the Leaflet map container with browser default outline. This is acceptable for RC1, but field testing should confirm keyboard users can reach app controls comfortably.

## Security Summary

Reviewed:

- Authentication/profile loading
- Route-level owner/manager guards
- Repository boundaries
- Supabase RLS assumptions
- Environment variables
- Sensitive client data exposure

Findings:

- The client uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No service role key is referenced by application code.
- Cloud Mode repositories use the browser Supabase client and rely on RLS; they do not bypass RLS.
- Admin pages perform server-side profile checks before rendering owner/manager tools.
- Demo Mode remains intentionally available without Supabase credentials.
- RLS coverage exists for organization membership, roles, assigned work, locks, sessions, feedback, and deletion boundaries.

Remaining security risk:

- RLS must still be smoke-tested on the deployed Supabase project with real owner, manager, and employee accounts before unsupervised field use.
- Dashboard can render Demo Mode data without login when Supabase is absent or the app is intentionally in demo fallback. This does not expose cloud data, but it should be explained to testers.

## Known Limitations

- Route planning is geometry-based and not turn-by-turn navigation.
- OSM import depends on public Overpass availability; demo/manual import remains the fallback.
- Cloud persistence should be tested on the deployed Supabase project before replacing Demo Mode in the field.
- Offline conflict resolution is not production-ready.
- Photo support is local/mock only.
- Performance monitoring and error logging are abstractions only; no third-party provider is connected.

## Deployment Checklist

1. Confirm feature freeze remains in effect.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `npm test`.
5. Create Supabase project and apply migrations.
6. Enable Supabase email/password auth.
7. Add only public Supabase env vars to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
8. Do not add a service role key to Vercel or any client-side env file.
9. Deploy to Vercel.
10. Open `/admin/beta-readiness`.
11. Open `/admin/cloud-test` as owner.
12. Test login, employee setup, territory setup, and Demo Mode fallback.
13. Install the PWA on the exact phones used for the first field test.

## Recommended First Field Test

Run with one owner and one employee for 60 to 90 minutes.

Test only one territory:

1. Owner confirms beta readiness.
2. Owner creates or selects one territory.
3. Owner imports or mock-imports streets.
4. Employee starts shift.
5. Employee starts route.
6. Employee starts one street.
7. Employee knocks 10 houses.
8. Employee creates one quick lead.
9. Employee schedules one follow-up.
10. Employee books one test job if a real booking exists.
11. Employee completes the street.
12. Employee ends shift.
13. Owner exports backup.
14. Both users submit feedback.

Stop the test if:

- Cloud Mode changes do not persist after refresh.
- Locks do not prevent duplicate street work.
- Follow-ups or jobs appear under the wrong customer/lead.
- The app becomes difficult to use in sunlight or one-handed walking conditions.

## Verification

Completed:

- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed.
- Production browser audit passed with no console errors.

Remaining warnings:

- None from lint, build, or tests.
- Browser audit still reports Leaflet internal 24 px visual `DIV` elements as small targets; these are not app controls.
