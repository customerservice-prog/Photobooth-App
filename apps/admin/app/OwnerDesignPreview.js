'use client';
import {useId} from 'react';
import {renderOwnerDesign} from '../lib/owner-design-preview.mjs';
import {isFprPrintPreset} from '../../booth/app/lib/fpr-print-presets.mjs';
import './owner-design.css';

export function OwnerDesignArtwork({cfg,shots=1}){
 const id=useId();
 return <span className="ownerDesignArtwork" dangerouslySetInnerHTML={{__html:renderOwnerDesign(cfg,shots,id)}}/>;
}
export default function OwnerDesignPreview({cfg,designName,previewNote=''}){
 const matchingStrips=isFprPrintPreset(cfg.defaultTemplate)||cfg.defaultTemplate==='grad-gala'||cfg.defaultTemplate==='custom'&&cfg.customDesign?.layouts?.four?.copies===2;
 return <div className="ownerDesignProof" data-testid="owner-design-proof">
  <div className="ownerDesignProofHeading"><span>YOUR CUSTOMER'S KEEPSAKES</span><strong>{designName}</strong></div>
  {previewNote&&<p className="ownerProofNotice" role="status">{previewNote}</p>}
  <div className="ownerDesignProofGrid">{[1,4].map(shots=><figure key={shots} data-testid={'owner-proof-'+shots}>
   <OwnerDesignArtwork cfg={cfg} shots={shots}/><figcaption><strong>{shots} {shots===1?'Photo':'Photos'}</strong><span>{shots===4&&matchingStrips?'Two matching strips · one 4×6 sheet':'One 4×6 sheet'}</span></figcaption>
  </figure>)}</div>
  <p>Guests' photos fill these spaces. Both choices use this artwork.</p>
 </div>;
}
