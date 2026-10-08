import Link from 'next/link';
import {createTemplate} from '../actions';
import {PageHeader} from '../../StudioUI';
const CATEGORIES=['Wedding','Birthday','Graduation','Bar / Bat Mitzvah','Sweet 16','Baby Shower','Corporate','Holiday','Anniversary','Quinceañera','School','General Party'];
export default function NewTemplatePage(){
 return <main className="page pageCompact">
  <Link href="/templates" className="btnPlain" style={{paddingLeft:0}}>← Print designs</Link>
  <PageHeader eyebrow="DESIGN LIBRARY" title="Register a print design" subtitle="This creates a design record and blank canvas in the admin database. It does not automatically install new printable artwork on an iPad."/>
  <form action={createTemplate} className="card formSection">
   <div className="formGrid">
    <label className="formField">Design name *<input className="input" name="name" required placeholder="Ivory & Gold Wedding"/></label>
    <label className="formField">Occasion<select name="category" className="input" defaultValue="Wedding">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
    <label className="formField">Print sheet format<select name="format" className="input" defaultValue="4x6_portrait"><option value="4x6_portrait">4×6 Portrait · 1200 × 1800</option><option value="4x6_landscape">4×6 Landscape · 1800 × 1200</option><option value="2x6_strip">2×6 Strip · 600 × 1800</option></select></label>
   </div>
   <div className="warningNote" style={{margin:'19px 0'}}>The live guest booth already offers one centered strip or two matching strips on a 4×6 sheet. Registering a 2×6 canvas here does not deploy a new strip design to that app.</div>
   <div className="buttonRow"><button className="btn" type="submit">Create design record</button><Link href="/templates" className="btn btn2">Cancel</Link></div>
  </form>
 </main>;
}