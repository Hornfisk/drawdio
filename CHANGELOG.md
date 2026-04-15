# Changelog

## [Unreleased]

### Added — Flat-Manifest Bridge
- **Live-edit bridge** — drawdio can now drive any app that stores its layout as a JSON file on disk. Drag a rect in drawdio → target file updates within ~200 ms → target app picks up the new layout. Companion plugins (e.g. SquelchPro / JUCE) reload with **Ctrl+R**; no recompile needed.
- **Bridge panel** (Toolbar → ☰ → Bridge) — GUI-driven WebSocket client. Connect / Disconnect toggle, target-file path, auto-connect-on-startup, one-click copy of the exact terminal command to launch the bridge server. Settings persist in localStorage.
- **Bridge server** — ~120-line Node script (`tools/bridge/server.mjs`) watching the target file with chokidar, broadcasting over `ws://localhost:7878`. SHA-1 content hashing suppresses self-echo so there's no ping-pong. Run with `npm run bridge` after a one-time `npm run bridge:install`.
- **Flat-manifest schema** — two-level JSON `{ <namespace>: { <id>: { x, y, w, h, locked? } } }`, documented in [`docs/FLAT_MANIFEST_SCHEMA.md`](docs/FLAT_MANIFEST_SCHEMA.md). Ids are round-tripped as dotted `namespace.id` on drawdio components.
- **Import Flat Manifest** menu item (Toolbar → ☰ → File) — load a flat manifest as additive rects on the canvas. Empty files get an explanatory alert instead of a silent success toast.
- **`locked` field on components** — rects marked `locked: true` are skipped by drag / resize / rotate. Exposed as a checkbox in the Properties panel; round-trips through the flat manifest so lock state survives a plugin reload.
- **Friendlier "wrong file type" error** — opening a flat-manifest file via **Open…** now points you at the correct Import menu item instead of a generic parse error.

### Added
- **Inline text editing on canvas** — press Enter on a single selected component (or double-click it) to edit its primary text in place. Works for labels, section headers, buttons, knobs, sliders, toggles, panels, images, dropdowns, and value readouts. Editor tracks pan/zoom and matches rendered font styling for `label_text`. Escape cancels, Enter/blur commits.
- **README screenshot** — SquelchPro acid synth mockup as a showcase of what Drawdio can produce
- **Rotation** — drag the rotation handle (circle above selection) to freely rotate any component; hold Shift to snap to configurable angle step; `[` / `]` keyboard shortcuts rotate by step (default 15°), Shift+`[`/`]` rotates by ±45°
- **Rotation step** — configurable per-step angle (∠ input in toolbar right section); affects `[`/`]` keys and Shift-snap during drag
- **Rotation field** in Properties panel (Position section) for precise numeric entry
- **Proportional resize** — hold Shift while dragging any corner handle to lock aspect ratio
- **Ctrl+drag** — duplicate components in-place and drag the copy; originals stay put
- **Resize handle tooltips** — hover any corner handle to see "Shift: lock ratio" hint (requires Tips enabled)
- **Rotation handle tooltip** — shows current step and key hints (requires Tips enabled)

### Changed
- **Waveform display** now scales correctly in real time during resize, using SVG `viewBox` scaling instead of a recomputed path
- **H Slider removed** from palette — use the Fader (formerly Vertical Slider) and rotate it 90° for a horizontal fader layout
- Resize handles hidden when a component has non-zero rotation (rotation must be 0° to resize; hint shown in selection)
- Hit-testing for rotated components uses proper rotated-rectangle math so rotated components remain clickable

### Fixed
- Layout bug: duplicate `id="app"` caused toolbar and canvas panels to render side-by-side instead of stacked
- Brave browser Force Dark Mode inverted SVG canvas colors — fixed with `color-scheme: dark`
- Palette icons showed as generic circles/squares — replaced with per-type inline SVG icons
- Drag-to-canvas from palette not working (consequence of layout bug above)
- Accessibility warnings in vite-plugin-svelte for interactive elements missing `role`, `tabindex`, or `onkeydown`
- `CollapsibleSection` Svelte 5 warning about `$state(prop)` — fixed with `untrack()`

## [1.0.0] — Initial Svelte release

- Migrated from single-file `drawdio.html` (4507 lines) to Svelte 5 + Vite + TypeScript
- 18 component types across Controls, Display, and Layout categories
- Full effects system (drop shadow, inner shadow, glow, bevel, gradient, texture, gloss)
- Snap-to-grid, zoom/pan, rubber-band selection, groups, layers, undo/redo
- Save/load `.drawdio.json`, autosave to localStorage
- Export PNG (1×/2×/3×/transparent), SVG, JSON to clipboard
