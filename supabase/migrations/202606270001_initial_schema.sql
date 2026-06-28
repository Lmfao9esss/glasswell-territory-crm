create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'manager', 'employee');
create type public.territory_status as enum ('not_started', 'active', 'paused', 'completed');
create type public.street_status as enum ('not_knocked', 'active', 'paused', 'completed', 'skipped', 'do_not_knock');
create type public.lead_status as enum ('interested', 'quoted', 'waiting', 'booked', 'repeat_customer', 'no_answer', 'lost', 'do_not_contact');
create type public.job_status as enum ('draft', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled', 'lost');
create type public.follow_up_status as enum ('open', 'completed', 'snoozed', 'cancelled');
create type public.session_status as enum ('active', 'paused', 'completed', 'cancelled');
create type public.service_type as enum ('residential', 'commercial', 'custom');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  branding jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'employee',
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.organizations
  add constraint organizations_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null,
  add constraint organizations_updated_by_fkey foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.profiles
  add constraint profiles_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null,
  add constraint profiles_updated_by_fkey foreign key (updated_by) references public.profiles(id) on delete set null;

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  polygon_geojson jsonb not null,
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  status public.territory_status not null default 'not_started',
  imported_streets_at timestamptz,
  total_streets integer not null default 0 check (total_streets >= 0),
  completed_streets integer not null default 0 check (completed_streets >= 0),
  estimated_houses integer not null default 0 check (estimated_houses >= 0),
  houses_knocked integer not null default 0 check (houses_knocked >= 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  revenue_total numeric(12,2) not null default 0 check (revenue_total >= 0),
  last_visited_at timestamptz,
  recommended_revisit_date date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.streets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  osm_way_id bigint,
  name text not null,
  geometry_geojson jsonb not null,
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  status public.street_status not null default 'not_knocked',
  estimated_houses integer not null default 0 check (estimated_houses >= 0),
  houses_knocked integer not null default 0 check (houses_knocked >= 0),
  completion_percent numeric(5,2) not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  last_knock_date date,
  next_recommended_revisit_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, territory_id, osm_way_id),
  unique (organization_id, territory_id, name)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete set null,
  street_id uuid references public.streets(id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  preferred_service_type public.service_type not null default 'residential',
  preferred_interval_days integer check (preferred_interval_days is null or preferred_interval_days > 0),
  do_not_contact boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete set null,
  street_id uuid references public.streets(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  phone text,
  email text,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  quote_amount numeric(12,2) check (quote_amount is null or quote_amount >= 0),
  requested_service text,
  notes text,
  follow_up_date date,
  lead_source text not null default 'door_to_door',
  status public.lead_status not null default 'interested',
  job_status public.job_status not null default 'draft',
  before_photo_urls text[] not null default '{}',
  after_photo_urls text[] not null default '{}',
  internal_comments text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  street_id uuid references public.streets(id) on delete set null,
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  service_type public.service_type not null default 'residential',
  status public.job_status not null default 'booked',
  quote_amount numeric(12,2) check (quote_amount is null or quote_amount >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  scheduled_at timestamptz,
  completed_at timestamptz,
  recurrence_interval_days integer check (recurrence_interval_days is null or recurrence_interval_days > 0),
  next_service_due_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz not null,
  status public.follow_up_status not null default 'open',
  reason text,
  completed_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_ups_has_subject check (
    lead_id is not null or customer_id is not null or job_id is not null
  )
);

create table public.knocking_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  territory_id uuid references public.territories(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  gps_path_geojson jsonb,
  houses_knocked integer not null default 0 check (houses_knocked >= 0),
  leads_created integer not null default 0 check (leads_created >= 0),
  quotes_created integer not null default 0 check (quotes_created >= 0),
  jobs_booked integer not null default 0 check (jobs_booked >= 0),
  revenue_booked numeric(12,2) not null default 0 check (revenue_booked >= 0),
  notes text,
  status public.session_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.street_locks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  street_id uuid not null references public.streets(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  released_by uuid references public.profiles(id) on delete set null,
  override_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint street_locks_expires_after_locked check (expires_at > locked_at)
);

create unique index street_locks_one_active_per_street
  on public.street_locks (street_id)
  where released_at is null;

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_organization_id_idx on public.profiles (organization_id);
create index territories_organization_id_idx on public.territories (organization_id);
create index streets_organization_id_idx on public.streets (organization_id);
create index streets_territory_id_idx on public.streets (territory_id);
create index customers_organization_id_idx on public.customers (organization_id);
create index leads_organization_id_idx on public.leads (organization_id);
create index leads_assigned_employee_id_idx on public.leads (assigned_employee_id);
create index jobs_organization_id_idx on public.jobs (organization_id);
create index follow_ups_due_at_idx on public.follow_ups (organization_id, due_at, status);
create index knocking_sessions_employee_id_idx on public.knocking_sessions (employee_id, started_at desc);
create index street_locks_street_id_idx on public.street_locks (street_id);
create index activity_log_entity_idx on public.activity_log (organization_id, entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_territories_updated_at before update on public.territories
  for each row execute function public.set_updated_at();
create trigger set_streets_updated_at before update on public.streets
  for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger set_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger set_follow_ups_updated_at before update on public.follow_ups
  for each row execute function public.set_updated_at();
create trigger set_knocking_sessions_updated_at before update on public.knocking_sessions
  for each row execute function public.set_updated_at();
create trigger set_street_locks_updated_at before update on public.street_locks
  for each row execute function public.set_updated_at();

create or replace function public.set_audit_user()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.created_by = old.created_by;
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  end if;

  return new;
end;
$$;

create trigger set_organizations_audit_user before insert or update on public.organizations
  for each row execute function public.set_audit_user();
create trigger set_profiles_audit_user before insert or update on public.profiles
  for each row execute function public.set_audit_user();
create trigger set_territories_audit_user before insert or update on public.territories
  for each row execute function public.set_audit_user();
create trigger set_streets_audit_user before insert or update on public.streets
  for each row execute function public.set_audit_user();
create trigger set_customers_audit_user before insert or update on public.customers
  for each row execute function public.set_audit_user();
create trigger set_leads_audit_user before insert or update on public.leads
  for each row execute function public.set_audit_user();
create trigger set_jobs_audit_user before insert or update on public.jobs
  for each row execute function public.set_audit_user();
create trigger set_follow_ups_audit_user before insert or update on public.follow_ups
  for each row execute function public.set_audit_user();
create trigger set_knocking_sessions_audit_user before insert or update on public.knocking_sessions
  for each row execute function public.set_audit_user();
create trigger set_street_locks_audit_user before insert or update on public.street_locks
  for each row execute function public.set_audit_user();

create or replace function public.set_default_job_recurrence()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;

  if new.status = 'completed' then
    new.recurrence_interval_days = coalesce(
      new.recurrence_interval_days,
      case new.service_type
        when 'commercial' then 30
        when 'residential' then 180
        else null
      end
    );

    if new.next_service_due_at is null and new.recurrence_interval_days is not null then
      new.next_service_due_at = coalesce(new.completed_at, now()) + make_interval(days => new.recurrence_interval_days);
    end if;
  end if;

  return new;
end;
$$;

create trigger set_jobs_default_recurrence before insert or update on public.jobs
  for each row execute function public.set_default_job_recurrence();

create or replace function public.log_activity(
  target_organization_id uuid,
  target_actor_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action text,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (
    organization_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    target_organization_id,
    target_actor_id,
    target_entity_type,
    target_entity_id,
    target_action,
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.log_important_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
begin
  if tg_table_name = 'streets' and tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.log_activity(new.organization_id, actor, 'street', new.id, 'street_status_changed', jsonb_build_object('old_status', old.status, 'new_status', new.status));
  elsif tg_table_name = 'leads' and tg_op = 'INSERT' then
    perform public.log_activity(new.organization_id, actor, 'lead', new.id, 'lead_created', jsonb_build_object('status', new.status));
  elsif tg_table_name = 'leads' and tg_op = 'UPDATE' and old.quote_amount is distinct from new.quote_amount then
    perform public.log_activity(new.organization_id, actor, 'lead', new.id, 'quote_updated', jsonb_build_object('old_quote_amount', old.quote_amount, 'new_quote_amount', new.quote_amount));
  elsif tg_table_name = 'jobs' and tg_op = 'INSERT' and new.status in ('booked', 'completed') then
    perform public.log_activity(new.organization_id, actor, 'job', new.id, 'job_booked', jsonb_build_object('status', new.status, 'revenue', new.revenue));
  elsif tg_table_name = 'jobs' and tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
    perform public.log_activity(new.organization_id, actor, 'job', new.id, 'job_completed', jsonb_build_object('revenue', new.revenue, 'next_service_due_at', new.next_service_due_at));
  elsif tg_table_name = 'follow_ups' and tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
    perform public.log_activity(new.organization_id, actor, 'follow_up', new.id, 'follow_up_completed', jsonb_build_object('completed_at', new.completed_at));
  elsif tg_table_name = 'territories' and tg_op = 'UPDATE' and old.assigned_employee_id is distinct from new.assigned_employee_id then
    perform public.log_activity(new.organization_id, actor, 'territory', new.id, 'territory_assigned', jsonb_build_object('old_employee_id', old.assigned_employee_id, 'new_employee_id', new.assigned_employee_id));
  elsif tg_table_name = 'street_locks' and tg_op = 'UPDATE' and new.override_reason is not null and old.override_reason is distinct from new.override_reason then
    perform public.log_activity(new.organization_id, actor, 'street_lock', new.id, 'lock_overridden', jsonb_build_object('street_id', new.street_id, 'override_reason', new.override_reason));
  end if;

  return new;
end;
$$;

create trigger log_street_activity after update on public.streets
  for each row execute function public.log_important_activity();
create trigger log_lead_activity after insert or update on public.leads
  for each row execute function public.log_important_activity();
create trigger log_job_activity after insert or update on public.jobs
  for each row execute function public.log_important_activity();
create trigger log_follow_up_activity after update on public.follow_ups
  for each row execute function public.log_important_activity();
create trigger log_territory_activity after update on public.territories
  for each row execute function public.log_important_activity();
create trigger log_street_lock_activity after update on public.street_locks
  for each row execute function public.log_important_activity();
