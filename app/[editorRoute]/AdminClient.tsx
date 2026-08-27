"use client";
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Contact,
  Eye,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { fallbackProfile } from "@/lib/content";
import {normalizeExperiencePayload,setExperienceVisibility} from "@/lib/experience";
import { MEDIA_BUCKET } from "@/lib/supabase";
import {
  configureEditorClient,
  editorClient as supabase,
} from "@/lib/editor-client";
import type {
  ContentBlock,
  MediaItem,
  Project,
  SiteProfile,
} from "@/lib/types";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["Portfolio Views", Eye],
  ["Profile", UserRound],
  ["Education", GraduationCap],
  ["Experience", FileText],
  ["Certifications", FileText],
  ["Awards", Sparkles],
  ["Organizations", Contact],
  ["Media", ImageIcon],
  ["Contact", Contact],
  ["Site Settings", Settings],
] as const;
type Notify = (message: string) => void;
const uid = () => crypto.randomUUID();
const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminClient({
  editorSecret,
}: {
  editorSecret: string;
}) {
  configureEditorClient(editorSecret);
  const [active, setActiveRaw] = useState("Dashboard"),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState("");
  const [profile, setProfile] = useState<SiteProfile>(fallbackProfile),
    [projects, setProjects] = useState<Project[]>([]),
    [media, setMedia] = useState<MediaItem[]>([]),
    [tracks, setTracks] = useState<any[]>([]),
    [dirty, setDirty] = useState(false);
  const notify: Notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 4500);
  };
  const setActive = (next: string) => {
    if (dirty && !confirm("You have unsaved changes. Leave this screen?"))
      return;
    setDirty(false);
    setActiveRaw(next);
  };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function load() {
    if (!supabase) return;
    const [p, ps, m, t] = await Promise.all([
      supabase.from("site_profile").select("*").single(),
      supabase.from("projects").select("*").order("display_order"),
      supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("portfolio_tracks").select("*").order("display_order"),
    ]);
    if (p.data) setProfile(p.data as SiteProfile);
    setProjects((ps.data || []) as Project[]);
    setMedia((m.data || []) as MediaItem[]);
    setTracks(t.data || []);
  }
  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);
  async function uploadFile(file: File, folder = "library") {
    if (!supabase) return null;
    if (file.size > 15 * 1024 * 1024) {
      notify("Maximum file size is 15 MB.");
      return null;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "application/pdf",
      "video/mp4",
    ];
    if (!allowed.includes(file.type)) {
      notify("That file type is not supported.");
      return null;
    }
    const path = `${folder}/${uid()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const up = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (up.error) {
      notify(up.error.message);
      return null;
    }
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    const row = {
      storage_path: path,
      public_url: data.publicUrl,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: null,
      caption: null,
    };
    const created = await supabase.from("media").insert(row).select().single();
    if (created.data) setMedia((v) => [created.data as MediaItem, ...v]);
    notify("Upload complete.");
    return created.data as MediaItem;
  }
  const screen =
    active === "Dashboard" ? (
      <Dashboard projects={projects} profile={profile} tracks={tracks} setActive={setActive} />
    ) : active === "Portfolio Views" ? (
      <PortfolioViews tracks={tracks} setTracks={setTracks} projects={projects} setProjects={setProjects} media={media} upload={uploadFile} notify={notify} dirty={setDirty} profile={profile} setProfile={setProfile} />
    ) : active === "Profile" ? (
      <GlobalProfileEditor
        profile={profile}
        setProfile={setProfile}
        upload={uploadFile}
        notify={notify}
        dirty={setDirty}
      />
    ) : active === "Media" ? (
      <MediaLibrary
        media={media}
        setMedia={setMedia}
        upload={uploadFile}
        notify={notify}
      />
    ) : active === "Contact" ? (
      <ContactEditor
        profile={profile}
        setProfile={setProfile}
        notify={notify}
      />
    ) : active === "Site Settings" ? (
      <SettingsEditor notify={notify} />
    ) : (
      <CollectionManager kind={active} notify={notify} />
    );
  return (
    <div className="admin-shell">
      <aside className={mobile ? "open" : ""}>
        <div className="admin-brand">
          <span>PCM.</span>
          <button aria-label="Close menu" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <p>Portfolio editor</p>
        <nav aria-label="Editor navigation">
          {nav.map(([label, Icon]) => (
            <button
              className={active === label ? "active" : ""}
              onClick={() => {
                setActive(label);
                setMobile(false);
              }}
              key={label}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <p className="private-route-note">Keep this editor URL private.</p>
      </aside>
      <div className="admin-main">
        <header>
          <button
            className="menu"
            aria-label="Open menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div>
            <p className="overline">Portfolio editor</p>
            <h1>{active}</h1>
          </div>
          <a href="/" target="_blank">
            View site ↗
          </a>
        </header>
        <section className="admin-content">{screen}</section>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function PortfolioViews({tracks,setTracks,projects,setProjects,media,upload,notify,dirty,profile,setProfile:_setProfile}:{tracks:any[];setTracks:(x:any[])=>void;projects:Project[];setProjects:(x:Project[])=>void;media:MediaItem[];upload:(file:File,folder?:string)=>Promise<MediaItem|null>;notify:Notify;dirty:(x:boolean)=>void;profile:SiteProfile;setProfile:(x:SiteProfile)=>void}) {
  void _setProfile; void profile;
  const [selected,setSelected]=useState<string>("");
  const [tab,setTab]=useState("Positioning");
  const [content,setContent]=useState<any>({});
  const view=tracks.find((x)=>x.id===selected) || tracks[0];
  useEffect(()=>{if(!view||!supabase)return; void (async()=>{
    const c=await supabase.from("track_content").select("*").eq("track_id",view.id).single();
    setContent(c.data||{track_id:view.id});
  })()},[view,profile.contact_email,profile.location,profile.availability,projects]);
  const saveView=async(next:any)=>{const configured=Boolean(next.name?.trim()&&next.selector_label?.trim()&&next.slug?.trim());next={...next,configured,active:configured?next.active:false,is_default:configured&&next.active?next.is_default:false};if(view?.is_default&&!next.active&&tracks.some((x)=>x.id!==next.id&&x.active))return notify("Choose another default niche before deactivating this one.");if(next.active&&!next.is_default&&!tracks.some((x)=>x.id!==next.id&&x.is_default))next.is_default=true;if(next.is_default){for(const other of tracks.filter((x)=>x.is_default&&x.id!==next.id))await supabase!.from("portfolio_tracks").update({is_default:false}).eq("id",other.id)}const result=await supabase!.from("portfolio_tracks").update(next).eq("id",next.id);if(result.error)return notify(result.error.message);setTracks(tracks.map((x)=>x.id===next.id?next:{...x,is_default:next.is_default?false:x.is_default}));notify("Niche saved.")};
  const saveContent=async()=>{const payload={...content,track_id:view.id};const q=content.id?supabase!.from("track_content").update(payload).eq("id",content.id):supabase!.from("track_content").insert(payload);const result=await q.select().single();if(result.data)setContent(result.data);notify(result.error?.message||"Targeted presentation saved.")};
  if(!tracks.length)return <div className="panel empty"><Eye/><h3>Six niche slots are ready for setup</h3><p>Apply migration 004, then configure each professional niche here.</p></div>;
  const tabs=["Positioning","Projects","Experience","Skills","Certifications","Awards","Organizations"];
  return <div>
    <div className="track-context"><strong>THIS NICHE</strong><span>Editing: {view?.name||`Niche slot ${view?.slot_number}`}</span></div>
    <div className="panel">
      <div className="panel-title"><Title title="Six portfolio niches" note="Configure each slot, then choose one active default"/></div>
      <div className="track-list">
        {tracks.map((t)=><div className="track-row" key={t.id}><button className="secondary" onClick={()=>setSelected(t.id)}>{t.name||`Niche slot ${t.slot_number}`}</button><div className="button-row"><span className={`badge ${t.configured?"published":"draft"}`}>{t.configured?(t.active?"Active":"Configured") : "Not configured"}</span>{t.is_default&&<span className="badge published">Default</span>}<button onClick={()=>saveView({...t,display_order:Math.max(1,t.display_order-1)})}><ArrowUp/></button><button onClick={()=>saveView({...t,display_order:Math.min(6,t.display_order+1)})}><ArrowDown/></button></div></div>)}
      </div>
    </div>
    {view&&<div className="panel form">
      <><div className="two"><Field label="Public name" value={view.name} onChange={(v)=>setTracks(tracks.map((x)=>x.id===view.id?{...x,name:v}:x))}/><Field label="Selector label" value={view.selector_label} onChange={(v)=>setTracks(tracks.map((x)=>x.id===view.id?{...x,selector_label:v}:x))}/><Field label="Shareable slug" value={view.slug} onChange={(v)=>setTracks(tracks.map((x)=>x.id===view.id?{...x,slug:slugify(v)}:x))}/><Field label="Internal description" value={view.description} onChange={(v)=>setTracks(tracks.map((x)=>x.id===view.id?{...x,description:v}:x))}/></div><div className="button-row"><label className="check"><input type="checkbox" checked={view.active} onChange={(e)=>saveView({...view,active:e.target.checked})}/>Active publicly</label><label className="check"><input type="checkbox" checked={view.is_default} onChange={(e)=>saveView({...view,is_default:e.target.checked})}/>Default niche</label><button className="primary" onClick={()=>saveView(view)}><Save/> Save niche</button></div></>
      <div className="track-tabs">{tabs.map((x)=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
      {tab==="Positioning"&&<><div className="two"><Field label="Headline" value={content.headline} onChange={(v)=>setContent({...content,headline:v})}/><Field label="Supporting headline" value={content.subheadline} onChange={(v)=>setContent({...content,subheadline:v})}/></div><Field label="Professional summary / introduction" area value={content.introduction} onChange={(v)=>setContent({...content,introduction:v})}/><Field label="Career framing" area value={content.career_interests} onChange={(v)=>setContent({...content,career_interests:v})}/><Field label="Contact CTA wording" value={content.contact_cta} onChange={(v)=>setContent({...content,contact_cta:v})}/><button className="primary" onClick={saveContent}><Save/> Save positioning</button></>}
      {tab==="Projects"&&<ProjectManager trackId={view.id} projects={projects.filter((p)=>p.portfolio_track_id===view.id)} setProjects={setProjects} media={media} upload={upload} notify={notify} dirty={dirty}/>} 
      {tab==="Experience"&&<TrackMappingManager kind="Experience" trackId={view.id} notify={notify}/>} 
      {tab==="Skills"&&<SkillsManager notify={notify} trackId={view.id}/>} 
      {tab==="Certifications"&&<TrackMappingManager kind="Certifications" trackId={view.id} notify={notify}/>} 
      {tab==="Awards"&&<TrackMappingManager kind="Awards" trackId={view.id} notify={notify}/>} 
      {tab==="Organizations"&&<TrackMappingManager kind="Organizations" trackId={view.id} notify={notify}/>} 
    </div>}
  </div>
}
function Dashboard({
  projects,
  profile,
  tracks,
  setActive,
}: {
  projects: Project[];
  profile: SiteProfile;
  tracks:any[];
  setActive: (s: string) => void;
}) {
  const missing = [
    !profile.photo_url && "professional photo",
    !profile.contact_email && "contact email",
  ].filter(Boolean);
  return (
    <>
      <div className="welcome">
        <div>
          <p className="overline">Portfolio overview</p>
          <h2>Your portfolio is ready for its next story.</h2>
          <p>Publishing here updates the public site without redeployment.</p>
        </div>
        <button onClick={() => setActive("Portfolio Views")}>
          <Plus />
          Edit a niche
        </button>
      </div>
      <div className="niche-summary">{tracks.map((track)=><article className="panel" key={track.id}><span className={`badge ${track.configured?"published":"draft"}`}>{track.configured?"Configured":"Not configured"}</span><h3>{track.name||`Niche slot ${track.slot_number}`}</h3><p>{projects.filter((p)=>p.portfolio_track_id===track.id&&p.status==="published"&&!p.archived_at).length} published · {projects.filter((p)=>p.portfolio_track_id===track.id&&p.status==="draft"&&!p.archived_at).length} drafts</p><p>{track.configured&&track.active?"Automatic CV available when content exists":"CV follows niche status"} · {profile.photo_url?"Photo ready":"Photo missing"}</p>{track.is_default&&<strong>Default niche</strong>}</article>)}</div>
      {missing.length > 0 && (
        <div className="notice">
          <strong>Global suggestions:</strong> add {missing.join(", ")} when
          ready.
        </div>
      )}
      <div className="panel">
        <div className="panel-title">
          <h2>Recently updated</h2>
        </div>
        {projects
          .filter((p) => !p.archived_at)
          .slice(0, 5)
          .map((p) => (
            <div className="mini-row" key={p.id}>
              <span className={`badge ${p.status}`}>{p.status}</span>
              <strong>{p.title}</strong>
              <span>{p.category || "Uncategorized"}</span>
            </div>
          ))}
        {projects.length === 0 && (
          <Empty
            title="No projects yet"
            text="Create a verified portfolio item when ready."
          />
        )}
      </div>
    </>
  );
}

function GlobalProfileEditor({profile,setProfile,upload,notify,dirty}:{profile:SiteProfile;setProfile:(p:SiteProfile)=>void;upload:(f:File,s?:string)=>Promise<MediaItem|null>;notify:Notify;dirty:(v:boolean)=>void}){
  const [p,setP]=useState(profile);const change=(key:keyof SiteProfile,value:any)=>{setP({...p,[key]:value});dirty(true)};
  const save=async()=>{const {error}=await supabase!.from("site_profile").upsert({id:p.id,name:p.name,short_bio:p.short_bio,long_bio:p.long_bio,cta_label:p.cta_label,cta_destination:p.cta_destination});if(!error){setProfile(p);dirty(false)}notify(error?.message||"Global profile saved.")};
  return <><div className="track-context"><strong>GLOBAL CONTENT</strong><span>Shared across every niche</span></div><div className="panel form"><Title title="Patricia's profile" note="Identity, biographies, and primary CTA are global"/><Field label="Name" value={p.name} onChange={v=>change("name",v)}/><Field label="Short bio" area value={p.short_bio} onChange={v=>change("short_bio",v)}/><Field label="Long bio" area value={p.long_bio} onChange={v=>change("long_bio",v)}/><div className="two"><Field label="Global CTA label" value={p.cta_label} onChange={v=>change("cta_label",v)}/><Field label="Global CTA destination" value={p.cta_destination} onChange={v=>change("cta_destination",v)}/></div><p className="helper">This primary action appears consistently across all six niche portfolios. Contact-section wording remains niche-specific.</p><button className="primary" onClick={save}><Save/> Save global profile</button></div><GlobalPhotoEditor profile={profile} setProfile={setProfile} upload={upload} notify={notify} dirty={dirty}/></>
}
function GlobalPhotoEditor({profile,setProfile,upload,notify,dirty}:{profile:SiteProfile;setProfile:(p:SiteProfile)=>void;upload:(f:File,s?:string)=>Promise<MediaItem|null>;notify:Notify;dirty:(v:boolean)=>void}){
  const [p,setP]=useState(profile);const change=(k:keyof SiteProfile,v:any)=>{setP({...p,[k]:v});dirty(true)};
  const save=async()=>{const {error}=await supabase!.from("site_profile").upsert({id:p.id,name:p.name,photo_url:p.photo_url,photo_alt:p.photo_alt,photo_position:p.photo_position});if(!error){setProfile(p);dirty(false)}notify(error?.message||"Global professional photo saved.")};
  return <div className="panel form"><div className="track-context"><strong>GLOBAL CONTENT</strong><span>Shared across all six niches</span></div><Title title="Professional photo"/>{p.photo_url?<img className="photo-preview" src={p.photo_url} alt={p.photo_alt||""}/>:<div className="photo-empty"><UserRound/><p>No photo uploaded</p></div>}<label className="upload">Upload or replace<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async(e)=>{const f=e.target.files?.[0];if(!f)return;const m=await upload(f,"profile");if(m)change("photo_url",m.public_url)}}/></label><Field label="Alternative text" value={p.photo_alt} onChange={(v)=>change("photo_alt",v)}/><Field label="Focal position (for example 50% 35%)" value={p.photo_position} onChange={(v)=>change("photo_position",v)}/><div className="button-row"><button className="secondary danger" onClick={()=>change("photo_url",null)}>Remove photo</button><button className="primary" onClick={save}><Save/> Save global photo</button></div></div>
}

const collectionConfigs: any = {
  Education: {
    table: "education",
    title: "Education",
    defaults: {
      institution: "",
      program: "",
      status: "",
      start_label: "",
      end_label: "",
      activities: "",
      honors: "",
      description: "",
      published: false,
    },
    fields: [
      ["institution", "Institution"],
      ["program", "Program / degree"],
      ["status", "Status"],
      ["start_label", "Start year/date"],
      ["end_label", "End/expected year"],
      ["activities", "Activities", "area"],
      ["honors", "Honors", "area"],
      ["description", "Description", "area"],
    ],
  },
  Experience: {
    table: "experience",
    title: "Experience",
    defaults: {
      organization: "",
      start_date: "",
      end_date: "",
      location: "",
      description: "",
      published: false,
    },
    fields: [
      ["organization", "Organization"],
      ["start_date", "Start date", "date"],
      ["end_date", "End date", "date"],
      ["location", "Location"],
      ["description", "Description", "area"],
    ],
  },
  Certifications: {
    table: "certifications",
    title: "Certifications",
    defaults: {
      name: "",
      issuer: "",
      date_label: "",
      credential_url: "",
      document_url: "",
      description: "",
      published: false,
    },
    fields: [
      ["name", "Name"],
      ["issuer", "Issuer"],
      ["date_label", "Date"],
      ["credential_url", "Credential URL"],
      ["document_url", "Document URL"],
      ["description", "Description", "area"],
    ],
  },
  Awards: {
    table: "awards",
    title: "Awards",
    defaults: {
      name: "",
      issuer: "",
      date_label: "",
      description: "",
      media_url: "",
      published: false,
    },
    fields: [
      ["name", "Name"],
      ["issuer", "Issuer / organization"],
      ["date_label", "Date"],
      ["description", "Description", "area"],
      ["media_url", "Supporting media URL"],
    ],
  },
  Organizations: {
    table: "organizations",
    title: "Organizations",
    defaults: {
      name: "",
      role: "",
      date_label: "",
      description: "",
      published: false,
    },
    fields: [
      ["name", "Organization"],
      ["role", "Role"],
      ["date_label", "Date / range"],
      ["description", "Description", "area"],
    ],
  },
};
function CollectionManager({ kind, notify, trackId }: { kind: string; notify: Notify; trackId?:string }) {
  const c = collectionConfigs[kind];
  const [rows, setRows] = useState<any[]>([]),
    [edit, setEdit] = useState<any | null>(null),
    [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    if (!c || !supabase) return;
    const query=supabase.from(c.table).select("*");
    (trackId?query.eq("portfolio_track_id",trackId):query).order("display_order")
      .then(({ data }) => setRows(data || []));
  }, [c,trackId]);
  if (!c) return null;
  const visible = rows.filter((r) =>
    showArchived ? Boolean(r.archived_at) : !r.archived_at,
  );
  const save = async (item: any) => {
    if (!supabase) return false;
    if(kind==="Experience"&&!item.organization?.trim()){notify("Organization is required.");return false}
    let payload = {
      ...item,
      ...(trackId?{portfolio_track_id:trackId}:{}),
      display_order: item.display_order ?? rows.length,
    };
    if(kind==="Experience")payload=normalizeExperiencePayload(item,trackId||"",rows.length);
    const q = item.id
      ? supabase.from(c.table).update(payload).eq("id", item.id)
      : supabase.from(c.table).insert(payload);
    const { error } = await q;
    if(error){notify(`Could not save ${c.title.toLowerCase()}. Check required fields and dates, then try again.`);return false}
    notify(`${c.title} saved.`);
    setEdit(null);
    reload();
    return true;
  };
  const reload = () => {if(!supabase)return;const query=supabase.from(c.table).select("*");(trackId?query.eq("portfolio_track_id",trackId):query).order("display_order").then(({data})=>setRows(data||[]))};
  const archive = async (r: any) => {
    if (
      !supabase ||
      !confirm(`${r.archived_at ? "Restore" : "Archive"} this item?`)
    )
      return;
    await supabase
      .from(c.table)
      .update({ archived_at: r.archived_at ? null : new Date().toISOString() })
      .eq("id", r.id);
    reload();
  };
  const move = async (i: number, d: number) => {
    const a = visible[i],
      b = visible[i + d];
    if (!a || !b || !supabase) return;
    await Promise.all([
      supabase
        .from(c.table)
        .update({ display_order: b.display_order })
        .eq("id", a.id),
      supabase
        .from(c.table)
        .update({ display_order: a.display_order })
        .eq("id", b.id),
    ]);
    reload();
  };
  if (edit)
    return (
      <RecordForm
        config={c}
        item={edit}
        save={save}
        cancel={() => setEdit(null)}
      />
    );
  return (
    <div className="panel">
      <div className="panel-title">
        <div>
          <p className="overline">Editable collection</p>
          <h2>{c.title}</h2>
        </div>
        <div className="button-row">
          <button
            className="secondary"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Active items" : "Archived"}
          </button>
          <button
            className="primary"
            onClick={() =>
              setEdit({ ...c.defaults, display_order: rows.length })
            }
          >
            <Plus />
            Add item
          </button>
        </div>
      </div>
      {visible.length ? (
        visible.map((r, i) => (
          <div className="manage-row" key={r.id}>
            <div>
              <strong>{r.institution || r.organization || r.name}</strong>
              <span>{r.program || r.position || r.role || r.issuer || ""}</span>
            </div>
            <span className={`badge ${r.published ? "published" : "draft"}`}>
              {r.archived_at ? "archived" : r.published ? "public" : "hidden"}
            </span>
            <OrderButtons
              up={() => move(i, -1)}
              down={() => move(i, 1)}
              first={i === 0}
              last={i === visible.length - 1}
            />
            <button onClick={() => setEdit(r)}>Edit</button>
            <button
              className="icon-danger"
              onClick={() => archive(r)}
              aria-label={r.archived_at ? "Restore" : "Archive"}
            >
              {r.archived_at ? <RotateCcw /> : <Archive />}
            </button>
          </div>
        ))
      ) : (
        <Empty
          title={
            showArchived
              ? "Nothing archived"
              : `No ${c.title.toLowerCase()} yet`
          }
          text="Add verified information when it is available."
        />
      )}
    </div>
  );
}
function RecordForm({
  config,
  item,
  save,
  cancel,
}: {
  config: any;
  item: any;
  save: (x: any) => void;
  cancel: () => void;
}) {
  const [v, setV] = useState(item);
  return (
    <div className="panel form">
      <Title title={`${item.id ? "Edit" : "Add"} ${config.title}`} />
      {config.fields.map(([k, l, t]: string[]) => (
        <DynamicField
          key={k}
          label={l}
          type={t}
          value={v[k]}
          onChange={(x: any) => setV({ ...v, [k]: x })}
        />
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(v.published)}
          onChange={(e) => setV(config.table==="experience"?setExperienceVisibility(v,e.target.checked):{ ...v, published: e.target.checked })}
        />
        Visible on portfolio
      </label>
      <div className="button-row">
        <button className="secondary" onClick={cancel}>
          Cancel
        </button>
        <button className="primary" onClick={() => save(v)}>
          <Save />
          Save
        </button>
      </div>
    </div>
  );
}

const mappingConfig:any={Experience:{global:"experience",mapping:"track_experience",foreign:"experience_id"},Certifications:{global:"certifications",mapping:"track_certifications",foreign:"certification_id"},Awards:{global:"awards",mapping:"track_awards",foreign:"award_id"},Organizations:{global:"organizations",mapping:"track_organizations",foreign:"organization_id"}};
function TrackMappingManager({kind,trackId,notify}:{kind:string;trackId:string;notify:Notify}){
  const config=mappingConfig[kind];const [records,setRecords]=useState<any[]>([]);const [maps,setMaps]=useState<any[]>([]);
  const load=async()=>{if(!supabase)return;const [r,m]=await Promise.all([supabase.from(config.global).select("*").is("archived_at",null).order("display_order"),supabase.from(config.mapping).select("*").eq("track_id",trackId).order("display_order")]);setRecords(r.data||[]);setMaps(m.data||[])};
  // Reload when the selected niche or collection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{queueMicrotask(()=>void load())},[kind,trackId]);
  const change=(record:any,patch:any)=>{const current=maps.find(m=>m[config.foreign]===record.id);const next=current?{...current,...patch}:{track_id:trackId,[config.foreign]:record.id,included:false,display_order:maps.length,...patch};setMaps(current?maps.map(m=>m.id===current.id?next:m):[...maps,next])};
  const save=async(record:any)=>{const map=maps.find(m=>m[config.foreign]===record.id);if(!map||!supabase)return;const result=map.id?await supabase.from(config.mapping).update(map).eq("id",map.id):await supabase.from(config.mapping).insert(map).select().single();if(result.data&&!map.id)setMaps(maps.map(x=>x===map?result.data:x));notify(result.error?.message||`${kind} selection saved.`)};
  return <div className="panel"><Title title={`${kind} for this niche`} note={`Select from GLOBAL ${kind.toLowerCase()} records`}/><div className="mapping-list">{records.map((record,index)=>{const map=maps.find(m=>m[config.foreign]===record.id)||{included:false,role_title:"",highlights:[],display_order:index};return <article className="mapping-card" key={record.id}><label className="check"><input type="checkbox" checked={Boolean(map.included)} onChange={e=>change(record,{included:e.target.checked})}/><strong>{record.organization||record.name}</strong></label>{kind==="Experience"&&<><Field label="Role / title for this niche" value={map.role_title} onChange={value=>change(record,{role_title:value})}/><Field label="Highlights (one per line)" area value={(map.highlights||[]).join("\n")} onChange={value=>change(record,{highlights:value.split("\n").filter(Boolean)})}/></>}<div className="button-row"><OrderButtons first={index===0} last={index===records.length-1} up={()=>change(record,{display_order:Math.max(0,map.display_order-1)})} down={()=>change(record,{display_order:map.display_order+1})}/><button className="primary" onClick={()=>save(record)}><Save/> Save selection</button></div></article>})}{records.length===0&&<Empty title={`No global ${kind.toLowerCase()} yet`} text={`Add records from the GLOBAL ${kind} section first.`}/>}</div></div>
}

function SkillsManager({ notify, trackId }: { notify: Notify; trackId:string }) {
  const [groups, setGroups] = useState<any[]>([]),
    [archived, setArchived] = useState(false),[newGroup,setNewGroup]=useState(""),[newSkills,setNewSkills]=useState<Record<string,string>>({});
  const load = () => supabase?.from("skill_groups").select("*, skills(*)").eq("portfolio_track_id",trackId).order("display_order").then(({data})=>setGroups(data||[]));
  useEffect(() => {
    void supabase?.from("skill_groups").select("*, skills(*)").eq("portfolio_track_id",trackId).order("display_order").then(({data})=>setGroups(data||[]));
  }, [trackId]);
  const saveGroup = async (g: any,name=g.name) => {
    if (!name || !supabase) return;
    if (g.id)
      await supabase.from("skill_groups").update({ name }).eq("id", g.id);
    else
      await supabase
        .from("skill_groups")
        .insert({ portfolio_track_id:trackId, name, display_order: groups.length, published: false });
    load();
    notify("Skill group saved.");
  };
  const addSkill = async (g: any,name=newSkills[g.id]||"") => {
    if (!name || !supabase) return;
    await supabase
      .from("skills")
      .insert({ group_id: g.id, name, display_order: g.skills?.length || 0 });
    setNewSkills({...newSkills,[g.id]:""});
    load();
  };
  const editSkill = async (s: any,name=s.name) => {
    if (!name || !supabase) return;
    await supabase.from("skills").update({ name }).eq("id", s.id);
    load();
  };
  const archiveGroup = async (g: any) => {
    if (
      !supabase ||
      !confirm(
        `${g.archived_at ? "Restore" : "Archive"} this group and its public skills?`,
      )
    )
      return;
    await supabase
      .from("skill_groups")
      .update({ archived_at: g.archived_at ? null : new Date().toISOString() })
      .eq("id", g.id);
    load();
  };
  const delSkill = async (s: any) => {
    if (!supabase || !confirm("Remove this skill?")) return;
    await supabase.from("skills").delete().eq("id", s.id);
    load();
  };
  const move = async (table: string, list: any[], i: number, d: number) => {
    const a = list[i],
      b = list[i + d];
    if (!a || !b || !supabase) return;
    await Promise.all([
      supabase
        .from(table)
        .update({ display_order: b.display_order })
        .eq("id", a.id),
      supabase
        .from(table)
        .update({ display_order: a.display_order })
        .eq("id", b.id),
    ]);
    load();
  };
  const shown = groups.filter((g) =>
    archived ? g.archived_at : !g.archived_at,
  );
  return (
    <div className="panel">
      <div className="panel-title">
        <Title title="Skill groups" />
        <div className="button-row">
          <button className="secondary" onClick={() => setArchived(!archived)}>
            {archived ? "Active" : "Archived"}
          </button>
          <input aria-label="New skill group name" value={newGroup} onChange={e=>setNewGroup(e.target.value)} placeholder="New skill group"/>
          <button className="primary" onClick={async()=>{await saveGroup({},newGroup);setNewGroup("")}}>
            <Plus />
            New group
          </button>
        </div>
      </div>
      {shown.length ? (
        shown.map((g, gi) => (
          <article className="skill-group" key={g.id}>
            <header>
              <div>
                <input aria-label="Skill group name" value={g.name} onChange={e=>setGroups(groups.map(x=>x.id===g.id?{...x,name:e.target.value}:x))}/>
                <span
                  className={`badge ${g.published ? "published" : "draft"}`}
                >
                  {g.published ? "public" : "hidden"}
                </span>
              </div>
              <div className="button-row">
                <OrderButtons
                  up={() => move("skill_groups", shown, gi, -1)}
                  down={() => move("skill_groups", shown, gi, 1)}
                  first={gi === 0}
                  last={gi === shown.length - 1}
                />
                <button onClick={() => saveGroup(g)}>Save name</button>
                <button
                  onClick={async () => {
                    await supabase
                      ?.from("skill_groups")
                      .update({ published: !g.published })
                      .eq("id", g.id);
                    load();
                  }}
                >
                  {g.published ? "Hide" : "Show"}
                </button>
                <button onClick={() => archiveGroup(g)}>
                  {g.archived_at ? <RotateCcw /> : <Archive />}
                </button>
              </div>
            </header>
            {!g.archived_at && (
              <>
                {(g.skills || [])
                  .sort((a: any, b: any) => a.display_order - b.display_order)
                  .map((s: any, si: number) => (
                    <div className="skill-row" key={s.id}>
                      <input aria-label={`Skill in ${g.name}`} value={s.name} onChange={e=>setGroups(groups.map(group=>group.id===g.id?{...group,skills:group.skills.map((x:any)=>x.id===s.id?{...x,name:e.target.value}:x)}:group))}/>
                      <OrderButtons
                        up={() => move("skills", g.skills, si, -1)}
                        down={() => move("skills", g.skills, si, 1)}
                        first={si === 0}
                        last={si === g.skills.length - 1}
                      />
                      <button onClick={() => editSkill(s)}>Save</button>
                      <button
                        className="icon-danger"
                        onClick={() => delSkill(s)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                <div className="inline-add"><input aria-label={`New skill for ${g.name}`} value={newSkills[g.id]||""} onChange={e=>setNewSkills({...newSkills,[g.id]:e.target.value})} placeholder="Add a skill"/><button className="secondary" onClick={() => addSkill(g)}>
                  <Plus />
                  Add skill
                </button></div>
              </>
            )}
          </article>
        ))
      ) : (
        <Empty
          title="No skill groups yet"
          text="Create a group, then add only verified skills."
        />
      )}
    </div>
  );
}

function ProjectManager({
  trackId,
  projects,
  setProjects,
  media,
  upload,
  notify,
  dirty,
}: {
  trackId: string;
  projects: Project[];
  setProjects: (p: Project[]) => void;
  media: MediaItem[];
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
  notify: Notify;
  dirty: (v: boolean) => void;
}) {
  const [edit, setEdit] = useState<Project | null>(null),
    [archived, setArchived] = useState(false);
  const load = () =>
    supabase
      ?.from("projects")
      .select("*")
      .order("display_order")
      .then(({ data }) => setProjects(data || []));
  const shown = projects.filter((p) =>
    archived ? Boolean(p.archived_at) : !p.archived_at,
  );
  const create = () =>
    setEdit({
      id: "",
      portfolio_track_id: trackId,
      title: "Untitled project",
      slug: `project-${shown.length + 1}`,
      category: null,
      summary: null,
      description: null,
      role: null,
      organization: null,
      date_label: null,
      cover_url: null,
      cover_alt: null,
      video_url: null,
      external_url: null,
      document_url: null,
      tags: [],
      content_blocks: [],
      featured: false,
      status: "draft",
      display_order: shown.length,
      archived_at: null,
    });
  const save = async (p: Project) => {
    if (!supabase) return;
    const payload = { ...p, portfolio_track_id:trackId, id: undefined };
    const { error } = p.id
      ? await supabase.from("projects").update({...p,portfolio_track_id:trackId}).eq("id", p.id)
      : await supabase.from("projects").insert(payload);
    notify(error?.message || "Project saved.");
    if (!error) {
      setEdit(null);
      dirty(false);
      load();
    }
  };
  const archive = async (p: Project) => {
    if (
      !supabase ||
      !confirm(`${p.archived_at ? "Restore" : "Archive"} “${p.title}”?`)
    )
      return;
    await supabase
      .from("projects")
      .update({ archived_at: p.archived_at ? null : new Date().toISOString() })
      .eq("id", p.id);
    load();
  };
  const move = async (i: number, d: number) => {
    const a = shown[i],
      b = shown[i + d];
    if (!a || !b || !supabase) return;
    await Promise.all([
      supabase
        .from("projects")
        .update({ display_order: b.display_order })
        .eq("id", a.id),
      supabase
        .from("projects")
        .update({ display_order: a.display_order })
        .eq("id", b.id),
    ]);
    load();
  };
  if (edit)
    return (
      <ProjectForm
        project={edit}
        save={save}
        cancel={() => {
          if (!confirm("Discard unsaved project changes?")) return;
          setEdit(null);
          dirty(false);
        }}
        media={media}
        upload={upload}
        dirty={dirty}
      />
    );
  return (
    <div className="panel">
      <div className="panel-title">
        <Title title="Projects" />
        <div className="button-row">
          <button className="secondary" onClick={() => setArchived(!archived)}>
            {archived ? "Active projects" : "Archived"}
          </button>
          <button className="primary" onClick={create}>
            <Plus />
            New project
          </button>
        </div>
      </div>
      {shown.length ? (
        shown.map((p, i) => (
          <div className="manage-row" key={p.id}>
            <div>
              <strong>{p.title}</strong>
              <span>{p.category || "No category"}</span>
            </div>
            <span className={`badge ${p.status}`}>
              {p.archived_at ? "archived" : p.status}
            </span>
            <OrderButtons
              up={() => move(i, -1)}
              down={() => move(i, 1)}
              first={i === 0}
              last={i === shown.length - 1}
            />
            {!p.archived_at && <button onClick={() => setEdit(p)}>Edit</button>}
            <button className="icon-danger" onClick={() => archive(p)}>
              {p.archived_at ? <RotateCcw /> : <Archive />}
            </button>
          </div>
        ))
      ) : (
        <Empty
          title={archived ? "No archived projects" : "Your work will live here"}
          text="Projects begin privately as drafts."
        />
      )}
    </div>
  );
}
function ProjectForm({
  project,
  save,
  cancel,
  media,
  upload,
  dirty,
}: {
  project: Project;
  save: (p: Project) => void;
  cancel: () => void;
  media: MediaItem[];
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
  dirty: (v: boolean) => void;
}) {
  const [p, setP] = useState(project),
    [preview, setPreview] = useState(false);
  const change = (k: keyof Project, v: any) => {
    setP({ ...p, [k]: v });
    dirty(true);
  };
  const setBlock = (i: number, b: ContentBlock) =>
    change(
      "content_blocks",
      p.content_blocks.map((x, n) => (n === i ? b : x)),
    );
  const addBlock = (type: ContentBlock["type"]) =>
    change("content_blocks", [
      ...p.content_blocks,
      { id: uid(), type, data: {} },
    ]);
  const moveBlock = (i: number, d: number) => {
    const a = [...p.content_blocks];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    change("content_blocks", a);
  };
  return (
    <div className="panel form">
      <div className="panel-title">
        <Title title={p.title} note="Unsaved changes" />
        <div className="button-row">
          <button className="secondary" onClick={() => setPreview(true)}>
            <Eye />
            Preview
          </button>
          <button className="secondary" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
      <div className="two">
        <Field
          label="Title"
          value={p.title}
          onChange={(v) => {
            change("title", v);
            if (!p.id) change("slug", slugify(v));
          }}
        />
        <Field
          label="URL slug"
          value={p.slug}
          onChange={(v) => change("slug", slugify(v))}
        />
      </div>
      <div className="two">
        <Field
          label="Category"
          value={p.category}
          onChange={(v) => change("category", v)}
        />
        <Field
          label="Date / range"
          value={p.date_label}
          onChange={(v) => change("date_label", v)}
        />
      </div>
      <Field
        label="Short summary"
        area
        value={p.summary}
        onChange={(v) => change("summary", v)}
      />
      <Field
        label="Introduction / full description"
        area
        value={p.description}
        onChange={(v) => change("description", v)}
      />
      <div className="two">
        <Field
          label="Patricia’s role"
          value={p.role}
          onChange={(v) => change("role", v)}
        />
        <Field
          label="School, client, or organization"
          value={p.organization}
          onChange={(v) => change("organization", v)}
        />
      </div>
      <AssetField
        label="Cover image"
        value={p.cover_url}
        accept="image"
        media={media}
        upload={upload}
        onChange={(v) => change("cover_url", v)}
      />
      <Field
        label="Cover image alt text"
        value={p.cover_alt}
        onChange={(v) => change("cover_alt", v)}
      />
      <div className="two">
        <Field
          label="External project URL"
          value={p.external_url}
          onChange={(v) => change("external_url", v)}
        />
        <Field
          label="Video URL"
          value={p.video_url}
          onChange={(v) => change("video_url", v)}
        />
      </div>
      <label>
        Skills / tags
        <input
          value={p.tags.join(", ")}
          onChange={(e) =>
            change(
              "tags",
              e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            )
          }
        />
      </label>
      <label>
        Status
        <select
          value={p.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="draft">Draft — private</option>
          <option value="published">Published — public</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={p.featured}
          onChange={(e) => change("featured", e.target.checked)}
        />
        Feature this project
      </label>
      <div className="composer">
        <div className="panel-title">
          <Title title="Project page content" />
          <AddBlock onAdd={addBlock} />
        </div>
        {p.content_blocks.length ? (
          p.content_blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              media={media}
              upload={upload}
              set={(x) => setBlock(i, x)}
              remove={() =>
                change(
                  "content_blocks",
                  p.content_blocks.filter((x) => x.id !== b.id),
                )
              }
              up={() => moveBlock(i, -1)}
              down={() => moveBlock(i, 1)}
              first={i === 0}
              last={i === p.content_blocks.length - 1}
            />
          ))
        ) : (
          <Empty
            title="No content blocks yet"
            text="Add text, images, galleries, quotes, video, or documents without writing code."
          />
        )}
      </div>
      <button className="primary save-wide" onClick={() => save(p)}>
        <Save />
        Save project
      </button>
      {preview && <PreviewModal project={p} close={() => setPreview(false)} />}
    </div>
  );
}
function AddBlock({ onAdd }: { onAdd: (t: ContentBlock["type"]) => void }) {
  const [type, setType] = useState<ContentBlock["type"]>("text");
  return (
    <div className="button-row">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ContentBlock["type"])}
      >
        {[
          "text",
          "heading",
          "image",
          "gallery",
          "quote",
          "video",
          "document",
        ].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <button className="primary" onClick={() => onAdd(type)}>
        <Plus />
        Add block
      </button>
    </div>
  );
}
function BlockEditor({
  block,
  set,
  remove,
  up,
  down,
  first,
  last,
  media,
  upload,
}: {
  block: ContentBlock;
  set: (b: ContentBlock) => void;
  remove: () => void;
  up: () => void;
  down: () => void;
  first: boolean;
  last: boolean;
  media: MediaItem[];
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
}) {
  const d = block.data as any,
    change = (k: string, v: any) => set({ ...block, data: { ...d, [k]: v } });
  return (
    <article className="block-editor">
      <header>
        <strong>{block.type}</strong>
        <div className="button-row">
          <OrderButtons up={up} down={down} first={first} last={last} />
          <button className="icon-danger" onClick={remove}>
            <Trash2 />
          </button>
        </div>
      </header>
      {block.type === "heading" && (
        <Field
          label="Heading"
          value={d.text}
          onChange={(v) => change("text", v)}
        />
      )}{" "}
      {block.type === "text" && (
        <Field
          label="Text"
          area
          value={d.text}
          onChange={(v) => change("text", v)}
        />
      )}{" "}
      {block.type === "quote" && (
        <>
          <Field
            label="Quote"
            area
            value={d.text}
            onChange={(v) => change("text", v)}
          />
          <Field
            label="Attribution"
            value={d.attribution}
            onChange={(v) => change("attribution", v)}
          />
        </>
      )}{" "}
      {block.type === "image" && (
        <>
          <AssetField
            label="Image"
            accept="image"
            value={d.url}
            media={media}
            upload={upload}
            onChange={(v) => change("url", v)}
          />
          <Field
            label="Alt text"
            value={d.alt}
            onChange={(v) => change("alt", v)}
          />
          <Field
            label="Caption"
            value={d.caption}
            onChange={(v) => change("caption", v)}
          />
        </>
      )}{" "}
      {block.type === "video" && (
        <>
          <Field
            label="Video URL"
            value={d.url}
            onChange={(v) => change("url", v)}
          />
          <Field
            label="Public label"
            value={d.label}
            onChange={(v) => change("label", v)}
          />
        </>
      )}{" "}
      {block.type === "document" && (
        <>
          <AssetField
            label="Document"
            accept="document"
            value={d.url}
            media={media}
            upload={upload}
            onChange={(v) => change("url", v)}
          />
          <Field
            label="Public label"
            value={d.label}
            onChange={(v) => change("label", v)}
          />
        </>
      )}{" "}
      {block.type === "gallery" && (
        <GalleryEditor
          images={d.images || []}
          set={(v) => change("images", v)}
          media={media}
          upload={upload}
        />
      )}
    </article>
  );
}
function GalleryEditor({
  images,
  set,
  media,
  upload,
}: {
  images: any[];
  set: (x: any[]) => void;
  media: MediaItem[];
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
}) {
  const add = (url: string) =>
    url && set([...images, { url, alt: "", caption: "" }]);
  return (
    <div>
      <AssetField
        label="Add gallery image"
        accept="image"
        value=""
        media={media}
        upload={upload}
        onChange={add}
      />
      <label className="upload">
        Upload multiple images
        <input
          multiple
          type="file"
          accept="image/*"
          onChange={async (e) => {
            for (const f of Array.from(e.target.files || [])) {
              const m = await upload(f, "projects");
              if (m) add(m.public_url);
            }
          }}
        />
      </label>
      {images.map((im, i) => (
        <div className="gallery-edit" key={`${im.url}-${i}`}>
          <img src={im.url} alt="" />
          <div>
            <Field
              label="Alt text"
              value={im.alt}
              onChange={(v) =>
                set(images.map((x, n) => (n === i ? { ...x, alt: v } : x)))
              }
            />
            <Field
              label="Caption"
              value={im.caption}
              onChange={(v) =>
                set(images.map((x, n) => (n === i ? { ...x, caption: v } : x)))
              }
            />
          </div>
          <OrderButtons
            up={() => {
              const a = [...images];
              [a[i], a[i - 1]] = [a[i - 1], a[i]];
              set(a);
            }}
            down={() => {
              const a = [...images];
              [a[i], a[i + 1]] = [a[i + 1], a[i]];
              set(a);
            }}
            first={i === 0}
            last={i === images.length - 1}
          />
          <button
            className="icon-danger"
            onClick={() => set(images.filter((_, n) => n !== i))}
          >
            <Trash2 />
          </button>
        </div>
      ))}
    </div>
  );
}
function PreviewModal({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Draft preview"
    >
      <div className="modal-card">
        <header>
          <div>
            <p className="overline">Private draft preview</p>
            <h2>{project.title}</h2>
          </div>
          <button onClick={close} aria-label="Close preview">
            <X />
          </button>
        </header>
        <p className="preview-lead">{project.description}</p>
        {project.content_blocks.map((b) => (
          <PreviewBlock block={b} key={b.id} />
        ))}
      </div>
    </div>
  );
}
function PreviewBlock({ block }: { block: ContentBlock }) {
  const d = block.data as any;
  if (block.type === "heading") return <h2>{d.text}</h2>;
  if (block.type === "text") return <p>{d.text}</p>;
  if (block.type === "quote")
    return (
      <blockquote>
        {d.text}
        <cite>{d.attribution}</cite>
      </blockquote>
    );
  if (block.type === "image")
    return (
      <figure>
        <img src={d.url} alt={d.alt || ""} />
        <figcaption>{d.caption}</figcaption>
      </figure>
    );
  if (block.type === "gallery")
    return (
      <div className="preview-gallery">
        {(d.images || []).map((x: any, i: number) => (
          <img key={i} src={x.url} alt={x.alt || ""} />
        ))}
      </div>
    );
  return (
    <a href={d.url} target="_blank">
      {d.label || block.type} ↗
    </a>
  );
}

function MediaLibrary({
  media,
  setMedia,
  upload,
  notify,
}: {
  media: MediaItem[];
  setMedia: (m: MediaItem[]) => void;
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
  notify: Notify;
}) {
  const [archived, setArchived] = useState(false);
  const shown = media.filter((m) =>
    archived ? m.archived_at : !m.archived_at,
  );
  const update = async (m: MediaItem) => {
    if (!supabase) return;
    await supabase
      .from("media")
      .update({ alt_text: m.alt_text, caption: m.caption })
      .eq("id", m.id);
    setMedia(media.map((x) => (x.id === m.id ? m : x)));
    notify("Media details saved.");
  };
  const archive = async (m: MediaItem) => {
    if (
      !supabase ||
      !confirm(
        "Archive this file? First confirm it is not used by a project, profile, certificate, award, or résumé.",
      )
    )
      return;
    await supabase
      .from("media")
      .update({ archived_at: m.archived_at ? null : new Date().toISOString() })
      .eq("id", m.id);
    setMedia(
      media.map((x) =>
        x.id === m.id
          ? {
              ...x,
              archived_at: m.archived_at ? null : new Date().toISOString(),
            }
          : x,
      ),
    );
  };
  return (
    <div className="panel">
      <div className="panel-title">
        <Title title="Media library" />
        <div className="button-row">
          <button className="secondary" onClick={() => setArchived(!archived)}>
            {archived ? "Active files" : "Archived"}
          </button>
          <label className="primary upload-button">
            <Plus />
            Upload files
            <input
              multiple
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,video/mp4"
              onChange={async (e) => {
                for (const f of Array.from(e.target.files || []))
                  await upload(f);
              }}
            />
          </label>
        </div>
      </div>
      {shown.length ? (
        <div className="media-grid">
          {shown.map((m) => (
            <MediaCard
              key={m.id}
              item={m}
              save={update}
              archive={() => archive(m)}
            />
          ))}
        </div>
      ) : (
        <Empty
          title="No media files"
          text="Upload once, then reuse assets throughout the portfolio."
        />
      )}
    </div>
  );
}
function MediaCard({
  item,
  save,
  archive,
}: {
  item: MediaItem;
  save: (m: MediaItem) => void;
  archive: () => void;
}) {
  const [m, setM] = useState(item);
  return (
    <article className="media-card">
      {m.mime_type.startsWith("image/") ? (
        <img src={m.public_url} alt={m.alt_text || ""} />
      ) : (
        <div className="file-preview">
          <FileText />
          <span>{m.mime_type === "application/pdf" ? "PDF" : "Video"}</span>
        </div>
      )}
      <strong title={m.filename}>{m.filename}</strong>
      <span>{(m.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
      {m.mime_type.startsWith("image/") && (
        <>
          <Field
            label="Alt text"
            value={m.alt_text}
            onChange={(v) => setM({ ...m, alt_text: v })}
          />
          <Field
            label="Caption"
            value={m.caption}
            onChange={(v) => setM({ ...m, caption: v })}
          />
        </>
      )}
      <div className="button-row">
        <a className="secondary" href={m.public_url} target="_blank">
          View ↗
        </a>
        {!m.archived_at && (
          <button className="secondary" onClick={() => save(m)}>
            Save
          </button>
        )}
        <button className="icon-danger" onClick={archive}>
          {m.archived_at ? <RotateCcw /> : <Archive />}
        </button>
      </div>
    </article>
  );
}
function ContactEditor({
  profile,
  setProfile,
  notify,
}: {
  profile: SiteProfile;
  setProfile: (p: SiteProfile) => void;
  notify: Notify;
}) {
  const [p, setP] = useState(profile);
  const [links, setLinks] = useState<any[]>([]),
    [edit, setEdit] = useState<any | null>(null);
  const load = () =>
    supabase
      ?.from("social_links")
      .select("*")
      .order("display_order")
      .then(({ data }) => setLinks(data || []));
  useEffect(() => {
    void load();
  }, []);
  const saveProfile = async () => {
    if (!supabase) return;
    await supabase.from("site_profile").upsert({id:p.id,name:p.name,contact_email:p.contact_email,location:p.location,availability:p.availability});
    setProfile(p);
    notify("Contact details saved.");
  };
  const saveLink = async () => {
    if (!supabase || !edit) return;
    if (edit.id)
      await supabase.from("social_links").update(edit).eq("id", edit.id);
    else
      await supabase
        .from("social_links")
        .insert({ ...edit, display_order: links.length });
    setEdit(null);
    load();
    notify("Social link saved.");
  };
  const move = async (i: number, d: number) => {
    const a = links[i],
      b = links[i + d];
    if (!a || !b || !supabase) return;
    await Promise.all([
      supabase
        .from("social_links")
        .update({ display_order: b.display_order })
        .eq("id", a.id),
      supabase
        .from("social_links")
        .update({ display_order: a.display_order })
        .eq("id", b.id),
    ]);
    load();
  };
  return (
    <div className="editor-grid">
      <div className="panel form">
        <Title title="Contact details" />
        <Field
          label="Public email"
          value={p.contact_email}
          onChange={(v) => setP({ ...p, contact_email: v })}
        />
        <button className="primary" onClick={saveProfile}>
          <Save />
          Save contact details
        </button>
      </div>
      <div className="panel">
        <div className="panel-title">
          <Title title="Social links" />
          <button
            className="primary"
            onClick={() =>
              setEdit({
                platform: "Other",
                label: "",
                url: "",
                published: true,
              })
            }
          >
            <Plus />
            Add link
          </button>
        </div>
        {edit && (
          <div className="form inset-form">
            <Field
              label="Platform"
              value={edit.platform}
              onChange={(v) => setEdit({ ...edit, platform: v })}
            />
            <Field
              label="Public label"
              value={edit.label}
              onChange={(v) => setEdit({ ...edit, label: v })}
            />
            <Field
              label="URL"
              value={edit.url}
              onChange={(v) => setEdit({ ...edit, url: v })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={edit.published}
                onChange={(e) =>
                  setEdit({ ...edit, published: e.target.checked })
                }
              />
              Show publicly
            </label>
            <div className="button-row">
              <button onClick={() => setEdit(null)}>Cancel</button>
              <button className="primary" onClick={saveLink}>
                Save
              </button>
            </div>
          </div>
        )}
        {links.map((l, i) => (
          <div className="social-row" key={l.id}>
            <div>
              <strong>{l.label || l.platform}</strong>
              <span>{l.url}</span>
            </div>
            <OrderButtons
              up={() => move(i, -1)}
              down={() => move(i, 1)}
              first={i === 0}
              last={i === links.length - 1}
            />
            <button onClick={() => setEdit(l)}>Edit</button>
            <button
              className="icon-danger"
              onClick={async () => {
                if (confirm("Remove this link?")) {
                  await supabase?.from("social_links").delete().eq("id", l.id);
                  load();
                }
              }}
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function SettingsEditor({ notify }: { notify: Notify }) {
  const [sections, setSections] = useState<any[]>([]);
  useEffect(() => {
    supabase
      ?.from("site_sections")
      .select("*")
      .order("display_order")
      .then(({ data }) => setSections(data || []));
  }, []);
  const toggle = async (s: any) => {
    if (!supabase) return;
    await supabase
      .from("site_sections")
      .update({ visible: !s.visible })
      .eq("id", s.id);
    setSections(
      sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)),
    );
    notify("Section visibility updated.");
  };
  return (
    <div className="panel">
      <Title
        title="Public section visibility"
        note="Empty sections remain hidden automatically"
      />
      {sections.map((s) => (
        <div className="setting-row" key={s.id}>
          <div>
            <strong>
              {s.section_key[0].toUpperCase() + s.section_key.slice(1)}
            </strong>
            <span>
              {s.visible
                ? "Enabled when content exists"
                : "Hidden from the public site"}
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={s.visible}
              onChange={() => toggle(s)}
            />
            <span />
          </label>
        </div>
      ))}
    </div>
  );
}

function AssetField({
  label,
  value,
  onChange,
  media,
  upload,
  accept,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  media: MediaItem[];
  upload: (f: File, s?: string) => Promise<MediaItem | null>;
  accept: "image" | "document";
}) {
  const options = media.filter(
    (m) =>
      !m.archived_at &&
      (accept === "image"
        ? m.mime_type.startsWith("image/")
        : !m.mime_type.startsWith("image/")),
  );
  return (
    <div className="asset-field">
      <label>
        {label}
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select from media library…</option>
          {options.map((m) => (
            <option value={m.public_url} key={m.id}>
              {m.filename}
            </option>
          ))}
        </select>
      </label>
      <label className="secondary upload-button">
        Upload new
        <input
          type="file"
          accept={
            accept === "image"
              ? "image/jpeg,image/png,image/webp,image/avif"
              : "application/pdf,video/mp4"
          }
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const m = await upload(f, "projects");
              if (m) onChange(m.public_url);
            }
          }}
        />
      </label>
      {value && (
        <a href={value} target="_blank">
          Preview selected file ↗
        </a>
      )}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
function DynamicField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
}) {
  if (type === "check")
    return (
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  if (type === "area" || type === "lines")
    return (
      <Field
        label={label}
        area
        value={type === "lines" ? (value || []).join("\n") : value}
        onChange={(v) =>
          onChange(type === "lines" ? v.split("\n").filter(Boolean) : v)
        }
      />
    );
  return (
    <label>
      {label}
      <input
        type={type === "date" ? "date" : "text"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Title({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <p className="overline">Portfolio content</p>
      <h2>{title}</h2>
      {note && <span className="save-state">{note}</span>}
    </div>
  );
}
function OrderButtons(props: {up?:()=>void;down?:()=>void;first?:boolean;last?:boolean;index?:number;length?:number;move?:(from:number,to:number)=>void}) {
  const index=props.index??0, length=props.length??0;
  const first=props.first??index===0, last=props.last??index===length-1;
  const up=props.up??(()=>props.move?.(index,index-1));
  const down=props.down??(()=>props.move?.(index,index+1));
  return (
    <div className="order-buttons">
      <button disabled={first} onClick={up} aria-label="Move up">
        <ArrowUp />
      </button>
      <button disabled={last} onClick={down} aria-label="Move down">
        <ArrowDown />
      </button>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Sparkles />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
