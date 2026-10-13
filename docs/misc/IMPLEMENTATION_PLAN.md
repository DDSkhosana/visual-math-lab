# Visual Mathematics Lab: Consolidated Audit and Implementation Plan

## 1. Audit scope and current state

This audit covers every file present in the workspace on 2026-10-10:

| File | Status | Consolidated role |
| --- | --- | --- |
| `AGENT_PROMPT.md` | Superseded draft specification | Historical reference only |
| `AGENT_PROMPT_MASTER.md` | Concise product specification | Source of product direction |
| `AGENT_PROMPT_MASTER1.md` | Duplicate of `AGENT_PROMPT_MASTER.md` | Remove after confirming the canonical specification |
| `monetisation.md` | 3,653-line aggregation of prompts, alternatives, and notes | Split into focused product and implementation documentation |
| `thales_s_theorem_visualization1.html` | Working interactive prototype | Candidate reference for mature 2D/3D controls |
| `thales_s_theorem_visualization2.html` | Byte-for-byte duplicate of visualization 1 | Remove |
| `thales_theorem_visualization_2d_3d.html` | Working interactive prototype | Canonical functional baseline candidate |
| `thales_theorem_visualization.html` | Presentation-only markup and styles; no inline implementation logic | Do not use as the product baseline |

The workspace is not currently a Git repository and is not deployable as a GitHub Pages site. It has no shared modules, catalogue data, configuration, documentation for users, automated checks, assets, or deployment workflow.

## 2. Consolidated product decisions

The following decisions reconcile the repeated and occasionally conflicting requirements:

1. Build a static, GitHub Pages-compatible site with HTML, CSS, and native ES modules. Do not introduce a framework for the MVP.
2. Publish one polished visualisation first: Thales' Theorem. Do not expose future visuals, "Coming Soon" cards, membership features, teacher resources, or school licensing in the public interface.
3. Use the functional `thales_theorem_visualization_2d_3d.html` as the behavior reference. Rebuild its reusable shell and preserve the verified mathematical interactions rather than copying its monolithic inline code unchanged.
4. Adopt the latest video requirement: YouTube embeds only; no `assets/videos/` directory and no locally hosted videos.
5. Centralize public integration settings in one committed `config/site-config.js` file. Measurement IDs are public configuration; API secrets must never be committed.
6. Make `data/visuals.json` the source of truth for the public catalogue. A visual is public only when its folder and required metadata both exist.
7. Use a minimalist editorial visual language: crisp off-white background, dark type, restrained motion, and a responsive masonry thumbnail strip. Avoid a dashboard-like or heavily colored EdTech interface.
8. Treat accessibility, SEO, responsive behavior, privacy disclosures, and lightweight loading as MVP requirements rather than later enhancements.

## 3. Key audit findings

### Prototype consolidation

- `thales_s_theorem_visualization1.html` and `thales_s_theorem_visualization2.html` have the same SHA-256 hash and must not both survive migration.
- The three interactive candidates duplicate 38-49 KB of HTML, CSS, and JavaScript each. All use a single-file implementation and external CDN scripts for Tailwind CSS, Three.js, OrbitControls, and MathJax.
- `thales_theorem_visualization.html` does not contain the interactive JavaScript required to initialize its controls and canvases. It is unsuitable as a functional base.
- The 2D/3D prototypes provide valuable interaction coverage: view selection, sliders, canvas rendering, 3D orbit controls, overlays, live derivations, fullscreen, draggable and resizable panels, and visibility toggles.

### Quality gaps to address during migration

- No prototype has a meta description or canonical URL.
- The interfaces use mouse drag events without touch or pointer-event equivalents, so primary panel interactions are not mobile-ready.
- Controls lack a semantic, keyboard-operable accessibility model; several buttons rely only on `title` text and omit explicit button types.
- Inline click handlers and broad global state make the current code difficult to test, reuse, or extend.
- Runtime dependencies are loaded from floating CDN URLs without integrity handling or a documented version/update policy.
- The full-screen visualisation layout is desktop-oriented and needs a deliberately designed small-screen presentation rather than simply shrinking panels.

### Documentation consolidation

