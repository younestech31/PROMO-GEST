/**
 * Capture the manual-browser evidence screenshots for docs/evidence/manual-2026-11-24
 * using puppeteer-core + @sparticuz/chromium (works in sandboxes where Playwright's
 * browser downloads are unavailable).
 *
 * Prerequisites:
 *   1. Dependencies (not saved to package.json on purpose, same policy as the
 *      Playwright runner in capture-manual-evidence.mjs):
 *        npm install --no-save puppeteer-core @sparticuz/chromium
 *   2. A running Vite-only preview with a fresh in-memory store:
 *        PROMOGEST_VITE_ONLY=1 npx vite --port 5173
 *      (restart it before a capture run so the setup wizard shows and the
 *      reservations history starts empty)
 *   3. A headless-shell compatible runtime environment. On minimal Debian
 *      sandboxes the bundled Amazon Linux libraries and fonts are used when
 *      present:
 *        - LD_LIBRARY_PATH includes /tmp/lib   (extracted al2023.tar.br)
 *        - FONTCONFIG_PATH=/tmp/fonts          (fonts.conf + TTFs converted
 *          from the @fontsource woff2 files with fonttools)
 *
 * RTL paint note: chrome-headless-shell can rasterise fit-content RTL pages
 * with a stale horizontal offset when a fullPage screenshot is taken at the
 * native viewport size. shot() therefore shrinks the viewport first (forcing
 * the fullPage expansion path, which repaints correctly) and pins
 * `sticky h-screen` sidebars to the real viewport height during the capture.
 */
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

if (existsSync('/tmp/fonts')) {
  process.env.FONTCONFIG_PATH ??= '/tmp/fonts';
}
if (existsSync('/tmp/lib') && !process.env.LD_LIBRARY_PATH?.split(':').includes('/tmp/lib')) {
  process.env.LD_LIBRARY_PATH = `/tmp/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`;
}

const BASE = process.env.EVIDENCE_BASE ?? 'http://127.0.0.1:5173';
const OUT = path.resolve(process.env.EVIDENCE_OUT ?? 'docs/evidence/manual-2026-11-24');

await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();

async function shot(name) {
  const vp = page.viewport() ?? { width: 1440, height: 900 };
  const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const file = path.join(OUT, name);
  if (contentHeight > vp.height + 1) {
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${name} done (fullPage, h=${contentHeight})`);
    return;
  }
  const style = await page.addStyleTag({
    content: `[class*="sticky"][class*="h-screen"] { height: ${vp.height}px !important; }`,
  });
  const shrink = Math.max(320, Math.min(600, contentHeight - 80));
  await page.setViewport({ width: vp.width, height: shrink });
  await sleep(400);
  await page.screenshot({ path: file, fullPage: true });
  await page.setViewport({ width: vp.width, height: vp.height });
  await style.evaluate((el) => el.remove());
  await sleep(300);
  console.log(`${name} done (fullPage via shrink-${shrink}+pinned-sidebar, h=${contentHeight})`);
}

// Clicks the first button/link/[role=button] whose text or aria-label matches.
async function clickBtn(re) {
  const result = await page.evaluate(
    ({ source, flags }) => {
      const rx = new RegExp(source, flags);
      const els = [
        ...document.querySelectorAll(
          'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"]',
        ),
      ];
      const el = els.find((e) => {
        const text = (e.textContent || '').replace(/\s+/g, ' ').trim();
        const label = e.getAttribute('aria-label') || '';
        return rx.test(text) || rx.test(label);
      });
      if (!el) return 'miss';
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return 'disabled';
      el.click();
      return 'clicked';
    },
    { source: re.source, flags: re.flags },
  );
  console.log(`clickBtn(${re}) -> ${result}`);
  return result;
}

// Clicks the innermost visible element containing the given literal text.
async function clickText(text) {
  const result = await page.evaluate((t) => {
    const all = [...document.querySelectorAll('body *')].filter(
      (el) => (el.textContent || '').includes(t) && el.getClientRects().length > 0,
    );
    if (!all.length) return 'miss';
    const inner = all.find((el) => !all.some((other) => other !== el && el.contains(other)));
    if (!inner) return 'miss';
    inner.click();
    return 'clicked';
  }, text);
  console.log(`clickText(${text}) -> ${result}`);
  return result;
}

async function open(url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  }
  await sleep(2500);
}

// 1. Landing / setup wizard
await open(BASE);
await shot('01-setup-wizard-ar-desktop.png');

// Enter the preview workspace (prefer the preview-entry phrase over the plain
// "دخول" submit button, which appears first on the login screen).
let entered = await clickBtn(/الدخول إلى مساحة المعاينة/);
if (entered !== 'clicked') entered = await clickBtn(/دخول/);
console.log(`entry -> ${entered}`);
await sleep(4000);
await shot('02-workspace-home-ar-desktop.png');

// Open the demo project
await clickText('DEMO-16-001');
await sleep(3000);
await shot('03-project-overview-ar-desktop.png');

// Reservations module (hosts the P1-10 review queue)
await clickBtn(/الحجوزات الداخلية/);
await sleep(2500);
await shot('04-reservations-queue-ar-desktop.png');

// Create a hold and wait for the history row to appear (the in-memory API can
// take a few seconds to reflect the write).
const created = await clickBtn(/إنشاء حجز/);
if (created !== 'clicked') {
  console.log(`WARN: create-hold button was not clicked (status=${created})`);
}
try {
  await page.waitForFunction(
    () => (document.body.textContent || '').includes('سجل الحجوزات (1)'),
    { timeout: 12000 },
  );
  console.log('hold row appeared in history');
} catch {
  console.log('WARN: hold row not detected within 12s');
}
await sleep(500);
await shot('05-after-create-hold-ar-desktop.png');

// Switch to French (desktop)
await clickBtn(/Français/);
await sleep(1500);
await shot('06-reservations-queue-fr-desktop.png');

// Mobile Arabic
await page.setViewport({ width: 390, height: 844 });
await sleep(500);
await clickBtn(/العربية/);
await sleep(1500);
await shot('07-reservations-queue-ar-mobile.png');

// Mobile French
await clickBtn(/Français/);
await sleep(1500);
await shot('08-reservations-queue-fr-mobile.png');

await browser.close();
console.log('All screenshots saved to', OUT);
