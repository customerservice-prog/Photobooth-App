// Real palette combinations. These are applied to saved event details and to the
// same renderers used by the actual 4x6 keepsake, not display-only swatches.
export const SETUP_COLOR_STORIES=Object.freeze([
 Object.freeze({id:'champagne',name:'Champagne',primary:'#32463e',secondary:'#d4ad73'}),
 Object.freeze({id:'rose',name:'Rose Garden',primary:'#855665',secondary:'#e4b4a1'}),
 Object.freeze({id:'midnight',name:'Black Tie',primary:'#222b37',secondary:'#cba65c'}),
 Object.freeze({id:'coastal',name:'Coastal Blue',primary:'#29546a',secondary:'#a2c9d9'}),
 Object.freeze({id:'sage',name:'Botanical',primary:'#54715b',secondary:'#c5bd89'}),
 Object.freeze({id:'festival',name:'Party Pop',primary:'#673b78',secondary:'#e5b458'})
]);
export function paletteSelected(details,palette){
 return Boolean(palette&&details?.primaryColor?.toLowerCase()===palette.primary.toLowerCase()&&details?.secondaryColor?.toLowerCase()===palette.secondary.toLowerCase());
}