- `AGENT_PROMPT.md` describes a broad starter repository but contains obsolete requirements, including local video directories and multiple unimplemented visualisation folders.
- `AGENT_PROMPT_MASTER.md` is the authoritative high-level product direction, but it needs to be converted from a generation prompt into maintainable project documentation.
- `monetisation.md` repeats repository structures, schemas, analytics requirements, workflow advice, design alternatives, and an example `.gitignore`. It should not remain the operational source of truth.
- Workflow guidance conflicts: one section calls for deployment, validation, and sitemap automation immediately, while another defers GitHub Actions. The plan adopts validation and deployment before first public release; sitemap generation is included in the build/validation step rather than as an independent mutable workflow.

## 4. Target repository architecture

```text
visual-math-lab/
  README.md
  index.html
  about.html
  contact.html
  privacy.html
  robots.txt
  sitemap.xml
  .gitignore
  assets/
    images/
    icons/
  config/
    site-config.js
  css/
    tokens.css
    site.css
    visual.css
  data/
    visuals.json
  js/
    analytics.js
    catalog.js
    components.js
    site.js
    visual-page.js
  visuals/
    thales-theorem/
      index.html
      thales-renderer.js
      thales-controls.js
      thales.css
      thumbnail.png
  scripts/
    validate-site.mjs
    generate-sitemap.mjs
  docs/
    roadmap.md
    product-decisions.md
    visual-authoring-guide.md
  .github/
    workflows/
      validate.yml
      deploy.yml
```

The `components.js` module should render shared navigation, footer, and support calls to action. The `visual-page.js` module should read the current slug, load its metadata, initialize analytics, render an optional validated YouTube embed, and mount the support call to action. The theorem modules should contain only theorem-specific rendering and control logic.

## 5. Metadata and configuration contracts

`config/site-config.js` will export the only source for public site-wide integration values:

```js
export const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",
  siteUrl: "https://YOUR_GITHUB_USERNAME.github.io/visual-math-lab",
  buyMeACoffeeUrl: "https://buymeacoffee.com/YOUR_HANDLE",
  membershipUrl: "",
  analyticsId: "",
  youtubeChannelUrl: "https://youtube.com/@YOUR_CHANNEL"
};
```

`data/visuals.json` will use this MVP schema:

```json
[
  {
    "slug": "thales-theorem",
    "title": "Thales' Theorem",
    "category": "Geometry",
    "description": "Explore why an angle subtended by a diameter is a right angle.",
    "thumbnail": "/visual-math-lab/visuals/thales-theorem/thumbnail.png",
    "youtubeId": "",
    "published": true
  }
]
```

The validation script will enforce unique slugs, required fields, a matching `visuals/<slug>/index.html`, an existing thumbnail, and a safe optional YouTube ID. It will reject folder/metadata mismatches and unpublished entries rendered in the catalogue.

## 6. Implementation phases

### Phase 0: Establish the repository baseline

1. Initialize Git and create the GitHub repository named `visual-math-lab`.
2. Preserve the current workspace in a `research/prototypes/` migration branch or archive outside the production tree until the new Thales visual has passed parity checks.
3. Add `.gitignore` for operating-system files, editors, logs, temporary content, dependencies, test artifacts, and private configuration.
4. Convert the concise product direction into `docs/product-decisions.md`; retain the roadmap only as an internal document.

**Exit criteria:** a clean repository has a documented purpose, one authoritative product decision record, and no duplicate production sources.

### Phase 1: Build the shared static-site shell

1. Create the target directory structure and ES-module entry points.
2. Implement design tokens and responsive global styles for the editorial, minimalist visual language.
3. Implement accessible shared navigation, footer, support button, and CTA rendering.
4. Create Home, About, Contact, and Privacy pages.
5. Ensure every support link comes from `SITE_CONFIG`; add a clear configuration state when placeholder values have not yet been replaced.

**Exit criteria:** all shared pages are responsive, keyboard navigable, and can be run from a static local server without console errors.

### Phase 2: Implement the data-driven catalogue and conversion integrations

