/** Normalize browser form values for PostgreSQL while preserving niche ownership and booleans. */
export function normalizeExperiencePayload(item,trackId,displayOrder=0){
  return {...item,portfolio_track_id:trackId,start_date:item.start_date||null,end_date:item.is_current?null:(item.end_date||null),date_label:item.date_label||null,location:item.location||null,description:item.description||null,highlights:Array.isArray(item.highlights)?item.highlights.filter(x=>typeof x==="string"&&x.trim()):[],published:Boolean(item.published),is_current:Boolean(item.is_current),display_order:item.display_order??displayOrder};
}
export function setExperienceVisibility(item,published){return {...item,published:Boolean(published)}}
