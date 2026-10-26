import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  initI18n,
  setLocale,
  getLocale,
  getLocaleInfo,
  getSupportedLocales,
  formatNumber,
  t,
  tHtml,
  translateDOM,
  loadBundle
} from '../js/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'locales');

const EXPECTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'ar', 'nr'];

function getObjectKeyPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, val] of Object.entries(obj)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      paths.push(...getObjectKeyPaths(val, nextPath));
    } else {
      paths.push(nextPath);
    }
  }
  return paths;
}

test('i18n: All 7 locale bundles exist and parse as valid JSON', () => {
  for (const code of EXPECTED_LOCALES) {
    const file = path.join(localesDir, `${code}.json`);
    assert.ok(fs.existsSync(file), `Locale file must exist: locales/${code}.json`);
    const content = fs.readFileSync(file, 'utf8');
    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(content);
    }, `locales/${code}.json must be valid JSON`);
    assert.ok(parsed && typeof parsed === 'object', `Parsed ${code}.json must be an object`);
  }
});

test('i18n: Schema Key Parity - 100% of keys in canonical en.json are present across all bundles', () => {
  const enBundle = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
  const enKeys = getObjectKeyPaths(enBundle);
  assert.ok(enKeys.length > 50, `en.json must define comprehensive dictionary keys (found ${enKeys.length})`);

  for (const code of EXPECTED_LOCALES) {
    if (code === 'en') continue;
    const bundle = JSON.parse(fs.readFileSync(path.join(localesDir, `${code}.json`), 'utf8'));
    for (const keyPath of enKeys) {
      const parts = keyPath.split('.');
      let val = bundle;
      for (const p of parts) {
        val = val?.[p];
      }
      assert.notEqual(val, undefined, `Locale "${code}" missing key path "${keyPath}"`);
      assert.notEqual(val, '', `Locale "${code}" has empty string at "${keyPath}"`);
    }
  }
});

test('i18n: Metadata contracts for IsiNdebele and Arabic', () => {
  const nrBundle = JSON.parse(fs.readFileSync(path.join(localesDir, 'nr.json'), 'utf8'));
  assert.equal(nrBundle.meta.locale, 'nr');
  assert.equal(nrBundle.meta.name, 'IsiNdebele');
  assert.equal(nrBundle.meta.nativeName, 'isiNdebele');
  assert.equal(nrBundle.meta.dir, 'ltr');

  const arBundle = JSON.parse(fs.readFileSync(path.join(localesDir, 'ar.json'), 'utf8'));
  assert.equal(arBundle.meta.locale, 'ar');
  assert.equal(arBundle.meta.dir, 'rtl');
});

test('i18n: All 12 Visualizers have complete localized entries in all bundles', () => {
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
    'unit-circle-helix',
    'law-of-sines',
    'law-of-cosines',
    'angle-sum-identities'
  ];

  for (const code of EXPECTED_LOCALES) {
    const bundle = JSON.parse(fs.readFileSync(path.join(localesDir, `${code}.json`), 'utf8'));
    assert.ok(bundle.visuals, `Locale "${code}" must have visuals section`);
    for (const slug of visualSlugs) {
      const entry = bundle.visuals[slug];
      assert.ok(entry, `Locale "${code}" must have entry for visual "${slug}"`);
      assert.ok(entry.title && entry.title.trim().length > 0, `Locale "${code}" visual "${slug}" must have title`);
      assert.ok(entry.category && entry.category.trim().length > 0, `Locale "${code}" visual "${slug}" must have category`);
      assert.ok(entry.badge && entry.badge.trim().length > 0, `Locale "${code}" visual "${slug}" must have badge`);
      assert.ok(entry.description && entry.description.trim().length > 0, `Locale "${code}" visual "${slug}" must have description`);
    }
  }
});

test('i18n Core Engine: Lifecycle, fallback, and parameter substitution', async () => {
  await initI18n({ initialLocale: 'en' });
  assert.equal(getLocale(), 'en');
  assert.equal(t('nav.home'), 'Home');
  assert.equal(t('nav.visuals_count', { count: 12 }), '12 Visuals');

  // IsiNdebele translation
  await setLocale('nr');
  assert.equal(getLocale(), 'nr');
  assert.equal(t('nav.home'), 'Ikhaya');
  assert.equal(t('nav.visuals_count', { count: 8 }), 'Iziboniso ezi-8');
  assert.equal(t('visuals.thales-theorem.title'), 'UmThetho ka-Thales');
  assert.equal(t('derivations.step_prefix', { step: 1 }), 'Isinyathelo 1');

  // Arabic translation (RTL)
  await setLocale('ar');
  assert.equal(getLocale(), 'ar');
  assert.equal(t('nav.home'), 'الرئيسية');
  assert.equal(getLocaleInfo().dir, 'rtl');
  assert.equal(t('derivations.step_prefix', { step: 3 }), 'الخطوة 3');

  // Fallback test: non-existent key in current bundle falls back to canonical en or custom fallback
  assert.equal(t('non.existent.key', {}, 'Custom Default'), 'Custom Default');
  assert.equal(t('non.existent.key'), 'non.existent.key');

  // Number formatting
  const formatted = formatNumber(1234.56, { minimumFractionDigits: 2 });
  assert.ok(formatted.includes('1') && formatted.includes('234'), `Formatted number should contain digits: ${formatted}`);

  // Switch back to default
  await setLocale('en');
  assert.equal(getLocale(), 'en');
});