1. Add `visuals.json` and render the homepage feature/index content from it.
2. Build the masonry strip from published metadata only, with native lazy-loaded thumbnails and a reduced-motion alternative.
3. Add optional YouTube embed rendering only for a valid `youtubeId`.
4. Add analytics initialization and named events: `visual_view`, `support_click`, `newsletter_signup`, and `youtube_click`.
5. Add a privacy disclosure that explains optional analytics and embedded third-party media before enabling production identifiers.

**Exit criteria:** a new published metadata entry creates a catalogue card without a homepage code change; an empty YouTube ID produces no video section; all conversion events use one shared analytics module.

### Phase 3: Migrate and improve Thales' Theorem

1. Select `thales_theorem_visualization_2d_3d.html` as the behavior baseline and catalogue each control, output, equation, and interaction before extraction.
2. Split the canvas renderer, Three.js scene, state model, control bindings, and visual-specific styles into modules.
3. Replace mouse-only drag/resize behavior with Pointer Events, keyboard alternatives, focus states, and touch-safe controls.
4. Create a mobile-first layout: a focused 2D primary view, optional 3D mode, collapsible controls, and no overlapping mandatory panels.
5. Ensure equations remain legible when MathJax is unavailable or still loading; use a pinned dependency strategy and documented upgrade process.
6. Produce an optimized local thumbnail and add accessible explanatory text for the theorem, controls, and mathematical result.

**Exit criteria:** the migrated page preserves the 2D and 3D theorem demonstrations, all core inputs work with keyboard and touch, the page remains usable at 320 px width, and the original duplicate prototypes are archived or removed from the production tree.

### Phase 4: Add SEO, quality gates, and GitHub Pages delivery

1. Add page-specific titles, descriptions, Open Graph metadata, canonical URLs, favicon assets, `robots.txt`, and a generated `sitemap.xml`.
2. Implement `validate-site.mjs` to check metadata integrity, JSON validity, duplicate slugs, page/folder correspondence, required image files, internal links, and prohibited local video assets.
3. Implement `generate-sitemap.mjs` from the public routes and published visual metadata.
4. Add a pull-request validation workflow and a deploy workflow using the official GitHub Pages Actions.
5. Validate deployed pages against the configured project base path, not only local root-relative URLs.

**Exit criteria:** validation fails for broken catalogue data, deploy runs only after validation succeeds, and the public site is reachable and correctly indexed from its GitHub Pages URL.

### Phase 5: Release and iterate from measured behavior

1. Configure the real public support URL, channel URL, site URL, and optional GA4 measurement ID.
2. Test the YouTube-to-visual-to-support funnel on mobile and desktop.
3. Measure visual views, support clicks, video clicks, and newsletter signups without collecting unnecessary personal data.
4. Use the visual-authoring guide and validation script when adding each new visualisation.
5. Keep future monetization, teacher resources, and licensing features behind internal roadmap decisions until the first visual has demonstrated user demand.

**Exit criteria:** production configuration is complete, analytics events are observable, legal/privacy content matches enabled services, and adding a second visual requires only its implementation folder, thumbnail, and catalogue record.

## 7. Verification plan

Before every release, verify:

1. Static validation succeeds and `visuals.json` satisfies its contract.
2. The homepage displays exactly the published visuals and no roadmap or placeholder content.
3. Every route has a unique title, meta description, canonical URL, and valid internal links.
4. The Thales visual works with mouse, touch, and keyboard at 320 px, tablet, and desktop widths.
5. Canvas resizing, 2D/3D switching, sliders, visibility toggles, derivations, and fullscreen behavior are exercised manually.
6. JavaScript reports no browser-console errors with normal and slow network conditions.
7. Support, YouTube, and analytics flows work when configured and degrade safely when optional configuration is blank.
8. GitHub Pages deployment completes from a clean checkout.

## 8. Decisions needed before Phase 5

The implementation can begin through Phase 4 with placeholder configuration. Before production release, provide:

1. GitHub owner and final repository name, which determine the canonical GitHub Pages URL.
2. Buy Me a Coffee profile URL.
3. YouTube channel URL and, if available, the Thales video ID.
4. Whether analytics requires an explicit consent banner for the intended audience/jurisdictions.
5. Newsletter provider and privacy requirements, if newsletter collection is in the first release.
