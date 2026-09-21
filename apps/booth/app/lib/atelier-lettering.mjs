// Typeface paths retain their OFL notices in generated/atelier-assets.mjs.
import {faces} from './generated/atelier-assets.mjs';
import {fitText} from './keepsake-model.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function measure(text,face,size,tracking=0){
 const font=faces[face],chars=[...text];let pen=0,minX=0,maxX=0,minY=0,maxY=0;
 for(let i=0;i<chars.length;i++){const g=font.glyphs[chars[i]];if(!g)return null;if(i)pen+=(font.kern[chars[i-1]+chars[i]]||0)*size/1000;const b=g.box||{x1:0,y1:-750,x2:g.advance,y2:250};minX=Math.min(minX,pen+b.x1*size/1000);maxX=Math.max(maxX,pen+b.x2*size/1000);minY=Math.min(minY,b.y1*size/1000);maxY=Math.max(maxY,b.y2*size/1000);pen+=g.advance*size/1000+tracking;}
 return {width:Math.max(maxX,pen-tracking)-minX,minX,minY,maxY};
}
export function lettering(raw,x,baseline,maxWidth,size,fill,{face='serif',tracking=0,lines=1,bounds=null}={}){
 const value=String(raw??'').normalize('NFC').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,240);if(!value)return '';
 const font=faces[face],m=measure(value,face,size,tracking);
 if(!m){let f=fitText(value,maxWidth,size,lines),y=baseline;if(bounds){const height=f.size*(.9+(f.lines.length-1)*1.13);if(height>bounds[1]-bounds[0])f={...f,size:f.size*(bounds[1]-bounds[0])/height};y=Math.max(bounds[0]+f.size*.8,Math.min(y,bounds[1]-f.size*(.15+(f.lines.length-1)*1.13)));}return f.lines.map((s,i)=>`<text data-copy="${esc(s)}" x="${x}" y="${y+i*f.size*1.13}" font-family="Georgia, serif" font-size="${f.size}" fill="${fill}" text-anchor="middle" ${s.length*f.size*.62>maxWidth?`textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(s)}</text>`).join('');}
 const chunks=[value];if(lines>1&&m.width>maxWidth*1.12&&value.includes(' ')){const words=value.split(' ');let split=1,best=Infinity;for(let i=1;i<words.length;i++){const delta=Math.abs(measure(words.slice(0,i).join(' '),face,size,tracking).width-measure(words.slice(i).join(' '),face,size,tracking).width);if(delta<best){best=delta;split=i;}}chunks.splice(0,1,words.slice(0,split).join(' '),words.slice(split).join(' '));}
 const widthScale=Math.min(1,maxWidth/Math.max(...chunks.map(s=>measure(s,face,size,tracking).width)));size*=widthScale;tracking*=widthScale;
 let metrics=chunks.map(s=>measure(s,face,size,tracking)),top=Math.min(...metrics.map((m,i)=>m.minY+i*size*1.12)),bottom=Math.max(...metrics.map((m,i)=>m.maxY+i*size*1.12));
 if(bounds&&bottom-top>bounds[1]-bounds[0]){const ratio=(bounds[1]-bounds[0])/(bottom-top);size*=ratio;tracking*=ratio;top*=ratio;bottom*=ratio;metrics=chunks.map(s=>measure(s,face,size,tracking));}
 if(bounds)baseline=Math.max(bounds[0]-top,Math.min(baseline,bounds[1]-bottom));
 return chunks.map((s,line)=>{const m=metrics[line];let pen=x-m.width/2-m.minX,art='';const chars=[...s];for(let i=0;i<chars.length;i++){const g=font.glyphs[chars[i]];if(i)pen+=(font.kern[chars[i-1]+chars[i]]||0)*size/1000;art+=`<path d="${g.path}" transform="translate(${pen.toFixed(2)} ${(baseline+line*size*1.12).toFixed(2)}) scale(${(size/1000).toFixed(6)})"/>`;pen+=g.advance*size/1000+tracking;}return `<g data-copy="${esc(s)}" aria-label="${esc(s)}" fill="${fill}">${art}</g>`;}).join('');
}
