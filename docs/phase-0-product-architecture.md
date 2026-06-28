# Glasswell Territory CRM - Phase 0 Architecture

Version: 1.1

This plan supersedes the original Phase 0 draft. The product is designed as a multi-organization field operating system for window cleaning businesses, with Glasswell Window Cleaning as the first branded organization.

## Product Principles

- The map is the primary interface.
- Streets are imported automatically from OpenStreetMap after a territory polygon is created.
- Most work stays street-level. House pins are created only when a useful customer event happens.
- Every data model includes `organization_id` from the beginning.
- Employee field actions should take one tap whenever possible.
- Analytics should become predictive over time without requiring a database rewrite.

## Database Schema

Core SaaS tables:

```text
organizations
- id
- name
- slug
- branding
- settings
- created_at

profiles
- id
- organization_id
- full_name
- email
- phone
- role: owner | manager | employee
- active
- created_at
```

Territory and OSM street import:

```text
territories
- id
- organization_id
- name
- polygon_geojson
- assigned_employee_id
- status: not_started | active | paused | completed
- lock_owner_id
- locked_at
- lock_expires_at
- manager_override_at
- manager_override_by
- imported_streets_at
- progress_cached
- revenue_cached
- last_visited_at
- recommended_revisit_date
- created_at

streets
- id
- organization_id
- territory_id
- osm_way_id
- name
- geometry_geojson
- assigned_employee_id
- status: not_knocked | active | paused | completed | skipped | do_not_knock
- lock_owner_id
- locked_at
- lock_expires_at
- estimated_houses
- houses_knocked
- completion_percent
- last_knock_date
- next_recommended_revisit_date
- notes
- created_at
```

Lead, customer, and recurring work:

```text
leads
- id
- organization_id
- territory_id
- street_id
- assigned_employee_id
- customer_name
- phone
- email
- address
- latitude
- longitude
- quote_amount
- requested_service
- notes
- follow_up_date
- lead_source
- status
- job_status
- before_photo_urls
- after_photo_urls
- internal_comments
- created_at
- updated_at

customers
- id
- organization_id
- lead_id
- name
- phone
- email
- address
- preferred_service_interval_days
- do_not_contact
- created_at

jobs
- id
- organization_id
- customer_id
- lead_id
- street_id
- assigned_employee_id
- service_type: residential | commercial | custom
- scheduled_date
- completed_at
- revenue
- status
- recurrence_interval_days
- suggested_follow_up_date
- notes

follow_ups
- id
- organization_id
- lead_id
- customer_id
- assigned_employee_id
- due_at
- reason
- completed_at
- notes
- created_at
```

Door knocking sessions and productivity:

```text
field_sessions
- id
- organization_id
- employee_id
- territory_id
- started_at
- finished_at
- gps_path_geojson
- houses_knocked
- streets_visited
- leads_created
- quotes_created
- jobs_booked
- revenue_booked
- summary

street_visits
- id
- organization_id
- field_session_id
- street_id
- employee_id
- started_at
- finished_at
- houses_knocked
- status_after_visit

employee_daily_stats
- id
- organization_id
- employee_id
- stat_date
- houses_knocked
- streets_completed
- leads_generated
- quotes_created
- jobs_booked
- conversion_percent
- average_revenue_per_knock
- hours_worked
```

Analytics and recommendations:

```text
street_performance_snapshots
- id
- organization_id
- street_id
- snapshot_date
- revenue
- leads
- quotes
- jobs
- conversion_rate
- average_job_value
- quote_acceptance_percent
- repeat_customer_percent
- revenue_per_house

territory_performance_snapshots
- id
- organization_id
- territory_id
- snapshot_date
- revenue
- jobs
- leads
- quotes
- conversion_rate
- average_job_value
- average_revenue_per_street
- average_revenue_per_house
- knock_coverage_percent
- days_since_last_visit
- recommended_revisit_date

recommendation_events
- id
- organization_id
- user_id
- entity_type
- entity_id
- recommendation_type
- reason
- confidence_score
- metadata
- dismissed_at
- acted_on_at
- created_at
```

