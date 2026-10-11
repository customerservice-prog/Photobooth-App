import {isFprPrintPreset} from './fpr-print-presets.mjs';

// This guides the live view only. Captures and archives retain the full frame.
export function approvedCaptureFrame(cfg={},current=1,total=4){
 if(cfg.guestMode!=='approved'||total!==4)return null;
 let width,height;
 if(isFprPrintPreset(cfg.defaultTemplate)||cfg.defaultTemplate==='grad-gala'){
  width=552;height=650;
 }else if(cfg.defaultTemplate==='custom'){
  const index=Math.max(0,Math.min(3,Math.trunc(Number(current)||1)-1));
  const rect=cfg.customDesign?.layouts?.four?.rects?.[index];
  if(!rect||!Number.isFinite(rect.w)||!Number.isFinite(rect.h)||rect.w<=0||rect.h<=0)return null;
  width=rect.w*12;height=rect.h*18;
 }else return null;
 return {width,height,aspect:width/height,fit:cfg.photoFit==='fit'?'contain':'cover'};
}
