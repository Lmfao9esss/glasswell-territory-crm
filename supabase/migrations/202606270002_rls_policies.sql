create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = target_organization_id
      and active = true
  )
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = target_organization_id
      and role = any(allowed_roles)
      and active = true
  )
$$;

create or replace function public.can_read_assigned_work(
  target_organization_id uuid,
  assigned_employee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or (
      public.has_org_role(target_organization_id, array['employee'::public.user_role])
      and assigned_employee_id = auth.uid()
    )
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.territories enable row level security;
alter table public.streets enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.jobs enable row level security;
alter table public.follow_ups enable row level security;
alter table public.knocking_sessions enable row level security;
alter table public.street_locks enable row level security;
alter table public.activity_log enable row level security;

create policy "owners can read own organization"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "owners can update own organization"
  on public.organizations for update
  using (public.has_org_role(id, array['owner'::public.user_role]))
  with check (public.has_org_role(id, array['owner'::public.user_role]));

create policy "owners can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "owners can delete own organization"
  on public.organizations for delete
  using (public.has_org_role(id, array['owner'::public.user_role]));

create policy "members can read organization profiles"
  on public.profiles for select
  using (public.is_org_member(organization_id));

create policy "owners and managers can create profiles"
  on public.profiles for insert
  with check (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]));

create policy "owners and managers can update profiles"
  on public.profiles for update
  using (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]))
  with check (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]));

create policy "owners can delete profiles"
  on public.profiles for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "owners and managers can read territories"
  on public.territories for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
  );

create policy "owners and managers can create territories"
  on public.territories for insert
  with check (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]));

create policy "owners and managers can update territories"
  on public.territories for update
  using (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]))
  with check (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]));

create policy "owners can delete territories"
  on public.territories for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read assigned streets"
  on public.streets for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or exists (
      select 1
      from public.territories
      where territories.id = streets.territory_id
        and territories.assigned_employee_id = auth.uid()
    )
  );

create policy "owners and managers can create streets"
  on public.streets for insert
  with check (public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role]));

create policy "assigned employees can update streets"
  on public.streets for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or exists (
      select 1
      from public.territories
      where territories.id = streets.territory_id
        and territories.assigned_employee_id = auth.uid()
    )
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or exists (
      select 1
      from public.territories
      where territories.id = streets.territory_id
        and territories.assigned_employee_id = auth.uid()
    )
  );

create policy "owners can delete streets"
  on public.streets for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read customers"
  on public.customers for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or created_by = auth.uid()
  );

create policy "members can create customers"
  on public.customers for insert
  with check (public.is_org_member(organization_id));

create policy "members can update customers"
  on public.customers for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or created_by = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or created_by = auth.uid()
  );

create policy "owners can delete customers"
  on public.customers for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read assigned leads"
  on public.leads for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "members can create leads"
  on public.leads for insert
  with check (public.is_org_member(organization_id));

create policy "members can update assigned leads"
  on public.leads for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "owners can delete leads"
  on public.leads for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read assigned jobs"
  on public.jobs for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "members can create jobs"
  on public.jobs for insert
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "members can update assigned jobs"
  on public.jobs for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "owners can delete jobs"
  on public.jobs for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read assigned follow ups"
  on public.follow_ups for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "members can create follow ups"
  on public.follow_ups for insert
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "members can update assigned follow ups"
  on public.follow_ups for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or assigned_employee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "owners can delete follow ups"
  on public.follow_ups for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read assigned sessions"
  on public.knocking_sessions for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
  );

create policy "employees can create own sessions"
  on public.knocking_sessions for insert
  with check (
    public.is_org_member(organization_id)
    and employee_id = auth.uid()
  );

create policy "employees can update own sessions"
  on public.knocking_sessions for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
  );

create policy "owners can delete sessions"
  on public.knocking_sessions for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read relevant street locks"
  on public.street_locks for select
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
    or exists (
      select 1
      from public.streets
      where streets.id = street_locks.street_id
        and streets.assigned_employee_id = auth.uid()
    )
  );

create policy "members can create own street locks"
  on public.street_locks for insert
  with check (
    public.is_org_member(organization_id)
    and employee_id = auth.uid()
  );

create policy "employees can release own locks and managers can override"
  on public.street_locks for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or employee_id = auth.uid()
  );

create policy "owners can delete street locks"
  on public.street_locks for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));

create policy "members can read activity log"
  on public.activity_log for select
  using (public.is_org_member(organization_id));

create policy "system and members can create activity log"
  on public.activity_log for insert
  with check (public.is_org_member(organization_id));

create policy "owners can delete activity log"
  on public.activity_log for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));
