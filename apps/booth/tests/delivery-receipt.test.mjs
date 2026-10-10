import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryReceiptView} from '../app/lib/delivery-receipt.mjs';
import {statusLabel} from '../app/lib/delivery.mjs';

const sendingOnly={email:{receiptsEnabled:false}};
const receipt=(status,channel='email')=>({channel,status,message:statusLabel(channel,status)});

test('sending-only queued and sent emails show provider acceptance without implying delivery',()=>{
 for(const status of ['queued','sent']){
  const view=deliveryReceiptView(receipt(status),sendingOnly);
  assert.equal(view.canCheck,false);
  assert.equal(view.unavailable,true);
  assert.match(view.message,/email service accepted your photo/);
  assert.match(view.message,/delivery has not been confirmed/);
 }
});
test('an ambiguous or rejected email never gains a provider-accepted message',()=>{
 for(const status of ['unknown','failed','bounced','suppressed','sending']){
  const original=receipt(status),view=deliveryReceiptView(original,sendingOnly);
  assert.equal(view.canCheck,false);
  assert.equal(view.message,original.message);
  assert.doesNotMatch(view.message,/email service accepted your photo/);
 }
});
test('existing email receipt integrations keep receipt checks and their recorded statuses',()=>{
 for(const config of [{email:{receiptsEnabled:true}},{email:{}},null]){
  const original=receipt('delivered'),view=deliveryReceiptView(original,config);
  assert.equal(view.canCheck,true);
  assert.equal(view.unavailable,false);
  assert.equal(view.message,original.message);
  assert.match(view.message,/Inbox placement is not confirmed/);
 }
});
test('email sending-only credentials do not disable SMS receipt checks',()=>{
 const original=receipt('queued','sms'),view=deliveryReceiptView(original,sendingOnly);
 assert.equal(view.canCheck,true);
 assert.equal(view.unavailable,false);
 assert.equal(view.message,original.message);
});
test('no receipt means no check action and no success message',()=>{
 const view=deliveryReceiptView(null,sendingOnly);
 assert.equal(view.canCheck,false);
 assert.equal(view.message,'');
});
