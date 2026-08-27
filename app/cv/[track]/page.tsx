import {notFound} from "next/navigation";
import {resolveCv} from "@/lib/cv";
import CvDocument from "@/app/CvDocument";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{track:string}>}){const {track}=await params;const cv=await resolveCv(track);return cv?{title:`${cv.name} — ${cv.trackName} CV`,robots:{index:true,follow:true}}:{title:"CV not found"}}
export default async function CvPage({params}:{params:Promise<{track:string}>}){const {track}=await params;const cv=await resolveCv(track);if(!cv)notFound();return <main className="cv-page"><a className="cv-return" href={`/?track=${cv.trackSlug}`}>← Return to portfolio</a><CvDocument cv={cv}/></main>}
