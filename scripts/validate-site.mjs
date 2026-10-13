import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFields = ["slug", "title", "category", "description", "thumbnail", "published", "youtubeId", "video"];
const errors = [];

function report(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON in ${relative(root, path)}: ${error.message}`);
    return [];
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return [".git", "node_modules", "coverage"].includes(entry.name) ? [] : walk(path);
    }
    return [path];
  });
}

const configPath = resolve(root, "config", "site-config.js");
const visualsPath = resolve(root, "data", "visuals.json");
report(existsSync(configPath), "Missing config/site-config.js.");
report(existsSync(visualsPath), "Missing data/visuals.json.");

const visuals = existsSync(visualsPath) ? readJson(visualsPath) : [];
report(Array.isArray(visuals), "data/visuals.json must contain an array.");
const slugs = new Set();

for (const visual of visuals) {
  for (const field of requiredFields) {
    report(Object.hasOwn(visual, field), `Visual entry is missing required field "${field}".`);
  }

  report(typeof visual.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(visual.slug), `Invalid slug "${visual.slug}".`);
  report(!slugs.has(visual.slug), `Duplicate slug "${visual.slug}".`);
  slugs.add(visual.slug);
  report(typeof visual.published === "boolean", `Visual "${visual.slug}" must have boolean "published".`);
  report(typeof visual.youtubeId === "string" && (visual.youtubeId === "" || /^[A-Za-z0-9_-]{11}$/.test(visual.youtubeId)), `Visual "${visual.slug}" has an invalid YouTube ID.`);

    const video = visual.video;
    const videoIsObject = video !== null && typeof video === "object" && !Array.isArray(video);
    report(videoIsObject, `Visual "${visual.slug}" must have a "video" object.`);
    if (videoIsObject) {
      report(typeof video.enabled === "boolean", `Visual "${visual.slug}" must have boolean "video.enabled".`);
      report(Number.isInteger(video.version) && video.version >= 1, `Visual "${visual.slug}" must have a positive integer "video.version".`);
      report(typeof video.script === "string", `Visual "${visual.slug}" must have string "video.script".`);
      report(typeof video.thumbnailText === "string", `Visual "${visual.slug}" must have string "video.thumbnailText".`);
      report(!video.enabled || visual.youtubeId !== "", `Visual "${visual.slug}" enables video but has an empty "youtubeId".`);
    }
  const visualIndex = resolve(root, "visuals", visual.slug, "index.html");
  report(existsSync(visualIndex), `Visual "${visual.slug}" is missing visuals/${visual.slug}/index.html.`);
  report(typeof visual.thumbnail === "string" && !visual.thumbnail.startsWith("/") && existsSync(resolve(root, visual.thumbnail)), `Visual "${visual.slug}" references a missing thumbnail "${visual.thumbnail}".`);
}

const visualDirectory = resolve(root, "visuals");
if (existsSync(visualDirectory)) {
  for (const entry of readdirSync(visualDirectory)) {
    const folder = resolve(visualDirectory, entry);
    if (statSync(folder).isDirectory()) {
      report(slugs.has(entry), `Visual folder "visuals/${entry}" has no matching metadata entry.`);
    }
  }
}

for (const file of walk(root)) {
  const pathFromRoot = relative(root, file);
  const normalized = pathFromRoot.split(sep).join("/");
  report(!normalized.startsWith("assets/videos/"), `Local video assets are not permitted: ${normalized}`);
}

if (errors.length > 0) {
  console.error("Site validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Site validation passed for ${visuals.length} visual metadata entries.`);
