-- Replace uploaded niche resumes with generated, checklist-configured niche CVs.
-- The guard also makes a rerun safe if a SQL client committed the rename before a later failure.
do $$ begin
  if to_regclass('public.track_cvs') is null and to_regclass('public.track_resumes') is not null then
    alter table public.track_resumes rename to track_cvs;
  end if;
  if to_regclass('public.track_cvs') is null then
    raise exception 'Expected public.track_resumes or public.track_cvs to exist';
  end if;
end $$;

-- Policies must be removed before dropping legacy columns referenced by their USING clauses.
drop policy if exists public_track_resumes_read on public.track_cvs;
drop policy if exists public_track_cvs_read on public.track_cvs;

alter table public.track_cvs
  add column if not exists enabled boolean not null default false,
  add column if not exists preview_enabled boolean not null default true,
  add column if not exists download_enabled boolean not null default true,
  add column if not exists filename_label text,
  add column if not exists enabled_sections text[] not null default array['contact','experience','education']::text[],
  add column if not exists section_order text[] not null default array['contact','summary','experience','education','skills','projects','certifications','awards','organizations']::text[];

-- Legacy uploaded-resume visibility does not auto-publish the new generated CV.
update public.track_cvs set display_label='CV' where display_label in ('Résumé','Resume');

alter table public.track_cvs
  alter column display_label set default 'CV',
  drop column if exists public_url,
  drop column if exists storage_path,
  drop column if exists visible;

alter table public.track_cvs drop constraint if exists track_cvs_enabled_sections_valid;
alter table public.track_cvs drop constraint if exists track_cvs_section_order_valid;
alter table public.track_cvs
  add constraint track_cvs_enabled_sections_valid check (
    enabled_sections <@ array['contact','summary','experience','education','skills','projects','certifications','awards','organizations']::text[]
  ),
  add constraint track_cvs_section_order_valid check (
    section_order <@ array['contact','summary','experience','education','skills','projects','certifications','awards','organizations']::text[]
    and cardinality(section_order)=9
  );

create policy public_track_cvs_read on public.track_cvs for select to anon,authenticated using(
  enabled and exists(
    select 1 from public.portfolio_tracks t
    where t.id=track_id and t.active and t.configured
  )
);

drop trigger if exists touch_track_resumes on public.track_cvs;
create trigger touch_track_cvs before update on public.track_cvs
for each row execute function public.touch_updated_at();
