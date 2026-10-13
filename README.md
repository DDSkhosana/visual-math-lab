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

- `siteUrl`
- `buyMeACoffeeUrl`
- `analyticsId`
- `youtubeChannelUrl`

Do not place private credentials in this repository.

## Adding a visual

Follow [the visual authoring guide](docs/visual-authoring-guide.md). The catalogue is generated from `data/visuals.json`; no homepage code change is required.

## Deployment

The GitHub Actions workflows validate the site, generate `sitemap.xml`, and deploy the repository to GitHub Pages. Configure Pages to use **GitHub Actions** as its build source.
