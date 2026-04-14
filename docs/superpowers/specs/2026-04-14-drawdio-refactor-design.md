# Drawdio Full-Scope Refactor — Design Spec

**Date:** 2026-04-14  
**Scope:** Code quality, type safety, utility extraction, CSS/theming, accessibility, UX polish  
**Approach:** Layered refactor in 5 independent passes (Option 2)

---

## Background

Drawdio is a Svelte 5 + TypeScript audio plugin UI mockup tool (~55 source files). A comprehensive audit identified 47 issues across 10 categories. This spec covers a full-scope refactor (code internals + visual/UX improvements) executed in 5 ordered passes, each independently reviewable.

**Audit summary (issues by category):**

| Category | High | Medium | Low |
|---|---|---|---|
| Code Duplication | 1 | 2 | 2 |
| Accessibility | 2 | 3 | 1 |
| CSS/Theming | 1 | 2 | 2 |
| Error Handling | 0 | 3 | 3 |
| TypeScript | 0 | 2 | 2 |
| UX/Consistency | 0 | 1 | 7 |
| Performance | 0 | 2 | 3 |
| Svelte Patterns | 0 | 1 | 3 |
| Security | 0 | 1 | 3 |

---

## Pass 1 — Type System

**Goal:** Eliminate all unsafe casts. Give the effects system and component properties real types.

### Changes

**`src/lib/components/types.ts`**
- Add `EffectKey` union type: `'drop_shadow' | 'inner_shadow' | 'blur_glow' | 'bevel' | 'gradient_fill' | 'texture_fill' | 'gloss'`
- Add `EffectData` interface replacing the loose `Record<string, unknown>` for individual effect entries:
  ```ts
  interface EffectEntry { enabled: boolean; intensity: number }
  type EffectsData = Record<EffectKey, EffectEntry>
  ```
- Add `ComponentProperties` interface with all known keys (`label`, `color`, `bgColor`, `fgColor`, `width`, `height`, `imageDataUrl`, `textureDataUrl`, `steps`, `octaves`, etc.) replacing `Record<string, unknown>` on `ComponentData.properties`
- `ComponentData.effects` becomes `EffectsData` (typed)

**`src/lib/panels/EffectsEditor.svelte`**
- Remove all `as Record<string, unknown>`, `as boolean`, `as number` casts — use `EffectKey` iteration and typed `EffectEntry`

**`src/lib/panels/PropertiesPanel.svelte`**
- Remove `as unknown as Record<string, unknown>` casts; use `ComponentProperties`
- Remove `e as unknown as MouseEvent`

**`src/lib/state/history.ts`**
- Replace `pop()!` non-null assertions with guards: `const snapshot = stack.pop(); if (!snapshot) return;`

**`src/lib/interaction/drag.svelte.ts`**
- Replace `getAttribute()!` non-null assertions with guarded early returns

**`src/lib/io/autosave.ts`**
- Replace empty catch blocks with `console.warn('Autosave failed:', err)` logging

**`src/lib/state/clipboard.ts`, `src/lib/state/history.ts`**
- Replace `JSON.parse(JSON.stringify(...))` deep-clone pattern with `structuredClone()` (already used elsewhere in codebase)

**`src/lib/io/serialization.ts`**
- Add schema validation on `fromJSON()` input: verify `drawdio_version` field exists and `components`/`groups` are arrays before processing
- Improve error message context: include filename in the alert

---

## Pass 2 — Utility Extraction & Deduplication

**Goal:** Remove the 4× drag-handler duplication in Palette.svelte; consolidate shared DOM/IO patterns.

### New files

**`src/lib/utils/canvas.ts`**
```ts
export function getCanvasSVGElement(): SVGSVGElement | null
export function getCanvasContainer(): HTMLElement | null
```
Replaces 8 identical `document.querySelector('.canvas-container')` / `.canvas-svg` calls.

**`src/lib/utils/drag-to-canvas.ts`**
```ts
export function createDragToCanvasHandler(
  getComponentData: () => Partial<ComponentData>,
  options?: { onPlaced?: (comp: ComponentData) => void }
): { onmousedown: (e: MouseEvent) => void }
```
Encapsulates: drag threshold detection, ghost element creation/positioning, CTM coordinate transformation, snap-to-grid, `addComponent()` call, cleanup. Replaces 4 near-identical drag handler blocks in Palette.svelte (lines ~81–144, ~157–229, ~234–325, ~357–415).

**`src/lib/utils/file-loader.ts`**
```ts
export function loadImageFile(
  accept: string,
  callback: (dataUrl: string, fileName: string) => void
): void
```
Replaces 3 duplicate file-picker + FileReader patterns in PropertiesPanel.svelte and Toolbar.svelte.

**`src/lib/utils/fetch-asset.ts`**
```ts
export async function fetchAssetAsDataUrl(url: string): Promise<string>
```
Wraps fetch + FileReader/blob→base64, with proper error propagation. Replaces the pattern in `builtin-knobs.ts` and `builtin-textures.ts`. Callers must handle the rejected promise.

### Modified files

