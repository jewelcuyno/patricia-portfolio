import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [
  migration,
  publicPage,
  editor,
  editorPage,
  api,
  client,
  completionMigration,
] = await Promise.all([
  read("../supabase/migrations/202608270001_initial_portfolio.sql"),
  read("../app/page.tsx"),
  read("../app/[editorRoute]/AdminClient.tsx"),
  read("../app/[editorRoute]/page.tsx"),
  read("../app/api/portfolio-editor/route.ts"),
  read("../lib/editor-client.ts"),
  read("../supabase/migrations/202608270002_complete_editor.sql"),
]);
test("published portfolio remains publicly readable while drafts stay private", () => {
  assert.match(migration, /public_projects_read[\s\S]*status='published'/);
  assert.match(publicPage, /projects\.length\s*>\s*0/);
});
test("anonymous database and storage writes are not granted", () => {
  assert.doesNotMatch(
    migration,
    /for\s+(insert|update|delete|all)\s+to\s+anon/i,
  );
  assert.doesNotMatch(migration, /media_editor_(insert|update|delete)/);
  assert.match(migration, /media_public_read[\s\S]*for select/);
});
test("private editor renders directly with no login or auth client", () => {
  assert.match(editorPage, /AdminClient editorSecret/);
  assert.doesNotMatch(
    editor,
    /signInWithOtp|onAuthStateChange|magic link|Sign out|Email address/,
  );
});
test("old admin route is absent and private route is excluded from indexing", () => {
  assert.match(editorPage, /index:\s*false/);
  assert.match(editorPage, /follow:\s*false/);
  assert.match(editorPage, /noarchive:\s*true/);
  assert.match(editorPage, /notFound\(\)/);
});
test("public portfolio never links or advertises the editor route", () => {
  assert.doesNotMatch(
    publicPage,
    /v7q4m9x2|portfolio-editor|editorRoute|\/admin/,
  );
});
test("server write layer requires the route secret and validates resources and fields", () => {
  assert.match(api, /x-editor-secret/);
  assert.match(api, /PORTFOLIO_EDITOR_SECRET/);
  assert.match(api, /Unknown resource/);
  assert.match(api, /clean\(resource,\s*data\)/);
  assert.match(api, /allowedFilters/);
});
test("editor mutations use controlled server API", () => {
  assert.match(client, /fetch\(["']\/api\/portfolio-editor["']/);
  assert.match(client, /x-editor-secret/);
  assert.doesNotMatch(editor, /createClient|SUPABASE_SERVICE_ROLE_KEY/);
});
test("media uploads use controlled server layer with type and size validation", () => {
  assert.match(api, /multipart\/form-data/);
  assert.match(api, /allowedMime/);
  assert.match(api, /15\s*\*\s*1024\s*\*\s*1024/);
  assert.match(client, /FormData/);
});
test("service-role credentials are server-only", () => {
  assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(client, /SERVICE_ROLE/);
  assert.doesNotMatch(editor, /SERVICE_ROLE/);
  assert.doesNotMatch(publicPage, /SERVICE_ROLE/);
});
test("public page filters empty collections and uses fixed automatic visibility", () => {
  for (const name of ["projects", "experience", "skills"])
    assert.match(publicPage, new RegExp(`${name}\\.length\\s*>\\s*0`));
  assert.match(publicPage, /enabled\(["']projects["']\)/);
  assert.match(publicPage, /Boolean\(embeddedCv\)/);
});
test("all completed editor workflows remain present", () => {
  for (const name of [
    "Education",
    "Experience",
    "Certifications",
    "Awards",
    "Organizations",
  ])
    assert.match(editor, new RegExp(`${name}.*table`, "s"));
  for (const type of [
    "text",
    "heading",
    "image",
    "gallery",
    "quote",
    "video",
    "document",
  ])
    assert.match(editor, new RegExp(`["']${type}["']`));
  for (const feature of [
    /SkillsManager/,
    /ContactEditor/,
    /MediaLibrary/,
    /OrderButtons/,
    /archived_at/,
    /PreviewModal/,
    /beforeunload/,
    /SettingsEditor/,
  ])
    assert.match(editor, feature);
  assert.match(completionMigration, /resume_visible/);
});
