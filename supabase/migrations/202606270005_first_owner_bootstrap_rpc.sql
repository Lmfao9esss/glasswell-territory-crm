create or replace function public.set_audit_user()
returns trigger
language plpgsql
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile_exists boolean := false;
begin
  if actor_id is not null then
    select exists (
      select 1
      from public.profiles
      where id = actor_id
    )
    into actor_profile_exists;
  end if;

  if tg_op = 'INSERT' then
    if actor_profile_exists or (tg_table_name = 'profiles' and new.id = actor_id) then
      new.created_by = coalesce(new.created_by, actor_id);
      new.updated_by = coalesce(new.updated_by, actor_id);
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by = old.created_by;
    if actor_profile_exists then
      new.updated_by = coalesce(actor_id, new.updated_by);
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists "owners can create organizations" on public.organizations;
drop policy if exists "signed in users can create first owner profile" on public.profiles;

create or replace function public.bootstrap_first_organization(
  organization_name text,
  organization_slug text,
  owner_email text,
  owner_full_name text default null
)
returns table (
  organization_id uuid,
  profile_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(organization_name), '');
  normalized_slug text := lower(regexp_replace(coalesce(nullif(trim(organization_slug), ''), 'organization'), '[^a-z0-9]+', '-', 'g'));
  jwt_email text := nullif(auth.jwt() ->> 'email', '');
  normalized_email text := lower(nullif(trim(coalesce(jwt_email, owner_email)), ''));
  created_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'Login is required before creating an organization.';
  end if;

  if exists (select 1 from public.organizations) then
    raise exception 'The first organization has already been created.';
  end if;

  if exists (select 1 from public.profiles) then
    raise exception 'The first owner profile has already been created.';
  end if;

  if normalized_name is null then
    raise exception 'Organization name is required.';
  end if;

  normalized_slug := trim(both '-' from normalized_slug);
  if normalized_slug = '' then
    normalized_slug := 'organization-' || left(replace(current_user_id::text, '-', ''), 8);
  end if;

  if normalized_email is null then
    raise exception 'Owner email is required.';
  end if;

  insert into public.organizations (
    name,
    slug,
    branding,
    settings
  )
  values (
    normalized_name,
    normalized_slug,
    '{}'::jsonb,
    '{}'::jsonb
  )
  returning id into created_organization_id;

  insert into public.profiles (
    id,
    organization_id,
    full_name,
    email,
    role,
    active,
    created_by,
    updated_by
  )
  values (
    current_user_id,
    created_organization_id,
    coalesce(nullif(trim(owner_full_name), ''), split_part(normalized_email, '@', 1), 'Owner'),
    normalized_email,
    'owner'::public.user_role,
    true,
    current_user_id,
    current_user_id
  );

  update public.organizations
  set created_by = current_user_id,
      updated_by = current_user_id
  where id = created_organization_id;

  organization_id := created_organization_id;
  profile_id := current_user_id;
  return next;
end;
$$;

grant execute on function public.bootstrap_first_organization(text, text, text, text) to authenticated;
