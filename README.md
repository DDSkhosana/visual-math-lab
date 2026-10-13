# Visual Mathematics Lab

A static, GitHub Pages-compatible collection of interactive mathematical visualisations.

## Local development

Use any static HTTP server from the repository root. For example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Validation

```powershell
node scripts/validate-site.mjs
node scripts/generate-sitemap.mjs
```

## Configuration

Update public site settings in `config/site-config.js` before release:

| Setting | Purpose |
|---|---|
| `site.name` | Site name shown in the header and footer |
| `site.url` | Public URL without a trailing slash; required for sitemap generation |
| `creator.name` | Content owner name |
| `buyMeACoffee.profileUrl` | Support panel and footer link |
| `buyMeACoffee.membershipUrl` | Membership page URL |
| `youtube.channelUrl`, `youtube.handle`, `youtube.channelId` | YouTube channel details |
| `analytics.measurementId` | Google Analytics 4 ID (`G-…`); leave empty to disable analytics |

`npm run validate` rejects placeholder values such as `G-XXXXXXXXXX` or `YOUR_CHANNEL`.

Do not place private credentials in this repository.

## Adding a visual

Follow [the visual authoring guide](docs/visual-authoring-guide.md). The catalogue is generated from `data/visuals.json`; no homepage code change is required.

## Deployment

The GitHub Actions workflows validate the site, generate `sitemap.xml`, and deploy the repository to GitHub Pages. Configure Pages to use **GitHub Actions** as its build source.

## Licensing

The code and content are licensed separately.

### Source Code

The website source code (HTML, CSS, JavaScript and build or validation scripts) is licensed under the [Apache License 2.0](LICENSE).

### Educational Content

Visualisations, mathematical explanations, educational text, diagrams, images, thumbnails, videos and generated media are © 2026 Dianah Skhosana, all rights reserved. See [CONTENT_LICENSE.md](CONTENT_LICENSE.md) for permitted uses and how to request permission for reuse.
