# Product decisions

## Public MVP

Visual Mathematics Lab is a static GitHub Pages site for a curated collection of interactive mathematical visualisations. The initial release publishes only Thales' Theorem.

## Technical direction

- Use HTML, CSS, and native JavaScript modules.
- Store public visual metadata in `data/visuals.json`.
- Keep site-wide public configuration in `config/site-config.js`.
- Use YouTube embeds only; do not commit locally hosted video content.
- Use GitHub Actions for validation, sitemap generation, and deployment.
- Mount each interactive visual directly in its visual page. Do not isolate first-party visualisations in iframes.
- Structure each visual as ES modules (model / views / controllers / ui / platform, wired in `main.js`) with partitioned CSS and unit-tested pure math; no monolithic script or stylesheet. MathJax was removed because no TeX is rendered.

## Content policy

Only a visual with a matching published catalogue entry and implementation folder is displayed publicly. Roadmap entries, premium ideas, teacher resources, and licensing features remain internal until intentionally implemented.
