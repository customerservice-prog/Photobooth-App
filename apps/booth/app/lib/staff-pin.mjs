// Shared length/format only. The actual staff PIN is never included in the app bundle.
// Railway stores BOOTH_STAFF_PIN_SHA256, not plaintext.
export const STAFF_PIN_LENGTH=4;
export function isValidStaffPin(value){
 return typeof value==='string'&&/^\d{4}$/.test(value);
}
export function normalizeStaffPinInput(value){
 return String(value??'').replace(/\D/g,'').slice(0,STAFF_PIN_LENGTH);
}
