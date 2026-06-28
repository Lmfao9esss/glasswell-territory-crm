# Glasswell Territory CRM

Field territory operating system for window cleaning teams. The first deployment is branded for Glasswell Window Cleaning in Ottawa, Ontario, but the architecture is organization-scoped from the start.

## Phase 1 Status

Built:

- Next.js App Router foundation
- TypeScript and Tailwind CSS
- Mobile-first app shell
- Leaflet and OpenStreetMap Ottawa home map
- PWA manifest and service worker starter
- Supabase browser/server client helpers
- Supabase schema, RLS migrations, seed data, and database types
- Role capability definitions
- Revised Phase 0 architecture in `docs/phase-0-product-architecture.md`

Not built yet:

- Authentication screens
- Real territory drawing
- OSM street import
- Live data sync
- Offline mutation queue

## Local Setup

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env.local
```

For Phase 1, the Supabase values may be blank. They become required when database/auth work begins.

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

Run lint:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```

## Supabase

Phase 2 database files live in:

```text
supabase/migrations/
supabase/seed.sql
src/lib/db/database.types.ts
```

Beginner setup instructions are in:

```text
docs/supabase-setup.md
```

## Free Deployment Stack

- Vercel Free Tier for hosting
- Supabase Free Tier for auth, Postgres, storage, and RLS
- OpenStreetMap tiles for map display
- Overpass API for import-time Ottawa street geometry

No paid APIs are required for the planned foundation.
