import {lettering} from '../atelier-lettering.mjs';
import {rose} from '../generated/atelier-assets.mjs';
import {eventCopy} from '../keepsake-model.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const R=(x,y,w,h,fill='none',stroke='none',sw=1,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
export const P=(d,fill='none',stroke='none',width=1)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
export const L=(x1,y1,x2,y2,color,width=1)=>P(`M${x1} ${y1}L${x2} ${y2}`,'none',color,width);
export const C=(x,y,r,fill,stroke='none',width=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
export const G=(x,y,s,body,rotate=0)=>`<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s})">${body}</g>`;
export const T=(text,x,y,w,size,fill,opts={})=>lettering(text,x,y,w,size,fill,opts);
export const tiny=(text,x,y,w,fill)=>T(text,x,y,w,25,fill,{face:'sans',tracking:3});
export const label=(text,x,y,w,fill)=>T(text,x,y,w,31,fill,{face:'sans',tracking:4});
export function name(text,x,y,w,size,fill,{bounds=[1400,1620],face='script'}={}){return `<g data-text-role="name" data-safe-left="${x-w/2}" data-safe-right="${x+w/2}" data-safe-top="${bounds[0]}" data-safe-bottom="${bounds[1]}">${T(text,x,y,w,size,fill,{face,lines:2,bounds})}</g>`;}
export function context(input,spec){
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{},copy=eventCopy({...cfg,type:spec.family});
 const id=String(input.id||'card').replace(/[^a-zA-Z0-9_-]/g,'')||'card';
 let photo=input.photo||'';if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)&&photo!=='/print-test.svg')photo='';
 const filter=['none','brightness(1.08) contrast(.96) saturate(.88)','grayscale(1) contrast(1.08) brightness(1.04)','sepia(.18) saturate(.92) brightness(1.03)'].includes(input.filter)?input.filter:'none';
 const gold=`url(#${id}-gold)`,silver=`url(#${id}-silver)`;
 return {cfg,c:copy,d:spec,id,photo,filter,gold,silver,monogram:String(input.monogram||copy.title.split(/\s+/).filter(w=>w&&w!=='&').slice(0,2).map(w=>[...w][0]).join('')).slice(0,8)};
}
export function begin(q){const {d,id}=q;return R(0,0,1200,1800,d.paper)+`<defs><linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#9a7841"/><stop offset=".32" stop-color="#d9bf87"/><stop offset=".47" stop-color="#f3dfab"/><stop offset=".68" stop-color="#b19252"/><stop offset="1" stop-color="#cbae73"/></linearGradient><linearGradient id="${id}-silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7d9fb0"/><stop offset=".45" stop-color="#e8eff0"/><stop offset="1" stop-color="#7da3b4"/></linearGradient><linearGradient id="${id}-wash" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${d.accent}" stop-opacity=".20"/><stop offset="1" stop-color="${d.paper}" stop-opacity=".02"/></linearGradient></defs>`;}
export function finish(q,art){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(q.d.name+' — '+q.c.title)}" data-design="${q.d.family}-${q.d.id}" data-template-key="${q.d.key}" data-layout="${q.d.layout}" data-collection="event-families"><title>${esc(q.c.title)}</title>${art}</svg>`;}
export function photo(q,{x=125,y=350,w=950,h=1000,shape='rect',radius=0}={}){
 const clip=shape==='arch'?P(`M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z`,'white'):shape==='cut'?P(`M${x+45} ${y}H${x+w-45}l45 45v${h-90}l-45 45H${x+45}l-45-45V${y+45}Z`,'white'):R(x,y,w,h,'white','none',0,radius);
 const fit=q.cfg.photoFit==='fit'||q.photo==='/print-test.svg'?'xMidYMid meet':'xMidYMid slice';
 const fallback=R(x,y,w,h,'#d7d9d1')+P(`M${x} ${y+h}Q${x+w/2} ${y+h*.1} ${x+w} ${y+h}Z`,'#a8b5ad')+C(x+w/2,y+h*.34,w*.15,'#bbc7bc');
 const media=q.photo?`<image data-guest-photo="true" href="${esc(q.photo)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" style="filter:${q.filter}"/>`:fallback;
 return `<defs><clipPath id="${q.id}-photo">${clip}</clipPath></defs><g clip-path="url(#${q.id}-photo)">${R(x,y,w,h,'#d6d5c9')}${media}</g><g fill="none" stroke="${q.gold}" stroke-width="3">${clip.replace(/fill="white"/g,'fill="none"').replace(/stroke="none"/g,'stroke="'+q.gold+'"').replace(/stroke-width="[0-9.]+"/g,'stroke-width="3"')}</g>`;
}
export function frame(color){return R(45,45,1110,1710,'none',color,2)+R(59,59,1082,1682,'none',color,.9);}
export function diamond(x,y,r,color){return P(`M${x} ${y-r}l${r} ${r}-${r} ${r}-${r}-${r}Z`,'none',color,2);}
export function glint(x,y,r,color){return G(x,y,1,P(`M0-${r}Q3-3 ${r} 0Q3 3 0 ${r}Q-3 3-${r} 0Q-3-3 0-${r}Z`,color));}
export function starOfDavid(x,y,r,color){return G(x,y,1,P(`M0-${r} ${r*.866} ${r*.5}H-${r*.866}ZM0 ${r} ${r*.866}-${r*.5}H-${r*.866}Z`,'none',color,2.8));}
// Entirely deterministic paths: no animation, canvas tricks or network-dependent artwork.
export function foliage(x,y,s,color='#667b68',second='#c4b07d',rotate=0){let a=P('M0 270C-16 174 50 84 15-50','none',color,2.3);for(let i=0;i<10;i++){const yy=230-i*27,xx=14+Math.sin(i*.45)*11,side=i%2?1:-1;a+=G(xx,yy,1,P(`M0 0C${side*45}-${20} ${side*70}-${53} ${side*46}-${78}C${side*6}-${57} ${side*7}-${22} 0 0Z`,i%3===0?second:color)+P(`M0 0Q${side*26}-34 ${side*46}-78`,'none','#e5dcc5',.65));}return G(x,y,s,a,rotate);}
export function laurel(x,y,s,color){let a=P('M-8 80C-104 60-106-45-45-86M8 80C104 60 106-45 45-86','none',color,2);for(const side of [-1,1])for(let i=0;i<8;i++){const yy=55-i*17,xx=side*(60+Math.sin(i*.42)*23);a+=G(xx,yy,1,P(`M0 0q${side*25}-12 ${side*26}-35q${-side*25} 2 ${-side*26} 35Z`,color));}return G(x,y,s,a);}
export function blooms(x,y,s,rotate=0){return G(x,y,s,`<image data-artwork="painted-botanical" href="${rose}" width="436" height="637"/>`,rotate);}
export function cap(x,y,s,color,gold){return G(x,y,s,P('M-100-12 0-50 100-12 0 24Z','#242a29',gold,2)+P('M-65 11v44q65 32 130 0V11','#333b34',gold,2)+P('M0-20 87 4v93','none',gold,3)+P('m82 90-10 55h30L93 90Z',gold)+C(0,-20,5,color));}
export function diploma(x,y,s,color,gold){return G(x,y,s,P('M-125-22Q-132-62-92-56L112-56Q153-53 143-18V63L-100 72Q-138 76-127 33Z','#e9ddba','#a98e62',1.5)+P('M110-55q-28 26-7 54q18 15 31-4M-121 18q22-22 33 4v51','none','#b29a6d',2)+R(-27,-58,53,132,color)+P('M-7 14q-53-55-48-15q4 25 48 15m14 0q53-55 48-15q-4 25-48 15','none',color,14)+C(0,17,30,gold)+laurel(0,17,.27,color),-17);}
export function ribbon(x,y,s,color,rotate=0){return G(x,y,s,P('M0 0C38 12-24 42 12 61C48 76-12 93 24 120l17-2C3 99 66 81 29 59C-5 39 60 15 23-3Z',color),rotate);}
export function confetti(color,secondary,count=36,seed=19){let a='',n=seed;const rand=()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};for(let i=0;i<count;i++){const left=i%2===0,x=left?25+rand()*63:1112+rand()*63,y=55+rand()*1680,r=4+rand()*8;a+=i%4===0?G(x,y,.32+rand()*.2,ribbon(0,0,1,i%3?color:secondary),rand()*100):R(x,y,r*1.1,r*2,i%3?color:secondary,'none',0,2);}return a;}
export function dust(color,count=210,seed=47){let a='',n=seed;const rand=()=>{n=(Math.imul(1103515245,n)+12345)>>>0;return n/4294967296;};for(let i=0;i<count;i++){const t=rand(),x=i%2===0?t*580:1200-t*540,y=i%2===0?34+Math.pow(t,1.4)*210+rand()*40:1770-Math.pow(t,1.4)*200-rand()*55;a+=C(x,y,1+rand()*3,color);}return a;}
export function marble(color,gold,side=0){
 let art='';
 for(let i=0;i<34;i++){
  const shift=i*5.7;
  art+=P(`M-${90+shift} -8C${118+shift} 53 ${64+shift} 70 ${93+shift} 128S${8+shift} 155 ${26+shift} 210S-${6+shift} 235 -20 327`,'none',i%7===0?gold:color,i%7===0?2.2:1.1);
 }
 art+=P('M-30-20C58 49 72 73 50 115S10 191-20 219L-40-20Z',color);
 return side?`<g transform="translate(1200 1800) rotate(180)">${art}</g>`:art;
}
export function footer(q,{subtitle=q.c.subtitle,y=1640,color=q.d.ink,width=965}={}){return T(subtitle,600,y,width,31,color,{face:'sans'})+T(q.c.date,600,1734,980,27,color,{face:'sans',tracking:1.1});}
