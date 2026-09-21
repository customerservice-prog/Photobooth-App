import {context,begin,finish,R,P,L,T,G,C,label,tiny,name,photo,frame,foliage,laurel,cap,diploma,ribbon,confetti,footer} from './svg-kit.mjs';
function honors(q){const {d,c,cfg,gold}=q;let a=begin(q)+frame(gold)+laurel(600,186,1.0,d.accent);
 a+=tiny(cfg.details?.classYear?'CLASS OF':'CELEBRATING',600,136,460,d.ink)+T(cfg.details?.classYear||'THE GRADUATE',600,233,510,cfg.details?.classYear?114:44,d.accent,{face:'serif'});
 a+=tiny('THE NEXT CHAPTER STARTS HERE',600,318,950,d.ink)+photo(q,{x:112,y:377,w:976,h:930});
 a+=foliage(74,1580,.8,'#7b8870','#b59a60',12)+diploma(155,1624,.78,d.ink,gold);
 a+=name(c.title,660,1489,842,165,d.accent,{bounds:[1400,1559]})+label('GRADUATE',666,1610,780,d.ink)+T(c.subtitle,666,1665,770,28,d.ink,{face:'sans'})+T(c.date,666,1734,770,26,d.ink,{face:'sans',tracking:1});
 return finish(q,a);}
function celebration(q){const {d,c,cfg,gold}=q;let a=begin(q)+confetti(gold,d.ink,48,63);
 a+=T('Congrats, Graduate!',578,213,942,136,d.ink,{face:'script'})+cap(1066,168,.63,d.ink,gold);
 a+=tiny(cfg.details?.classYear?'CLASS OF '+cfg.details.classYear:'YOU DID IT',600,296,835,d.accent)+photo(q,{x:133,y:356,w:934,h:982});
 a+=P('M150 1403Q210 1387 312 1396L1060 1370l-23 24 45 6-27 20 13 12-30 18 15 15-18 30-892 46 35-22-27-10 28-23-16-13 33-19Z','#282c28');
 a+=name(c.title,600,1525,846,154,gold,{bounds:[1430,1568]});
 a+=tiny('DREAM BIG · GO FURTHER',600,1618,910,d.ink)+T(c.subtitle,600,1672,940,29,d.ink,{face:'sans'})+T(c.date,600,1734,965,27,d.ink,{face:'sans',tracking:1});
 return finish(q,a);}
function future(q){const {d,c,cfg,gold}=q;let a=begin(q);
 a+=P('M777 0h145l278 258v125Z',gold)+P('M0 1465l330 335H214L0 1587Z',gold)+L(987,62,987,1738,gold,2)+L(1000,62,1000,1738,d.accent,.8);
 a+=T('NEXT CHAPTER',510,185,843,103,gold,{face:'serif',lines:2,bounds:[83,261]})+tiny('THE FUTURE IS YOURS',510,320,795,d.ink);
 a+=photo(q,{x:85,y:408,w:836,h:958});
 const year=cfg.details?.classYear||'GRADUATE';a+=G(1110,930,1,T(year,0,0,1060,cfg.details?.classYear?231:134,gold,{face:'serif'}),90);
 a+=name(c.title,510,1517,839,158,d.ink,{bounds:[1430,1635]})+T(c.subtitle,510,1672,835,27,d.ink,{face:'sans'})+T(c.date,510,1734,835,25,d.ink,{face:'sans',tracking:1});
 return finish(q,a);}
export function renderGraduation(input,spec){const q=context(input,spec);return ({'honors-edit':honors,'confetti-graduate':celebration,'modern-future':future})[spec.layout](q);}
