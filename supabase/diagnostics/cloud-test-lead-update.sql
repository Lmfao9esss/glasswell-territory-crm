-- Diagnostic queries for /admin/cloud-test lead update failures.
-- Run in Supabase SQL Editor while logged into the affected project.

-- 1. List every trigger currently attached to public.leads.
select
  trigger_schema,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'leads'
order by trigger_name, event_manipulation;

-- 2. Show trigger definitions from pg_trigger, including disabled/internal flags.
select
  trigger_name,
  enabled,
  definition
from (
  select
    tg.tgname as trigger_name,
    tg.tgenabled as enabled,
    pg_get_triggerdef(tg.oid, true) as definition
  from pg_trigger tg
  join pg_class cls on cls.oid = tg.tgrelid
  join pg_namespace nsp on nsp.oid = cls.relnamespace
  where nsp.nspname = 'public'
    and cls.relname = 'leads'
    and not tg.tgisinternal
) trigger_list
order by trigger_name;

-- 3. Show functions that mention completed, lead_status, activity_log, or leads.
select
  nsp.nspname as schema_name,
  proc.proname as function_name,
  pg_get_functiondef(proc.oid) as function_definition
from pg_proc proc
join pg_namespace nsp on nsp.oid = proc.pronamespace
where nsp.nspname = 'public'
  and (
    pg_get_functiondef(proc.oid) ilike '%completed%'
    or pg_get_functiondef(proc.oid) ilike '%lead_status%'
    or pg_get_functiondef(proc.oid) ilike '%activity_log%'
    or pg_get_functiondef(proc.oid) ilike '%leads%'
  )
order by proc.proname;

-- 4. Confirm activity_log.action is text, not an enum.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_schema,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'activity_log'
  and column_name = 'action';

-- 5. Pick the most recent cloud-test lead.
select
  id,
  customer_name,
  status,
  job_status,
  notes,
  created_at,
  updated_at
from public.leads
where customer_name like 'Cloud Test%'
order by created_at desc
limit 5;

-- 6. Manually update one cloud-test lead status to waiting.
-- If this fails with lead_status "completed", the issue is a database trigger/function.
with target as (
  select id
  from public.leads
  where customer_name like 'Cloud Test%'
  order by created_at desc
  limit 1
)
update public.leads
set
  status = 'waiting'::public.lead_status,
  notes = 'Manual SQL status update diagnostic',
  updated_at = now()
where id in (select id from target)
returning id, customer_name, status, job_status, notes, updated_at;

-- 7. Manually update notes only on the same class of lead.
-- This catches generic trigger functions that evaluate job_status conditions
-- while running for the leads table.
with target as (
  select id
  from public.leads
  where customer_name like 'Cloud Test%'
  order by created_at desc
  limit 1
)
update public.leads
set
  notes = 'Manual SQL notes-only diagnostic',
  updated_at = now()
where id in (select id from target)
returning id, customer_name, status, job_status, notes, updated_at;
