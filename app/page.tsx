/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import Link from "next/link";
import { getPublicContent } from "@/lib/content";
import {getCvPublicActions} from "@/lib/cv-availability";
import {resolveCvFromContent} from "@/lib/cv";
import {educationActivities} from "@/lib/education-list";
import CvDocument from "./CvDocument";
import TrackSelector from "./TrackSelector";
export const dynamic = "force-dynamic";
export async function generateMetadata({searchParams}:{searchParams:Promise<{track?:string}>}) {
  const {track}=await searchParams; const data=await getPublicContent(track); const c=data.trackContent, p=data.profile;
  const niche=data.selectedTrack?.name?.trim(); const title=niche?`${p.name} — ${niche}`:p.name;
  const description=c?.subheadline?.trim()||c?.introduction?.trim()||p.site_description||undefined;
  const image=p.og_image_url;
  return {title,description,openGraph:{title,description,images:image?[image]:[]},twitter:{card:"summary_large_image",title,description,images:image?[image]:[]}};
}
export default async function Home({searchParams}:{searchParams:Promise<{track?:string}>}) {
  const {track}=await searchParams;
  const data=await getPublicContent(track);
  const {
    profile,
    projects,
    education,
    experience,
    skills,
    socials,
    certifications,
    awards,
    organizations,
    sections,
    tracks,selectedTrack,trackContent,
  } = data;
  const embeddedCv=selectedTrack?.slug?resolveCvFromContent(data,selectedTrack.slug):null;
  const view={...profile,headline:trackContent?.headline||selectedTrack?.name||null,supporting_headline:trackContent?.subheadline||null,intro:trackContent?.introduction||null,career_interests:trackContent?.career_interests||null,contact_cta:trackContent?.contact_cta||null};
  const enabled = (key: string) =>
    sections.length === 0 || sections.some((s: any) => s.section_key === key);
  const cvActions=getCvPublicActions(Boolean(embeddedCv),selectedTrack?.slug);
  const collection = (title: string, rows: any[], key:string) =>
    rows.length > 0 && (
      <section className={`work ${key}-section`}>
        <div className="section-heading">
          <p className="eyebrow">{title}</p>
          <span>{String(rows.length).padStart(2, "0")}</span>
        </div>
        {rows.map((x) => (
          <article className="list-row" key={x.id}>
            <span>{x.date_label}</span>
            <div>
              <h2>{x.name}</h2>
              <p>{x.issuer || x.role}</p>
              {x.description && <p className="muted">{x.description}</p>}
              {x.credential_url && (
                <a href={x.credential_url}>View credential ↗</a>
              )}
            </div>
          </article>
        ))}
      </section>
    );
  return (
    <main>
      <header className="site-header">
        <a
          className="wordmark"
          href="#top"
          aria-label={`${view.name}, home`}
        >
          PCM<span className="wordmark-dot">.</span>
        </a>
        <nav aria-label="Primary navigation">
          {(view.short_bio||view.long_bio)&&<a href="#about">About</a>}
          {enabled("projects") && projects.length > 0 && (
            <a href="#work">Work</a>
          )}
          <a className="nav-cta" href={profile.cta_destination||"#contact"}>
            {profile.cta_label||"Contact"} <span aria-hidden>↗</span>
          </a>
        </nav>
      </header>
      {tracks.length>0&&<div className="view-bar"><TrackSelector tracks={tracks} selected={selectedTrack?.slug||""}/><span>{selectedTrack?.name}</span></div>}
      <section
        className={`hero ${view.photo_url ? "hero-photo" : ""}`}
        id="top"
      >
        <div className="hero-kicker"><strong>{view.name}</strong></div>
        {view.photo_url && (
          <img
            className="profile-photo"
            src={view.photo_url}
            alt={view.photo_alt || ""}
            style={{ objectPosition: view.photo_position }}
          />
        )}
        <div className="hero-copy"><h1>{view.headline}</h1>{view.supporting_headline&&<p className="supporting-headline">{view.supporting_headline}</p>}</div>
        <div className="hero-foot">
          {view.availability&&<p>{view.availability}</p>}
          <a
            href="#about"
            className="round-link"
            aria-label="Continue to about section"
          >
            ↓
          </a>
        </div>
        <div className="orb orb-one" aria-hidden />
        <div className="orb orb-two" aria-hidden />
      </section>
      <div className="portfolio-sections">
      {enabled("about")&&view.intro&&<section className="professional-summary" id="about">
        <p className="eyebrow">Professional summary</p>
        <p className="summary-copy">{view.intro}</p>
      </section>}
      {(view.short_bio||view.long_bio)&&<section className="about-bio"><div><p className="eyebrow">About Patricia</p><h2>Beyond the role</h2></div><div>{view.short_bio&&<p className="short-bio">{view.short_bio}</p>}{view.long_bio&&<p className="long-bio">{view.long_bio}</p>}</div></section>}
      {view.career_interests&&<section className="career-framing"><p className="eyebrow">Career direction</p><p>{view.career_interests}</p></section>}
      {enabled("projects") && projects.length > 0 && (
        <section className="work" id="work">
          <div className="section-heading">
            <p className="eyebrow">Selected work</p>
            <span>{String(projects.length).padStart(2, "0")}</span>
          </div>
          <div className="project-grid">
            {projects.map((p, index) => (
              <Link
                className="project-card"
                href={`/work/${selectedTrack?.slug}/${p.slug}`}
                key={p.id}
              >
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.cover_alt || ""} />
                ) : (
                  <div className="project-placeholder">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                )}
                <div className="project-meta">
                  <span>{p.category || "Project"}</span>
                  <h2>{p.title}</h2>
                  <p>{p.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {enabled("education") && education.length > 0 && (
        <section className="education" id="education">
          <div className="section-heading">
            <p className="eyebrow">Education</p>
            <span>{String(education.length).padStart(2, "0")}</span>
          </div>
          {education.map((x: any) => {
            const activitiesAndHonors=educationActivities(x.activities,x.honors);
            return (
            <article className="education-card" key={x.id}>
              <div className="monogram" aria-hidden>
                {x.institution
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <p className="status">{x.status}</p>
                <h2>{x.institution}</h2>
                <p>{x.program}</p>
                {(x.start_label||x.end_label)&&<p className="education-dates">{[x.start_label,x.end_label||"Present"].filter(Boolean).join(" — ")}</p>}
                {activitiesAndHonors.length>0&&<ul className="education-activities">{activitiesAndHonors.map((item,index)=><li key={index}>{item}</li>)}</ul>}
                {x.description && <p className="muted">{x.description}</p>}
              </div>
            </article>
            );
          })}
        </section>
      )}
      {enabled("experience") && experience.length > 0 && (
        <section className="work experience-section">
          <div className="section-heading">
            <p className="eyebrow">Experience</p>
          </div>
          {experience.map((x: any) => (
            <article className="list-row" key={x.id}>
              <span>
                {x.date_label ||
                  [x.start_date, x.is_current?"Present":x.end_date].filter(Boolean).join(" — ")}
              </span>
              <div>
                <h2>{x.position}</h2>
                <p>{x.organization}</p>
                {x.location&&<p className="experience-location">{x.location}</p>}
                {x.description && <p className="muted">{x.description}</p>}
                {Array.isArray(x.highlights)&&x.highlights.length>0&&<ul className="experience-highlights">{x.highlights.map((highlight:string,index:number)=><li key={index}>{highlight.replace(/^[-*•]\s*/,"")}</li>)}</ul>}
              </div>
            </article>
          ))}
        </section>
      )}
      {enabled("skills") && skills.length > 0 && (
        <section className="work skills-section">
          <p className="eyebrow">Skills</p>
          <div className="skills-grid">
            {skills.map((g: any) => (
              <div key={g.id}>
                <h2>{g.name}</h2>
                <p>
                  {g.skills
                    ?.filter((s: any) => s.published && !s.archived_at)
                    .sort((a: any, b: any) => a.display_order - b.display_order)
                    .map((s: any) => s.name)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {enabled("certifications") &&
        collection("Certifications", certifications,"certifications")}
      {enabled("awards") && collection("Awards", awards,"awards")}
      {enabled("organizations") && collection("Organizations", organizations,"organizations")}
      {embeddedCv&&cvActions.length>0&&<section className="cv-showcase" aria-label="Curriculum vitae"><header><div><p className="eyebrow">Curriculum vitae</p><h2>A focused view of Patricia&apos;s experience.</h2></div><div className="cv-showcase-actions">{cvActions.map(action=><a href={action.href} key={action.kind}>{action.kind==="preview"?"View full CV":"Download CV"} {action.kind==="preview"?"↗":"↓"}</a>)}</div></header><div className="cv-preview-shell"><CvDocument cv={embeddedCv} embedded/><div className="cv-preview-fade" aria-hidden/></div></section>}
      {enabled("contact") && (
        <section className="contact" id="contact">
          <p className="eyebrow">Contact</p>
          <h2>
            {view.contact_cta || (
              <>
                Let&apos;s create something
                <br />
                <em>worth communicating.</em>
              </>
            )}
          </h2>
          {profile.contact_email ? (
            <a
              className="contact-email"
              href={`mailto:${profile.contact_email}`}
            >
              {profile.contact_email} ↗
            </a>
          ) : (
            <p>Contact details will be available here when published.</p>
          )}
          <div className="socials">
            {socials.map((s: any) => (
              <a href={s.url} key={s.id} target="_blank" rel="noreferrer">
                {s.label || s.platform} ↗
              </a>
            ))}
          </div>
        </section>
      )}
      </div>
      <footer>
        <span>
          © {new Date().getFullYear()} {view.name}
        </span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
