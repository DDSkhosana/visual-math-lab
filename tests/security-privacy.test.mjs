import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  initializeAnalytics,
  trackEvent,
  updateConsent,
  getConsentStatus,
  CONSENT_STORAGE_KEY
} from '../js/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EXPECTED_PAGES = [
  'index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'visuals/circle-theorems/index.html',
  'visuals/trigonometry/index.html',
  'visuals/circle-theorems/thales-theorem/index.html',
  'visuals/circle-theorems/angle-at-centre/index.html',
  'visuals/circle-theorems/angles-in-same-segment/index.html',
  'visuals/circle-theorems/cyclic-quadrilateral/index.html',
  'visuals/circle-theorems/tangent-radius/index.html',
  'visuals/circle-theorems/alternate-segment/index.html',
  'visuals/circle-theorems/tangents-from-external-point/index.html',
  'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
  'visuals/trigonometry/unit-circle-helix/index.html',
  'visuals/trigonometry/law-of-sines/index.html',
  'visuals/trigonometry/law-of-cosines/index.html',
  'visuals/trigonometry/angle-sum-identities/index.html'
];

const VISUAL_PAGES = EXPECTED_PAGES.filter((p) => p.includes('visuals/') && !p.endsWith('visuals/circle-theorems/index.html') && !p.endsWith('visuals/trigonometry/index.html'));

test('Security & Privacy: Google Consent Mode v2 implementation contract', () => {
  const analyticsPath = path.join(rootDir, 'js', 'analytics.js');
  const code = fs.readFileSync(analyticsPath, 'utf8');

  // Consent Mode v2 default declaration
  assert.ok(code.includes("window.gtag(\"consent\", \"default\""), 'analytics.js must implement gtag consent default');
  assert.ok(code.includes('analytics_storage'), 'analytics.js must specify analytics_storage');
  assert.ok(code.includes('ad_storage'), 'analytics.js must deny ad_storage');
  assert.ok(code.includes('ad_user_data'), 'analytics.js must deny ad_user_data');
  assert.ok(code.includes('ad_personalization'), 'analytics.js must deny ad_personalization');

  // Hardened signals & COPPA protection
  assert.ok(code.includes("allow_google_signals"), 'analytics.js must disable allow_google_signals');
  assert.ok(code.includes("allow_ad_personalization_signals"), 'analytics.js must disable allow_ad_personalization_signals');
  assert.ok(code.includes("anonymize_ip"), 'analytics.js must enable anonymize_ip');

  // Dynamic consent update function
  assert.ok(code.includes('export function updateConsent('), 'analytics.js must export updateConsent');
  assert.ok(code.includes('export function getConsentStatus('), 'analytics.js must export getConsentStatus');
  assert.ok(code.includes('vml:consent-updated'), 'analytics.js must dispatch vml:consent-updated');
});

test('Security & Privacy: Cookie Consent Banner module & CSS', () => {
  const cookieModulePath = path.join(rootDir, 'js', 'cookie-consent.js');
  assert.ok(fs.existsSync(cookieModulePath), 'js/cookie-consent.js must exist');
  const cookieCode = fs.readFileSync(cookieModulePath, 'utf8');

  assert.ok(cookieCode.includes('mountCookieBanner'), 'cookie-consent.js must implement mountCookieBanner');
  assert.ok(cookieCode.includes('initCookieConsent'), 'cookie-consent.js must implement initCookieConsent');
  assert.ok(cookieCode.includes('openCookieBanner'), 'cookie-consent.js must implement openCookieBanner');
  assert.ok(cookieCode.includes('btn-cookie-accept'), 'cookie-consent.js must include accept button');
  assert.ok(cookieCode.includes('btn-cookie-decline'), 'cookie-consent.js must include decline button');
  assert.ok(cookieCode.includes('vml:locale-changed'), 'cookie-consent.js must re-translate on locale changed');

  // CSS definitions in site.css
  const siteCss = fs.readFileSync(path.join(rootDir, 'css', 'site.css'), 'utf8');
  assert.ok(siteCss.includes('.cookie-banner'), 'site.css must style .cookie-banner');
  assert.ok(siteCss.includes('.cookie-banner__inner'), 'site.css must style .cookie-banner__inner');
  assert.ok(siteCss.includes('.site-footer__cookie-btn'), 'site.css must style .site-footer__cookie-btn');

  // components.js integration
  const componentsCode = fs.readFileSync(path.join(rootDir, 'js', 'components.js'), 'utf8');
  assert.ok(componentsCode.includes('initCookieConsent'), 'components.js must invoke initCookieConsent');
  assert.ok(componentsCode.includes('data-cookie-settings'), 'components.js footer must include data-cookie-settings button');
});

