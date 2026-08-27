-- Global profile and canonical shared records with per-niche presentation mappings.
-- Additive after migrations 001-005; preserves all existing records.

alter table public.site_profile add column if not exists short_bio text;
alter table public.site_profile add column if not exists long_bio text;

-- Preserve every pre-006 niche bio for manual review while the live model moves
-- to one global bio. This is a private migration archive, not portfolio content.
create table if not exists public.migration_006_track_bio_backup (
  track_id uuid primary key references public.portfolio_tracks(id) on delete cascade,
  short_bio text,
  long_bio text,
  archived_at timestamptz not null default now()
);
alter table public.migration_006_track_bio_backup enable row level security;
insert into public.migration_006_track_bio_backup (track_id, short_bio, long_bio)
select track_id, short_bio, long_bio
from public.track_content
where short_bio is not null or long_bio is not null
on conflict (track_id) do update set
  short_bio=excluded.short_bio,
  long_bio=excluded.long_bio,
  archived_at=now();

update public.site_profile p set
  short_bio=coalesce(p.short_bio,(select tc.short_bio from public.track_content tc join public.portfolio_tracks t on t.id=tc.track_id where tc.short_bio is not null order by t.is_default desc,t.display_order limit 1)),
  long_bio=coalesce(p.long_bio,(select tc.long_bio from public.track_content tc join public.portfolio_tracks t on t.id=tc.track_id where tc.long_bio is not null order by t.is_default desc,t.display_order limit 1));
alter table public.track_content drop column if exists short_bio;
alter table public.track_content drop column if exists long_bio;

-- Migration 004 policies reference portfolio_track_id; remove them before dropping that column.
drop policy if exists public_experience_read on public.experience;
drop policy if exists public_certifications_read on public.certifications;
drop policy if exists public_awards_read on public.awards;
drop policy if exists public_organizations_read on public.organizations;

create table if not exists public.track_experience (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.portfolio_tracks(id) on delete cascade,
  experience_id uuid not null references public.experience(id) on delete cascade,
  included boolean not null default false,
  role_title text,
  highlights text[] not null default '{}',
  display_order integer not null default 0,
  unique(track_id,experience_id)
);
insert into public.track_experience(track_id,experience_id,included,role_title,highlights,display_order)
select portfolio_track_id,id,published,position,coalesce(highlights,'{}'),display_order from public.experience where portfolio_track_id is not null
on conflict(track_id,experience_id) do nothing;
alter table public.experience drop column if exists portfolio_track_id;
alter table public.experience drop column if exists position;
alter table public.experience drop column if exists experience_type;
alter table public.experience drop column if exists highlights;

create table if not exists public.track_certifications (
  id uuid primary key default gen_random_uuid(), track_id uuid not null references public.portfolio_tracks(id) on delete cascade,
  certification_id uuid not null references public.certifications(id) on delete cascade, included boolean not null default false,
  display_order integer not null default 0, unique(track_id,certification_id)
);
insert into public.track_certifications(track_id,certification_id,included,display_order)
select portfolio_track_id,id,published,display_order from public.certifications where portfolio_track_id is not null on conflict(track_id,certification_id) do nothing;
alter table public.certifications drop column if exists portfolio_track_id;

create table if not exists public.track_awards (
  id uuid primary key default gen_random_uuid(), track_id uuid not null references public.portfolio_tracks(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade, included boolean not null default false,
  display_order integer not null default 0, unique(track_id,award_id)
);
insert into public.track_awards(track_id,award_id,included,display_order)
select portfolio_track_id,id,published,display_order from public.awards where portfolio_track_id is not null on conflict(track_id,award_id) do nothing;
alter table public.awards drop column if exists portfolio_track_id;

create table if not exists public.track_organizations (
  id uuid primary key default gen_random_uuid(), track_id uuid not null references public.portfolio_tracks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, included boolean not null default false,
  display_order integer not null default 0, unique(track_id,organization_id)
);
insert into public.track_organizations(track_id,organization_id,included,display_order)
select portfolio_track_id,id,published,display_order from public.organizations where portfolio_track_id is not null on conflict(track_id,organization_id) do nothing;
alter table public.organizations drop column if exists portfolio_track_id;

alter table public.track_experience enable row level security;
alter table public.track_certifications enable row level security;
alter table public.track_awards enable row level security;
alter table public.track_organizations enable row level security;

create policy public_experience_read on public.experience for select to anon,authenticated using(published and archived_at is null and exists(
  select 1 from public.track_experience m join public.portfolio_tracks t on t.id=m.track_id where m.experience_id=experience.id and m.included and t.active and t.configured
));
create policy public_certifications_read on public.certifications for select to anon,authenticated using(published and archived_at is null and exists(
  select 1 from public.track_certifications m join public.portfolio_tracks t on t.id=m.track_id where m.certification_id=certifications.id and m.included and t.active and t.configured
));
create policy public_awards_read on public.awards for select to anon,authenticated using(published and archived_at is null and exists(
  select 1 from public.track_awards m join public.portfolio_tracks t on t.id=m.track_id where m.award_id=awards.id and m.included and t.active and t.configured
));
create policy public_organizations_read on public.organizations for select to anon,authenticated using(published and archived_at is null and exists(
  select 1 from public.track_organizations m join public.portfolio_tracks t on t.id=m.track_id where m.organization_id=organizations.id and m.included and t.active and t.configured
));

create policy public_track_experience_read on public.track_experience for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured));
create policy public_track_certifications_read on public.track_certifications for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured));
create policy public_track_awards_read on public.track_awards for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured));
create policy public_track_organizations_read on public.track_organizations for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured));
