'use client';
import {useId} from 'react';
import {renderKeepsake} from '../lib/keepsake-designs.mjs';
import './print-designs.css';
// SVG escapes every event field and accepts only raster data URLs or our local test card.
// The same renderer is used by every thumbnail, full preview and print simulation.
export default function PrintCard({photo,cfg,monogram,template='ivory',filter='none',mini=false}){
 const id=useId();
 return <div className={'print luxuryPrint designPrint'+(mini?' miniPrint':'')} data-event={cfg.type||'other'} aria-hidden={mini?true:undefined} dangerouslySetInnerHTML={{__html:renderKeepsake({photo,cfg,monogram,template,filter,id})}}/>;
}
