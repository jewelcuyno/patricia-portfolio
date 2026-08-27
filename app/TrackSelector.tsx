import Link from "next/link";
import type { PortfolioTrack } from "@/lib/types";
export default function TrackSelector({tracks,selected}:{tracks:PortfolioTrack[];selected:string}) {
  return <nav className="track-selector" aria-label="Portfolio niches"><span>Portfolio views</span><div>{tracks.map(track=><Link href={`/?track=${encodeURIComponent(track.slug||"")}`} aria-current={track.slug===selected?"page":undefined} key={track.id}>{track.selector_label||track.name}</Link>)}</div></nav>;
}
