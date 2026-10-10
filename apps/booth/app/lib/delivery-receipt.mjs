// Client-safe presentation of an actual server receipt. A sending-only email
// credential cannot confirm delivery, even after the provider accepts a send.
export function deliveryReceiptView(receipt,config){
 const unavailable=receipt?.channel==='email'&&config?.email?.receiptsEnabled===false;
 const accepted=unavailable&&['queued','sent'].includes(receipt?.status);
 return {canCheck:Boolean(receipt)&&!unavailable,unavailable,message:accepted?
  'The email service accepted your photo. Check your inbox and spam folder; delivery has not been confirmed.':receipt?.message||''};
}
