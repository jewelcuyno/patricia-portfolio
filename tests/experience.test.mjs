import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeExperiencePayload,setExperienceVisibility} from "../lib/experience.js";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");
const [editor,api,content,migration,page]=await Promise.all([read("../app/[editorRoute]/AdminClient.tsx"),read("../app/api/portfolio-editor/route.ts"),read("../lib/content.ts"),read("../supabase/migrations/202608270005_configurable_dynamic_cvs.sql"),read("../app/page.tsx")]);

test("Experience insert payload preserves direct niche ownership and nullable dates",()=>{
  const payload=normalizeExperiencePayload({organization:"QA Org",position:"QA Role",start_date:"",end_date:"",published:false,is_current:false,highlights:["One",""]},"niche-a",4);
  assert.equal(payload.portfolio_track_id,"niche-a");assert.equal(payload.start_date,null);assert.equal(payload.end_date,null);assert.deepEqual(payload.highlights,["One"]);assert.equal(payload.display_order,4);
});
test("Experience update keeps ownership and clears an end date for current employment",()=>{
  const payload=normalizeExperiencePayload({id:"record",organization:"QA Org",position:"QA Role",start_date:"2024-01-01",end_date:"2025-01-01",published:true,is_current:true},"niche-a");
  assert.equal(payload.id,"record");assert.equal(payload.portfolio_track_id,"niche-a");assert.equal(payload.end_date,null);assert.equal(payload.is_current,true);assert.equal(payload.published,true);
});
test("public visibility toggles false to true to false independently of current employment",()=>{
  const base={published:false,is_current:true};const shown=setExperienceVisibility(base,true);const hidden=setExperienceVisibility(shown,false);
  assert.equal(shown.published,true);assert.equal(shown.is_current,true);assert.equal(hidden.published,false);assert.equal(hidden.is_current,true);
});
test("global Experience editor omits role highlights and type while mappings own presentation",()=>{
  assert.doesNotMatch(editor,/\["experience_type", "Type"/);assert.match(editor,/TrackMappingManager kind="Experience"/);assert.match(editor,/role_title/);assert.match(editor,/Highlights \(one per line\)/);
  assert.match(editor,/Visible on portfolio/);assert.match(editor,/if\(error\).*return false/);assert.match(api,/normalizeExperiencePayload/);
});
test("public Experience resolves selected mappings and niche presentation",()=>{
  assert.match(content,/track_experience[^\n]*selectedTrack\.id[^\n]*included[^\n]*true/);
  assert.match(content,/position:m\.role_title/);assert.match(content,/highlights:m\.highlights/);
});
test("public Experience renders ordered semantic highlights only when present",()=>{
  assert.match(page,/Array\.isArray\(x\.highlights\)&&x\.highlights\.length>0&&<ul className="experience-highlights">/);
  assert.match(page,/x\.highlights\.map\(\(highlight:string,index:number\)/);
  assert.match(page,/x\.location&&/);assert.match(page,/x\.is_current\?"Present"/);
});
test("migration 005 removes dependent policies before legacy columns and is rerunnable",()=>{
  const policy=migration.indexOf("drop policy if exists public_track_resumes_read");const columns=migration.indexOf("drop column if exists visible");
  assert.ok(policy>-1&&columns>-1&&policy<columns);assert.match(migration,/to_regclass\('public\.track_cvs'\)/);assert.match(migration,/drop constraint if exists track_cvs_enabled_sections_valid/);assert.doesNotMatch(migration,/cascade/i);
});
