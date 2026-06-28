# Known Issues

## Safe For Beta

- OSM import depends on the public Overpass API. If it is slow or rate-limited, use mock import or manual street entry during beta.
- Service worker registration only happens in production builds. Local development may show the service worker readiness check as failed.
- Cloud Mode requires Supabase migrations and RLS setup before field use. Demo Mode remains available without Supabase.
- Feedback in Cloud Mode falls back to local storage if the `feedback` table migration has not been applied.
- Route planning is simple geometry-based ordering, not turn-by-turn navigation.

## Must Fix Before Real Use

- Verify Cloud Mode RLS with real owner, manager, and employee accounts before employees use it unsupervised.
- Verify lead, job, and follow-up persistence in Cloud Mode after refresh on the deployed app.
- Verify street locks across two real employee accounts before simultaneous canvassing.
- Verify backup export/import on the exact phones used in the field.
- Confirm the PWA install flow and service worker behavior on the deployed Vercel domain.

## Future Improvements

- Draw custom territory polygons directly on the map.
- Replace simple route planning with true route optimization.
- Add real photo upload storage.
- Add full offline sync conflict handling.
- Add richer owner analytics after beta workflows are stable.
- Add email/SMS follow-up reminders after customer data is verified.
