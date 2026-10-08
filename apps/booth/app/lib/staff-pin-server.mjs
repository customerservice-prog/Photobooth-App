// Server-only verifier. Only the salted/offline verifier is stored on the iPad.
// Never put the staff PIN or the configured SHA-256 digest in client code.
import {createHash,timingSafeEqual} from 'node:crypto';
import {isValidStaffPin} from './staff-pin.mjs';
export function matchesConfiguredStaffPin(pin,configuredSHA256){
 const expected=/^[a-f0-9]{64}$/i.test(configuredSHA256||'')?
  Buffer.from(configuredSHA256,'hex'):Buffer.alloc(32);
 const actual=createHash('sha256').update(typeof pin==='string'?pin:'').digest();
 return isValidStaffPin(pin)&&timingSafeEqual(actual,expected);
}
