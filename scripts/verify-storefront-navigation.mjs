// Browser regression for the separate Home / About / department pages.
// Set PLAYWRIGHT_MODULE when Playwright is supplied by a shared runtime.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const loadModule = createRequire(import.meta.url);
const { chromium } = loadModule(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const output = process.env.TEST_OUTPUT || '.tmp/navigation-check';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const go = async path => {
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, path);
      await page.locator('header nav[aria-label="Main navigation"]').waitFor();
    };
    for (const path of ['/', '/shop/women', '/shop/men', '/about']) {
      await go(path);
      for (const width of [1586, 1024, 794, 760, 390, 320]) {
        await page.setViewportSize({ width, height: 992 });
        const layout = await page.evaluate(() => ({
          width: innerWidth, scroll: document.documentElement.scrollWidth,
          logoCenter: (() => { const r = document.querySelector('header > a').getBoundingClientRect(); return r.left + r.width / 2; })(),
          logoAccent: getComputedStyle(document.querySelector('header > a span')).color,
          lastNavigationItem: document.querySelector('header nav').lastElementChild.textContent,
          controls: [...document.querySelectorAll('header a,header button')].map(el => {
            const rect = el.getBoundingClientRect();
            return { text: el.textContent || el.getAttribute('aria-label'), left: rect.left, right: rect.right };
          }),
        }));
        assert.ok(layout.scroll <= layout.width + 1, `${path} overflows at ${width}: ${layout.scroll}`);
        assert.ok(Math.abs(layout.logoCenter - width / 2) <= 1, `Logo not centered at ${path} ${width}`);
        assert.equal(layout.logoAccent, 'rgb(142, 65, 47)');
        assert.equal(layout.lastNavigationItem, 'About');
        for (const control of layout.controls) assert.ok(control.left >= -1 && control.right <= width + 1, `${control.text} clipped at ${path} ${width}`);
        checks.push(`${path} layout ${width}px`);
        if ([1586, 390, 794].includes(width)) await page.screenshot({ path: `${output}/${path.replaceAll('/', '-') || 'home'}-${width}.png`, fullPage: path === '/' });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await go('/');
    assert.equal(await page.locator('#shop').count(), 0);
    assert.equal(await page.locator('#preview').count(), 0);
    assert.equal(await page.locator('figure img').getAttribute('src'), '/landing-approved-reference.png');
    const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    await nav.getByRole('link', { name: 'Shop Men' }).click();
    await page.waitForURL('**/shop/men');
    await page.getByRole('heading', { name: 'Shop Men', exact: true }).waitFor();
    assert.ok((await page.locator('.product-grid img').first().getAttribute('src')).includes('mo-men-'));
    const menImages = await page.locator('.product-grid img').evaluateAll(images => images.map(image => ({
      alt: image.getAttribute('alt'),
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
    })));
    assert.ok(menImages.length > 0, 'Men storefront should render product images');
    for (const image of menImages) {
      assert.ok(image.complete && image.width > 0 && image.height > 0, `Men product image failed: ${image.alt}`);
    }
    await nav.getByRole('link', { name: 'Shop Women' }).click();
    await page.waitForURL('**/shop/women');
    await page.getByRole('heading', { name: 'Shop Women', exact: true }).waitFor();
    assert.ok((await page.locator('.product-grid img').first().getAttribute('src')).includes('mo-women-'));
    const womenImages = await page.locator('.product-grid img').evaluateAll(images => images.map(image => ({
      alt: image.getAttribute('alt'),
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
    })));
    assert.ok(womenImages.length > 0, 'Women storefront should render product images');
    for (const image of womenImages) {
      assert.ok(image.complete && image.width > 0 && image.height > 0, `Women product image failed: ${image.alt}`);
    }
    checks.push('Department navigation uses distinct routes, correct products, and loaded images');

    await page.locator('.product-image-button').first().click();
    await page.locator('.quick-purchase select').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await page.locator('.bag-list article').waitFor();
    await page.locator('.checkout-drawer .close-button').click();
    await nav.getByRole('link', { name: 'About', exact: true }).click();
    await page.waitForURL('**/about');
    await page.getByRole('button', { name: 'Shopping cart with 1 items' }).waitFor();
    await page.getByRole('button', { name: 'Shopping cart with 1 items' }).click();
    assert.equal(await page.locator('.bag-list article').count(), 1);
    await page.locator('.checkout-drawer .close-button').click();
    assert.equal(await page.locator('#preview').count(), 1);
    assert.equal(await page.locator('#evidence').count(), 1);
    const faq = page.locator('#faqs details').nth(1);
    await faq.locator('summary').click();
    assert.equal(await faq.getAttribute('open'), '');
    checks.push('Cart persists across pages; About contains demo, evaluation and working FAQs');

    await page.getByRole('button', { name: 'Search products', exact: true }).click();
    await page.waitForURL('**/shop/women?search=1');
    await page.waitForFunction(() => document.activeElement?.matches('.search-box input'));
    await page.locator('.search-box input').fill('zz-no-matching-product');
    assert.equal(await page.locator('.product-card').count(), 0);
    await page.locator('.search-box input').fill('');
    await page.locator('.product-image-button').first().waitFor();
    checks.push('Search navigates, focuses and filters');

    await go('/');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('**/account?next=/fit-passport');
    await page.locator('input[type="email"]').waitFor();
    await go('/');
    await page.getByRole('button', { name: 'Set up my Fit Passport' }).click();
    await page.waitForURL('**/account?next=/fit-passport');
    await go('/');
    await page.getByRole('button', { name: 'Maybe later', exact: true }).click();
    await page.waitForURL('**/shop/women');
    checks.push('Login and setup use shopping-account login; Maybe later opens shopping');
    assert.deepEqual(errors, [], 'Browser runtime errors');
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ base, checks, errors }, null, 2));
    console.log(`PASS: ${checks.length} checks; no browser runtime errors. Evidence: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
