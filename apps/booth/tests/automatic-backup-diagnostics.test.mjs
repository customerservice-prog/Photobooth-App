import test from 'node:test';
import assert from 'node:assert/strict';
import {isRegisteredProbeBlobError} from '../scripts/automatic-backup-diagnostics.mjs';

const origin='http://127.0.0.1:33583';
const id='b52752a7-4e9b-4732-8505-4d1dc7985771';
const registered=new Set(['blob:'+origin+'/'+id]);
const diagnostic=url=>url+' due to access control checks.';

test('WebKit diagnostics match only their registered Blob URL, including its truncated native spelling',()=>{
 for(const url of ['blob:'+origin+'/'+id,origin+'/'+id,origin.slice(1)+'/'+id,'blob:'+origin.slice(1)+'/'+id]){
  assert.equal(isRegisteredProbeBlobError('webkit',diagnostic(url),registered),true,url);
  assert.equal(isRegisteredProbeBlobError('webkit','Failed to load "'+url+'" due to access control checks.',registered),true,url);
 }
});
test('unregistered local files, HTTP endpoints and application failures remain fatal',()=>{
 for(const message of [
  diagnostic(origin+'/b52752a7-4e9b-4732-8505-4d1dc7985772'),
  diagnostic('http://127.0.0.1:33584/'+id),
  diagnostic(origin+'/api/backup/image'),
  diagnostic(origin+'/'+id+'-other'),
  diagnostic('https://127.0.0.1:33583/'+id),
  origin+'/'+id+' failed while creating the finished design.',
  'TypeError: capture failed',
 ])assert.equal(isRegisteredProbeBlobError('webkit',message,registered),false,message);
 assert.equal(isRegisteredProbeBlobError('chromium',diagnostic(origin+'/'+id),registered),false);
 assert.equal(isRegisteredProbeBlobError('webkit',diagnostic(origin+'/'+id),new Set()),false);
});
