import {resolveCv} from "@/lib/cv";
import {generateCvPdf} from "@/lib/cv-pdf";
const filename=(value:string)=>value.trim().replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-|-$/g,"")||"Patricia-Morales-CV";
export async function GET(_request:Request,{params}:{params:Promise<{track:string}>}){const {track}=await params;const cv=await resolveCv(track);if(!cv)return new Response("CV unavailable",{status:404});return new Response(generateCvPdf(cv),{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="${filename(`${cv.name}-${cv.trackName}-CV`)}.pdf"`,"cache-control":"no-store"}})}
