insert into public.organizations (id, name, slug, branding, settings)
values (
  '00000000-0000-4000-8000-000000000001',
  'Glasswell Window Cleaning',
  'glasswell',
  '{"primaryColor":"#18181b","serviceArea":"Ottawa, Ontario"}',
  '{"defaultResidentialRecurrenceDays":180,"defaultCommercialRecurrenceDays":30}'
)
on conflict (slug) do nothing;

insert into public.profiles (id, organization_id, full_name, email, phone, role, active)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Glasswell Owner', 'owner@glasswell.local', '613-555-0101', 'owner', true),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Glasswell Manager', 'manager@glasswell.local', '613-555-0102', 'manager', true),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Glasswell Employee', 'employee@glasswell.local', '613-555-0103', 'employee', true)
on conflict (id) do nothing;

insert into public.territories (
  id,
  organization_id,
  name,
  polygon_geojson,
  assigned_employee_id,
  status,
  total_streets,
  completed_streets,
  estimated_houses,
  houses_knocked,
  progress_percent,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000001',
    'Vanier North',
    '{"type":"Polygon","coordinates":[[[-75.6709,45.4453],[-75.6451,45.4382],[-75.6472,45.4282],[-75.6761,45.4315],[-75.6709,45.4453]]]}',
    '00000000-0000-4000-8000-000000000103',
    'active',
    2,
    0,
    72,
    18,
    25.00,
    '00000000-0000-4000-8000-000000000102'
  ),
  (
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000000001',
    'Vanier South',
    '{"type":"Polygon","coordinates":[[[-75.6706,45.4283],[-75.6478,45.4249],[-75.6508,45.4132],[-75.6792,45.4179],[-75.6706,45.4283]]]}',
    '00000000-0000-4000-8000-000000000103',
    'not_started',
    2,
    0,
    65,
    0,
    0.00,
    '00000000-0000-4000-8000-000000000102'
  )
on conflict (organization_id, name) do nothing;

insert into public.streets (
  id,
  organization_id,
  territory_id,
  osm_way_id,
  name,
  geometry_geojson,
  assigned_employee_id,
  status,
  estimated_houses,
  houses_knocked,
  completion_percent,
  last_knock_date,
  next_recommended_revisit_date,
  notes,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000002001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001001',
    9001001,
    'Montfort Street',
    '{"type":"LineString","coordinates":[[-75.6647,45.4381],[-75.6596,45.4342]]}',
    '00000000-0000-4000-8000-000000000103',
    'active',
    38,
    18,
    47.37,
    current_date,
    current_date + interval '180 days',
    'Pilot imported street for Vanier North.',
    '00000000-0000-4000-8000-000000000102'
  ),
  (
    '00000000-0000-4000-8000-000000002002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001001',
    9001002,
    'Lafontaine Avenue',
    '{"type":"LineString","coordinates":[[-75.6697,45.4349],[-75.6573,45.4301]]}',
    '00000000-0000-4000-8000-000000000103',
    'not_knocked',
    34,
    0,
    0.00,
    null,
    null,
    'Ready for first pass.',
    '00000000-0000-4000-8000-000000000102'
  ),
  (
    '00000000-0000-4000-8000-000000002003',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001002',
    9002001,
    'McArthur Avenue',
    '{"type":"LineString","coordinates":[[-75.6674,45.4258],[-75.6529,45.4229]]}',
    '00000000-0000-4000-8000-000000000103',
    'not_knocked',
    42,
    0,
    0.00,
    null,
    null,
    'High traffic street; likely commercial mix.',
    '00000000-0000-4000-8000-000000000102'
  ),
  (
    '00000000-0000-4000-8000-000000002004',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001002',
    9002002,
    'Hannah Street',
    '{"type":"LineString","coordinates":[[-75.6731,45.4216],[-75.6593,45.4188]]}',
    '00000000-0000-4000-8000-000000000103',
    'not_knocked',
    23,
    0,
    0.00,
    null,
    null,
    'Residential test street.',
    '00000000-0000-4000-8000-000000000102'
  )
on conflict (organization_id, territory_id, osm_way_id) do nothing;