**`src/lib/panels/Palette.svelte`**
- Import and use `createDragToCanvasHandler` — reduces drag handler code by ~180 lines
- Import and use `getCanvasSVGElement` / `getCanvasContainer`
- Expected reduction: ~645 → ~400 lines

**`src/lib/components/builtin-knobs.ts`**, **`src/lib/components/builtin-textures.ts`**
- Use `fetchAssetAsDataUrl`; add `.catch(err => console.error('Asset load failed:', err))`

**`src/lib/panels/PropertiesPanel.svelte`**, **`src/lib/toolbar/Toolbar.svelte`**
- Use `loadImageFile` for all file-picker flows

---

## Pass 3 — CSS & Theming Consistency

**Goal:** No hardcoded hex colors in SVG component files. All interactive states have visual treatment.

### New CSS variables (added to `:root` and `[data-theme="light"]` in `src/app.css`)

| Variable | Dark default | Light override | Usage |
|---|---|---|---|
| `--component-bg` | `#141416` | `#f0f0f2` | Display component backgrounds |
| `--component-bg-alt` | `#2a2a3a` | `#dde0e8` | Track / secondary backgrounds |
| `--component-active` | `var(--accent)` | `var(--accent)` | Lit step, active LED |
| `--component-inactive` | `#383848` | `#c8ccd6` | Unlit step, inactive LED |
| `--component-label` | `#888` | `#555` | Small label text inside components |
| `--meter-green` | `#66bb6a` | `#4caf50` | LevelMeter low segment |
| `--meter-yellow` | `#ffd54f` | `#ffb300` | LevelMeter mid segment |
| `--meter-red` | `#ef5350` | `#e53935` | LevelMeter peak segment |
| `--key-white` | `#dde0e8` | `#ffffff` | MidiKeyboard white keys |
| `--key-black` | `#111` | `#1a1a1a` | MidiKeyboard black keys |

### SVG component files to update (replace hardcoded colors)

- `src/lib/components/display/LevelMeter.svelte` — `#66bb6a`, `#ffd54f`, `#ef5350`
- `src/lib/components/display/AcidStepSequencer.svelte` — `#c42a2a`, `#f0dc3c`, `#d6d6da`, `#782818`, `#2a2a3a`
- `src/lib/components/display/StepSequencer.svelte` — `#2a2a3a`, `#3a3a4a`, `#4a4a5a`
- `src/lib/components/controls/MidiKeyboard.svelte` — `#111`, `#0d0d0f`, `#2a2a2a`
- `src/lib/components/display/WaveformDisplay.svelte` — background hardcodes
- `src/lib/components/display/SpectrumAnalyzer.svelte` — background hardcodes
- `src/lib/components/controls/RotaryKnob.svelte` — track/indicator hardcodes
- `src/lib/components/controls/HorizontalSlider.svelte` — track hardcodes
- `src/lib/components/controls/VerticalSlider.svelte` — track hardcodes

**Note:** SVG `style=` attributes must be used (not `fill=` presentation attributes) since CSS variables don't work through SVG presentation attributes — consistent with existing patterns in the codebase.

### Additional CSS changes (`src/app.css`)

- Add `:focus-visible` ring to: `.palette-item`, `.toolbar-btn`, `.panel-btn`, all `input`, `select`, `button` elements
- Add `cursor: not-allowed; opacity: 0.5` for `[disabled]` and `.disabled` states
- Raise `--text-dimmer`: `#555` → `#777` (dark theme) for WCAG AA contrast
- Raise `--text-dim`: `#666` → `#888` (dark theme)
- Update light theme equivalents accordingly
- Remove `color-mix()` usage without fallback; provide explicit fallback values

---

## Pass 4 — Accessibility

**Goal:** Screen-reader usable interactive components, keyboard-navigable UI, WCAG AA contrast everywhere.

### Interactive SVG components — ARIA

Add to each component's root `<svg>` or wrapping `<g>` element:

| Component | role | aria-label | additional |
|---|---|---|---|
| `RotaryKnob` | `slider` | `"{label} knob"` | `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` |
| `HorizontalSlider` | `slider` | `"{label} slider"` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation="horizontal"` |
| `VerticalSlider` | `slider` | `"{label} slider"` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation="vertical"` |
| `MomentaryButton` | `button` | `"{label}"` | `aria-pressed` |
| `ToggleSwitch` | `switch` | `"{label}"` | `aria-checked` |
| `Dropdown` | `combobox` | `"{label}"` | native `<select>` already handles this |
| `XYPad` | `group` | `"XY Pad: {label}"` | child `role="slider"` for X and Y axes |
| `LedIndicator` | `status` | `"{label} indicator"` | `aria-live="polite"` |

### Context menu (`src/lib/ui/ContextMenu.svelte`)

- Auto-focus first non-disabled menu item when menu opens
- Trap focus within menu while open
- `Escape` closes menu and returns focus to trigger element
- Arrow Up/Down navigate between items
- `role="menu"` on container, `role="menuitem"` on items

### Properties panel (`src/lib/panels/PropertiesPanel.svelte`)