test('i18n DOM Translation: [data-i18n], [data-i18n-attr], [data-i18n-aria-label]', async () => {
  await initI18n({ initialLocale: 'en' });

  // Minimal mock DOM container
  const elements = [
    {
      attrs: { 'data-i18n': 'nav.home' },
      textContent: 'Placeholder',
      getAttribute(k) { return this.attrs[k]; },
      hasAttribute(k) { return k in this.attrs; }
    },
    {
      attrs: { 'data-i18n': 'nav.visuals_count', 'data-i18n-params': JSON.stringify({ count: 12 }) },
      textContent: 'Old Count',
      getAttribute(k) { return this.attrs[k]; },
      hasAttribute(k) { return k in this.attrs; }
    },
    {
      attrs: { 'data-i18n-attr': 'placeholder:nav.search_placeholder,title:controls.reset_view' },
      targetAttrs: {},
      getAttribute(k) { return this.attrs[k]; },
      hasAttribute(k) { return k in this.attrs; },
      setAttribute(k, v) { this.targetAttrs[k] = v; }
    },
    {
      attrs: { 'data-i18n-aria-label': 'nav.clear_search' },
      targetAttrs: {},
      getAttribute(k) { return this.attrs[k]; },
      hasAttribute(k) { return k in this.attrs; },
      setAttribute(k, v) { this.targetAttrs[k] = v; }
    }
  ];

  const mockRoot = {
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [elements[0], elements[1]];
      if (selector === '[data-i18n-attr]') return [elements[2]];
      if (selector === '[data-i18n-aria-label]') return [elements[3]];
      return [];
    }
  };

  // Translate in English
  translateDOM(mockRoot);
  assert.equal(elements[0].textContent, 'Home');
  assert.equal(elements[1].textContent, '12 Visuals');
  assert.equal(elements[2].targetAttrs['placeholder'], 'Search visualisations (e.g. Helix, Sine, Thales)...');
  assert.equal(elements[2].targetAttrs['title'], 'Reset to Default');
  assert.equal(elements[3].targetAttrs['aria-label'], 'Clear query');

  // Translate in IsiNdebele
  await setLocale('nr');
  translateDOM(mockRoot);
  assert.equal(elements[0].textContent, 'Ikhaya');
  assert.equal(elements[1].textContent, 'Iziboniso ezi-12');
  assert.equal(elements[2].targetAttrs['placeholder'], 'Rhubhulula iziboniso (isib. i-Helix, i-Sine, i-Thales)...');
  assert.equal(elements[2].targetAttrs['title'], 'Buyisela Ekuqaleni');
  assert.equal(elements[3].targetAttrs['aria-label'], 'Sula umbuzo');

  await setLocale('en');
});

test('i18n Architecture: components.js, catalog.js, circle-derivations.js & CSS compliance', () => {
  // 1. components.js
  const componentsPath = path.join(rootDir, 'js', 'components.js');
  const componentsCode = fs.readFileSync(componentsPath, 'utf8');
  assert.ok(componentsCode.includes('id="nav-lang-dropdown"'), 'components.js must include #nav-lang-dropdown');
  assert.ok(componentsCode.includes('id="nav-lang-btn"'), 'components.js must include #nav-lang-btn');
  assert.ok(componentsCode.includes('id="nav-lang-menu"'), 'components.js must include #nav-lang-menu');
  assert.ok(componentsCode.includes('vml:locale-changed'), 'components.js must listen for vml:locale-changed');

  // 2. catalog.js
  const catalogPath = path.join(rootDir, 'js', 'catalog.js');
  const catalogCode = fs.readFileSync(catalogPath, 'utf8');
  assert.ok(catalogCode.includes('t(`visuals.${visual.slug}.title`'), 'catalog.js must translate visual titles');
  assert.ok(catalogCode.includes('vml:locale-changed'), 'catalog.js must subscribe to vml:locale-changed');

  // 3. circle-derivations.js
  const derivationsPath = path.join(rootDir, 'js', 'circle-derivations.js');
  const derivationsCode = fs.readFileSync(derivationsPath, 'utf8');
  assert.ok(derivationsCode.includes("t('derivations.step_prefix'"), 'circle-derivations.js must translate derivation step prefixes');

  // 4. CSS: site.css & visual.css
  const siteCss = fs.readFileSync(path.join(rootDir, 'css', 'site.css'), 'utf8');
  assert.ok(siteCss.includes('.site-nav__lang-dropdown'), 'site.css must style .site-nav__lang-dropdown');
  assert.ok(siteCss.includes('[dir="rtl"]'), 'site.css must include [dir="rtl"] layout mirroring');
  assert.ok(siteCss.includes('[dir="rtl"] .katex'), 'site.css must preserve LTR direction for KaTeX math');

  const visualCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  assert.ok(visualCss.includes('[dir="rtl"] .visual-toolbar'), 'visual.css must support RTL visual-toolbar mirroring');
});
