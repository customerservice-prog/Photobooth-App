import assert from 'node:assert/strict';

// Shared browser assertion for the actual guest screen, including saved legacy events.
export async function assertFinishedGuest(page,total){
 const preview=page.getByTestId('approved-guest-preview');
 await preview.waitFor({timeout:110000});
 await page.getByTestId('approved-finished-jpeg').waitFor({timeout:35000});
 await page.waitForFunction(()=>document.querySelector('[data-testid="approved-gallery-status"]')?.textContent?.includes('Saved to the event gallery'),null,{timeout:25000});
 assert.equal(await preview.getAttribute('data-output-layout'),total===1?'card':'photo_strip');
 assert.equal(await preview.locator('.agPaperWrap img').count(),1,'guest sees one preloaded finished picture');
 assert.equal(await preview.locator('.agDock button').count(),3,'guest has only Print, Send and Done');
 assert.equal(await page.getByTestId('approved-retake').count(),0,'retake is not another guest design control');
 assert.match(await page.getByTestId('approved-print').innerText(),/^Print/);
 assert.equal((await page.getByTestId('approved-digital-copy').innerText()).trim(),'Send');
 assert.match(await page.getByTestId('approved-done').innerText(),/^Done/);
 assert.equal(await page.locator('.ksGallery,.ksAdjustments,.ksPhotoTools,[data-testid="layout-card"],[data-testid="layout-strip"]').count(),0,'guest cannot change the preloaded look or photo layout');
 assert.equal(await preview.locator('input,select,textarea').count(),0,'finished preview has no adjustment forms');
 assert(!/Choose your keepsake|Photo adjustments|Event setup|Edit event|Show the whole photo|Fill the frame/i.test(await preview.innerText()));
 assert.equal(await page.locator('a[href^="/setup"],a[href^="/event-prep"]').count(),0,'no event setup navigation remains above the finished guest screen');
 const src=await page.getByTestId('approved-finished-jpeg').getAttribute('src');
 assert(src?.startsWith('data:image/jpeg;base64,'),'finished preview is the prepared real JPEG');
 return Buffer.from(src.split(',')[1],'base64');
}
