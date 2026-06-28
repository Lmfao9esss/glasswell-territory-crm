create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('bug', 'idea', 'confusing', 'urgent')),
  page_area text not null,
  description text not null,
  screenshot_note text,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_organization_created_idx
  on public.feedback (organization_id, created_at desc);

alter table public.feedback enable row level security;

create policy "members can create feedback"
  on public.feedback for insert
  with check (public.is_org_member(organization_id));

create policy "owners and managers can read feedback"
  on public.feedback for select
  using (
    public.has_org_role(
      organization_id,
      array['owner'::public.user_role, 'manager'::public.user_role]
    )
  );

create policy "owners can delete feedback"
  on public.feedback for delete
  using (public.has_org_role(organization_id, array['owner'::public.user_role]));
