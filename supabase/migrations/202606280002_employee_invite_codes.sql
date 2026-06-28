alter table public.organizations
  add column if not exists invite_code text,
  add column if not exists invite_code_updated_at timestamptz;

update public.organizations
set
  invite_code = upper(left(replace(id::text, '-', ''), 10)),
  invite_code_updated_at = coalesce(updated_at, now())
where invite_code is null;

alter table public.organizations
  alter column invite_code set not null,
  alter column invite_code_updated_at set default now();

create unique index if not exists organizations_invite_code_idx
  on public.organizations (invite_code);

alter table public.organizations
  drop constraint if exists organizations_invite_code_format,
  add constraint organizations_invite_code_format
    check (invite_code ~ '^[A-Z0-9]{8,16}$');

create or replace function public.new_invite_code()
returns text
language sql
volatile
as $$
  select upper(left(md5(random()::text || clock_timestamp()::text), 10))
$$;

alter table public.organizations
  alter column invite_code set default public.new_invite_code();

create or replace function public.regenerate_organization_invite_code(
  target_organization_id uuid
)
returns table(invite_code text, invite_code_updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  if not public.has_org_role(
    target_organization_id,
    array['owner'::public.user_role, 'manager'::public.user_role]
  ) then
    raise exception 'Owner or manager access is required to regenerate invite codes.'
      using errcode = '42501';
  end if;

  loop
    generated_code := public.new_invite_code();
    exit when not exists (
      select 1
      from public.organizations
      where organizations.invite_code = generated_code
    );
  end loop;

  return query
  update public.organizations
  set
    invite_code = generated_code,
    invite_code_updated_at = now(),
    updated_by = auth.uid()
  where id = target_organization_id
  returning organizations.invite_code, organizations.invite_code_updated_at;
end;
$$;

create or replace function public.join_organization_by_invite(
  invite_code_input text,
  employee_full_name text,
  employee_phone text default null
)
returns table(
  organization_id uuid,
  profile_id uuid,
  role public.user_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := coalesce(auth.email(), auth.jwt() ->> 'email');
  normalized_code text := upper(regexp_replace(coalesce(invite_code_input, ''), '[^A-Za-z0-9]', '', 'g'));
  target_organization public.organizations%rowtype;
  existing_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Login is required before joining an organization.'
      using errcode = '42501';
  end if;

  if current_user_email is null or length(trim(current_user_email)) = 0 then
    raise exception 'Your auth account does not have an email address.'
      using errcode = '22023';
  end if;

  if length(normalized_code) < 8 then
    raise exception 'Invite code is invalid.'
      using errcode = '22023';
  end if;

  select *
  into target_organization
  from public.organizations
  where invite_code = normalized_code
  limit 1;

  if target_organization.id is null then
    raise exception 'Invite code is invalid or expired.'
      using errcode = '22023';
  end if;

  select *
  into existing_profile
  from public.profiles
  where id = current_user_id
  limit 1;

  if existing_profile.id is not null then
    if existing_profile.organization_id <> target_organization.id then
      raise exception 'This account already belongs to another organization.'
        using errcode = '23505';
    end if;

    organization_id := existing_profile.organization_id;
    profile_id := existing_profile.id;
    role := existing_profile.role;
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.profiles
    where organization_id = target_organization.id
      and lower(email) = lower(current_user_email)
      and id <> current_user_id
  ) then
    raise exception 'A profile already exists for this email. Log in with that account or ask an owner for help.'
      using errcode = '23505';
  end if;

  insert into public.profiles (
    id,
    organization_id,
    full_name,
    email,
    phone,
    role,
    active,
    created_by,
    updated_by
  )
  values (
    current_user_id,
    target_organization.id,
    coalesce(nullif(trim(employee_full_name), ''), split_part(current_user_email, '@', 1), 'Employee'),
    current_user_email,
    nullif(trim(coalesce(employee_phone, '')), ''),
    'employee',
    true,
    current_user_id,
    current_user_id
  );

  organization_id := target_organization.id;
  profile_id := current_user_id;
  role := 'employee';
  return next;
end;
$$;

grant execute on function public.regenerate_organization_invite_code(uuid) to authenticated;
grant execute on function public.join_organization_by_invite(text, text, text) to authenticated;
