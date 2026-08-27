import type { ResolvedCv } from "@/lib/cv";

export default function CvDocument({cv,embedded=false}:{cv:ResolvedCv;embedded?:boolean}){
  return <div className={embedded?"cv-document cv-document-embedded":"cv-document"}>
    <header className="cv-document-header">
      <div><h2>{cv.name}</h2><p>{cv.trackName}</p></div>
      {!embedded&&<a className="cv-download" href={`/cv/${cv.trackSlug}/pdf`}>Download PDF</a>}
    </header>
    {cv.sections.map(section=><section key={section.key} className={`cv-document-section cv-document-${section.key}`}>
      <h3>{section.title}</h3>
      {section.entries.map((entry,index)=><article key={index}>
        {entry.heading&&<h4>{entry.heading}</h4>}
        {(entry.subheading||entry.meta)&&<p className="cv-meta">{[entry.subheading,entry.meta].filter(Boolean).join(" · ")}</p>}
        {entry.detail&&<p className="cv-detail">{entry.detail}</p>}
        {entry.body&&<p>{entry.body}</p>}
        {entry.highlights&&entry.highlights.length>0&&<ul>{entry.highlights.map((highlight,i)=><li key={i}>{highlight}</li>)}</ul>}
        {entry.link&&!entry.link.startsWith("mailto:")&&<a href={entry.link}>{entry.link}</a>}
      </article>)}
    </section>)}
  </div>
}
