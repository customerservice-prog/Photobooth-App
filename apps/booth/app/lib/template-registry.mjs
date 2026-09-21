// Stable legacy IDs preserve saved events. Keys identify the real, distinct compositions.
// Adding a template family must supply its own renderer; a palette is not a template.
const IDS=['ivory','blush','champagne'];
function family(type,fields,designs){return Object.freeze({type,fields:Object.freeze(fields),templates:Object.freeze(designs.map((d,i)=>Object.freeze({id:IDS[i],key:type+'/'+d[0],family:type,name:d[1],description:d[2],layout:d[0],paper:d[3],ink:d[4],accent:d[5],supportedFields:Object.freeze([...fields]),format:Object.freeze({width:1200,height:1800,inches:'4 × 6'})})))};}
export const TEMPLATE_FAMILIES=Object.freeze({
 wedding:family('wedding',['partner1','partner2','venue','date'],[
  ['botanical','Rosewater Romance','Painted roses · flowing calligraphy','#f7f1e7','#655044','#b19565'],
  ['editorial','The Vow Edit','Fashion-editorial portrait · sculpted type','#f8f4ea','#442b35','#9d7a77'],
  ['deco','Black-Tie Heirloom','Champagne ornament · calligraphic names','#182c29','#f5ecd7','#c3a671']]),
 birthday:family('birthday',['honoree','age','theme','date'],[
  ['balloons','Champagne Birthday','Satin balloons · personal age seal','#f6e9dc','#824f52','#c69b60'],
  ['ticket','Retro Party Club','Scalloped ticket · oversized lettering','#f2d39c','#8d3d47','#aa583f'],
  ['disco','Midnight Disco','Faceted mirror ball · pearl and lilac','#28233d','#f1e7f0','#d3bccf']]),
 mitzvah:family('mitzvah',['honoree','mitzvahType','hebrewName','date'],[
  ['timeless-classic','Timeless Classic','Navy botanical engraving · ivory stationery','#f5f0e3','#203849','#b49358'],
  ['modern-luxe','Modern Luxe','Sapphire marble · architectural gold','#102c43','#f5ecd8','#c6a46d'],
  ['celebration-mosaic','Celebration Mosaic','Plum mosaic · arched celebration portrait','#f5e9e3','#64374c','#bd975e']]),
 graduation:family('graduation',['graduate','classYear','school','date'],[
  ['honors-edit','The Honors Edit','Laurel crest · diploma · graduate signature','#f5efdf','#514a3b','#ae8b4e'],
  ['confetti-graduate','Confetti Celebration','Gold ribbon confetti · brush-stroke signature','#faf5eb','#242725','#b58d45'],
  ['modern-future','Modern Future','Vertical class year · midnight editorial','#20282b','#f7f0e0','#c5a568']]),
 corporate:family('corporate',['company','eventName','date'],[
  ['executive-modern','Executive Modern','Company masthead · clean ivory geometry','#f5f2ea','#2b4242','#ad9363'],
  ['corporate-gala','Corporate Gala','Gilded marble · formal event invitation','#222a28','#f7ecd5','#c5a15d'],
  ['summit-modern','Summit Modern','Architectural skyline · blue event editorial','#153348','#e8f1f4','#82b0c6']]),
 other:family('other',['eventName','honoree','subtitle','date'],[
  ['botanical','Celebration Blooms','Painted florals · personal occasion title','#f7ece3','#624839','#bc9d6f'],
  ['evening-soiree','Evening Soirée','Champagne stardust · evening inscription','#232a29','#f5ebd4','#c5a46a'],
  ['confetti-moment','Confetti Moment','Painterly confetti · warm contemporary type','#f8f2e6','#315465','#b49153']])
});
export function resolveFamily(type){return Object.hasOwn(TEMPLATE_FAMILIES,type)?TEMPLATE_FAMILIES[type]:TEMPLATE_FAMILIES.other;}
export function getDesigns(type='other'){return resolveFamily(type).templates;}
export function getDesign(type,id){const f=resolveFamily(type);return f.templates.find(d=>d.id===id||d.key===id)||f.templates[0];}
