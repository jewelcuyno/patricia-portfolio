-- Additive multi-niche architecture. Run after 202608270002_complete_editor.sql.
create table public.portfolio_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  selector_label text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  display_order integer not null default 0,
  active boolean not null default false,
  is_default boolean not null default false,
  is_general boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index portfolio_tracks_one_default on public.portfolio_tracks (is_default) where is_default;
create unique index portfolio_tracks_one_general on public.portfolio_tracks (is_general) where is_general;

create table public.track_content (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null unique references public.portfolio_tracks on delete cascade,
  headline text,
  subheadline text,
  introduction text,
  short_bio text,
  long_bio text,
  career_interests text,
  cta_label text,
  cta_destination text,
  contact_cta text,
  photo_url text,
  section_order text[] not null default array['about','projects','experience','education','skills','certifications','awards','organizations','contact'],
  section_visibility jsonb not null default '{}',
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_url text,
  updated_at timestamptz not null default now()
);

create table public.track_resumes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null unique references public.portfolio_tracks on delete cascade,
  public_url text,
  storage_path text,
  display_label text not null default 'Résumé',
  visible boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.track_projects (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  included boolean not null default true,
  featured boolean not null default false,
  display_order integer not null default 0,
  targeted_summary text,
  primary key(track_id, project_id)
);
create table public.track_experience (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  experience_id uuid not null references public.experience on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  emphasis text,
  primary key(track_id, experience_id)
);
create table public.track_skill_groups (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  group_id uuid not null references public.skill_groups on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  primary key(track_id, group_id)
);
create table public.track_skills (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  skill_id uuid not null references public.skills on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  priority integer not null default 0,
  primary key(track_id, skill_id)
);
create table public.track_education (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  education_id uuid not null references public.education on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  emphasis text,
  primary key(track_id, education_id)
);
create table public.track_certifications (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  certification_id uuid not null references public.certifications on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  primary key(track_id, certification_id)
);
create table public.track_awards (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  award_id uuid not null references public.awards on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  primary key(track_id, award_id)
);
create table public.track_organizations (
  track_id uuid not null references public.portfolio_tracks on delete cascade,
  organization_id uuid not null references public.organizations on delete cascade,
  included boolean not null default true,
  display_order integer not null default 0,
  primary key(track_id, organization_id)
);

insert into public.portfolio_tracks(name,selector_label,slug,description,display_order,active,is_general)
values('General Overview','General Overview','general-overview','Broad portfolio presentation',-1,true,true);
insert into public.track_content(track_id) select id from public.portfolio_tracks where is_general on conflict do nothing;
insert into public.track_resumes(track_id) select id from public.portfolio_tracks where is_general on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['portfolio_tracks','track_content','track_resumes','track_projects','track_experience','track_skill_groups','track_skills','track_education','track_certifications','track_awards','track_organizations'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy public_active_tracks_read on public.portfolio_tracks for select to anon,authenticated using(active);
create policy public_track_content_read on public.track_content for select to anon,authenticated using(exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_resumes_read on public.track_resumes for select to anon,authenticated using(visible and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_projects_read on public.track_projects for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_experience_read on public.track_experience for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_skill_groups_read on public.track_skill_groups for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_skills_read on public.track_skills for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_education_read on public.track_education for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_certifications_read on public.track_certifications for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_awards_read on public.track_awards for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));
create policy public_track_organizations_read on public.track_organizations for select to anon,authenticated using(included and exists(select 1 from public.portfolio_tracks t where t.id=track_id and t.active));

create trigger touch_portfolio_tracks before update on public.portfolio_tracks for each row execute function public.touch_updated_at();
create trigger touch_track_content before update on public.track_content for each row execute function public.touch_updated_at();
create trigger touch_track_resumes before update on public.track_resumes for each row execute function public.touch_updated_at();
