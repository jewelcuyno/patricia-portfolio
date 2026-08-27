import type { ResolvedCv } from "./cv";

const ascii=(s:string)=>s.normalize("NFKD").replace(/[^\x20-\x7E]/g,"-");
const esc=(s:string)=>ascii(s).replace(/([\\()])/g,"\\$1");
const wrap=(text:string,width=88)=>{const words=ascii(text).split(/\s+/);const lines:string[]=[];let line="";for(const word of words){if(!word)continue;if(`${line} ${word}`.trim().length>width){if(line)lines.push(line);line=word}else line=`${line} ${word}`.trim()}if(line)lines.push(line);return lines};

export function cvToTextLines(cv:ResolvedCv){
  const lines=[cv.name.toUpperCase(),cv.trackName,""];
  for(const section of cv.sections){lines.push(section.title.toUpperCase());for(const e of section.entries){if(e.heading)lines.push(e.heading);if(e.subheading||e.meta)lines.push([e.subheading,e.meta].filter(Boolean).join(" | "));if(e.detail)lines.push(e.detail);if(e.body)lines.push(...wrap(e.body));for(const highlight of e.highlights||[])lines.push(...wrap(`- ${highlight}`,84));if(e.link&&!e.link.startsWith("mailto:"))lines.push(e.link);lines.push("")}lines.push("")}
  return lines;
}

export function generateCvPdf(cv:ResolvedCv){
  const source=cvToTextLines(cv),pages:string[][]=[];for(let i=0;i<source.length;i+=48)pages.push(source.slice(i,i+48));
  const objects:string[]=[];const pageIds=pages.map((_,i)=>4+i*2);const fontId=3;
  objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[fontId]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((lines,i)=>{const pageId=pageIds[i],contentId=pageId+1;let y=760;const commands=["BT","/F1 10 Tf"];for(const line of lines){const heading=line===cv.name.toUpperCase()||cv.sections.some(s=>line===s.title.toUpperCase());commands.push(`${heading?"/F1 13 Tf":"/F1 10 Tf"}`,`1 0 0 1 54 ${y} Tm (${esc(line)}) Tj`);y-=heading?22:15}commands.push("ET");const stream=commands.join("\n");objects[contentId]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`});
  let pdf="%PDF-1.4\n";const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
