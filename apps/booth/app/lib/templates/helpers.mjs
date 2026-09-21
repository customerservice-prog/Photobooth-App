import {lettering} from '../atelier-lettering.mjs';
import {eventCopy} from '../keepsake-model.mjs';
import {rose} from '../generated/atelier-assets.mjs';
export const clean=v=>String(v??'').normalize('NFC').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,240);
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const rect=(x,y,w,h,fill,stroke='none',sw=1,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
export const path=(d,stroke='none',sw=1,fill='none')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
export const text=(value,x,y,width,size,color,options={})=>lettering(clean(value),x,y,width,size,color,options);
export const rule=(x1,y,x2,color,sw=1)=>path(`M${x1} ${y}H${x2}`,color,sw);
export function context(input,template){const cfg={...input.cfg,type:template.eventType};return {cfg,copy:eventCopy(cfg),id:String(input.id||'card').replace(/[^a-zA-Z0-9_-]/g,'')||'card',template,photo:input.photo||'',filter:input.filter||'none',monogram:input.monogram||''};}
export function goldDefs(id){return `<linearGradient id="${id}-foil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9e7c40"/><stop offset=".32" stop-color="#d9bc80"/><stop offset=".49" stop-color="#f6e3b1"/><stop offset=".72" stop-color="#a27e42"/><stop offset="1" stop-color="#dcc38e"/></linearGradient>`;}
export function svg(ctx,{photo,before='',after='',copy='',defs=''}={}){
 const {id,template:t}=ctx,gold=`url(#${id}-foil)`,b=photo||t.photo;
 let source=ctx.photo;if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source)&&source!=='/print-test.svg')source='';
 const allowed=['none','brightness(1.08) contrast(.96) saturate(.88)','grayscale(1) contrast(1.08) brightness(1.04)','sepia(.18) saturate(.92) brightness(1.03)'];const filter=allowed.includes(ctx.filter)?ctx.filter:'none';
 const fit=ctx.cfg.photoFit==='fit'||source==='/print-test.svg';
 const x=b.x,y=b.y,w=b.width,h=b.height;
 const shape=!fit&&b.shape==='arch'?path(`M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z`,'none',0,'#fff'):!fit&&b.shape==='cutout'?path(`M${x+45} ${y}H${x+w-45}l45 45v${h-90}l-45 45H${x+45}l-45-45V${y+45}Z`,'none',0,'#fff'):rect(x,y,w,h,'#fff','none',0,fit?0:b.radius||0);
 const border=shape.replace(/fill="[^"]*"/g,'fill="none"').replace(/stroke="[^"]*"/g,'stroke="'+gold+'"').replace(/stroke-width="[^"]*"/g,'stroke-width="2"');
 const picture=source?`<image data-guest-photo="true" href="${esc(source)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid ${fit?'meet':'slice'}" style="filter:${filter}"/>`:rect(x,y,w,h,'#d9d6cc')+path(`M${x} ${y+h}Q${x+w/2} ${y+h*.18} ${x+w} ${y+h}Z`,'none',0,'#aeb7ac')+`<circle cx="${x+w/2}" cy="${y+h*.35}" r="${w*.15}" fill="#c1c7bb"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(t.name+' — '+ctx.copy.title)}" data-collection="event-collections-v1" data-template-id="${t.id}" data-design="${t.eventType}-${t.legacyId}" data-layout="${t.layout}"><title>${esc(ctx.copy.title)}</title><defs>${goldDefs(id)}<clipPath id="${id}-photo">${shape}</clipPath>${defs}</defs>${rect(0,0,1200,1800,t.paper)}${before}<g clip-path="url(#${id}-photo)">${rect(x,y,w,h,t.photoMat||'#e6e1d5')}${picture}</g>${border}${after}${copy}</svg>`;
}
export const gold=ctx=>`url(#${ctx.id}-foil)`;
export function nameBlock(ctx,{value=ctx.template.eventType==='corporate'?ctx.copy.title.toUpperCase():ctx.copy.title,y=1500,width=980,size=160,face='script',ink=ctx.template.ink,bounds=[1380,1605]}={}){return `<g data-text-role="name">${text(value,600,y,width,size,ink,{face,lines:2,bounds})}</g>`;}
export function footer(ctx,{caption=ctx.copy.subtitle,date=ctx.copy.date,ink=ctx.template.ink,captionY=1652,dateY=1728}={}){return text(caption,600,captionY,970,29,ink,{face:'sans',tracking:.6})+text(date,600,dateY,960,26,ink,{face:'sans',tracking:1.1});}
export function leaves(x,y,scale=1,rotation=0,a='#8e9c8b',b='#b5a174'){
 return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${path('M0 310C-40 190 20 80 0 0',a,3)}${Array.from({length:11},(_,i)=>{const side=i%2?1:-1,yy=25+i*24,xx=Math.sin(i*.6)*8;return `<g transform="translate(${xx} ${yy}) rotate(${side*55})">${path('M0 0C-24-19-25-60-5-86C17-60 25-20 0 0Z',a,.8,i%3?a:b)}${path('M-5-78Q3-41 0 0','#fff',.8)}</g>`;}).join('')}</g>`;
}
export const botanical=(x,y,s,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${s})"><image data-artwork="museum-rose" href="${rose}" width="436" height="637"/></g>`;
export function medallion(x,y,r,color){return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${color}"/><circle r="${r-9}" fill="none" stroke="#f8edcf" stroke-width="2"/>${Array.from({length:36},(_,i)=>`<path transform="rotate(${i*10})" d="M0-${r-3}V-${r+4}" stroke="${color}" stroke-width="4"/>`).join('')}</g>`;}
export function spark(x,y,s,c){return path(`M${x} ${y-s}Q${x+2} ${y-2} ${x+s} ${y}Q${x+2} ${y+2} ${x} ${y+s}Q${x-2} ${y+2} ${x-s} ${y}Q${x-2} ${y-2} ${x} ${y-s}Z`,'none',0,c);}
export function hexagram(x,y,s,color){return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="3"><path d="M0-${s} ${s*.866} ${s*.5}H-${s*.866}Z M0 ${s} ${s*.866}-${s*.5}H-${s*.866}Z"/></g>`;}
export function chosenMotif(ctx,x,y,s){return ctx.cfg.details?.symbols==='Star of David'?hexagram(x,y,s,gold(ctx)):spark(x,y,s,gold(ctx));}
export function laurel(x,y,s,c){return `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 78C-100 65-100-37-44-75M0 78C100 65 100-37 44-75',c,2)}${[-1,1].map(side=>Array.from({length:8},(_,i)=>{const t=i/7*Math.PI*.86+Math.PI*.10,xx=side*Math.sin(t)*67,yy=70-Math.cos(t)*135;return path(`M ${xx} ${yy} q ${side*26} -25 ${side*37} -11 q ${-side*10} 28 ${-side*37} 11`,'none',0,c);}).join('')).join('')}</g>`;}
export function cap(x,y,s,c){return `<g transform="translate(${x} ${y}) rotate(12) scale(${s})">${path('M-85 0 0-35 85 0 0 35Z',c,2,'#292b2b')}${path('M-53 23v33q53 27 106 0V23','#30312d',2,'#3c403b')}${path('M0 0 83 0v77',c,4)}<circle cx="83" cy="78" r="5" fill="${c}"/>${Array.from({length:6},(_,i)=>path(`M${80+i} 84l${i-2} 31`,c,2)).join('')}</g>`;}
export function confetti(c,variant='gold',count=70){const colors=variant==='color'?['#bd7b85','#83a5a7','#b99b5e','#aab5a0']:[c,'#b39756','#292d30'];return Array.from({length:count},(_,i)=>{const left=i%2===0,x=left?22+(i*29)%75:1105+(i*17)%68,y=90+(i*157)%1630,r=(i*47)%360;return `<g transform="translate(${x} ${y}) rotate(${r})">${i%3?rect(-3,-7,6,14,colors[i%colors.length],'none',0,2):`<circle r="${3+i%5}" fill="${colors[i%colors.length]}"/>`}</g>`;}).join('');}
export function ribbons(c){return [[65,185,0],[1110,670,170],[68,1220,16],[1080,1620,158]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})">${path('M0 0C88 4 74 60 14 61C-31 62-3 119 71 118',c,18)}${path('M0 0C88 4 74 60 14 61C-31 62-3 119 71 118','#fff6',3)}</g>`).join('');}
export function cornerLines(c){return path('M60 230V60h170M970 60h170v170M60 1570v170h170m740 0h170v-170M74 210V74h136m780 0h136v136M74 1590v136h136m780 0h136v-136',c,2);}
export function marble(c){return `<g opacity=".82">${path('M0 0H410Q205 64 230 160Q95 95 0 300Z','none',0,'#263e48')}${path('M1200 1800H850q140-110 65-192q170-25 285-260Z','none',0,'#263e48')}${path('M0 286Q185 71 223 171Q258 67 422 0M1200 1350q-195 85-281 246q112 71-74 204',c,5)}${path('M0 270Q140 200 172 116T400 0m800 1390q-200 80-244 213q45 95-94 197',c,1.3)}</g>`;}
export function definition(data){return Object.freeze({...data,photo:Object.freeze(data.photo),typography:Object.freeze(data.typography||{heading:'serif',name:'script',body:'sans'})});}
