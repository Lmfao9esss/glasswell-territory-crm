alter table public.activity_log
  alter column action type text using action::text;

create or replace function public.log_important_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
begin
  if tg_table_name = 'streets' then
    if tg_op = 'UPDATE' and old.status is distinct from new.status then
      perform public.log_activity(
        new.organization_id,
        actor,
        'street',
        new.id,
        'street_status_changed',
        jsonb_build_object('old_status', old.status::text, 'new_status', new.status::text)
      );
    end if;
  elsif tg_table_name = 'leads' then
    if tg_op = 'INSERT' then
      perform public.log_activity(
        new.organization_id,
        actor,
        'lead',
        new.id,
        'lead_created',
        jsonb_build_object('status', new.status::text)
      );
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      perform public.log_activity(
        new.organization_id,
        actor,
        'lead',
        new.id,
        'lead_status_changed',
        jsonb_build_object('old_status', old.status::text, 'new_status', new.status::text)
      );
    elsif tg_op = 'UPDATE' and old.quote_amount is distinct from new.quote_amount then
      perform public.log_activity(
        new.organization_id,
        actor,
        'lead',
        new.id,
        'quote_updated',
        jsonb_build_object('old_quote_amount', old.quote_amount, 'new_quote_amount', new.quote_amount)
      );
    end if;
  elsif tg_table_name = 'jobs' then
    if tg_op = 'INSERT' and new.status in ('booked', 'completed') then
      perform public.log_activity(
        new.organization_id,
        actor,
        'job',
        new.id,
        'job_booked',
        jsonb_build_object('status', new.status::text, 'revenue', new.revenue)
      );
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
      perform public.log_activity(
        new.organization_id,
        actor,
        'job',
        new.id,
        'job_completed',
        jsonb_build_object('revenue', new.revenue, 'next_service_due_at', new.next_service_due_at)
      );
    end if;
  elsif tg_table_name = 'follow_ups' then
    if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
      perform public.log_activity(
        new.organization_id,
        actor,
        'follow_up',
        new.id,
        'follow_up_completed',
        jsonb_build_object('completed_at', new.completed_at)
      );
    end if;
  elsif tg_table_name = 'territories' then
    if tg_op = 'UPDATE' and old.assigned_employee_id is distinct from new.assigned_employee_id then
      perform public.log_activity(
        new.organization_id,
        actor,
        'territory',
        new.id,
        'territory_assigned',
        jsonb_build_object('old_employee_id', old.assigned_employee_id, 'new_employee_id', new.assigned_employee_id)
      );
    end if;
  elsif tg_table_name = 'street_locks' then
    if tg_op = 'UPDATE' and new.override_reason is not null and old.override_reason is distinct from new.override_reason then
      perform public.log_activity(
        new.organization_id,
        actor,
        'street_lock',
        new.id,
        'lock_overridden',
        jsonb_build_object('street_id', new.street_id, 'override_reason', new.override_reason)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists log_lead_activity on public.leads;
create trigger log_lead_activity after insert or update on public.leads
  for each row execute function public.log_important_activity();

drop trigger if exists log_job_activity on public.jobs;
create trigger log_job_activity after insert or update on public.jobs
  for each row execute function public.log_important_activity();

drop trigger if exists log_follow_up_activity on public.follow_ups;
create trigger log_follow_up_activity after update on public.follow_ups
  for each row execute function public.log_important_activity();
