begin;

alter table public.site_profile add column if not exists cta_label text;
alter table public.site_profile add column if not exists cta_destination text;

-- Prefer the default niche's current CTA, then the first configured niche.
update public.site_profile p set
  cta_label = coalesce(p.cta_label, (
    select tc.cta_label from public.track_content tc
    join public.portfolio_tracks t on t.id = tc.track_id
    where nullif(trim(tc.cta_label), '') is not null
    order by t.is_default desc, t.display_order, t.slot_number limit 1
  )),
  cta_destination = coalesce(p.cta_destination, (
    select tc.cta_destination from public.track_content tc
    join public.portfolio_tracks t on t.id = tc.track_id
    where nullif(trim(tc.cta_destination), '') is not null
    order by t.is_default desc, t.display_order, t.slot_number limit 1
  ));

-- Keep a private migration audit of every former niche CTA before retiring it.
create table if not exists public.migration_007_track_cta_backup (
  track_id uuid primary key references public.portfolio_tracks(id) on delete cascade,
  cta_label text,
  cta_destination text,
  archived_at timestamptz not null default now()
);
alter table public.migration_007_track_cta_backup enable row level security;
insert into public.migration_007_track_cta_backup (track_id, cta_label, cta_destination)
select track_id, cta_label, cta_destination from public.track_content
where cta_label is not null or cta_destination is not null
on conflict (track_id) do update set
  cta_label=excluded.cta_label,
  cta_destination=excluded.cta_destination,
  archived_at=now();

alter table public.track_content drop column if exists cta_label;
alter table public.track_content drop column if exists cta_destination;

-- CVs now derive automatically from five fixed sections. Retain one minimal
-- row per track for future extension while removing obsolete owner controls.
drop policy if exists public_track_cvs_read on public.track_cvs;
alter table public.track_cvs drop constraint if exists track_cvs_enabled_sections_valid;
alter table public.track_cvs drop constraint if exists track_cvs_section_order_valid;
alter table public.track_cvs drop column if exists enabled;
alter table public.track_cvs drop column if exists preview_enabled;
alter table public.track_cvs drop column if exists download_enabled;
alter table public.track_cvs drop column if exists display_label;
alter table public.track_cvs drop column if exists filename_label;
alter table public.track_cvs drop column if exists enabled_sections;
alter table public.track_cvs drop column if exists section_order;
create policy public_track_cvs_read on public.track_cvs for select to anon,authenticated using(
  exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured)
);

commit;
