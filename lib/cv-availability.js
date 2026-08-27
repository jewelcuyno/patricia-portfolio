export function getCvPublicActions(hasContent,slug){
  if(!hasContent||!slug)return [];
  return [{kind:"preview",href:`/cv/${slug}`,label:"View CV"},{kind:"download",href:`/cv/${slug}/pdf`,label:"Download CV"}];
}
