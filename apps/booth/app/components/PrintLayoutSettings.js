'use client';
import {normalizePrintLayouts} from '../lib/print-layouts.mjs';
import './photo-strip-options.css';
export default function PrintLayoutSettings({value,onChange}){
 const v=normalizePrintLayouts(value);
 function change(key,next){onChange(normalizePrintLayouts({...v,[key]:next}));}
 return <fieldset className="psSettings"><legend>Photo layout options</legend><p>Guests choose after all their photos are taken.</p>
  <div className="psSettingChoices">
   <label><input type="checkbox" checked={v.cardEnabled} disabled={!v.stripEnabled} onChange={e=>change('cardEnabled',e.target.checked)}/>Enable 4×6 Card</label>
   <label><input type="checkbox" checked={v.stripEnabled} disabled={!v.cardEnabled} onChange={e=>change('stripEnabled',e.target.checked)}/>Enable Photo Strip</label>
  </div>
  <label className="psSettingField">Default photo layout<select value={v.defaultLayout} onChange={e=>change('defaultLayout',e.target.value)}>{v.cardEnabled&&<option value="card">4×6 Card</option>}{v.stripEnabled&&<option value="photo_strip">Photo Strip</option>}</select></label>
  <label className="psSettingField">Strips per printed sheet<select disabled={!v.stripEnabled} value={v.stripMode} onChange={e=>change('stripMode',e.target.value)}><option value="double">Two matching strips</option><option value="single">One centered strip</option></select></label>
  <label className="psSettingField">Strip footer text (optional)<input disabled={!v.stripEnabled} value={v.footerText} maxLength={80} placeholder="Uses your event caption when blank" onChange={e=>change('footerText',e.target.value)}/></label>
  <label className="psColorSetting"><input type="checkbox" disabled={!v.stripEnabled} checked={v.useEventColors} onChange={e=>change('useEventColors',e.target.checked)}/>Use event colors on strips</label>
  <p className="psFine">Two strips still use one 4×6 sheet and one print request. Cut between them after printing. Settings apply in this browser; use a settings backup to transfer them to the iPad.</p>
 </fieldset>;
}
