import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173';
const OUT = path.resolve('docs/evidence/manual-2026-11-24');

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// 1. Landing / setup
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '01-setup-wizard-ar-desktop.png'), fullPage: true });
console.log('01 done');

// Enter preview
const enterBtn = page.getByRole('button', { name: /الدخول إلى مساحة المعاينة|دخول/ });
if (await enterBtn.count()) {
  await enterBtn.click();
  await page.waitForTimeout(4000);
}
await page.screenshot({ path: path.join(OUT, '02-workspace-home-ar-desktop.png'), fullPage: true });
console.log('02 done');

// Open the demo project
const projectLink = page.locator('text=DEMO-16-001').first();
if (await projectLink.count()) {
  await projectLink.click();
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: path.join(OUT, '03-project-overview-ar-desktop.png'), fullPage: true });
console.log('03 done');

// Go to reservations
const resLink = page.locator('text=الحجوزات الداخلية').first();
if (await resLink.count()) {
  await resLink.click();
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: path.join(OUT, '04-reservations-queue-ar-desktop.png'), fullPage: true });
console.log('04 done');

// Create a hold if possible
const createBtn = page.getByRole('button', { name: /إنشاء حجز/ });
if (await createBtn.count() && await createBtn.isEnabled()) {
  await createBtn.click();
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: path.join(OUT, '05-after-create-hold-ar-desktop.png'), fullPage: true });
console.log('05 done');

// Switch to French
const frBtn = page.getByRole('button', { name: 'Français' });
if (await frBtn.count()) {
  await frBtn.click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: path.join(OUT, '06-reservations-queue-fr-desktop.png'), fullPage: true });
console.log('06 done');

// Mobile AR
await page.setViewportSize({ width: 390, height: 844 });
const arBtn = page.getByRole('button', { name: 'العربية' });
if (await arBtn.count()) {
  await arBtn.click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: path.join(OUT, '07-reservations-queue-ar-mobile.png'), fullPage: true });
console.log('07 done');

// Mobile FR
const frBtn2 = page.getByRole('button', { name: 'Français' });
if (await frBtn2.count()) {
  await frBtn2.click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: path.join(OUT, '08-reservations-queue-fr-mobile.png'), fullPage: true });
console.log('08 done');

await browser.close();
console.log('All screenshots saved to', OUT);
