import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(path)=>readFile(new URL(path,import.meta.url),"utf8");
const [migration,content,page,selector,project,editor,api,readme]=await Promise.all([
  read("../supabase/migrations/202608270004_direct_niche_ownership.sql"),
  read("../lib/content.ts"),read("../app/page.tsx"),read("../app/TrackSelector.tsx"),
  read("../app/work/[track]/[slug]/page.tsx"),read("../app/[editorRoute]/AdminClient.tsx"),
  read("../app/api/portfolio-editor/route.ts"),read("../README.md"),
]);
test("General Overview is removed from the corrected architecture",()=>{
  for(const source of [content,page,selector,editor,readme])assert.doesNotMatch(source,/General Overview/);
  assert.match(migration,/delete from public\.portfolio_tracks where is_general/);
  assert.match(migration,/drop column if exists is_general/);
});
test("exactly six owner-facing niche slots exist and a seventh is rejected",()=>{
  assert.match(migration,/generate_series\(1,6\)/);assert.match(migration,/prevent_seventh_portfolio_track/);
  assert.match(editor,/Six portfolio niches/);assert.doesNotMatch(editor,/Create niche/);
});
test("one active configured niche is the default and root resolves it",()=>{
  assert.match(migration,/portfolio_tracks_default_ready/);assert.match(editor,/x\.is_default/);
  assert.match(editor,/Choose another default niche/);assert.match(content,/find\(\(track\)=>track\.is_default\)/);
});
test("direct niche URLs and selector use query state",()=>{
  assert.match(page,/searchParams/);assert.match(selector,/\?track=/);assert.doesNotMatch(selector,/<option value="">/);
});
test("positioning stays niche-specific while metadata is automatic",()=>{
  for(const field of ["headline","subheadline","introduction","career_interests","contact_cta"])assert.match(api,new RegExp(field));
  assert.match(page,/trackContent\?\.headline/);assert.match(page,/generateMetadata/);assert.match(page,/p\.name.*niche/);
});
test("professional photo is one shared global record",()=>{
  assert.match(editor,/Shared across all six niches/);assert.match(page,/profile\.photo_url|view\.photo_url/);
  assert.match(migration,/track_content drop column if exists photo_url/);
  assert.doesNotMatch(api,/track_content[^\n]*photo_url/);
});
test("projects and complete case studies are directly niche-owned",()=>{
  assert.match(migration,/projects add column if not exists portfolio_track_id/);
  assert.match(content,/projects[^\n]*portfolio_track_id/);assert.match(editor,/portfolio_track_id:trackId/);
  assert.match(project,/portfolio_track_id/);assert.match(project,/content_blocks/);
});
test("project routes include the niche and cannot cross-resolve",()=>{
  assert.match(project,/\{track:string;slug:string\}/);assert.match(project,/eq\("slug",track\)/);
  assert.match(project,/eq\("portfolio_track_id",view\.id\)/);
});
test("projects and skills remain directly niche-owned",()=>{
  for(const table of ["projects","skill_groups"])assert.match(migration,new RegExp(`${table} add column if not exists portfolio_track_id`));
  assert.match(editor,/SkillsManager[^\n]*trackId/);
});
test("obsolete mapping tables are explicitly removed",()=>{
  for(const table of ["track_projects","track_experience","track_skill_groups","track_skills","track_certifications","track_awards","track_organizations","track_education"])assert.match(migration,new RegExp(`drop table if exists public\\.${table}`));
  assert.doesNotMatch(content,/track_projects|track_skills/);
});
test("automatic CV uses the selected niche and never falls back",()=>{
  assert.doesNotMatch(content,/track_cvs/);assert.match(page,/getCvPublicActions\(Boolean\(embeddedCv\)/);
  assert.doesNotMatch(page,/profile\.resume_|trackResume/);
});
test("Education and Contact remain shared",()=>{
  assert.match(content,/from\("education"\)/);assert.doesNotMatch(content,/education[^\n]*portfolio_track_id/);
  assert.match(content,/from\("social_links"\)/);assert.match(page,/profile\.contact_email/);
});
test("missing niche content never falls back to another niche",()=>{
  assert.match(content,/if\(!selectedTrack\)/);assert.match(content,/trackContent:null/);
  assert.match(page,/view\.intro&&<section className="professional-summary"/);
});
test("draft protections and anonymous write denial remain intact",()=>{
  assert.match(content,/eq\("status","published"\)/);assert.match(project,/eq\("status","published"\)/);
  assert.doesNotMatch(migration,/for\s+(insert|update|delete|all)\s+to\s+anon/i);
});
test("private controlled API manages every niche-owned resource",()=>{
  for(const resource of ["portfolio_tracks","track_content","track_cvs","projects","experience","skill_groups","skills","certifications","awards","organizations"])assert.match(api,new RegExp(resource));
  assert.match(api,/x-editor-secret/);
});
