import test from 'node:test';
import assert from 'node:assert/strict';
import {composeEventConfig} from '../app/lib/event-config.mjs';
import {getDesigns,renderKeepsake} from '../app/lib/keepsake-designs.mjs';
for(const d of getDesigns('other'))test(d.name+' preserves host, occasion and optional caption together',()=>{const cfg=composeEventConfig({type:'other'},{eventName:'Golden Anniversary',hostName:'The Carters',subtitle:'Together through the years',date:'September 22, 2026'});const svg=renderKeepsake({cfg,template:d.id});for(const text of ['Golden Anniversary','The Carters','Together through the years','September 22, 2026'])assert(svg.includes(text));});
