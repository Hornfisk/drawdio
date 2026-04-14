# Drawdio

FOSS audio plugin UI mockup tool. Migrated from a single 4507-line HTML file (`drawdio.html`, kept as reference) to Svelte 5 + Vite + TypeScript.

## Quick Start

```bash
nvm use 22    # requires Node 22+
npm install
npm run dev   # http://localhost:5173
npm run build # production build to dist/
```

## Architecture

### State (Svelte 5 runes)

- `src/lib/state/app.svelte.ts` — Central `$state` object: canvas dimensions, components[], groups[], selectedIds[], zoom/pan, clipboard, etc.
- `src/lib/state/derived.svelte.ts` — Helper functions (not `$derived` exports — Svelte 5 can't export `$derived` from modules). Use `getComponentMap()`, `getSortedComponents()`, `getSelectedComponents()`.
- `src/lib/state/history.ts` — Snapshot-based undo/redo stack (max 50). `pushHistory()` before mutations, `undo()`, `redo()`.
- `src/lib/state/clipboard.ts` — `doCopy()`, `doPaste()`, `doCut()`, `doDuplicate()`.
- `src/lib/state/selection.ts` — `select()`, `clearSelection()`, `deleteSelected()`, etc.
- `src/lib/state/zorder.ts` — `bringForward()`, `sendBackward()`, `bringToFront()`, `sendToBack()`.
- `src/lib/state/groups.ts` — `createGroup()`, `ungroupById()`, `expandSelection()`.

### Component System

- `src/lib/components/registry.ts` — `register(type, entry)`, `getEntry(type)`, `entriesByCategory()`. `RegistryEntry` has optional `variantGroup`/`variantLabel` fields — entries sharing a `variantGroup` collapse into one palette row with tab pills.
- `src/lib/components/register-all.ts` — Registers all 20 component types with metadata + editable properties.
- `src/lib/components/types.ts` — `ComponentData`, `EffectsData`, `PropertySpec` interfaces, `createDefaultEffects()`.
- 18 SVG components in `controls/`, `display/`, `layout/` subdirs. Each receives `{data}: {data: ComponentData}` via `$props()`.

### Rendering

- `src/lib/components/svg/ComponentRenderer.svelte` — Dynamic dispatch: looks up registry entry, renders `<Component {data} />` inside a `<g>` with transform + effects filter.
- `src/lib/components/svg/EffectsFilter.svelte` — SVG `<filter>` builder in `<defs>` (drop shadow, inner shadow, blur/glow, bevel).
- `src/lib/components/svg/EffectsDefs.svelte` — Gradient `<linearGradient>` and texture `<pattern>` defs.
- `src/lib/components/svg/EffectsOverlay.svelte` — Visual overlays (gradient rect, texture rect, gloss ellipse) inside component `<g>`.

### Canvas & Interaction

- `src/lib/canvas/Canvas.svelte` — Main SVG with defs, background, optional ref image layer (`<image id="ref-image">`), grid, components layer, selection layer.
- `src/lib/interaction/drag.svelte.ts` — Mouse state machine: move, resize, rubber-band, pan, zoom, click-to-place, right-click context menu.
- `src/lib/interaction/shortcuts.ts` — All keyboard shortcuts (delete, undo/redo, copy/paste, z-order, group, save, export, zoom).

### Panels

- `src/lib/panels/Palette.svelte` — Component palette with search, categories, drag-to-canvas, click-to-place. `PaletteIcon.svelte` is a reusable icon-per-type SVG component used by sub-menus.
- `src/lib/panels/PropertiesPanel.svelte` — Reactive property editor (label, position, appearance, parameters, effects).
- `src/lib/panels/LayersPanel.svelte` — Z-ordered list with visibility toggles and reordering.
- `src/lib/panels/EffectsEditor.svelte` — Effects toggles + intensity sliders.
- `src/lib/panels/CollapsibleSection.svelte` — Reusable collapsible section.

### IO

- `src/lib/io/serialization.ts` — `toJSON()`, `fromJSON()`, `save()`, `saveAs()`, `loadFromFile()`, `newProject()`. Backward-compatible `drawdio_version: 1` format.
- `src/lib/io/export.ts` — `exportPNG(scale, transparent)`, `exportSVG()`, `copyJSONToClipboard()`.
- `src/lib/io/autosave.ts` — localStorage auto-save every 30s, restore prompt on load.
- `src/lib/ui/ColorPicker.svelte` — HSB canvas-based color picker, positioned fixed. Props: `color`, `x`, `y`, `swatches`, `onchange`, `onswatchsave`, `onreset`, `onclose`. Swatches persisted in localStorage under `drawdio_swatches`.
- `src/lib/ui/ColorField.svelte` — reusable row (hex input + well + eyedropper) used in Appearance, Canvas BG, Gradient, and Toolbar accent. Eyedropper prefers `window.EyeDropper` when available; falls back to a canvas-scoped picker for Brave with fingerprint blocking.
- `src/lib/ui/eyedropper.svelte.ts` — shared `$state` mode for the canvas-scoped picker. `Canvas.svelte` watches `eyedropperState.active` and, when true, rasterizes the live SVG (via `XMLSerializer` → blob URL → `<img>` → `drawImage` → `getImageData`) and samples the clicked pixel. Data URLs for ref images / user assets avoid CORS taint. Escape / right-click cancels. Note: the eyedropper only *samples* colors — applying the result to a raster asset (imported image, `image_placeholder`) will update `data.color` but has no visible effect since those components don't respect it.

### Toolbar & UI

- `src/lib/toolbar/Toolbar.svelte` — Single hamburger `☰` menu containing File, Export, Accent Color (8 presets + hex + native picker), and Theme (Dark/Light) sections. Right side has Tips/Snap/Grid toggles.
- `src/lib/ui/ContextMenu.svelte` — Right-click context menu with full action set.

## Environment

- **WSL2 + /mnt/c**: Vite's inotify-based watcher doesn't fire on Windows filesystem. `vite.config.ts` has `usePolling: true` — HMR works but requires a one-time restart after changing `vite.config.ts` itself.
- **Brave Force Dark Mode**: Three-layer defense — `color-scheme: dark` on `:root` (CSS), `<meta name="color-scheme">` (HTML), and `root.style.colorScheme` updated from `App.svelte` `$effect`. All three stay in sync when the user switches themes.
- **Layout root**: `main.ts` mounts into `<div id="app">` from `index.html`. The main layout div in `App.svelte` uses `id="app-layout"` to avoid a duplicate-id CSS collision.
- **Git push**: SSH key requires `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519` before pushing. Remote is `git@github.com:Hornfisk/drawdio.git`.

## Key Svelte 5 Patterns

- `$state` for reactive state, `$derived` for computed values, `$props()` for component props, `$effect()` for side effects.
- Cannot export `$derived` from `.svelte.ts` modules — use regular functions instead.
- `<svelte:component>` is deprecated — use `{@const Component = expr}` then `<Component />`.
- Direct mutation of `$state` proxied objects triggers reactive updates (e.g., `comp.x = 100` updates only where `.x` is read).
- `{@html}` inside `<svg>` does NOT work — Svelte uses HTML parser, not SVG namespace. Use inline `{#if}` template elements directly inside the `<svg>` tag instead.
- To initialise local state from a prop without Svelte warning: `let x = $state(untrack(() => propVal))` (import `untrack` from `'svelte'`).
- `{@const}` is only valid as a direct child of block tags (`{#if}`, `{#each}`, etc.) — not at the top level of a `<g>` element. Inline expressions instead.
- To force-update a `$state` Map, replace the whole object: `myMap = new Map(myMap).set(k, v)` — mutating in-place won't trigger reactivity.
- Resize handle `<div>` with `onmousedown` needs `<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->` above it.

## Palette Sub-menu Pattern

Collapsible inline library below a palette row: add `class:expanded={...}` to `.palette-item-group`, a `<button class="palette-lib-arrow">` inside `.palette-item` (stopPropagation on mousedown to block drag), and the content block conditionally after. CSS: `.palette-item-group.expanded` gets `background: var(--surface-hover)` + `border-left: 2px solid var(--accent)`. The sequencer `variantGroup` uses this pattern instead of tab pills.

## Builtin Media (Knobs & Textures)

- `public/knobs/` — 11 PNG knobs (512×512, transparent bg) served at `/knobs/*.png`.
- `public/textures/` — 4 PNG textures served at `/textures/*.png`.
- Registries: `src/lib/components/builtin-knobs.ts`, `src/lib/components/builtin-textures.ts`.
- Fetch helper converts public URL → base64 at placement time (export-safe). Place knobs at `comp.width = comp.height = 80`.
- Textures: click/drag applies to selected `panel_group` as texture fill; falls back to `image_placeholder`.

## Save Format

Files use `.drawdio.json` extension. Format:
```json
{
  "drawdio_version": 1,
  "canvas": { "width": 900, "height": 600, "bgColor": "#1a1a1a", "gridSize": 20, "refImageDataUrl": null, "refImageOpacity": 0.5, "refImageVisible": true },
  "components": [...],
  "groups": [...]
}
```
Backward-compatible with files saved by the original `drawdio.html`. Reference image (`id="ref-image"` SVG element) is always stripped from exports via `clone.getElementById('ref-image')?.remove()` in both `exportPNG` and `exportSVG`.

## 18 Component Types

**Controls:** rotary_knob, horizontal_slider, vertical_slider, momentary_button, toggle_switch, dropdown, xy_pad, midi_keyboard
**Display:** level_meter, waveform_display, spectrum_analyzer, step_sequencer, acid_step_sequencer, label_text, led_indicator, value_readout
**Layout:** panel_group, separator, section_header, image_placeholder

`step_sequencer` and `acid_step_sequencer` share `variantGroup: 'sequencer'` — displayed as one row with a `▾` arrow that expands both variants as sub-items (arrow pattern, not tab pills). Other variantGroups still use tab pills. Register order in `register-all.ts` = palette order; currently alphabetical by `displayName` per category.

## Effects System

7 effects per component: drop_shadow, inner_shadow, blur_glow, bevel (SVG filters), gradient_fill, texture_fill, gloss (visual overlays). Each has enabled toggle + intensity (0-100).

## Theming

CSS uses a 16-token variable system. `:root` has dark defaults; `[data-theme="light"]` overrides all 16. `App.svelte` `$effect` sets `document.documentElement.dataset.theme`, `colorScheme`, `--accent`, and the meta tag together.

**SVG theming caveat:** SVG presentation attributes (`fill="#xxx"`) do NOT support CSS variables. Use SVG `style=` attributes (`style="fill: var(--border-muted)"`) or Svelte bindings (`fill={appState.accentColor}`) instead.

**`--accent` self-reference trap:** `:root { --accent: var(--accent) }` is circular and always resolves empty. Always use a literal: `:root { --accent: #4fc3f7 }`.

## User Assets

Users can import PNG/JPEG/SVG/WebP assets at runtime via the palette "Add Assets" button. Assets are stored as base64 data URLs in `appState.userAssets` and serialized into `.drawdio.json`. Dragging an asset places an `image_placeholder` component with `data.properties.imageDataUrl` set.

## What's Left / Known Issues

- Tooltip component not yet ported (low priority)
- Left panel is resizable (120–400px); `leftPanelWidth = $state(180)` in `App.svelte`, `.left-panel` uses `flex-shrink: 0` with inline `style="width: {leftPanelWidth}px"`.
- No drag-reorder in layers panel (use arrow buttons)
- `horizontal_slider` palette icon falls through to generic grey rect (no case in the `Palette.svelte` SVG icon block).
