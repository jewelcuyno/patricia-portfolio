export type SiteProfile = {
  id?: string; name: string;
  location: string | null; availability: string | null; contact_email: string | null;
  short_bio: string | null; long_bio: string | null;
  cta_label: string | null; cta_destination: string | null;
  photo_url: string | null; photo_alt: string | null; photo_position: string; site_title: string | null;
  site_description: string | null; og_image_url: string | null;
};
export type Project = { id:string; portfolio_track_id:string|null; title:string; slug:string; category:string|null; summary:string|null; description:string|null; role:string|null; organization:string|null; date_label:string|null; cover_url:string|null; cover_alt:string|null; video_url:string|null; external_url:string|null; document_url:string|null; tags:string[]; content_blocks:ContentBlock[]; featured:boolean; status:'draft'|'published'; display_order:number; archived_at:string|null; };
export type ContentBlock = { id:string; type:'text'|'heading'|'image'|'gallery'|'video'|'document'|'quote'|'details'|'links'; data:Record<string, unknown> };
export type CollectionItem = { id:string; title?:string; name?:string; institution?:string; organization?:string; subtitle?:string; description?:string; status?:string; published?:boolean; display_order:number; [key:string]:unknown };
export type MediaItem = { id:string; storage_path:string; public_url:string; filename:string; mime_type:string; size_bytes:number; alt_text:string|null; caption:string|null; archived_at:string|null; created_at:string };
export type PortfolioTrack = { id:string; slot_number:number; name:string|null; selector_label:string|null; slug:string|null; description:string|null; display_order:number; active:boolean; configured:boolean; is_default:boolean };
export type TrackContent = { id?:string; track_id:string; headline:string|null; subheadline:string|null; introduction:string|null; career_interests:string|null; contact_cta:string|null; section_order:string[]; section_visibility:Record<string,boolean>; seo_title:string|null; seo_description:string|null; og_title:string|null; og_description:string|null; og_image_url:string|null };
export type CvSectionKey = 'contact'|'summary'|'experience'|'education'|'skills'|'projects'|'certifications'|'awards'|'organizations';
export type TrackCv = { id?:string; track_id:string; updated_at?:string };