- Add `aria-label` to all unlabeled `<input>` elements (there are several with only visual labels)
- Add `aria-invalid="true"` + `aria-describedby` pointing to an error hint span for numeric inputs when value is out of range

### Status announcements

- Add `<div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="app-status">` to `App.svelte`
- Wire autosave confirmation and export success messages through this region
- CSS `.sr-only`: standard visually-hidden pattern (position absolute, 1×1px clip)

### Palette items

- Add `role="button"` and `tabindex="0"` to `.palette-item` elements
- Handle `keydown` Enter/Space to trigger click-to-place mode (same as click)
- Add `aria-label="{displayName} — drag to canvas or press Enter to place"` on each item

### Contrast fixes

- `--text-dimmer` and `--text-dim` raised as specified in Pass 3
- Verify all text/background pairs in both themes meet 4.5:1 ratio (normal text) or 3:1 (large text/UI components)

---

## Pass 5 — UX Polish

**Goal:** Consistent labels, loading feedback, placement mode clarity, shortcut discoverability.

### Placement mode indicator

When `appState.placingType` is non-null, show a floating chip anchored to the top-left of the canvas:

```
[ Placing: Rotary Knob  ×  Esc to cancel ]
```

- Implemented as an `{#if appState.placingType}` block in `Canvas.svelte` or `App.svelte`
- Styled as a small pill: `--accent` left border, dark background, 12px text
- Click `×` or press `Esc` to cancel (mirrors existing `Escape` shortcut in `shortcuts.ts`)

### Loading states for knob/texture tiles

- While `await fetchAssetAsDataUrl()` resolves, overlay the palette tile with a subtle pulsing shimmer (CSS `@keyframes` on opacity)
- Implemented via a `loading = $state(false)` flag per tile in Palette.svelte

### Export feedback toast

- Add `Toast.svelte` component: a small notification that fades in/out at top-right of canvas
- Show on: PNG export success, SVG export success, JSON copy success, autosave success
- Auto-dismisses after 2.5s; no user interaction required
- Wire into `export.ts` and `autosave.ts` via a simple `showToast(message)` store function in new `src/lib/state/toast.svelte.ts`

### Standardize labels (global find-and-replace)

| Current | Standardized |
|---|---|
| "Load Reference Image…" / "Load Texture…" | "Load Image…" / "Load Texture…" (keep ellipsis for all file pickers) |
| "Delete" (context menu) | Keep "Delete" — it's the standard term; remove "Remove" inconsistency |
| Mixed title/sentence case on buttons | All buttons: Title Case |
| "☰" tooltip-less | Add `title="Menu"` |

### `title` attributes on icon-only buttons

- All icon-only toolbar buttons: add `title="..."` for native browser tooltip
- Palette category toggle arrows: `title="Expand {category}"` / `title="Collapse {category}"`

### Keyboard shortcut reference overlay

- `?` key (already in shortcut list or easy to add to `shortcuts.ts`) opens a modal overlay
- Content: a two-column table of all shortcuts grouped by category (Canvas, Edit, View, File)
- Implemented as `ShortcutsHelp.svelte`, shown via a `showShortcutsHelp = $state(false)` in `app.svelte.ts`
- Overlay has `role="dialog"`, `aria-label="Keyboard shortcuts"`, focus trap, `Esc` to close

---

## Execution Order & Dependencies

```
Pass 1 (Types)
  └─► Pass 2 (Utils) — depends on typed interfaces from Pass 1
        └─► Pass 3 (CSS) — independent of Pass 2, but should follow Pass 1
              └─► Pass 4 (A11y) — uses CSS variables from Pass 3
                    └─► Pass 5 (UX) — builds on all previous passes
```

Each pass produces a coherent, working state of the app. Passes 3 and 2 can run in parallel after Pass 1.

---

## Files Created (new)

- `src/lib/utils/canvas.ts`
- `src/lib/utils/drag-to-canvas.ts`
- `src/lib/utils/file-loader.ts`
- `src/lib/utils/fetch-asset.ts`
- `src/lib/state/toast.svelte.ts`
- `src/lib/ui/Toast.svelte`
- `src/lib/ui/ShortcutsHelp.svelte`
- `docs/superpowers/specs/2026-04-14-drawdio-refactor-design.md` (this file)

---

## Files Modified (major)

- `src/lib/components/types.ts` (Pass 1)
- `src/lib/panels/EffectsEditor.svelte` (Pass 1)
- `src/lib/panels/Palette.svelte` (Pass 2 — 645→~400 lines)
- `src/lib/panels/PropertiesPanel.svelte` (Pass 1, 2, 4)
- `src/lib/toolbar/Toolbar.svelte` (Pass 2, 5)
- `src/app.css` (Pass 3, 4)
- `src/App.svelte` (Pass 4, 5)
- `src/lib/canvas/Canvas.svelte` (Pass 5)
- All 9 SVG component files listed under Pass 3
- All 8 interactive SVG component files listed under Pass 4

---

## Out of Scope

- Adding new features or component types
- Redesigning the layout or information architecture
- Porting the reference `drawdio.html`
- Migrating to a different framework
- Adding server-side functionality
