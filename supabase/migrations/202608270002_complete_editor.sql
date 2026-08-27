alter table public.site_profile add column if not exists resume_visible boolean not null default true;
alter table public.site_profile add column if not exists updated_at timestamptz not null default now();
alter table public.projects add column if not exists updated_at timestamptz not null default now();
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists touch_site_profile on public.site_profile;
create trigger touch_site_profile before update on public.site_profile for each row execute function public.touch_updated_at();
drop trigger if exists touch_projects on public.projects;
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
insert into public.site_sections(section_key,visible,display_order) values('organizations',true,75),('resume',true,85) on conflict(section_key) do nothing;