test('Security & Privacy: Privacy Policy legislative compliance (GDPR, POPIA, CCPA, COPPA)', () => {
  const privacyPath = path.join(rootDir, 'privacy.html');
  const privacyHtml = fs.readFileSync(privacyPath, 'utf8');

  // 1. Cookie & Local Storage Inventory
  assert.ok(privacyHtml.includes('<code>_ga</code>'), 'privacy.html must document _ga cookie');
  assert.ok(privacyHtml.includes('<code>_ga_E1W7GYR7Q0</code>'), 'privacy.html must document container cookie');
  assert.ok(privacyHtml.includes('<code>vml_cookie_consent</code>'), 'privacy.html must document consent storage');
  assert.ok(privacyHtml.includes('<code>vml_locale</code>'), 'privacy.html must document locale storage');

  // 2. Interactive Consent Manager
  assert.ok(privacyHtml.includes('id="privacy-btn-allow"'), 'privacy.html must have Allow Analytics button');
  assert.ok(privacyHtml.includes('id="privacy-btn-block"'), 'privacy.html must have Block Analytics button');
  assert.ok(privacyHtml.includes('id="privacy-consent-status"'), 'privacy.html must display live consent status');

  // 3. GDPR & UK compliance
  assert.ok(privacyHtml.includes('General Data Protection Regulation'), 'privacy.html must reference GDPR');
  assert.ok(privacyHtml.includes('Article 6(1)(a)'), 'privacy.html must cite consent lawful basis');
  assert.ok(privacyHtml.includes('Information Commissioner\'s Office'), 'privacy.html must cite supervisory authority (ICO)');

  // 4. South Africa POPIA compliance
  assert.ok(privacyHtml.includes('Protection of Personal Information Act'), 'privacy.html must cite POPIA');
  assert.ok(privacyHtml.includes('Section 72'), 'privacy.html must disclose transborder data flows');
  assert.ok(privacyHtml.includes('Information Regulator'), 'privacy.html must disclose Information Regulator');
  assert.ok(privacyHtml.includes('inforeg@justice.gov.za'), 'privacy.html must provide Information Regulator contact email');

  // 5. United States CCPA/CPRA & State compliance
  assert.ok(privacyHtml.includes('Do Not Sell or Share My Personal Information'), 'privacy.html must declare Do Not Sell or Share');
  assert.ok(privacyHtml.includes('California Consumer Privacy Act'), 'privacy.html must cite CCPA/CPRA');

  // 6. COPPA & Student Privacy
  assert.ok(privacyHtml.includes('Children\'s Online Privacy Protection Act'), 'privacy.html must cite COPPA');
  assert.ok(privacyHtml.includes('anonymize_ip') || privacyHtml.includes('anonymized'), 'privacy.html must cite IP anonymization');
});

test('Security Hardening: Content Security Policy & Permissions Policy present across all pages', () => {
  for (const pageRel of EXPECTED_PAGES) {
    const pagePath = path.join(rootDir, pageRel);
    assert.ok(fs.existsSync(pagePath), `Page must exist: ${pageRel}`);
    const html = fs.readFileSync(pagePath, 'utf8');

    assert.ok(
      html.includes('http-equiv="Content-Security-Policy"'),
      `Page ${pageRel} must declare Content-Security-Policy meta tag`
    );
    assert.ok(
      html.includes('http-equiv="Permissions-Policy"'),
      `Page ${pageRel} must declare Permissions-Policy meta tag`
    );
    assert.ok(
      html.includes('camera=(self)'),
      `Page ${pageRel} Permissions-Policy must constrain camera to self`
    );
    assert.ok(
      html.includes('microphone=()'),
      `Page ${pageRel} Permissions-Policy must disallow microphone`
    );
    assert.ok(
      html.includes('geolocation=()'),
      `Page ${pageRel} Permissions-Policy must disallow geolocation`
    );
  }
});

test('Security Hardening: Subresource Integrity (SRI) on all 12 visualizer pages', () => {
  const EXPECTED_HASHES = {
    katexCss: 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+',
    katexJs: 'sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg',
    threeJs: 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu',
    orbitControls: 'sha384-wagZhIFgY4hD+7awjQjR4e2E294y6J2HSnd8eTNc15ZubTeQeVRZwhQJ+W6hnBsf'
  };

  assert.equal(VISUAL_PAGES.length, 12, 'Must test exactly 12 visualizer pages');

  for (const visualPage of VISUAL_PAGES) {
    const pagePath = path.join(rootDir, visualPage);
    const html = fs.readFileSync(pagePath, 'utf8');

    // KaTeX CSS
    assert.ok(
      html.includes(`integrity="${EXPECTED_HASHES.katexCss}"`),
      `Page ${visualPage} must include SRI hash for KaTeX CSS`
    );
    // KaTeX JS
    assert.ok(
      html.includes(`integrity="${EXPECTED_HASHES.katexJs}"`),
      `Page ${visualPage} must include SRI hash for KaTeX JS`
    );
    // Three.js
    assert.ok(
      html.includes(`integrity="${EXPECTED_HASHES.threeJs}"`),
      `Page ${visualPage} must include SRI hash for Three.js`
    );
    // OrbitControls
    assert.ok(
      html.includes(`integrity="${EXPECTED_HASHES.orbitControls}"`),
      `Page ${visualPage} must include SRI hash for OrbitControls`
    );
    // All must have crossorigin="anonymous"
    assert.ok(
      html.includes('crossorigin="anonymous"'),
      `Page ${visualPage} must specify crossorigin="anonymous" for SRI`
    );
  }
});
