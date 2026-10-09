// Five owner-approved photo booth sample themes. This is the entire preset menu;
// 'custom' remains a separate customer-specific artwork workflow.
export const FPR_PRINT_PRESETS=Object.freeze([
 Object.freeze({id:'fpr-graduation',key:'graduation',name:'Graduation',caption:'Class of 2026 · Navy & Gold',image:'/print-presets/graduation-sample-2026.webp'}),
 Object.freeze({id:'fpr-wedding',key:'wedding',name:'Wedding',caption:'Floral Mr. & Mrs.',image:'/print-presets/wedding-sample-2026.webp'}),
 Object.freeze({id:'fpr-birthday',key:'birthday',name:'Birthday',caption:'Pink & Rose Gold',image:'/print-presets/birthday-sample-2026.webp'}),
 Object.freeze({id:'fpr-quince',key:'quince',name:'Quinceañera',caption:'Lavender Mis XV',image:'/print-presets/quince-sample-2026.webp'}),
 Object.freeze({id:'fpr-corporate',key:'corporate',name:'Corporate Event',caption:'Black & Gold Gala',image:'/print-presets/corporate-sample-2026.webp'})
]);
const ids=new Set(FPR_PRINT_PRESETS.map(item=>item.id));
export const isFprPrintPreset=value=>ids.has(value);
export const presetById=value=>FPR_PRINT_PRESETS.find(item=>item.id===value)||null;
export function presetForEventType(type){
 const t=String(type||'').toLowerCase();
 if(t.includes('graduation'))return 'fpr-graduation';
 if(t.includes('wedding'))return 'fpr-wedding';
 if(t.includes('quince'))return 'fpr-quince';
 if(t.includes('corporate'))return 'fpr-corporate';
 return 'fpr-birthday';
}