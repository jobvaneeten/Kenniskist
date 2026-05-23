import { chromium } from 'playwright';
const browser = await chromium.launch();
const page    = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 750 });
page.on('pageerror',  e => console.log('ERR:', e.message));
page.on('console',    m => { const t = m.text(); if (!t.includes('BJS') && !t.includes('GPU') && !t.includes('vite') && !t.includes('React')) console.log('LOG:', t) });

await page.goto('http://localhost:5173');
await page.waitForTimeout(500);
await page.click('.btn-wardrobe');
await page.waitForTimeout(5000);

// Click the Ajax shirt swatch (last swatch in the shirt row — the model swatch)
const swatches = await page.$$('.color-swatch');
console.log('total swatches:', swatches.length);
if (swatches.length > 0) {
  await swatches[8].click();  // 8 color swatches + ajax model swatch = index 8
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: 'ss_ajax_idle.png' });
console.log('ajax idle done');

// Now play Hip Hop
const emoteBtns = await page.$$('.emote-btn:not(:disabled)');
if (emoteBtns.length > 0) {
  await emoteBtns[0].click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ss_ajax_dance.png' });
  console.log('ajax dance done');
}

await browser.close();
console.log('done');
