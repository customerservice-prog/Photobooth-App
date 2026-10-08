// Keep the installed app identity stable. Navigation never clears or migrates
// photos, settings, counters, or any other browser storage.
export const BOOTH_RELEASE='2026.10.08.11';
export const BOOTH_RELEASE_LABEL='Classic arcade four-photo print with corrected page layout';
const ENTRIES=Object.freeze({
  demo:'/?event=oct10-2026&demo=1',
  preparation:'/event-prep',
  saved:'/',
  launch:'/launch'
});
export function freshBoothEntry(kind='launch',stamp=Date.now()){
  if(!Object.prototype.hasOwnProperty.call(ENTRIES,kind))throw new Error('Choose a known booth destination.');
  if(!Number.isSafeInteger(stamp)||stamp<0)throw new Error('The refresh time is invalid.');
  const path=ENTRIES[kind],separator=path.includes('?')?'&':'?';
  return path+separator+'boothv='+encodeURIComponent(BOOTH_RELEASE)+'&refresh='+stamp;
}