Offline and audit:

```text
sync_queue
- id
- organization_id
- user_id
- operation_type
- entity_type
- entity_id
- payload
- base_version
- synced
- conflict_status
- created_at

activity_log
- id
- organization_id
- actor_id
- entity_type
- entity_id
- action
- metadata
- created_at
```

## Row Level Security

- Every business table is scoped by `organization_id`.
- Owners have full access to their organization.
- Managers can assign territories, manage employees, override locks, and update work records, but cannot delete company-level data.
- Employees can read and update assigned territories, active sessions, assigned streets, assigned leads, assigned jobs, and assigned follow-ups.
- Employees can create leads and field session records for their organization.
- Lock override is manager or owner only.

## Automatic Street Import

When a manager or owner draws a territory polygon:

1. Save territory polygon.
2. Query OpenStreetMap Overpass API for highway ways inside the polygon.
3. Normalize streets by OSM way ID and street name.
4. Store each street geometry as GeoJSON.
5. Estimate houses using address density where available, then fallback to street length heuristics.
6. Attach all imported streets to the territory.

No paid API is required. Overpass is suitable for import-time queries, not high-frequency runtime use. Imported geometry is stored in Supabase so the field app can work offline.

## Component Architecture

```text
AppShell
- Role-aware nav
- Offline state
- PWA service worker registration
- Mobile bottom navigation

HomeMap
- Leaflet map
- Territory polygons
- Street layers
- Lead pins
- Revenue and revisit overlays
- Route overlay

BottomSheets
- Territory details
- Street quick actions
- Lead creation
- Session controls

Dashboards
- Owner analytics
- Employee daily assignment
- Productivity ranking
```

## API Structure

```text
/api/osm/import-streets
- Imports OSM street geometry for a territory polygon.

/api/territories/[id]/lock
- Starts, renews, or overrides a territory lock.

/api/streets/[id]/lock
- Starts, renews, or overrides a street lock.

/api/sessions/start
- Starts a door knocking session.

/api/sessions/finish
- Finishes a session and writes summary stats.

/api/route-plan
- Generates walking route from assigned unfinished streets, due follow-ups, and booked jobs.

/api/sync
- Processes offline mutation queue and reports conflicts.

/api/recommendations
- Returns future smart recommendations.

/api/reports/dashboard
- Aggregated owner and manager metrics.

/api/search
- Global search across customers, streets, territories, employees, and notes.
```

## Roadmap

Phase 1: Foundation

- Next.js App Router, TypeScript, Tailwind, app shell, PWA basics, Supabase helpers, empty Ottawa map.

Phase 2: Database and RLS

- Supabase migrations, organization-aware tables, RLS policies, seed data, generated TypeScript types.

Phase 3: OSM Territory Import

- Territory drawing, Overpass street import, street normalization, estimated house counts, imported street layers.

Phase 4: Locks and Street Quick Actions

- Territory and street locks, active employee visibility, manager override, one-tap street actions.

Phase 5: Coverage Tracking

- Houses knocked, completion percent, last knock date, revisit date, territory rollups.

Phase 6: Lead and House Event Pins

- Tap-to-create customer event pins only for answers, quotes, bookings, and do-not-return records.

Phase 7: Door Knocking Sessions

- Start session, finish session, streets visited, houses knocked, leads, quotes, booked jobs, summary.

Phase 8: Repeat Customer System

- Residential 6-month suggestions, commercial 30-day suggestions, custom reminders, due-again map styling.

Phase 9: Dashboards and Heatmaps

- Owner dashboard, employee productivity rankings, street revenue heatmap, conversion overlays.

Phase 10: Offline Sync

- IndexedDB cache, queued writes, conflict handling, map data availability.

Phase 11: Route Planning and Recommendations

- Walking routes, nearby overdue quotes, high expected revenue streets, stale territory alerts.

Phase 12: Production Hardening

- Tests, validation, deployment guide, monitoring, beginner setup documentation.
