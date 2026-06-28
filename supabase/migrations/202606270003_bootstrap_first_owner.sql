create policy "signed in users can create first owner profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role = 'owner'::public.user_role
    and not exists (
      select 1
      from public.profiles existing
      where existing.organization_id = profiles.organization_id
    )
  );
