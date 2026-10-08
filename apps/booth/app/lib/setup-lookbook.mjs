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


// A small, print-safe edge trim ties palette choices to the real 4x6 card.
// The 3 template compositions retain their own legible title colors.
// Strip compositions already render the primary and secondary event colors.
export function applyEventPaletteTrim(svg,details){
 const primary=/^#[\da-f]{6}$/i.test(details?.primaryColor||'')?details.primaryColor:null;
 const secondary=/^#[\da-f]{6}$/i.test(details?.secondaryColor||'')?details.secondaryColor:null;
 if(!primary&&!secondary)return svg;
 const a=primary||'#3c5746',b=secondary||'#c5a469';
 const trim='<g data-event-color-trim="true" fill="none" stroke-linecap="round" aria-hidden="true">'
  +'<path d="M41 165V41H166 M1034 41H1159V165" stroke="'+b+'" stroke-width="8" opacity=".93"/>'
  +'<path d="M41 1635V1759H166 M1034 1759H1159V1635" stroke="'+a+'" stroke-width="8" opacity=".9"/>'
  +'<path d="M199 41H1001 M199 1759H1001" stroke="'+a+'" stroke-width="3" opacity=".65"/>'
  +'<circle cx="190" cy="41" r="5" fill="'+b+'" stroke="none"/>'
  +'<circle cx="1010" cy="41" r="5" fill="'+b+'" stroke="none"/>'
  +'<circle cx="190" cy="1759" r="5" fill="'+a+'" stroke="none"/>'
  +'<circle cx="1010" cy="1759" r="5" fill="'+a+'" stroke="none"/></g>';
 return String(svg).replace(/<\/svg>\s*$/,trim+'</svg>');
}
