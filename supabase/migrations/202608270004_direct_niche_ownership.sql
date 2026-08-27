-- Correct the portfolio model: six targeted niches, no General Overview.
-- Identity/photo, education, contact/socials, and media remain global.

-- Remove the obsolete seeded General Overview and its dependent configuration.
delete from public.portfolio_tracks where is_general;

alter table public.portfolio_tracks add column if not exists slot_number integer;
alter table public.portfolio_tracks add column if not exists configured boolean not null default false;
alter table public.portfolio_tracks alter column name drop not null;
alter table public.portfolio_tracks alter column selector_label drop not null;
alter table public.portfolio_tracks alter column slug drop not null;
alter table public.portfolio_tracks drop column if exists is_general;
alter table public.portfolio_tracks add constraint portfolio_tracks_slot_range check(slot_number between 1 and 6);
alter table public.portfolio_tracks add constraint portfolio_tracks_configured_fields check(
  not configured or (name is not null and selector_label is not null and slug is not null)
);
alter table public.portfolio_tracks add constraint portfolio_tracks_default_ready check(
  not is_default or (configured and active)
);
create unique index portfolio_tracks_slot_unique on public.portfolio_tracks(slot_number);

with ordered as (
  select id,row_number() over(order by display_order,created_at,id) as slot
  from public.portfolio_tracks
)
update public.portfolio_tracks t set slot_number=ordered.slot
from ordered where ordered.id=t.id and ordered.slot<=6;
delete from public.portfolio_tracks where slot_number is null;
insert into public.portfolio_tracks(slot_number,display_order,active,configured,is_default)
select slot,slot,false,false,false from generate_series(1,6) slot
on conflict(slot_number) do nothing;

create or replace function public.prevent_seventh_portfolio_track()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.portfolio_tracks) >= 6 then
    raise exception 'The portfolio supports exactly six niche slots';
  end if;
  return new;
end $$;
drop trigger if exists prevent_seventh_portfolio_track on public.portfolio_tracks;
create trigger prevent_seventh_portfolio_track before insert on public.portfolio_tracks
for each row execute function public.prevent_seventh_portfolio_track();

-- Direct ownership replaces track-to-record mapping tables.
alter table public.projects add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;
alter table public.experience add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;
alter table public.skill_groups add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;
alter table public.certifications add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;
alter table public.awards add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;
alter table public.organizations add column if not exists portfolio_track_id uuid references public.portfolio_tracks(id) on delete cascade;

-- Preserve any early mapped records by assigning each record to its first mapping.
update public.projects p set portfolio_track_id=x.track_id from (
  select distinct on(project_id) project_id,track_id from public.track_projects order by project_id,display_order,track_id
) x where p.id=x.project_id and p.portfolio_track_id is null;
update public.experience e set portfolio_track_id=x.track_id from (
  select distinct on(experience_id) experience_id,track_id from public.track_experience order by experience_id,display_order,track_id
) x where e.id=x.experience_id and e.portfolio_track_id is null;
update public.skill_groups g set portfolio_track_id=x.track_id from (
  select distinct on(group_id) group_id,track_id from public.track_skill_groups order by group_id,display_order,track_id
) x where g.id=x.group_id and g.portfolio_track_id is null;
update public.certifications c set portfolio_track_id=x.track_id from (
  select distinct on(certification_id) certification_id,track_id from public.track_certifications order by certification_id,display_order,track_id
) x where c.id=x.certification_id and c.portfolio_track_id is null;
update public.awards a set portfolio_track_id=x.track_id from (
  select distinct on(award_id) award_id,track_id from public.track_awards order by award_id,display_order,track_id
) x where a.id=x.award_id and a.portfolio_track_id is null;
update public.organizations o set portfolio_track_id=x.track_id from (
  select distinct on(organization_id) organization_id,track_id from public.track_organizations order by organization_id,display_order,track_id
) x where o.id=x.organization_id and o.portfolio_track_id is null;

drop table if exists public.track_projects;
drop table if exists public.track_experience;
drop table if exists public.track_skills;
drop table if exists public.track_skill_groups;
drop table if exists public.track_certifications;
drop table if exists public.track_awards;
drop table if exists public.track_organizations;
drop table if exists public.track_education;

-- The professional photo is global and stays on site_profile.
alter table public.track_content drop column if exists photo_url;
alter table public.site_profile drop column if exists headline;
alter table public.site_profile drop column if exists intro;
alter table public.site_profile drop column if exists short_bio;
alter table public.site_profile drop column if exists long_bio;
alter table public.site_profile drop column if exists career_interests;
alter table public.site_profile drop column if exists cta_text;
alter table public.site_profile drop column if exists contact_cta;
alter table public.site_profile drop column if exists resume_url;
alter table public.site_profile drop column if exists resume_title;
alter table public.site_profile drop column if exists resume_description;
alter table public.site_profile drop column if exists resume_visible;

-- Project slugs are unique within a niche; the route includes the niche slug.
alter table public.projects drop constraint if exists projects_slug_key;
create unique index projects_track_slug_unique on public.projects(portfolio_track_id,slug)
where portfolio_track_id is not null;

-- Replace permissive legacy read policies with ownership-aware policies.
drop policy if exists public_projects_read on public.projects;
create policy public_projects_read on public.projects for select to anon,authenticated using(
  status='published' and archived_at is null and exists(
    select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured
  )
);
drop policy if exists public_experience_read on public.experience;
create policy public_experience_read on public.experience for select to anon,authenticated using(
  published and archived_at is null and exists(
    select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured
  )
);
drop policy if exists public_skill_groups_read on public.skill_groups;
create policy public_skill_groups_read on public.skill_groups for select to anon,authenticated using(
  published and archived_at is null and exists(
    select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured
  )
);
drop policy if exists public_skills_read on public.skills;
create policy public_skills_read on public.skills for select to anon,authenticated using(
  published and archived_at is null and exists(
    select 1 from public.skill_groups g join public.portfolio_tracks t on t.id=g.portfolio_track_id
    where g.id=group_id and g.published and g.archived_at is null and t.active and t.configured
  )
);
drop policy if exists public_certifications_read on public.certifications;
create policy public_certifications_read on public.certifications for select to anon,authenticated using(
  published and archived_at is null and exists(select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured)
);
drop policy if exists public_awards_read on public.awards;
create policy public_awards_read on public.awards for select to anon,authenticated using(
  published and archived_at is null and exists(select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured)
);
drop policy if exists public_organizations_read on public.organizations;
create policy public_organizations_read on public.organizations for select to anon,authenticated using(
  published and archived_at is null and exists(select 1 from public.portfolio_tracks t where t.id=portfolio_track_id and t.active and t.configured)
);

drop policy if exists public_active_tracks_read on public.portfolio_tracks;
create policy public_active_tracks_read on public.portfolio_tracks for select to anon,authenticated using(active and configured);
drop policy if exists public_track_content_read on public.track_content;
create policy public_track_content_read on public.track_content for select to anon,authenticated using(
  exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured)
);
drop policy if exists public_track_resumes_read on public.track_resumes;
create policy public_track_resumes_read on public.track_resumes for select to anon,authenticated using(
  visible and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active and t.configured)
);
