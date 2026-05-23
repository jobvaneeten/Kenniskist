import { chromium } from 'playwright';
const browser = await chromium.launch();
const page    = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 750 });
page.on('pageerror',  e => console.log('ERR:', e.message));
page.on('console',    m => { const t = m.text(); if (!t.includes('BJS') && !t.includes('GPU') && !t.includes('vite') && !t.includes('React')) console.log('LOG:', t) });

await page.goto('http://localhost:5173');
await page.waitForTimeout(500);
await page.click('.btn-wardrobe');
await page.waitForTimeout(6000);  // wait for all 4 files to load

const btns = await page.$$('.emote-btn');
console.log('emote buttons:', btns.length);
for (const btn of btns) {
  const label = await btn.innerText();
  const disabled = await btn.isDisabled();
  console.log(' -', label.trim().replace(/\n/g, ' '), disabled ? '[DISABLED]' : '[OK]');
}

await page.screenshot({ path: 'ss_emotes_idle.png' });

// Click each emote and screenshot
for (let i = 1; i < btns.length; i++) {
  const label = await btns[i].innerText();
  if (await btns[i].isDisabled()) { console.log('skip disabled:', label); continue }
  await btns[i].click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `ss_emote_${i}.png` });
  console.log(`screenshot emote ${i}: ${label.trim()}`);
}

await browser.close();
console.log('done');
