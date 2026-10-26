/**
 * Visual Mathematics Lab - Internationalisation (i18n) Engine
 * Zero-dependency, pure ESM architecture for real-time localization.
 * Supports: en (Canonical), es, fr, de, zh, ar (RTL), nr (IsiNdebele).
 */

export const SUPPORTED_LOCALES = Object.freeze({
  en: Object.freeze({ code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' }),
  es: Object.freeze({ code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' }),
  fr: Object.freeze({ code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' }),
  de: Object.freeze({ code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' }),
  zh: Object.freeze({ code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' }),
  ar: Object.freeze({ code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' }),
  nr: Object.freeze({ code: 'nr', name: 'Southern Ndebele', nativeName: 'isiNdebele', dir: 'ltr' })
});

export const DEFAULT_LOCALE = 'en';
export const STORAGE_KEY = 'vml_locale';

let currentLocale = DEFAULT_LOCALE;
const bundles = new Map();
let isInitialized = false;

/**
 * Register a locale dictionary bundle directly into memory.
 * Useful for tests, embedded bundles, or custom loading pipelines.
 * @param {string} code
 * @param {object} bundle
 */
export function registerBundle(code, bundle) {
  if (code && typeof bundle === 'object' && bundle !== null) {
    bundles.set(code, bundle);
  }
}

/**
 * Fetch or read a locale bundle JSON by language code.
 * Seamlessly handles both Browser (fetch) and Node.js (fs) environments.
 * @param {string} code
 * @returns {Promise<object>}
 */
export async function loadBundle(code) {
  if (bundles.has(code)) {
    return bundles.get(code);
  }

  // Node.js environment detection for unit test runners
  if (typeof process !== 'undefined' && process.versions?.node && typeof window === 'undefined') {
    try {
      const fs = await import('node:fs');
      const { fileURLToPath } = await import('node:url');
      const filePath = fileURLToPath(new URL(`../locales/${code}.json`, import.meta.url));
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      bundles.set(code, json);
      return json;
    } catch (err) {
      console.warn(`[i18n] Node.js failed to load locale bundle "${code}":`, err.message);
    }
  }

  // Browser fetch environment
  try {
    const bundleUrl = new URL(`../locales/${code}.json`, import.meta.url).href;
    const response = await fetch(bundleUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} loading ${bundleUrl}`);
    }
    const json = await response.json();
    bundles.set(code, json);
    return json;
  } catch (err) {
    console.warn(`[i18n] Failed to fetch locale bundle "${code}":`, err.message);
    // If not canonical, ensure canonical fallback is loaded
    if (code !== DEFAULT_LOCALE && !bundles.has(DEFAULT_LOCALE)) {
      try {
        await loadBundle(DEFAULT_LOCALE);
      } catch {
        // no-op
      }
    }
    return bundles.get(DEFAULT_LOCALE) || {};
  }
}

/**
 * Detect the optimal locale from environment (URL query > localStorage > navigator.languages > default).
 * @returns {string} Supported locale code
 */
export function detectLocale() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // 1. URL search parameter (?lang=... or ?locale=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const queryLang = (params.get('lang') || params.get('locale') || '').toLowerCase().trim();
    if (queryLang && SUPPORTED_LOCALES[queryLang]) {
      return queryLang;
    }
  } catch {
    // Ignore URL parse errors
  }

  // 2. Local storage persistence
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES[saved]) {
      return saved;
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  // 3. User navigator preferences
  try {
    const navLangs = navigator.languages || [navigator.language];
    for (const raw of navLangs) {
      if (!raw) continue;
      const normalized = raw.toLowerCase().trim();
      // Exact match (e.g. 'es', 'zh', 'nr')
      if (SUPPORTED_LOCALES[normalized]) {
        return normalized;
      }
      // Prefix match (e.g. 'es-ES' -> 'es', 'nr-ZA' -> 'nr', 'zh-CN' -> 'zh')
      const prefix = normalized.split('-')[0];
      if (SUPPORTED_LOCALES[prefix]) {
        return prefix;
      }
    }
  } catch {
    // Ignore navigator inspection errors
  }

  return DEFAULT_LOCALE;
}

/**
 * Retrieve the current active locale code.
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Retrieve metadata for a locale (code, name, nativeName, dir).
 * @param {string} [code] Defaults to current locale
 * @returns {{ code: string, name: string, nativeName: string, dir: 'ltr'|'rtl' }}
 */
export function getLocaleInfo(code = currentLocale) {
  return SUPPORTED_LOCALES[code] || SUPPORTED_LOCALES[DEFAULT_LOCALE];
}

/**
 * Get all supported locale metadata entries.
 * @returns {Array<{ code: string, name: string, nativeName: string, dir: 'ltr'|'rtl' }>}
 */
export function getSupportedLocales() {
  return Object.values(SUPPORTED_LOCALES);
}

/**
 * Format a number according to the active locale conventions.
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  try {
    return new Intl.NumberFormat(currentLocale, options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Helper to traverse nested dot-paths in an object.
 * @param {object} obj
 * @param {string} path
 * @returns {any}
 */
function resolvePath(obj, path) {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || typeof curr !== 'object' || !(part in curr)) {
      return undefined;
    }
    curr = curr[part];
  }
  return curr;
}

/**
 * Translate a string key with optional parameter substitution and English fallback.
 * @param {string} key Dot-notated path e.g. 'nav.home' or 'visuals.thales-theorem.title'
 * @param {Record<string, any>} [params] Named interpolation parameters e.g. { count: 12 }
 * @param {string} [fallback] Custom fallback string if key is absent
 * @returns {string}
 */
export function t(key, params = {}, fallback = '') {
  if (!key) return '';

  const activeBundle = bundles.get(currentLocale);
  const defaultBundle = bundles.get(DEFAULT_LOCALE);

  let val = resolvePath(activeBundle, key);
  if (val === undefined || val === null || val === '') {
    val = resolvePath(defaultBundle, key);
  }
  if (val === undefined || val === null || val === '') {
    val = fallback !== '' ? fallback : key;
  }

  let text = String(val);

  // Substitute {paramName} placeholders
  if (params && typeof params === 'object') {
    text = text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, paramName) => {
      if (paramName in params) {
        const pVal = params[paramName];
        return pVal !== null && pVal !== undefined ? String(pVal) : '';
      }
      return match;
    });
  }

  return text;
}

/**
 * Translate a string key and sanitize parameters for safe HTML injection.
 * @param {string} key
 * @param {Record<string, any>} [params]
 * @param {string} [fallback]
 * @returns {string}
 */
export function tHtml(key, params = {}, fallback = '') {
  const sanitizedParams = {};
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      sanitizedParams[k] = escapeHtml(v);
    }
  }
  return t(key, sanitizedParams, fallback);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Scan a DOM container and translate all nodes marked with [data-i18n] or [data-i18n-attr].
 * @param {HTMLElement|Document} [root=document]
 */
export function translateDOM(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return;

  // 1. Text / Content nodes
  const textElements = root.querySelectorAll('[data-i18n]');
  textElements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;

    let params = {};
    const rawParams = el.getAttribute('data-i18n-params');
    if (rawParams) {
      try {
        params = JSON.parse(rawParams);
      } catch {
        // Simple key=value format fallback
        rawParams.split(';').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k && v) params[k.trim()] = v.trim();
        });
      }
    }

    const isHtml = el.hasAttribute('data-i18n-html');
    const translated = isHtml ? tHtml(key, params) : t(key, params);

    if (isHtml) {
      el.innerHTML = translated;
    } else {
      el.textContent = translated;
    }
  });

  // 2. Attribute mappings: data-i18n-attr="placeholder:nav.search_placeholder,title:controls.reset_view"
  const attrElements = root.querySelectorAll('[data-i18n-attr]');
  attrElements.forEach((el) => {
    const mappings = el.getAttribute('data-i18n-attr');
    if (!mappings) return;

    mappings.split(',').forEach((mapping) => {
      const parts = mapping.split(':');
      if (parts.length >= 2) {
        const attrName = parts[0].trim();
        const key = parts.slice(1).join(':').trim();
        if (attrName && key) {
          el.setAttribute(attrName, t(key));
        }
      }
    });
  });

  // 3. Convenience ARIA label mapping: data-i18n-aria-label="key"
  const ariaElements = root.querySelectorAll('[data-i18n-aria-label]');
  ariaElements.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });
}

/**
 * Switch the active locale dynamically without requiring a page reload.
 * Loads bundle, updates document lang/dir attributes, saves preference, translates DOM,
 * and emits a 'vml:locale-changed' event.
 * @param {string} code Supported locale code
 * @returns {Promise<string>} Active locale code
 */
export async function setLocale(code) {
  const targetCode = SUPPORTED_LOCALES[code] ? code : DEFAULT_LOCALE;

  // Always ensure canonical is available for fallbacks
  if (!bundles.has(DEFAULT_LOCALE)) {
    await loadBundle(DEFAULT_LOCALE);
  }

  // Load target bundle
  await loadBundle(targetCode);
  currentLocale = targetCode;

  // Persist preference
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, targetCode);
    } catch {
      // Ignore write errors (e.g. private mode quota)
    }
  }

  // Update DOM root attributes
  if (typeof document !== 'undefined' && document.documentElement) {
    const info = getLocaleInfo(targetCode);
    document.documentElement.lang = targetCode;
    document.documentElement.dir = info.dir || 'ltr';
  }

  // Translate all marked DOM nodes
  translateDOM();

  // Notify components and subscribers
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    const info = getLocaleInfo(targetCode);
    window.dispatchEvent(new CustomEvent('vml:locale-changed', {
      detail: {
        locale: targetCode,
        dir: info.dir || 'ltr',
        info,
        bundle: bundles.get(targetCode)
      }
    }));
  }

  return targetCode;
}

/**
 * Initialize the internationalisation system.
 * @param {object} [options]
 * @param {string} [options.initialLocale] Explicit locale override
 * @param {boolean} [options.translateOnLoad=true] Automatically run translateDOM()
 * @returns {Promise<string>} Initial active locale code
 */
export async function initI18n(options = {}) {
  const targetLocale = options.initialLocale || detectLocale();

  // Load canonical first so fallbacks are never missing
  await loadBundle(DEFAULT_LOCALE);

  if (targetLocale !== DEFAULT_LOCALE) {
    await loadBundle(targetLocale);
  }

  currentLocale = targetLocale;
  isInitialized = true;

  if (typeof document !== 'undefined' && document.documentElement) {
    const info = getLocaleInfo(targetLocale);
    document.documentElement.lang = targetLocale;
    document.documentElement.dir = info.dir || 'ltr';
  }

  if (options.translateOnLoad !== false) {
    translateDOM();
  }

  // Dispatch initial ready event
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    const info = getLocaleInfo(targetLocale);
    window.dispatchEvent(new CustomEvent('vml:locale-changed', {
      detail: {
        locale: targetLocale,
        dir: info.dir || 'ltr',
        info,
        bundle: bundles.get(targetLocale)
      }
    }));
  }

  return targetLocale;
}
