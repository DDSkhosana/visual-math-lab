# Adding a visualisation

1. Create `visuals/<slug>/index.html`.
2. Add a thumbnail image under `assets/images/` or the visual folder.
3. Add one complete, unique entry to `data/visuals.json`.
4. Set `published` to `true` only once the page is ready to show publicly.
5. Run `node scripts/validate-site.mjs` and `node scripts/generate-sitemap.mjs`.

Every published metadata entry must provide `slug`, `title`, `category`, `description`, `thumbnail`, `youtubeId`, and `published`. An empty `youtubeId` means no video section is rendered.

## Interactive implementation

Place the visual's markup directly in `visuals/<slug>/index.html`. First-party mathematical interactions must not be embedded in an iframe: direct mounting preserves page-level accessibility, analytics, responsive layout, and shared site behavior.

### Module structure (reference: `visuals/thales-theorem/`)

```
visuals/<slug>/
  index.html        markup shell only; no inline scripts or handlers
  styles/           explorer.css (@import manifest) + layout, panels, controls, overlays, responsive partials
  src/
    main.js         composition root: builds store, views, controllers; wires dependencies
    config/         constants, defaults, palette
    model/          pure math (no DOM), observable store, state-patch actions
    views/          render state only (Canvas2D, Scene3D facade, labels, stats); Null Object fallbacks
    controllers/    translate user input into actions; declarative control tables
    ui/             reusable widgets (Accordion, Panel, Tooltip, fullscreen)
    platform/       wrappers over globals such as Three.js
  tests/            node --test unit tests for model code
```

Principles: single responsibility per module; views never mutate state; controllers never draw; dependencies are injected from `main.js` (dependency inversion); new controls are added as rows in a table rather than new branches (open/closed). Use Pointer Events and `ResizeObserver` so touch and every viewport size work, and collapse panels to in-flow blocks on compact screens. Floating panels default to collapsed state on initial load to keep the canvas workspace clean and unoccluded, with draggable headers, minimize toggles (`+`/`−`), and independent "Expand All" / "Collapse All" actions. Run `npm test` before committing.
