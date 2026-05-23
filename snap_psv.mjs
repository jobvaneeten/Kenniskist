import { chromium } from 'playwright';
const browser = await chromium.launch();
const page    = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 750 });
page.on('pageerror',  e => console.log('ERR:', e.message));

await page.goto('http://localhost:5173');
await page.waitForTimeout(500);
await page.click('.btn-wardrobe');
await page.waitForTimeout(4000);

// PSV texture swatch is the first texture swatch (index 8, after 8 color swatches)
const swatches = await page.$$('.color-swatch');
console.log('swatches:', swatches.length);
// PSV is at index 8 (after 8 shirt colors), Ajax is index 9
await swatches[8].click();
await page.waitForTimeout(2000);
await page.screenshot({ path: 'ss_psv_shirt.png' });
console.log('done');
await browser.close();
