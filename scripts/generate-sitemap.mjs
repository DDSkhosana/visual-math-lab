import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const configText = readFileSync(resolve(root, "config", "site-config.js"), "utf8");
const urlMatch = configText.match(/siteUrl:\s*"([^"]*)"/);
const siteUrl = urlMatch?.[1].replace(/\/$/, "");
const visuals = JSON.parse(readFileSync(resolve(root, "data", "visuals.json"), "utf8"));

if (!siteUrl) {
  console.log("Skipping sitemap generation until config/site-config.js has a siteUrl.");
  process.exit(0);
}

const routes = ["/", "/about.html", "/contact.html", "/privacy.html"];
for (const visual of visuals.filter((visual) => visual.published)) {
  routes.push(`/visuals/${visual.slug}/`);
}

const urls = routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
writeFileSync(resolve(root, "sitemap.xml"), sitemap);
console.log(`Generated sitemap for ${routes.length} public routes.`);
