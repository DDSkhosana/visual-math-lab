# Adding a visualisation

1. Create `visuals/<slug>/index.html`.
2. Add a thumbnail image under `assets/images/` or the visual folder.
3. Add one complete, unique entry to `data/visuals.json`.
4. Set `published` to `true` only once the page is ready to show publicly.
5. Run `node scripts/validate-site.mjs` and `node scripts/generate-sitemap.mjs`.

Every metadata entry must provide `slug`, `title`, `category`, `description`, `thumbnail`, `published`, `youtubeId`, and `video`:

```json
{
  "slug": "perpendicular-chord-bisector",
  "title": "Perpendicular Chord Bisector",
  "category": "Geometry",
  "description": "...",
  "thumbnail": "assets/images/perpendicular-chord-bisector-thumbnail.svg",
  "published": true,
  "youtubeId": "",
  "video": {
    "enabled": false,
    "version": 1,
    "script": "",
    "thumbnailText": ""
  }
}
```

- `video.enabled`: the "Watch the demonstration" section renders only when this is `true` and `youtubeId` is a valid 11-character YouTube ID. Validation fails if `enabled` is `true` with an empty `youtubeId`.
- `video.version`: positive integer; bump it when the video is re-recorded.
- `video.script`: narration script or a path to it (planning only, never rendered publicly).
- `video.thumbnailText`: overlay text for the YouTube thumbnail (planning only).

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

Collapsed headers form plain shelves, with recessed groove-like spacing between them, not texture on their faces. In `css/workspace-dock.css`, collapsed section/card containers and shaded docked windows provide 3px of dark bottom padding beneath each header. Keep this spacing outside header hit areas and scoped to collapsed states; preserve expansion, drag behavior, navigation controls, keyboard focus outlines, and forced-colors boundaries. Shelves and a lone open section keep their full height. The deck's top card shrinks to a readable 10rem minimum; smaller panel bodies scroll instead of crushing its content. Docked header padding and body insets are shared across the circle and trigonometry suites.

The elevation deck is the only step-navigation panel for derivation cards. Keep step selection, previous/next controls, and mode switching there; card headers contain only the step title, badge, and expand/collapse affordance.

Navigation follows panel/category (level 1), section/group (level 2), and nested step (level 3). Parent groups never compete with their children as sibling turns. When groups contain nested steps, the same deck includes a Group selector and navigates only that group's steps, remembering each group's selected step. Panels without nested groups retain their section navigation. The breadcrumb shows the full path; Escape ascends from a nested control to its step header, then the group selector, then the panel header. Use the existing Panels menu or Alt+Up/Down to switch panel categories.

Docked panels default to Deck mode: once two or more sections are open they take elevation turns, with one section on top and the other open sections parked behind the deck pills (`◀`/`▶`, pills, mouse wheel, or `[`/`]`). Only steps the pills list are parked: in plain Deck mode, closed sections stay visible as shelves, and their headers raise them. The deck's mode button switches a panel to Scroll All, Accordion, or Focus Step; to start in another mode, pass `initWorkspaceDock(root, { deckMode })` or set `data-deck-mode` (`tabs`, `stack`, or `accordion`) on the `.panel-body`. "Expand All" appears only on floating windows, because docked panels navigate through the deck.

A step's own header always folds it. A step folded while it holds the turn in a panel whose deck lists every step (derivations, grouped panels, Focus Step, Accordion) stays as the deck's cursor on a closed shelf with the deck still visible. Nothing is raised while the turn rests, so nothing is parked: steps left open behind the deck fold too, and every step shows as a shelf. Background resyncs keep this collapsed state; any shelf header, a pill, `◀`/`▶`, the wheel, `[`/`]`, or the Group selector raises a step again and parks the others. In plain Deck mode, where pills list only open sections, folding the top section passes the turn to the next open one. Deck controls call `syncPanelElevationTurn` with `reveal` or `direction`; header handlers call it with the card or section that owns the header and no options. Header handlers in visual-specific accordions must toggle that owner (`.open` on a `.derivation-card`, `.collapsed` on a `.collapsible-section`) rather than its parent group.
The dock overlays rather than resizes the canvas. Its default width is the smaller of 380px and 35% of available width; default height is the smaller of 340px and 45% of available height, subject to normal 240px/160px minima. Drag the exposed edge or focus its separator and use arrow keys (Shift for larger increments), Home, or End. Resizing is capped at 65% of the available dimension, retaining at least 35% for the canvas; tiny viewports take precedence over the minima. Compact viewports use a resizable bottom sheet. Remembered horizontal and vertical sizes are clamped on viewport changes without discarding the user's preferred desktop size.

The viewport decides only the dock's size and placement. Content inside the dock responds to the dock itself: `.workspace-dock-body` is the `workspace-dock` inline-size container, and docked layout rules use `@container workspace-dock (…)` rather than viewport `@media` queries. In top/bottom docks, panels share a row only above 40rem of dock width. Below 20rem, the deck gives its pills a full row. Floating panels have no dock container and keep their own layout.
Elevation is drawn as volume, not just as stacking order: a recessed dock well, window slabs, plain shelves, lifted sections and raised active cards. The shared `--elevation-*` tokens control faces, rims and cast shadows, including top/bottom overlays and shaded windows. The top card leaves room for up to three receding edges for waiting turns; turns rise or settle through depth, becoming instant under `prefers-reduced-motion`. Forced colors retain system boundaries without shadows. Keep presentation driven by existing hierarchy and turn state, not by visual-specific overrides. Use Thales' theorem and the law of sines as the nested and flat-derivation benchmarks, including short and compact viewports.
