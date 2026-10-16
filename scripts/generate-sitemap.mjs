import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const { default: SITE_CONFIG } = await import(pathToFileURL(resolve(root, "config", "site-config.js")).href);
const siteUrl = (SITE_CONFIG.site?.url || "").replace(/\/$/, "");
const visuals = JSON.parse(readFileSync(resolve(root, "data", "visuals.json"), "utf8"));

if (!siteUrl) {
  console.log("Skipping sitemap generation until config/site-config.js has a site.url.");
  process.exit(0);
}

const today = new Date().toISOString().split("T")[0];

const pages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/about.html", priority: "0.7", changefreq: "monthly" },
  { path: "/contact.html", priority: "0.5", changefreq: "monthly" },
  { path: "/privacy.html", priority: "0.3", changefreq: "yearly" },
];

for (const visual of visuals.filter((visual) => visual.published)) {
  pages.push({
    path: `/visuals/${visual.slug}/`,
    priority: "0.9",
    changefreq: "weekly",
  });
}

const urls = pages
  .map(
    (p) => `  <url>
    <loc>${siteUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
writeFileSync(resolve(root, "sitemap.xml"), sitemap);
console.log(`Generated sitemap for ${pages.length} public routes.`);
