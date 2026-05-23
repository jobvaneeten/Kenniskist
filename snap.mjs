import { chromium } from 'playwright';
const browser = await chromium.launch();
const page    = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 750 });
page.on('pageerror',  e => console.log('ERR:', e.message));
page.on('console',    m => { const t = m.text(); if (!t.includes('BJS') && !t.includes('GPU') && !t.includes('vite') && !t.includes('React')) console.log('LOG:', t) });

await page.goto('http://localhost:5173');
await page.waitForTimeout(500);
await page.click('.btn-wardrobe');

// Wait for character + animations to load
await page.waitForTimeout(5500);
await page.screenshot({ path: 'ss_wardrobe_with_anims.png' });
console.log('wardrobe loaded');

// Click "Lopen" (Walking) - first emote button
const btns = await page.$$('.emote-btn:not(:disabled)');
console.log('enabled emote buttons:', btns.length);
if (btns.length > 0) {
  await btns[0].click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ss_emote_walking.png' });
  console.log('walking screenshot done');
}

// Click Boom Dance
if (btns.length > 2) {
  await btns[2].click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'ss_emote_dance.png' });
  console.log('dance screenshot done');
}

await browser.close();
console.log('done');
