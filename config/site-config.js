// config/site-config.js
// Public site-wide settings only. Never place API secrets or private credentials here.

const SITE_CONFIG = {
  site: {
    name: "Visual Mathematics Lab",
    // Full public URL without a trailing slash, e.g. "https://ddskhosana.github.io/visual-math-lab".
    // Leave empty to skip sitemap generation.
    url: "https://ddskhosana.github.io/visual-math-lab"
  },

  creator: {
    name: "Dianah Skhosana"
  },

  buyMeACoffee: {
    profileUrl: "https://buymeacoffee.com/ddskhosana"
  },

  youtube: {
    channelUrl: "https://www.youtube.com/@dianahskhosana5134",
    handle: "@dianahskhosana5134",
    channelId: ""
  },

  analytics: {
    // Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ9". Leave empty to disable analytics.
    measurementId: "G-E1W7GYR7Q0"
  }
};

export function hasConfiguredUrl(value) {
  return typeof value === "string" && /^https:\/\//.test(value);
}

export function hasMeasurementId(value) {
  return typeof value === "string" && /^G-[A-Z0-9]+$/i.test(value) && !/^G-X+$/i.test(value);
}

export default SITE_CONFIG;
