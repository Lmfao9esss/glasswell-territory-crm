drop policy if exists "members can update assigned leads" on public.leads;

create policy "members can update assigned leads"
  on public.leads for update
  using (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or (
      public.is_org_member(organization_id)
      and (
        assigned_employee_id = auth.uid()
        or created_by = auth.uid()
      )
    )
  )
  with check (
    public.has_org_role(organization_id, array['owner'::public.user_role, 'manager'::public.user_role])
    or (
      public.is_org_member(organization_id)
      and (
        assigned_employee_id = auth.uid()
        or created_by = auth.uid()
      )
    )
  );
