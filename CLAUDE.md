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

- `src/lib/components/registry.ts` — `register(type, entry)`, `getEntry(type)`, `entriesByCategory()`.
- `src/lib/components/register-all.ts` — Registers all 18 component types with metadata + editable properties.
- `src/lib/components/types.ts` — `ComponentData`, `EffectsData`, `PropertySpec` interfaces, `createDefaultEffects()`.
- 18 SVG components in `controls/`, `display/`, `layout/` subdirs. Each receives `{data}: {data: ComponentData}` via `$props()`.

### Rendering

- `src/lib/components/svg/ComponentRenderer.svelte` — Dynamic dispatch: looks up registry entry, renders `<Component {data} />` inside a `<g>` with transform + effects filter.
- `src/lib/components/svg/EffectsFilter.svelte` — SVG `<filter>` builder in `<defs>` (drop shadow, inner shadow, blur/glow, bevel).
- `src/lib/components/svg/EffectsDefs.svelte` — Gradient `<linearGradient>` and texture `<pattern>` defs.
- `src/lib/components/svg/EffectsOverlay.svelte` — Visual overlays (gradient rect, texture rect, gloss ellipse) inside component `<g>`.

### Canvas & Interaction

- `src/lib/canvas/Canvas.svelte` — Main SVG with defs, background, grid, components layer, selection layer.
- `src/lib/interaction/drag.svelte.ts` — Mouse state machine: move, resize, rubber-band, pan, zoom, click-to-place, right-click context menu.
- `src/lib/interaction/shortcuts.ts` — All keyboard shortcuts (delete, undo/redo, copy/paste, z-order, group, save, export, zoom).

### Panels

- `src/lib/panels/Palette.svelte` — Component palette with search, categories, drag-to-canvas, click-to-place.
- `src/lib/panels/PropertiesPanel.svelte` — Reactive property editor (label, position, appearance, parameters, effects).
- `src/lib/panels/LayersPanel.svelte` — Z-ordered list with visibility toggles and reordering.
- `src/lib/panels/EffectsEditor.svelte` — Effects toggles + intensity sliders.
- `src/lib/panels/CollapsibleSection.svelte` — Reusable collapsible section.

### IO

- `src/lib/io/serialization.ts` — `toJSON()`, `fromJSON()`, `save()`, `saveAs()`, `loadFromFile()`, `newProject()`. Backward-compatible `drawdio_version: 1` format.
- `src/lib/io/export.ts` — `exportPNG(scale, transparent)`, `exportSVG()`, `copyJSONToClipboard()`.
- `src/lib/io/autosave.ts` — localStorage auto-save every 30s, restore prompt on load.

### Toolbar & UI

- `src/lib/toolbar/Toolbar.svelte` — File/Export dropdown menus, canvas presets, toggle buttons.
- `src/lib/ui/ContextMenu.svelte` — Right-click context menu with full action set.

## Key Svelte 5 Patterns

- `$state` for reactive state, `$derived` for computed values, `$props()` for component props, `$effect()` for side effects.
- Cannot export `$derived` from `.svelte.ts` modules — use regular functions instead.
- `<svelte:component>` is deprecated — use `{@const Component = expr}` then `<Component />`.
- Direct mutation of `$state` proxied objects triggers reactive updates (e.g., `comp.x = 100` updates only where `.x` is read).

## Save Format

Files use `.drawdio.json` extension. Format:
```json
{
  "drawdio_version": 1,
  "canvas": { "width": 900, "height": 600, "bgColor": "#1a1a1a", "gridSize": 20 },
  "components": [...],
  "groups": [...]
}
```
Backward-compatible with files saved by the original `drawdio.html`.

## 18 Component Types

**Controls:** rotary_knob, horizontal_slider, vertical_slider, momentary_button, toggle_switch, dropdown, xy_pad
**Display:** level_meter, waveform_display, spectrum_analyzer, step_sequencer, label_text, led_indicator, value_readout
**Layout:** panel_group, separator, section_header, image_placeholder

## Effects System

7 effects per component: drop_shadow, inner_shadow, blur_glow, bevel (SVG filters), gradient_fill, texture_fill, gloss (visual overlays). Each has enabled toggle + intensity (0-100).

## What's Left / Known Issues

- Tooltip component not yet ported (low priority)
- Left panel resize handle not functional (CSS-only placeholder)
- No drag-reorder in layers panel (use arrow buttons)
- The `appState` import in `App.svelte` is currently unused after removing seed data — can be removed if not needed for future features
