// Offline illustrated mock photo, used only in the event-setup preview.
// It never becomes a guest photo, is never archived, and never enters print jobs.
const color=(input,fallback)=>/^#[a-f0-9]{6}$/i.test(input||'')?input:fallback;
export function createIllustrativePreviewPhotos(primary='#32463e',secondary='#d4ad73'){
 if(typeof document==='undefined')return [];
 const ink=color(primary,'#32463e'),gold=color(secondary,'#d4ad73');
 const canvas=document.createElement('canvas');
 canvas.width=600;canvas.height=820;
 const ctx=canvas.getContext('2d');
 if(!ctx)return [];
 const result=[];
 const oval=(x,y,rx,ry,fill)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
 for(let pose=0;pose<4;pose++){
  ctx.clearRect(0,0,600,820);
  const bg=ctx.createLinearGradient(0,0,600,820);
  bg.addColorStop(0,'#223d36');bg.addColorStop(.52,ink);bg.addColorStop(1,'#132a2a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,600,820);
  const amber=ctx.createRadialGradient(305,250,10,310,300,440);
  amber.addColorStop(0,'rgba(255,235,195,.43)');
  amber.addColorStop(.4,'rgba(247,213,152,.10)');
  amber.addColorStop(1,'rgba(20,42,37,0)');
  ctx.fillStyle=amber;ctx.fillRect(0,0,600,820);
  ctx.strokeStyle=gold;ctx.lineWidth=4;ctx.globalAlpha=.72;
  ctx.beginPath();ctx.moveTo(62,780);ctx.lineTo(62,225);
  ctx.bezierCurveTo(62,40,539,40,539,225);ctx.lineTo(539,780);ctx.stroke();
  ctx.globalAlpha=.4;ctx.lineWidth=1.3;ctx.beginPath();
  ctx.moveTo(76,760);ctx.lineTo(76,230);ctx.bezierCurveTo(76,67,525,67,525,230);
  ctx.lineTo(525,760);ctx.stroke();ctx.globalAlpha=1;
  let seed=843+pose*311;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<62;i++){
   const x=random()*600,y=random()*770,r=1+random()*5,alpha=.13+random()*.4;
   ctx.fillStyle=i%3===0?'rgba(255,240,209,'+alpha+')':i%3===1?'rgba(247,203,149,'+alpha+')':'rgba(182,219,196,'+alpha+')';
   ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  // Two anonymous editorial silhouettes. No real visitor or generated person is represented.
  const movement=[-25,20,-10,16][pose];
  const outfit=ctx.createLinearGradient(120,440,370,820);
  outfit.addColorStop(0,'#8e8976');outfit.addColorStop(.3,'#324941');outfit.addColorStop(1,'#101f26');
  ctx.fillStyle=outfit;ctx.beginPath();
  ctx.moveTo(60,820);ctx.bezierCurveTo(78,566,158+movement,524,250+movement,540);
  ctx.bezierCurveTo(342,570,388,707,390,820);ctx.closePath();ctx.fill();
  const second=ctx.createLinearGradient(330,450,580,820);
  second.addColorStop(0,'#a49a7f');second.addColorStop(.2,'#384850');second.addColorStop(1,'#101e25');
  ctx.fillStyle=second;ctx.beginPath();
  ctx.moveTo(246,820);ctx.bezierCurveTo(250,575,392-movement,500,484-movement,541);
  ctx.bezierCurveTo(550,581,600,700,630,820);ctx.closePath();ctx.fill();
  oval(230+movement,453,68,90,'#c4a28b');
  oval(404-movement,450,68,91,'#b89c85');
  oval(220+movement,388,75,46,'#303734');
  oval(404-movement,384,74,48,'#2a3537');
  ctx.fillStyle='#29362e';ctx.beginPath();
  ctx.moveTo(177+movement,425);ctx.bezierCurveTo(136,327,167,295,213+movement,293);
  ctx.bezierCurveTo(278,298,304+movement,381,268+movement,425);
  ctx.closePath();ctx.fill();
  for(const side of [0,1]){
   ctx.save();ctx.translate(side?555:45,750);ctx.scale(side?-1:1,1);
   for(let i=0;i<7;i++){
    ctx.save();ctx.translate(i*4,-i*91);
    ctx.strokeStyle=i%2?'#c5a878':'#8ca68a';ctx.globalAlpha=.6;
    ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(0,80);
    ctx.quadraticCurveTo(40,-15,18,-97);ctx.stroke();
    oval(19,-62,20,10,i%2?'#e0c397':'#a6bfa2');
    ctx.restore();
   }ctx.restore();
  }
  ctx.globalAlpha=1;
  const shade=ctx.createLinearGradient(0,550,0,820);
  shade.addColorStop(0,'rgba(6,27,24,0)');
  shade.addColorStop(1,'rgba(5,23,20,.36)');
  ctx.fillStyle=shade;ctx.fillRect(0,550,600,270);
  result.push(canvas.toDataURL('image/jpeg',.82));
 }
 canvas.width=0;canvas.height=0;
 return result;
}
