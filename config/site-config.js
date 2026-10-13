export const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",
  siteUrl: "",
  buyMeACoffeeUrl: "https://buymeacoffee.com/ddskhosana",
  membershipUrl: "",
  analyticsId: "",
  youtubeChannelUrl: "https://www.youtube.com/@dianahskhosana5134"
};

export function hasConfiguredUrl(value) {
  return typeof value === "string" && /^https:\/\//.test(value);
}
