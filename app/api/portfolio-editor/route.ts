/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import {normalizeExperiencePayload} from "@/lib/experience";

const fields: Record<string, string[]> = {
  site_profile: [
    "id",
    "name",
    "location",
    "availability",
    "contact_email",
    "short_bio",
    "long_bio",
    "cta_label",
    "cta_destination",
    "photo_url",
    "photo_alt",
    "photo_position",
    "site_title",
    "site_description",
    "og_image_url",
  ],
  projects: [
    "portfolio_track_id",
    "title",
    "slug",
    "category",
    "summary",
    "description",
    "role",
    "organization",
    "date_label",
    "cover_url",
    "cover_alt",
    "video_url",
    "external_url",
    "document_url",
    "tags",
    "content_blocks",
    "featured",
    "status",
    "display_order",
    "archived_at",
  ],
  project_media: [
    "project_id",
    "media_id",
    "url",
    "media_type",
    "alt_text",
    "caption",
    "display_order",
  ],
  media: [
    "storage_path",
    "public_url",
    "filename",
    "mime_type",
    "size_bytes",
    "alt_text",
    "caption",
    "archived_at",
  ],
  education: [
    "institution",
    "program",
    "status",
    "start_label",
    "end_label",
    "activities",
    "honors",
    "description",
    "display_order",
    "published",
    "archived_at",
  ],
  experience: [
    "organization",
    "start_date",
    "end_date",
    "is_current",
    "date_label",
    "location",
    "description",
    "display_order",
    "published",
    "archived_at",
  ],
  skill_groups: ["portfolio_track_id", "name", "display_order", "published", "archived_at"],
  skills: ["group_id", "name", "display_order", "published", "archived_at"],
  certifications: [
    "name",
    "issuer",
    "date_label",
    "credential_url",
    "document_url",
    "description",
    "display_order",
    "published",
    "archived_at",
  ],
  awards: [
    "name",
    "issuer",
    "date_label",
    "description",
    "media_url",
    "display_order",
    "published",
    "archived_at",
  ],
  organizations: [
    "name",
    "role",
    "date_label",
    "description",
    "display_order",
    "published",
    "archived_at",
  ],
  social_links: [
    "platform",
    "label",
    "url",
    "display_order",
    "published",
    "archived_at",
  ],
  site_sections: ["section_key", "visible", "display_order", "settings"],
  portfolio_tracks: ["slot_number","name","selector_label","slug","description","display_order","active","configured","is_default"],
  track_content: ["track_id","headline","subheadline","introduction","career_interests","contact_cta","section_order","section_visibility","seo_title","seo_description","og_title","og_description","og_image_url"],
  track_cvs: ["track_id"],
  track_experience:["track_id","experience_id","included","role_title","highlights","display_order"],
  track_certifications:["track_id","certification_id","included","display_order"],
  track_awards:["track_id","award_id","included","display_order"],
  track_organizations:["track_id","organization_id","included","display_order"],
};
const allowedFilters = new Set([
  "id",
  "archived_at",
  "status",
  "published",
  "group_id",
  "project_id",
  "track_id",
  "portfolio_track_id",
]);
const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
  "video/mp4",
]);
function authorized(request: Request) {
  const secret =
    process.env.PORTFOLIO_EDITOR_SECRET ||
    "v7q4m9x2k8r5p3n6t1w0f4h7c9d2s8j5";
  return Boolean(secret && request.headers.get("x-editor-secret") === secret);
}
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Server Supabase configuration is incomplete");
  return createClient(url, key);
}
function clean(resource: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid record payload");
  const out: Record<string, unknown> = {};
  for (const key of fields[resource])
    if (Object.prototype.hasOwnProperty.call(input, key))
      out[key] = (input as Record<string, unknown>)[key];
  if(resource==="experience"){
    const normalized=normalizeExperiencePayload(out,String(out.portfolio_track_id||""),Number(out.display_order||0));
    for(const key of fields.experience)if(Object.prototype.hasOwnProperty.call(normalized,key))out[key]=normalized[key];
  }
  return out;
}
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const type = request.headers.get("content-type") || "";
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file"),
        bucket = form.get("bucket"),
        path = form.get("path");
      if (
        !(file instanceof File) ||
        bucket !== "portfolio-media" ||
        typeof path !== "string" ||
        !allowedMime.has(file.type) ||
        file.size < 1 ||
        file.size > 15 * 1024 * 1024
      )
        return Response.json({ error: "Invalid upload" }, { status: 400 });
      if (!/^(library|profile|projects|resume)\/[a-zA-Z0-9._-]+$/.test(path))
        return Response.json(
          { error: "Invalid storage path" },
          { status: 400 },
        );
      const db = client();
      const result = await db.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw result.error;
      return Response.json({ data: result.data });
    }
    const body = (await request.json()) as Record<string, any>;
    const { resource, action, data, filters = [], order, single } = body;
    if (typeof resource !== "string" || !fields[resource])
      return Response.json({ error: "Unknown resource" }, { status: 400 });
    if (!["select", "insert", "update", "upsert", "delete"].includes(action))
      return Response.json({ error: "Unknown action" }, { status: 400 });
    const db = client();
    let query: any;
    if (action === "select")
      query = db
        .from(resource)
        .select(resource === "skill_groups" ? "*, skills(*)" : "*");
    else if (action === "insert")
      query = db.from(resource).insert(clean(resource, data)).select();
    else if (action === "update")
      query = db.from(resource).update(clean(resource, data)).select();
    else if (action === "upsert")
      query = db.from(resource).upsert(clean(resource, data)).select();
    else query = db.from(resource).delete().select();
    for (const f of filters) {
      if (!f || !allowedFilters.has(f.column) || !["eq", "is"].includes(f.op))
        return Response.json({ error: "Invalid filter" }, { status: 400 });
      query =
        f.op === "eq"
          ? query.eq(f.column, f.value)
          : query.is(f.column, f.value);
    }
    if (order && fields[resource].includes(order.column))
      query = query.order(order.column, {
        ascending: order.ascending !== false,
      });
    if (single) query = query.single();
    const result = await query;
    if (result.error) throw result.error;
    return Response.json({ data: result.data });
  } catch (error) {
    const message=error instanceof Error&&/date|invalid input syntax/i.test(error.message)
      ? "A date value is invalid. Use the date fields or leave them blank."
      : "The editor could not save that change. Check required fields and try again.";
    return Response.json({error:message},{status:400});
  }
}
