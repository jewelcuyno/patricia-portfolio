/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import type { PortfolioTrack, Project, SiteProfile, TrackContent } from "./types";

export const fallbackProfile: SiteProfile = {
  name:"Patricia Camille S. Morales",location:null,availability:null,contact_email:null,
  short_bio:null,long_bio:null,
  cta_label:null,cta_destination:null,
  photo_url:null,photo_alt:null,photo_position:"50% 50%",site_title:"Patricia Camille S. Morales",
  site_description:"Portfolio of Patricia Camille S. Morales.",og_image_url:null,
};
const fallbackEducation=[{id:"seed",institution:"Olivarez College",program:"Bachelor of Arts in Communication",status:"College Undergraduate",display_order:0}];
const emptyOwned={projects:[] as Project[],experience:[],skills:[],certifications:[],awards:[],organizations:[]};

export async function getPublicContent(trackSlug?:string){
  if(!supabase)return{profile:fallbackProfile,education:fallbackEducation,socials:[],sections:[],tracks:[] as PortfolioTrack[],selectedTrack:null as PortfolioTrack|null,trackContent:null as TrackContent|null,...emptyOwned};
  const [profile,education,socials,sections,trackResult]=await Promise.all([
    supabase.from("site_profile").select("*").single(),
    supabase.from("education").select("*").eq("published",true).is("archived_at",null).order("display_order"),
    supabase.from("social_links").select("*").eq("published",true).is("archived_at",null).order("display_order"),
    supabase.from("site_sections").select("*").eq("visible",true),
    supabase.from("portfolio_tracks").select("*").eq("active",true).eq("configured",true).order("display_order"),
  ]);
  const tracks=(trackResult.data??[]) as PortfolioTrack[];
  const requested=trackSlug?tracks.find((track)=>track.slug===trackSlug):null;
  const selectedTrack=requested??tracks.find((track)=>track.is_default)??tracks[0]??null;
  const shared={profile:profile.data??fallbackProfile,education:education.data??fallbackEducation,socials:socials.data??[],sections:sections.data??[],tracks,selectedTrack};
  if(!selectedTrack)return{...shared,trackContent:null,...emptyOwned};
  const [content,projects,experienceMap,skills,certificationMap,awardMap,organizationMap]=await Promise.all([
    supabase.from("track_content").select("*").eq("track_id",selectedTrack.id).single(),
    supabase.from("projects").select("*").eq("portfolio_track_id",selectedTrack.id).eq("status","published").is("archived_at",null).order("display_order"),
    supabase.from("track_experience").select("*, experience(*)").eq("track_id",selectedTrack.id).eq("included",true).order("display_order"),
    supabase.from("skill_groups").select("*, skills(*)").eq("portfolio_track_id",selectedTrack.id).eq("published",true).is("archived_at",null).order("display_order"),
    supabase.from("track_certifications").select("*, certification:certifications(*)").eq("track_id",selectedTrack.id).eq("included",true).order("display_order"),
    supabase.from("track_awards").select("*, award:awards(*)").eq("track_id",selectedTrack.id).eq("included",true).order("display_order"),
    supabase.from("track_organizations").select("*, organization:organizations(*)").eq("track_id",selectedTrack.id).eq("included",true).order("display_order"),
  ]);
  const experience=experienceMap.error?(await supabase.from("experience").select("*").eq("portfolio_track_id",selectedTrack.id).eq("published",true).is("archived_at",null).order("display_order")).data??[]:(experienceMap.data??[]).map((m:any)=>({...m.experience,position:m.role_title,highlights:m.highlights,display_order:m.display_order}));
  const certifications=certificationMap.error?(await supabase.from("certifications").select("*").eq("portfolio_track_id",selectedTrack.id).eq("published",true).is("archived_at",null).order("display_order")).data??[]:(certificationMap.data??[]).map((m:any)=>({...m.certification,display_order:m.display_order}));
  const awards=awardMap.error?(await supabase.from("awards").select("*").eq("portfolio_track_id",selectedTrack.id).eq("published",true).is("archived_at",null).order("display_order")).data??[]:(awardMap.data??[]).map((m:any)=>({...m.award,display_order:m.display_order}));
  const organizations=organizationMap.error?(await supabase.from("organizations").select("*").eq("portfolio_track_id",selectedTrack.id).eq("published",true).is("archived_at",null).order("display_order")).data??[]:(organizationMap.data??[]).map((m:any)=>({...m.organization,display_order:m.display_order}));
  return{...shared,trackContent:(content.data??null) as TrackContent|null,projects:(projects.data??[]) as Project[],experience,skills:skills.data??[],certifications,awards,organizations};
}