insert into public.leads (
  id,
  organization_id,
  territory_id,
  street_id,
  assigned_employee_id,
  customer_name,
  phone,
  email,
  address,
  latitude,
  longitude,
  quote_amount,
  requested_service,
  notes,
  follow_up_date,
  lead_source,
  status,
  job_status,
  internal_comments,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000003001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000002001',
    '00000000-0000-4000-8000-000000000103',
    'Sample Vanier Lead',
    '613-555-0110',
    'lead@example.local',
    '101 Montfort Street, Ottawa, ON',
    45.4364000,
    -75.6621000,
    225.00,
    'Exterior residential window cleaning',
    'Interested, wants spring follow-up.',
    current_date + interval '1 day',
    'door_to_door',
    'quoted',
    'quoted',
    'Seed lead for testing RLS and map pins later.',
    '00000000-0000-4000-8000-000000000103'
  ),
  (
    '00000000-0000-4000-8000-000000003002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000002003',
    '00000000-0000-4000-8000-000000000103',
    'Sample Commercial Lead',
    '613-555-0111',
    null,
    '220 McArthur Avenue, Ottawa, ON',
    45.4242000,
    -75.6599000,
    480.00,
    'Monthly storefront window cleaning',
    'Decision maker asked for a callback.',
    current_date + interval '3 days',
    'door_to_door',
    'waiting',
    'quoted',
    'Potential recurring account.',
    '00000000-0000-4000-8000-000000000103'
  )
on conflict (id) do nothing;

insert into public.customers (
  id,
  organization_id,
  territory_id,
  street_id,
  name,
  phone,
  email,
  address,
  latitude,
  longitude,
  preferred_service_type,
  preferred_interval_days,
  notes,
  created_by
)
values (
  '00000000-0000-4000-8000-000000004001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000002001',
  'Sample Repeat Customer',
  '613-555-0120',
  'customer@example.local',
  '118 Montfort Street, Ottawa, ON',
  45.4359000,
  -75.6614000,
  'residential',
  180,
  'Completed first clean; due every six months.',
  '00000000-0000-4000-8000-000000000103'
)
on conflict (id) do nothing;

insert into public.jobs (
  id,
  organization_id,
  customer_id,
  territory_id,
  street_id,
  assigned_employee_id,
  service_type,
  status,
  quote_amount,
  revenue,
  scheduled_at,
  completed_at,
  recurrence_interval_days,
  notes,
  created_by
)
values (
  '00000000-0000-4000-8000-000000005001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000004001',
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000002001',
  '00000000-0000-4000-8000-000000000103',
  'residential',
  'completed',
  210.00,
  210.00,
  now() - interval '8 days',
  now() - interval '7 days',
  180,
  'Seed completed job; trigger sets next service due date when missing.',
  '00000000-0000-4000-8000-000000000103'
)
on conflict (id) do nothing;

insert into public.follow_ups (
  id,
  organization_id,
  lead_id,
  assigned_employee_id,
  due_at,
  status,
  reason,
  notes,
  created_by
)
values (
  '00000000-0000-4000-8000-000000006001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000003001',
  '00000000-0000-4000-8000-000000000103',
  now() + interval '1 day',
  'open',
  'quote_follow_up',
  'Ask if they want to book this week.',
  '00000000-0000-4000-8000-000000000103'
)
on conflict (id) do nothing;

insert into public.knocking_sessions (
  id,
  organization_id,
  employee_id,
  territory_id,
  started_at,
  houses_knocked,
  leads_created,
  quotes_created,
  jobs_booked,
  revenue_booked,
  notes,
  status,
  created_by
)
values (
  '00000000-0000-4000-8000-000000007001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000001001',
  now() - interval '2 hours',
  18,
  1,
  1,
  0,
  0,
  'Active demo session.',
  'active',
  '00000000-0000-4000-8000-000000000103'
)
on conflict (id) do nothing;

insert into public.street_locks (
  id,
  organization_id,
  street_id,
  employee_id,
  locked_at,
  expires_at,
  created_by
)
values (
  '00000000-0000-4000-8000-000000008001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000002001',
  '00000000-0000-4000-8000-000000000103',
  now(),
  now() + interval '4 hours',
  '00000000-0000-4000-8000-000000000103'
)
on conflict do nothing;
