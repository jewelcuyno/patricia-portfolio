/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPublicContent } from "./content";
import type { CvSectionKey } from "./types";

export const AUTOMATIC_CV_SECTIONS: { key: CvSectionKey; label: string }[] = [
  {key:"contact",label:"Contact Details"},{key:"summary",label:"Professional Summary"},
  {key:"experience",label:"Work Experience"},{key:"education",label:"Education"},{key:"skills",label:"Skills"},
];
export type CvEntry={heading?:string;subheading?:string;meta?:string;detail?:string;body?:string;highlights?:string[];link?:string};
export type ResolvedCvSection={key:CvSectionKey;title:string;entries:CvEntry[]};
export type ResolvedCv={name:string;trackName:string;trackSlug:string;sections:ResolvedCvSection[]};
const clean=(value:unknown)=>typeof value==="string"&&value.trim()?value.trim():undefined;
const dateRange=(x:Record<string,unknown>)=>clean(x.date_label)||[clean(x.start_date),clean(x.end_date)].filter(Boolean).join(" — ")||undefined;

export async function resolveCv(trackSlug:string):Promise<ResolvedCv|null>{
  const data=await getPublicContent(trackSlug);
  return resolveCvFromContent(data,trackSlug);
}
export function resolveCvFromContent(data:Awaited<ReturnType<typeof getPublicContent>>,trackSlug:string):ResolvedCv|null{
  if(data.selectedTrack?.slug!==trackSlug)return null;
  const {profile,trackContent}=data;
  const contact:CvEntry[]=[];
  if(clean(profile.contact_email))contact.push({heading:profile.contact_email||undefined,link:`mailto:${profile.contact_email}`});
  if(clean(profile.location))contact.push({heading:profile.location||undefined});
  if(clean(profile.availability))contact.push({heading:profile.availability||undefined});
  for(const social of data.socials.filter((s:any)=>/linkedin|website|portfolio/i.test(`${s.platform} ${s.label}`)))if(clean(social.url))contact.push({heading:clean(social.label)||clean(social.platform),link:social.url});
  const entries:Record<string,CvEntry[]>={
    contact,
    summary:clean(trackContent?.introduction)?[{body:clean(trackContent?.introduction)}]:[],
    experience:data.experience.map((x:any)=>({heading:clean(x.position),subheading:clean(x.organization),meta:clean(x.date_label)||[clean(x.start_date),x.is_current?"Present":clean(x.end_date)].filter(Boolean).join(" — ")||undefined,detail:clean(x.location),body:clean(x.description),highlights:Array.isArray(x.highlights)?x.highlights.map((h:unknown)=>clean(h)?.replace(/^[-*•]\s*/,"")).filter(Boolean) as string[]:[]})),
    education:data.education.map((x:any)=>({heading:clean(x.program),subheading:clean(x.institution),meta:[dateRange(x),clean(x.status)].filter(Boolean).join(" · ")||undefined,body:clean(x.description)})),
    skills:data.skills.map((g:any)=>({heading:clean(g.name),body:(g.skills||[]).filter((s:any)=>s.published&&!s.archived_at).sort((a:any,b:any)=>a.display_order-b.display_order).map((s:any)=>s.name).filter(Boolean).join(", ")||undefined})).filter((x:CvEntry)=>x.heading||x.body),
  };
  const sections=AUTOMATIC_CV_SECTIONS.map(({key,label})=>({key,title:label,entries:entries[key]})).filter(section=>section.entries.length>0);
  if(sections.length===0)return null;
  return{name:profile.name,trackName:data.selectedTrack.name||"Portfolio",trackSlug,sections};
}
