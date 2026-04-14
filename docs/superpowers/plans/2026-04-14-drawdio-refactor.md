# Drawdio Full-Scope Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve code quality, type safety, CSS theming consistency, accessibility, and UX polish across the Drawdio codebase in five independent, sequentially buildable passes.

**Architecture:** Five layered passes — types first (removes casts everywhere downstream), then utility extraction (reduces Palette.svelte by ~250 lines), then CSS/theming (component-level CSS vars), then accessibility (ARIA + keyboard nav), then UX polish (toast, placement indicator, shortcuts overlay). Each pass leaves the app in a working state.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, SVG, CSS custom properties. No new dependencies.

---

## File Map

### Created
- `src/lib/utils/fetch-asset.ts` — shared fetch-to-base64 utility (replaces duplicate code in builtin-knobs/textures)
- `src/lib/utils/file-loader.ts` — shared file-picker + FileReader utility
- `src/lib/utils/drag-to-canvas.ts` — shared drag-ghost + CTM + snap handler factory
- `src/lib/state/toast.svelte.ts` — toast message reactive state
- `src/lib/ui/Toast.svelte` — auto-dismissing notification component
- `src/lib/ui/ShortcutsHelp.svelte` — keyboard shortcut reference overlay

### Modified
- `src/lib/components/types.ts` — add `EffectKey`, `ComponentProperties`, tighten types
- `src/lib/panels/EffectsEditor.svelte` — remove all `as Record<...>` casts
- `src/lib/panels/PropertiesPanel.svelte` — use `ComponentProperties`, remove casts
- `src/lib/state/history.ts` — remove `!` assertions, use `structuredClone`
- `src/lib/state/clipboard.ts` — use `structuredClone`
- `src/lib/io/serialization.ts` — use `structuredClone`, improve validation
- `src/lib/io/autosave.ts` — log errors, wire toast
- `src/lib/io/export.ts` — wire toast on success
- `src/lib/components/builtin-knobs.ts` — use `fetchAssetAsDataUrl`
- `src/lib/components/builtin-textures.ts` — use `fetchAssetAsDataUrl`
- `src/lib/panels/Palette.svelte` — use `createDragHandler`; ~645 → ~400 lines
- `src/lib/toolbar/Toolbar.svelte` — use `loadImageFile`; add titles
- `src/app.css` — new component CSS vars; focus-visible; contrast fixes; disabled styles
- `src/lib/components/display/LevelMeter.svelte` — CSS vars
- `src/lib/components/display/StepSequencer.svelte` — CSS vars
- `src/lib/components/display/AcidStepSequencer.svelte` — CSS vars
- `src/lib/components/controls/MidiKeyboard.svelte` — CSS vars
- `src/lib/components/display/WaveformDisplay.svelte` — CSS vars
- `src/lib/components/display/SpectrumAnalyzer.svelte` — CSS vars
- `src/lib/components/controls/RotaryKnob.svelte` — CSS vars, ARIA
- `src/lib/components/controls/HorizontalSlider.svelte` — CSS vars, ARIA
- `src/lib/components/controls/VerticalSlider.svelte` — CSS vars, ARIA
- `src/lib/components/controls/MomentaryButton.svelte` — CSS vars, ARIA
- `src/lib/components/controls/ToggleSwitch.svelte` — CSS vars, ARIA
- `src/lib/components/display/LedIndicator.svelte` — ARIA
- `src/lib/ui/ContextMenu.svelte` — focus on open, arrow-key nav
- `src/lib/canvas/Canvas.svelte` — placement mode indicator
- `src/App.svelte` — sr-only status region, Toast + ShortcutsHelp mount
- `src/lib/interaction/shortcuts.ts` — add `?` shortcut for help overlay

---

## Pass 1 — Type System

### Task 1: Add `EffectKey` and `ComponentProperties` to types.ts

**Files:**
- Modify: `src/lib/components/types.ts`

- [ ] **Step 1: Add `EffectKey` union type and `ComponentProperties` interface**

Open `src/lib/components/types.ts`. After the existing `EffectsData` block (line 16), add before `ComponentData`:

```ts
export type EffectKey = keyof EffectsData;

export interface ComponentProperties {
  // Label / text
  text?: string;
  // Colours
  bgColor?: string;
  fgColor?: string;
  // Image assets
  imageDataUrl?: string | null;
  imageName?: string;
  // Texture
  textureDataUrl?: string | null;
  textureOpacity?: number;
  textureOffsetX?: number;
  textureOffsetY?: number;
  textureScale?: number;
  textureBlend?: string;
  // Numeric params
  segments?: number;
  bars?: number;
  rows?: number;
  columns?: number;
  steps?: string;
  cellSize?: number;
  octaves?: number;
  minNote?: number;
  maxNote?: number;
  // State flags
  default?: boolean;
  on?: boolean;
  // Misc display
  orientation?: string;
  portsPosition?: string;
  activeColor?: string;
  pitchBend?: boolean;
  modWheel?: boolean;
  pattern?: string;
  // Index signature for forward-compatibility with custom properties
  [key: string]: unknown;
}
```

Then change `properties: Record<string, unknown>` in `ComponentData` to `properties: ComponentProperties`:

```ts
export interface ComponentData {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string;
  properties: ComponentProperties;
  effects: EffectsData;
  group: string | null;
  visible: boolean;
  zIndex: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -40
```

Expected: build succeeds (0 errors). Because `ComponentProperties` has an index signature `[key: string]: unknown`, all existing code using `comp.properties.someKey` stays valid.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/types.ts
git commit -m "feat(types): add EffectKey union and ComponentProperties interface"
```

---

### Task 2: Remove casts from EffectsEditor.svelte

**Files:**
- Modify: `src/lib/panels/EffectsEditor.svelte`

- [ ] **Step 1: Rewrite EffectsEditor script block to use typed access**

`EffectsData` is already a typed interface (not `Record<string, unknown>`). The casts are unnecessary. Replace the entire `<script>` block:

```ts
<script lang="ts">
  import type { ComponentData, EffectKey } from '../components/types.js';
  import { appState } from '../state/app.svelte.js';
  import CollapsibleSection from './CollapsibleSection.svelte';

  let { data }: { data: ComponentData } = $props();

  const EFFECT_NAMES: Record<EffectKey, string> = {
    drop_shadow: 'Drop Shadow',
    inner_shadow: 'Inner Shadow',
    blur_glow: 'Blur / Glow',
    bevel: 'Bevel',
    gloss: 'Gloss',
    gradient_fill: 'Gradient',
    texture_fill: 'Texture',
  };

  const TEXTURE_PRESETS = ['noise', 'carbon', 'brushed_metal', 'wood_grain', 'diamond_plate'];

  function toggleEffect(key: EffectKey, val: boolean) {
    data.effects[key].enabled = val;
    appState.isDirty = true;
  }

  function setIntensity(key: EffectKey, val: number) {
    data.effects[key].intensity = val;
    appState.isDirty = true;
  }
</script>
```

- [ ] **Step 2: Update template to remove remaining casts**

Replace the `{#each}` block in the template. The full updated template section:

```svelte
<CollapsibleSection title="Effects" collapsed={true}>
  {#each (Object.keys(EFFECT_NAMES) as EffectKey[]) as key}
    {@const effect = data.effects[key]}
    {#if effect}
      <div class="props-row">
        <input type="checkbox"
               checked={effect.enabled}
               onchange={(e) => toggleEffect(key, (e.target as HTMLInputElement).checked)} />
        <span class="props-label" style="flex:1;">{EFFECT_NAMES[key]}</span>
        <input class="props-input props-input-sm" type="range"
               min="0" max="100"
               value={effect.intensity}
               oninput={(e) => setIntensity(key, Number((e.target as HTMLInputElement).value))}
               style="flex:1; min-width:50px;" />
      </div>

      {#if key === 'gradient_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">From</span>
          <input class="props-input props-input-sm" type="color"
                 value={data.effects.gradient_fill.startColor}
                 oninput={(e) => { data.effects.gradient_fill.startColor = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-label">To</span>
          <input class="props-input props-input-sm" type="color"
                 value={data.effects.gradient_fill.endColor}
                 oninput={(e) => { data.effects.gradient_fill.endColor = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Angle</span>
          <input class="props-input props-input-sm" type="number"
                 value={data.effects.gradient_fill.angle}
                 oninput={(e) => { data.effects.gradient_fill.angle = Number((e.target as HTMLInputElement).value); appState.isDirty = true; }} />
        </div>
      {/if}

      {#if key === 'texture_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Preset</span>
          <select class="toolbar-select" style="flex:1;"
                  value={data.effects.texture_fill.preset}
                  onchange={(e) => { data.effects.texture_fill.preset = (e.target as HTMLSelectElement).value; appState.isDirty = true; }}>
            {#each TEXTURE_PRESETS as p}
              <option value={p}>{p.replace(/_/g, ' ')}</option>
            {/each}
          </select>
        </div>
      {/if}
    {/if}
  {/each}
</CollapsibleSection>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/panels/EffectsEditor.svelte
git commit -m "fix(types): remove Record<string,unknown> casts in EffectsEditor"
```

---

### Task 3: Fix non-null assertions and deep-clone patterns

**Files:**
- Modify: `src/lib/state/history.ts`
- Modify: `src/lib/state/clipboard.ts`
- Modify: `src/lib/io/serialization.ts`
- Modify: `src/lib/io/autosave.ts`

- [ ] **Step 1: Fix history.ts — remove `!` assertions and use structuredClone**

Replace the full contents of `src/lib/state/history.ts`:

```ts
import { appState } from './app.svelte.js';
import type { ComponentData, Group } from '../components/types.js';

interface Snapshot {
  components: ComponentData[];
  groups: Group[];
  selectedIds: string[];
}

const MAX_HISTORY = 50;
let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];

function takeSnapshot(): Snapshot {
  return {
    components: structuredClone(appState.components),
    groups: structuredClone(appState.groups),
    selectedIds: [...appState.selectedIds],
  };
}

function applySnapshot(snap: Snapshot) {
  appState.components.length = 0;
  for (const c of snap.components) appState.components.push(c);
  appState.groups.length = 0;
  for (const g of snap.groups) appState.groups.push(g);
  appState.selectedIds = [...snap.selectedIds];
  appState.isDirty = true;
}

export function pushHistory() {
  undoStack.push(takeSnapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(takeSnapshot());
  const prev = undoStack.pop();
  if (prev) applySnapshot(prev);
}

export function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(takeSnapshot());
  const next = redoStack.pop();
  if (next) applySnapshot(next);
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
}
```

- [ ] **Step 2: Fix serialization.ts — use structuredClone and tighten schema validation**

In `src/lib/io/serialization.ts`, replace the `toJSON` function and the `fromJSON` validation block:

```ts
export function toJSON() {
  return {
    drawdio_version: 1,
    canvas: {
      width: appState.canvasWidth,
      height: appState.canvasHeight,
      bgColor: appState.bgColor,
      gridSize: appState.gridSize,
      refImageDataUrl: appState.refImageDataUrl,
      refImageOpacity: appState.refImageOpacity,
      refImageVisible: appState.refImageVisible,
    },
    components: structuredClone(appState.components),
    groups: structuredClone(appState.groups),
  };
}
```

Replace the `fromJSON` validation guard (lines 24–26):

```ts
export function fromJSON(json: Record<string, unknown>) {
  if (!json || typeof json.drawdio_version !== 'number') {
    alert('Invalid Drawdio file: missing version field.');
    return;
  }
  if (!Array.isArray(json.components) || !Array.isArray(json.groups)) {
    alert('Invalid Drawdio file: malformed components or groups.');
    return;
  }
```

Also update the `loadFromFile` error message (line ~119) to include the filename:

```ts
  } catch (err) {
    alert(`Failed to load "${file.name}": ${(err as Error).message}`);
  }
```

- [ ] **Step 3: Fix autosave.ts — log errors instead of swallowing them**

Replace both empty catch blocks in `src/lib/io/autosave.ts`:

```ts
    } catch (err) {
      console.warn('Autosave failed (localStorage may be full):', err);
    }
```

```ts
  } catch (err) {
    console.warn('Failed to restore autosave:', err);
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/state/history.ts src/lib/io/serialization.ts src/lib/io/autosave.ts
git commit -m "fix(types): remove ! assertions, use structuredClone, improve error logging"
```

---

## Pass 2 — Utility Extraction

### Task 4: Create fetch-asset and file-loader utilities

**Files:**
- Create: `src/lib/utils/fetch-asset.ts`
- Create: `src/lib/utils/file-loader.ts`

- [ ] **Step 1: Create fetch-asset.ts**

```ts
// src/lib/utils/fetch-asset.ts

/**
 * Fetches a URL and returns a base64 data URL.
 * Used for builtin knobs and textures at placement time.
 */
export async function fetchAssetAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch asset "${url}": ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader failed for "${url}"`));
    reader.readAsDataURL(blob);
  });
}
```

- [ ] **Step 2: Create file-loader.ts**

```ts
// src/lib/utils/file-loader.ts

/**
 * Opens a file picker dialog and returns the selected file as a base64 data URL.
 * Caller provides the accept string (e.g., 'image/png,image/jpeg').
 */
export function loadImageFile(
  accept: string,
  callback: (dataUrl: string, fileName: string) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.onerror = () => console.error('Failed to read file:', file.name);
    reader.readAsDataURL(file);
  };
  input.click();
}
```

- [ ] **Step 3: Update builtin-knobs.ts to use fetchAssetAsDataUrl**

Replace `src/lib/components/builtin-knobs.ts` with:

```ts
export interface BuiltinKnob {
  id: string;
  name: string;
  src: string;
}

export const BUILTIN_KNOBS: BuiltinKnob[] = [
  { id: 'builtin_knob_black_1',  name: 'Black Brushed',   src: '/knobs/knob_black_1.png' },
  { id: 'builtin_knob_black_2',  name: 'Black Flat',      src: '/knobs/knob_black_2.png' },
  { id: 'builtin_knob_black_3',  name: 'Black LED Blue',  src: '/knobs/knob_black_3.png' },
  { id: 'builtin_knob_black_4',  name: 'Black LED Amber', src: '/knobs/knob_black_4.png' },
  { id: 'builtin_knob_blue_1',   name: 'Blue',            src: '/knobs/knob_blue_1.png' },
  { id: 'builtin_knob_metal_1',  name: 'Metal Blue',      src: '/knobs/knob_metal_1.png' },
  { id: 'builtin_knob_metal_2',  name: 'Metal Green',     src: '/knobs/knob_metal_2.png' },
  { id: 'builtin_knob_metal_3',  name: 'Dark Brushed',    src: '/knobs/knob_metal_3.png' },
  { id: 'builtin_knob_metal_4',  name: 'Dark Knurled',    src: '/knobs/knob_metal_4.png' },
  { id: 'builtin_knob_red_1',    name: 'Red',             src: '/knobs/knob_red_1.png' },
  { id: 'builtin_knob_silver_1', name: 'Silver',          src: '/knobs/knob_silver_1.png' },
];
```

Note: `fetchKnobDataUrl` is removed — callers will use `fetchAssetAsDataUrl` from `utils/fetch-asset.ts` directly.

- [ ] **Step 4: Update builtin-textures.ts**

Replace `src/lib/components/builtin-textures.ts` with:

```ts
export interface BuiltinTexture {
  id: string;
  name: string;
  src: string;
}

export const BUILTIN_TEXTURES: BuiltinTexture[] = [
  { id: 'builtin_texture_1', name: 'Texture 1', src: '/textures/texture.png' },
  { id: 'builtin_texture_2', name: 'Texture 2', src: '/textures/texture_2.png' },
  { id: 'builtin_texture_3', name: 'Texture 3', src: '/textures/texture_3.png' },
  { id: 'builtin_texture_4', name: 'Texture 4', src: '/textures/texture_4.png' },
];
```

Note: `fetchTextureDataUrl` is removed — callers use `fetchAssetAsDataUrl`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -40
```

Expected: Errors about `fetchKnobDataUrl` and `fetchTextureDataUrl` being missing. These will be fixed in Task 5 when Palette.svelte is updated.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/fetch-asset.ts src/lib/utils/file-loader.ts src/lib/components/builtin-knobs.ts src/lib/components/builtin-textures.ts
git commit -m "feat(utils): add fetchAssetAsDataUrl and loadImageFile utilities"
```

---

### Task 5: Create drag-to-canvas handler and refactor Palette.svelte

**Files:**
- Create: `src/lib/utils/drag-to-canvas.ts`
- Modify: `src/lib/panels/Palette.svelte`

- [ ] **Step 1: Create drag-to-canvas.ts**

This factory function handles ghost creation, mouse move/up, CTM transform, and snap. It calls `onDrop(cx, cy)` when released over the canvas, or `onClick()` when released without dragging.

```ts
// src/lib/utils/drag-to-canvas.ts
import { snap } from './geometry.js';

const DRAG_THRESHOLD = 4;

interface DragHandlerOptions {
  /** Text shown in the drag ghost label */
  label: string;
  /**
   * Called with canvas-space coordinates when the item is dropped on the canvas.
   * May be async (e.g., needs to fetch a data URL before placing).
   */
  onDrop: (canvasX: number, canvasY: number) => void | Promise<void>;
  /**
   * Called when mouse is released without dragging (click-to-place).
   * If omitted, a click does nothing.
   */
  onClick?: () => void | Promise<void>;
}

/**
 * Returns a mousedown handler that implements the drag-to-canvas pattern:
 * - Shows a ghost label while dragging
 * - On drop over the canvas, converts screen coords to canvas coords via CTM
 * - On click (no drag), calls onClick if provided
 */
export function createDragHandler(opts: DragHandlerOptions): (e: MouseEvent) => void {
  return function onMouseDown(e: MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    let ghost: HTMLDivElement | null = null;

    function onMouseMove(me: MouseEvent) {
      const dist = Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY);
      if (dist > DRAG_THRESHOLD && !ghost) {
        ghost = document.createElement('div');
        ghost.className = 'palette-drag-ghost';
        ghost.textContent = opts.label;
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = me.clientX + 12 + 'px';
        ghost.style.top = me.clientY - 12 + 'px';
        document.body.style.cursor = 'grabbing';
      }
    }

    async function onMouseUp(me: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';

      if (ghost) {
        ghost.remove();
        ghost = null;

        // Check if released over the canvas
        const container = document.querySelector('.canvas-container');
        const svgEl = container?.querySelector('svg');
        if (container && svgEl) {
          const rect = container.getBoundingClientRect();
          const overCanvas =
            me.clientX >= rect.left && me.clientX <= rect.right &&
            me.clientY >= rect.top  && me.clientY <= rect.bottom;
          if (overCanvas) {
            const ctm = (svgEl as SVGSVGElement).getScreenCTM();
            if (ctm) {
              const inv = ctm.inverse();
              const cx = inv.a * me.clientX + inv.c * me.clientY + inv.e;
              const cy = inv.b * me.clientX + inv.d * me.clientY + inv.f;
              const snapped = snap(cx, cy);
              await opts.onDrop(snapped.x, snapped.y);
            }
          }
        }
      } else if (opts.onClick) {
        await opts.onClick();
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
}
```

- [ ] **Step 2: Rewrite Palette.svelte script block**

Replace the entire `<script lang="ts">` section of `src/lib/panels/Palette.svelte` with the following. This uses `createDragHandler` for all four drag handler types and imports the new utilities:

```ts
<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import type { UserAsset } from '../state/app.svelte.js';
  import { entriesByCategory } from '../components/registry.js';
  import type { RegistryEntry } from '../components/registry.js';
  import { createComponent } from '../state/actions.js';
  import { select } from '../state/selection.js';
  import PaletteIcon from './PaletteIcon.svelte';
  import { BUILTIN_KNOBS } from '../components/builtin-knobs.js';
  import type { BuiltinKnob } from '../components/builtin-knobs.js';
  import { BUILTIN_TEXTURES } from '../components/builtin-textures.js';
  import type { BuiltinTexture } from '../components/builtin-textures.js';
  import { createDragHandler } from '../utils/drag-to-canvas.js';
  import { fetchAssetAsDataUrl } from '../utils/fetch-asset.js';

  let searchQuery = $state('');
  let collapsedCats = $state(new Set<string>());
  let activeVariants = $state(new Map<string, string>());

  const categories = $derived(entriesByCategory());
  const CATEGORY_ORDER = ['Controls', 'Display', 'Layout'];

  interface DisplayItem {
    type: string;
    entry: RegistryEntry;
    variants?: { type: string; label: string }[];
  }

  const filteredCategories = $derived.by(() => {
    const q = searchQuery.toLowerCase();
    const result = new Map<string, DisplayItem[]>();

    for (const cat of CATEGORY_ORDER) {
      const items = categories.get(cat);
      if (!items) continue;
      const filtered = q
        ? items.filter(i => i.entry.displayName.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
        : items;
      if (filtered.length === 0) continue;

      const seen = new Set<string>();
      const display: DisplayItem[] = [];

      for (const item of filtered) {
        const vg = item.entry.variantGroup;
        if (vg) {
          if (seen.has(vg)) continue;
          seen.add(vg);
          const allVariants = (categories.get(cat) || []).filter(i => i.entry.variantGroup === vg);
          const variants = allVariants.map(v => ({ type: v.type, label: v.entry.variantLabel || v.entry.displayName }));
          if (!activeVariants.has(vg)) activeVariants.set(vg, allVariants[0].type);
          const activeType = activeVariants.get(vg)!;
          const activeItem = allVariants.find(v => v.type === activeType) || allVariants[0];
          display.push({ type: activeItem.type, entry: activeItem.entry, variants });
        } else {
          display.push({ type: item.type, entry: item.entry });
        }
      }

      result.set(cat, display);
    }
    return result;
  });

  function setVariant(group: string, type: string) {
    activeVariants = new Map(activeVariants).set(group, type);
  }

  function toggleCategory(cat: string) {
    const next = new Set(collapsedCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    collapsedCats = next;
  }

  // ---- Component items ----
  let knobLibExpanded = $state(false);
  let seqLibExpanded = $state(false);

  function onItemMouseDown(e: MouseEvent, type: string) {
    const entry =
      categories.get('Controls')?.find(i => i.type === type) ||
      categories.get('Display')?.find(i => i.type === type) ||
      categories.get('Layout')?.find(i => i.type === type);
    const label = entry?.entry.displayName ?? type;

    createDragHandler({
      label,
      onDrop(cx, cy) {
        const comp = createComponent(type, cx, cy);
        if (comp) select(comp.id);
      },
      onClick() {
        appState.placingType = type;
      },
    })(e);
  }

  // ---- Builtin knobs ----
  function onKnobMouseDown(e: MouseEvent, knob: BuiltinKnob) {
    createDragHandler({
      label: knob.name,
      async onDrop(cx, cy) {
        try {
          const dataUrl = await fetchAssetAsDataUrl(knob.src);
          const comp = createComponent('image_placeholder', cx, cy);
          if (comp) {
            comp.width = 80; comp.height = 80;
            comp.properties.imageDataUrl = dataUrl;
            comp.properties.imageName = knob.name;
            comp.label = knob.name;
            select(comp.id);
          }
        } catch (err) {
          console.error('Failed to load knob:', err);
        }
      },
      async onClick() {
        try {
          const dataUrl = await fetchAssetAsDataUrl(knob.src);
          const comp = createComponent('image_placeholder',
            appState.canvasWidth / 2 - 40,
            appState.canvasHeight / 2 - 40);
          if (comp) {
            comp.width = 80; comp.height = 80;
            comp.properties.imageDataUrl = dataUrl;
            comp.properties.imageName = knob.name;
            comp.label = knob.name;
            select(comp.id);
          }
        } catch (err) {
          console.error('Failed to load knob:', err);
        }
      },
    })(e);
  }

  // ---- Builtin textures ----
  let texturesCollapsed = $state(true);

  function applyTextureToSelectedPanel(dataUrl: string, name: string): boolean {
    if (appState.selectedIds.length !== 1) return false;
    const comp = appState.components.find(c => c.id === appState.selectedIds[0]);
    if (!comp || comp.type !== 'panel_group') return false;
    comp.properties.textureDataUrl = dataUrl;
    comp.properties.textureOpacity = comp.properties.textureOpacity ?? 0.8;
    comp.properties.textureOffsetX = 0;
    comp.properties.textureOffsetY = 0;
    comp.properties.textureScale = 1;
    comp.properties.textureBlend = comp.properties.textureBlend ?? 'multiply';
    appState.isDirty = true;
    return true;
  }

  function onTextureMouseDown(e: MouseEvent, tex: BuiltinTexture) {
    createDragHandler({
      label: tex.name,
      async onDrop(cx, cy) {
        try {
          const dataUrl = await fetchAssetAsDataUrl(tex.src);
          if (!applyTextureToSelectedPanel(dataUrl, tex.name)) {
            const comp = createComponent('image_placeholder', cx, cy);
            if (comp) {
              comp.properties.imageDataUrl = dataUrl;
              comp.properties.imageName = tex.name;
              comp.label = tex.name;
              select(comp.id);
            }
          }
        } catch (err) {
          console.error('Failed to load texture:', err);
        }
      },
      async onClick() {
        try {
          const dataUrl = await fetchAssetAsDataUrl(tex.src);
          if (!applyTextureToSelectedPanel(dataUrl, tex.name)) {
            const comp = createComponent('image_placeholder',
              appState.canvasWidth / 2,
              appState.canvasHeight / 2);
            if (comp) {
              comp.properties.imageDataUrl = dataUrl;
              comp.properties.imageName = tex.name;
              comp.label = tex.name;
              select(comp.id);
            }
          }
        } catch (err) {
          console.error('Failed to load texture:', err);
        }
      },
    })(e);
  }

  // ---- User assets ----
  let assetsCollapsed = $state(false);

  function addAssets() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          const asset: UserAsset = {
            id: `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            dataUrl: reader.result as string,
          };
          appState.userAssets = [...appState.userAssets, asset];
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function removeAsset(id: string) {
    appState.userAssets = appState.userAssets.filter(a => a.id !== id);
  }

  function onAssetMouseDown(e: MouseEvent, asset: UserAsset) {
    createDragHandler({
      label: asset.name,
      onDrop(cx, cy) {
        const comp = createComponent('image_placeholder', cx, cy);
        if (comp) {
          comp.properties.imageDataUrl = asset.dataUrl;
          comp.properties.imageName = asset.name;
          comp.label = asset.name;
          select(comp.id);
        }
      },
      // Assets don't support click-to-place; user must drag them onto the canvas
    })(e);
  }
</script>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -40
```

Expected: 0 errors. If there is an error about `snap` import in `drag-to-canvas.ts`, check that the geometry utility is at `src/lib/utils/geometry.ts` (it is) and the import path is correct (`./geometry.js`).

- [ ] **Step 4: Start the dev server and manually test drag and click-to-place**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run dev
```

Open http://localhost:5173. Verify:
- Dragging a "Rotary Knob" from palette to canvas places a component
- Clicking a palette item enters placing mode (item highlights)
- Dragging a builtin knob from the knob library places an image_placeholder
- Dragging a texture drops on canvas or applies to a selected panel_group
- Dragging a user asset places an image_placeholder

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/drag-to-canvas.ts src/lib/panels/Palette.svelte
git commit -m "refactor(palette): extract createDragHandler, reduce Palette.svelte by ~250 lines"
```

---

### Task 6: Use loadImageFile in Toolbar.svelte

**Files:**
- Modify: `src/lib/toolbar/Toolbar.svelte`

- [ ] **Step 1: Replace the inline file-loading code in loadRefImageFromMenu**

In `src/lib/toolbar/Toolbar.svelte`, add the import at the top of the script block:

```ts
  import { loadImageFile } from '../utils/file-loader.js';
```

Replace the `loadRefImageFromMenu` function (lines 26–58) with:

```ts
  function loadRefImageFromMenu() {
    closeMenu();
    loadImageFile('image/png,image/jpeg,image/webp,image/gif', (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        if (appState.components.length > 0) {
          if (!confirm(`Resize canvas to ${img.naturalWidth}×${img.naturalHeight}px?`)) {
            appState.refImageDataUrl = dataUrl;
            appState.refImageVisible = true;
            appState.isDirty = true;
            return;
          }
        }
        appState.canvasWidth = img.naturalWidth;
        appState.canvasHeight = img.naturalHeight;
        appState.refImageDataUrl = dataUrl;
        appState.refImageVisible = true;
        appState.isDirty = true;
      };
      img.src = dataUrl;
    });
  }
```

- [ ] **Step 2: Verify TypeScript compiles and test manually**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/toolbar/Toolbar.svelte
git commit -m "refactor(toolbar): use loadImageFile utility for ref image loading"
```

---

## Pass 3 — CSS & Theming Consistency

### Task 7: Add component CSS variables and fix contrast/states

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add component theme variables to `:root`**

In `src/app.css`, after the `--on-accent` line in `:root` (line 29), add:

```css
  /* Component-level tokens (used in SVG style= attributes) */
  --component-bg:       #141416;
  --component-bg-alt:   #2a2a3a;
  --component-inactive: #383848;
  --component-label:    #888;
  --meter-green:        #66bb6a;
  --meter-yellow:       #ffd54f;
  --meter-red:          #ef5350;
  --key-white:          #e8e8e4;
  --key-black:          #1a1a1a;
```

- [ ] **Step 2: Override component variables in light theme**

In `[data-theme="light"]` (after `--on-accent` line 50), add:

```css
  --component-bg:       #e8e8ee;
  --component-bg-alt:   #d0d0da;
  --component-inactive: #c0c0cc;
  --component-label:    #666;
  --meter-green:        #4caf50;
  --meter-yellow:       #ffb300;
  --meter-red:          #e53935;
  --key-white:          #ffffff;
  --key-black:          #1a1a1a;
```

- [ ] **Step 3: Raise contrast on dim text colours**

In `:root`, change:
```css
  --text-dim:        #777;
  --text-dimmer:     #666;
```
(was `#666` and `#555` respectively — these failed WCAG AA on `--bg-panel: #151528`)

In `[data-theme="light"]`, change:
```css
  --text-dim:        #6a6a80;
  --text-dimmer:     #808098;
```
(was `#7a7a90` and `#9090a8`)

- [ ] **Step 4: Add `:focus-visible` rings to interactive elements that are missing them**

After the `.palette-variant-tab:focus-visible` rule, add:

```css
/* Focus rings for inputs and selects */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* Disabled state */
button:disabled,
input:disabled,
select:disabled,
.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* Screen-reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

- [ ] **Step 5: Fix `--surface-hover` reference in palette**

Search `src/app.css` for `--surface-hover` (used in `.palette-item-group.expanded`). This variable doesn't exist — replace it:

```css
.palette-item-group.expanded {
  background: var(--bg-hover);
  border-left: 2px solid var(--accent);
  margin: 1px 2px;
}
```

- [ ] **Step 6: Verify TypeScript compiles and check dev server**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

Open http://localhost:5173, toggle dark/light theme — UI should look correct in both themes.

- [ ] **Step 7: Commit**

```bash
git add src/app.css
git commit -m "feat(css): add component CSS vars, fix contrast, add focus/disabled styles"
```

---

### Task 8: Replace hardcoded colors in display components

**Files:**
- Modify: `src/lib/components/display/LevelMeter.svelte`
- Modify: `src/lib/components/display/StepSequencer.svelte`
- Modify: `src/lib/components/display/AcidStepSequencer.svelte`
- Modify: `src/lib/components/display/WaveformDisplay.svelte`
- Modify: `src/lib/components/display/SpectrumAnalyzer.svelte`

**Note:** SVG `fill="#xxx"` presentation attributes do NOT support CSS variables. Use `style="fill: var(--xxx)"` instead.

- [ ] **Step 1: Update LevelMeter.svelte**

Replace the `segColor` function:

```ts
  function segColor(pct: number): string {
    if (pct < 0.6) return 'var(--meter-green)';
    if (pct < 0.8) return 'var(--meter-yellow)';
    return 'var(--meter-red)';
  }
```

The `fill={segColor(pct)}` binding in the template now passes a CSS variable string — this works because it's bound via Svelte (rendered as `style` attribute at runtime). Actually for SVG `fill=` attribute with a CSS var string, this won't work. We need to use `style`:

Change both `<rect>` elements in the template:

```svelte
      <rect x="0" y={sy} width={data.width} height={segH}
            rx="1" style="fill: {segColor(pct)};" fill-opacity={lit ? 0.9 : 0.15} />
```
and
```svelte
      <rect x={sx} y="0" width={segW} height={data.height}
            rx="1" style="fill: {segColor(pct)};" fill-opacity={lit ? 0.9 : 0.15} />
```

- [ ] **Step 2: Update StepSequencer.svelte**

Replace the background rect and inactive cell fill:

```svelte
  <!-- Background -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke-width="0.5"
        style:stroke="var(--component-bg-alt)" />
```

For the cell rects in the `{#each}` block, change the `fill` and `stroke` attributes to use `style=`:

```svelte
      <rect x={cx} y={cy} width={cellW} height={cellH} rx="2"
            style="fill: {active ? ((data.properties.activeColor as string) || data.color) : 'var(--component-inactive)'}; stroke: {active ? data.color : 'var(--component-bg-alt)'};"
            stroke-width="0.5"
            data-cell={key} />
```

Wait — Svelte doesn't support multiple `style:` and `style=` on the same element cleanly. Use a single `style` attribute:

```svelte
      <rect x={cx} y={cy} width={cellW} height={cellH} rx="2"
            style="fill: {active ? ((data.properties.activeColor as string) || data.color) : 'var(--component-inactive)'}; stroke: {active ? data.color : 'var(--component-bg-alt)'}; stroke-width: 0.5;"
            data-cell={key} />
```

- [ ] **Step 3: Update AcidStepSequencer.svelte**

Replace hardcoded colors throughout. The background rect:
```svelte
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="2" style="fill: var(--component-bg);" stroke="#28282e" stroke-width="0.5"/>
```

Cell background:
```svelte
    <rect x={cx} y="0" width={cellW} height={data.height} rx="1"
          style="fill: var(--component-bg);" stroke={isQ ? '#3a3a42' : '#1e1e22'} stroke-width="0.5"/>
```

Accent toggle (`#c42a2a` → keep as semantic color, it's the "accent" red for acid):
- Leave `#c42a2a` (accent red) and `#f0dc3c` (slide yellow) as-is — these are intentional musical semantics, not theme colors.
- Replace `#2a2a30` (inactive toggle bg) with `style="fill: var(--component-inactive);"`.
- Replace `#1c1c20` (pitch slider track bg) with `style="fill: var(--component-bg);"`.
- Replace `#141416` (cell background) with `style="fill: var(--component-bg);"`.

Pitch slider track:
```svelte
    <rect x={trackX} y={toggleRowH} width={trackW} height={sliderRowH}
          rx="1.5" style="fill: var(--component-bg);"/>
```

- [ ] **Step 4: Update WaveformDisplay.svelte**

```svelte
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5" />
```

- [ ] **Step 5: Update SpectrumAnalyzer.svelte**

```svelte
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5" />
```

- [ ] **Step 6: Start dev server and visually inspect all display components**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run dev
```

Open http://localhost:5173. Place each display component on the canvas. Toggle light/dark theme. Verify the backgrounds change appropriately.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/display/LevelMeter.svelte src/lib/components/display/StepSequencer.svelte src/lib/components/display/AcidStepSequencer.svelte src/lib/components/display/WaveformDisplay.svelte src/lib/components/display/SpectrumAnalyzer.svelte
git commit -m "feat(theming): replace hardcoded colors in display components with CSS vars"
```

---

### Task 9: Replace hardcoded colors in control components

**Files:**
- Modify: `src/lib/components/controls/RotaryKnob.svelte`
- Modify: `src/lib/components/controls/HorizontalSlider.svelte`
- Modify: `src/lib/components/controls/VerticalSlider.svelte`
- Modify: `src/lib/components/controls/MomentaryButton.svelte`
- Modify: `src/lib/components/controls/ToggleSwitch.svelte`
- Modify: `src/lib/components/controls/MidiKeyboard.svelte`

- [ ] **Step 1: Update RotaryKnob.svelte**

Replace the body circle and label text:

```svelte
  <!-- Body -->
  <circle cx={cx} cy={cy} r={r} style="fill: var(--component-bg-alt);" stroke={data.color} stroke-width="1.5" />
```

```svelte
    <text x={cx} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
```

- [ ] **Step 2: Update HorizontalSlider.svelte**

Replace track background and label:

```svelte
  <rect x={thumbR} y={trackY - trackH / 2}
        width={trackWidth} height={trackH}
        rx={trackH / 2} style="fill: var(--component-bg-alt);" />
```

```svelte
    <text x={data.width / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
```

Thumb fill `#ddd` → use CSS var for key-white (it's light in both themes):
```svelte
  <circle cx={thumbCx} cy={trackY} r={thumbR}
          style="fill: var(--key-white);" stroke={data.color} stroke-width="1.5" />
```

- [ ] **Step 3: Update VerticalSlider.svelte**

```svelte
  <rect x={trackX} y="0" width={trackW} height={trackH} rx={trackW / 2} style="fill: var(--component-bg-alt);" />
```

```svelte
  <rect x={data.width / 2 - thumbW / 2} y={thumbY} width={thumbW} height={thumbH}
        rx="2" style="fill: var(--key-white);" stroke={data.color} stroke-width="1.5" />
```

```svelte
    <text x={data.width / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
```

- [ ] **Step 4: Update MomentaryButton.svelte**

```svelte
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="4" style="fill: var(--component-bg-alt);" stroke={data.color} stroke-width="1" />
```

- [ ] **Step 5: Update ToggleSwitch.svelte**

The thumb when off is `#888` — replace with `var(--component-label)`. Label text:

```svelte
  <circle cx={thumbX} cy={r} r={thumbR}
          style="fill: {isOn ? data.color : 'var(--component-label)'};" />
```

```svelte
    <text x={pillW / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
```

- [ ] **Step 6: Update MidiKeyboard.svelte**

Replace keyboard body background and side strip colors:

```svelte
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="2" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5"/>
```

Side strips: replace `fill="#111"` → `style="fill: var(--key-black);"` and `fill="#0d0d0f"` → `style="fill: var(--component-bg);"`.

White keys: replace `fill="#e8e8e4"` → `style="fill: var(--key-white);"`.

Black keys: replace `fill="#1a1a1a"` → `style="fill: var(--key-black);"`.

Label text `fill="#555"` → `style="fill: var(--component-label);"`.

Key label `fill="#888"` → `style="fill: var(--component-label);"`.

- [ ] **Step 7: Start dev server and visually inspect all control components**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run dev
```

Toggle dark/light theme. Verify controls look correct in both themes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/controls/RotaryKnob.svelte src/lib/components/controls/HorizontalSlider.svelte src/lib/components/controls/VerticalSlider.svelte src/lib/components/controls/MomentaryButton.svelte src/lib/components/controls/ToggleSwitch.svelte src/lib/components/controls/MidiKeyboard.svelte
git commit -m "feat(theming): replace hardcoded colors in control components with CSS vars"
```

---

## Pass 4 — Accessibility

### Task 10: Add ARIA to interactive SVG components

**Files:**
- Modify: `src/lib/components/controls/RotaryKnob.svelte`
- Modify: `src/lib/components/controls/HorizontalSlider.svelte`
- Modify: `src/lib/components/controls/VerticalSlider.svelte`
- Modify: `src/lib/components/controls/MomentaryButton.svelte`
- Modify: `src/lib/components/controls/ToggleSwitch.svelte`
- Modify: `src/lib/components/display/LedIndicator.svelte`

**Context:** These SVG components are rendered inside a larger SVG. We add `role`, `aria-label`, and relevant ARIA state to the root `<g>` element of each. This allows assistive technologies to describe the component even though it's not keyboard-navigable in isolation (canvas interaction handles focus at the component level).

- [ ] **Step 1: Update RotaryKnob.svelte root `<g>`**

```svelte
<g role="slider"
   aria-label="{data.label || 'Rotary knob'}"
   aria-valuenow="50"
   aria-valuemin="0"
   aria-valuemax="100">
```

- [ ] **Step 2: Update HorizontalSlider.svelte root `<g>`**

```svelte
<g role="slider"
   aria-label="{data.label || 'Horizontal slider'}"
   aria-orientation="horizontal"
   aria-valuenow="50"
   aria-valuemin="0"
   aria-valuemax="100">
```

- [ ] **Step 3: Update VerticalSlider.svelte root `<g>`**

```svelte
<g role="slider"
   aria-label="{data.label || 'Vertical slider'}"
   aria-orientation="vertical"
   aria-valuenow="50"
   aria-valuemin="0"
   aria-valuemax="100">
```

- [ ] **Step 4: Update MomentaryButton.svelte root `<g>`**

```svelte
<g role="button"
   aria-label="{data.label || 'Button'}"
   aria-pressed="false">
```

- [ ] **Step 5: Update ToggleSwitch.svelte root `<g>`**

```svelte
<g role="switch"
   aria-label="{data.label || 'Toggle'}"
   aria-checked={isOn}>
```

- [ ] **Step 6: Update LedIndicator.svelte root `<g>`**

```svelte
<g role="status"
   aria-label="{data.label || 'LED indicator'}"
   aria-live="polite">
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/controls/RotaryKnob.svelte src/lib/components/controls/HorizontalSlider.svelte src/lib/components/controls/VerticalSlider.svelte src/lib/components/controls/MomentaryButton.svelte src/lib/components/controls/ToggleSwitch.svelte src/lib/components/display/LedIndicator.svelte
git commit -m "feat(a11y): add ARIA roles and labels to interactive SVG components"
```

---

### Task 11: Add keyboard navigation to ContextMenu

**Files:**
- Modify: `src/lib/ui/ContextMenu.svelte`

- [ ] **Step 1: Rewrite ContextMenu.svelte script block**

Replace the full `<script lang="ts">` section:

```ts
<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { select, clearSelection, selectAll, deleteSelected } from '../state/selection.js';
  import { doCopy, doCut, doPaste, doDuplicate } from '../state/clipboard.js';
  import { createGroup, ungroupSelected, getGroupOf } from '../state/groups.js';
  import { bringForward, sendBackward, bringToFront, sendToBack } from '../state/zorder.js';

  type MenuItem = {
    label: string;
    shortcut?: string;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
  };

  let visible = $state(false);
  let x = $state(0);
  let y = $state(0);
  let items = $state<MenuItem[]>([]);
  let menuEl = $state<HTMLDivElement | undefined>(undefined);
  let triggerEl: Element | null = null;

  function buildForSelection(): MenuItem[] {
    const hasSelection = appState.selectedIds.length > 0;
    const multiSelected = appState.selectedIds.length > 1;
    let hasGroup = false;
    for (const id of appState.selectedIds) {
      if (getGroupOf(id)) { hasGroup = true; break; }
    }
    const hasClipboard = appState.clipboard.length > 0;
    return [
      { label: 'Copy',         shortcut: 'Ctrl+C',       action: doCopy,                                         disabled: !hasSelection },
      { label: 'Cut',          shortcut: 'Ctrl+X',       action: doCut,                                          disabled: !hasSelection },
      { label: 'Paste',        shortcut: 'Ctrl+V',       action: doPaste,                                        disabled: !hasClipboard },
      { label: 'Duplicate',    shortcut: 'Ctrl+D',       action: doDuplicate,                                    disabled: !hasSelection },
      { separator: true, label: '', action: () => {} },
      { label: 'Group',        shortcut: 'Ctrl+G',       action: () => createGroup([...appState.selectedIds]),   disabled: !multiSelected },
      { label: 'Ungroup',      shortcut: 'Ctrl+Shift+G', action: ungroupSelected,                                disabled: !hasGroup },
      { separator: true, label: '', action: () => {} },
      { label: 'Bring Forward',  shortcut: 'Ctrl+]',       action: () => bringForward(appState.selectedIds) },
      { label: 'Send Backward',  shortcut: 'Ctrl+[',       action: () => sendBackward(appState.selectedIds) },
      { label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', action: () => bringToFront(appState.selectedIds) },
      { label: 'Send to Back',   shortcut: 'Ctrl+Shift+[', action: () => sendToBack(appState.selectedIds) },
      { separator: true, label: '', action: () => {} },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
      { label: 'Delete',     shortcut: 'Del',    action: deleteSelected, disabled: !hasSelection },
    ];
  }

  function buildForCanvas(): MenuItem[] {
    const hasClipboard = appState.clipboard.length > 0;
    return [
      { label: 'Paste',      shortcut: 'Ctrl+V', action: doPaste,  disabled: !hasClipboard },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
    ];
  }

  function hide() {
    visible = false;
    // Return focus to the element that triggered the menu
    if (triggerEl instanceof HTMLElement) triggerEl.focus();
    triggerEl = null;
  }

  function onItemClick(item: MenuItem) {
    if (item.disabled) return;
    hide();
    item.action();
  }

  /** Returns all focusable (non-disabled, non-separator) menu item elements */
  function getMenuItems(): HTMLElement[] {
    if (!menuEl) return [];
    return Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not(.disabled)'));
  }

  function handleContextMenu(e: Event) {
    const ce = e as CustomEvent<{ x: number; y: number; hasSelection: boolean }>;
    triggerEl = document.activeElement;
    x = ce.detail.x;
    y = ce.detail.y;
    items = ce.detail.hasSelection ? buildForSelection() : buildForCanvas();
    visible = true;

    requestAnimationFrame(() => {
      if (menuEl) {
        const rect = menuEl.getBoundingClientRect();
        if (rect.right > window.innerWidth) x = ce.detail.x - rect.width;
        if (rect.bottom > window.innerHeight) y = ce.detail.y - rect.height;
        // Focus first non-disabled item
        getMenuItems()[0]?.focus();
      }
    });
  }

  $effect(() => {
    window.addEventListener('drawdio-contextmenu', handleContextMenu);
    const dismiss = (e: MouseEvent) => {
      if (visible && menuEl && !menuEl.contains(e.target as Node)) hide();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === 'Escape') { hide(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const menuItems = getMenuItems();
        if (menuItems.length === 0) return;
        const focused = menuEl?.querySelector<HTMLElement>('[role="menuitem"]:focus');
        const idx = focused ? menuItems.indexOf(focused) : -1;
        const next = e.key === 'ArrowDown'
          ? menuItems[(idx + 1) % menuItems.length]
          : menuItems[(idx - 1 + menuItems.length) % menuItems.length];
        next?.focus();
      }
    };
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('drawdio-contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  });
</script>
```

- [ ] **Step 2: Update the template — add `role="menu"` to container**

```svelte
{#if visible}
  <div class="context-menu" bind:this={menuEl}
       role="menu"
       aria-label="Context menu"
       style="left: {x}px; top: {y}px;">
    {#each items as item}
      {#if item.separator}
        <div class="context-menu-separator" role="separator"></div>
      {:else}
        <div class="context-menu-item" class:disabled={item.disabled}
             onclick={() => onItemClick(item)}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(item); } }}
             role="menuitem"
             aria-disabled={item.disabled}
             tabindex={item.disabled ? -1 : 0}>
          <span>{item.label}</span>
          {#if item.shortcut}
            <span class="context-menu-shortcut">{item.shortcut}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
```

- [ ] **Step 3: Verify and test**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

Open dev server. Right-click on the canvas. Verify:
- First menu item is auto-focused
- Arrow Down/Up navigate items
- Enter activates focused item
- Escape closes menu and returns focus

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/ContextMenu.svelte
git commit -m "feat(a11y): add keyboard navigation, focus management, and ARIA to ContextMenu"
```

---

### Task 12: Add sr-only status region and palette keyboard support

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/lib/panels/Palette.svelte`

- [ ] **Step 1: Add sr-only status region to App.svelte**

In `src/App.svelte`, after the `<ContextMenu />` line, add:

```svelte
<!-- Screen-reader status announcements (populated by toast/export) -->
<div id="app-status" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
```

- [ ] **Step 2: Add keyboard support to palette component items**

In `src/lib/panels/Palette.svelte`, the component items already have `role="button"` and `tabindex="0"`. Add `onkeydown` handler to the `.palette-item` div for component items:

Find the palette-item div (around line 444 in the original, now shifted). Add the keyboard handler:

```svelte
          <div class="palette-item"
               class:placing={appState.placingType === item.type}
               title="{vg === 'sequencer' ? 'Sequencer — click arrow for variants' : item.entry.displayName + ' — drag to canvas or press Enter to place'}"
               onmousedown={(e) => { if (vg !== 'sequencer') onItemMouseDown(e, item.type); }}
               onkeydown={(e) => {
                 if ((e.key === 'Enter' || e.key === ' ') && vg !== 'sequencer') {
                   e.preventDefault();
                   appState.placingType = item.type;
                 }
               }}
               role="button" tabindex="0"
               aria-label="{item.entry.displayName} — drag to canvas or press Enter to place"
               aria-pressed={appState.placingType === item.type}>
```

Also add `onkeydown` to sequencer sub-items and knob items similarly:

For sequencer sub-items:
```svelte
                <div class="palette-item palette-seq-sub-item"
                     class:placing={appState.placingType === v.type}
                     title="{v.label} — drag to canvas or click to place"
                     onmousedown={(e) => onItemMouseDown(e, v.type)}
                     onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); appState.placingType = v.type; } }}
                     role="button" tabindex="0"
                     aria-label="{v.label} — drag to canvas or press Enter to place">
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte src/lib/panels/Palette.svelte
git commit -m "feat(a11y): add sr-only status region and palette keyboard support"
```

---

## Pass 5 — UX Polish

### Task 13: Create toast notification system

**Files:**
- Create: `src/lib/state/toast.svelte.ts`
- Create: `src/lib/ui/Toast.svelte`

- [ ] **Step 1: Create toast.svelte.ts**

```ts
// src/lib/state/toast.svelte.ts

interface ToastMessage {
  id: number;
  message: string;
}

let _toasts = $state<ToastMessage[]>([]);
let _nextId = 0;

export const toastState = {
  get toasts() { return _toasts; },
};

export function showToast(message: string, durationMs = 2500): void {
  const id = ++_nextId;
  _toasts = [..._toasts, { id, message }];

  // Also announce to screen reader via the status region
  const statusEl = document.getElementById('app-status');
  if (statusEl) statusEl.textContent = message;

  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
  }, durationMs);
}
```

- [ ] **Step 2: Create Toast.svelte**

```svelte
<script lang="ts">
  import { toastState } from '../state/toast.svelte.js';
</script>

{#if toastState.toasts.length > 0}
  <div class="toast-container" aria-live="off" aria-atomic="false">
    {#each toastState.toasts as toast (toast.id)}
      <div class="toast">{toast.message}</div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 52px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 4000;
    pointer-events: none;
  }
  .toast {
    background: var(--bg-menu);
    color: var(--text);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    animation: toast-in 0.2s ease;
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
</style>
```

- [ ] **Step 3: Mount Toast in App.svelte**

In `src/App.svelte`, add the import and component:

```ts
  import Toast from './lib/ui/Toast.svelte';
```

After `<ContextMenu />`:

```svelte
<Toast />
```

- [ ] **Step 4: Wire toast into export.ts**

In `src/lib/io/export.ts`, add the import:

```ts
import { showToast } from '../state/toast.svelte.js';
```

In `exportPNG`, after the `download(blob, ...)` call inside `canvas.toBlob`:

```ts
        download(blob, `drawdio-export${suffix}-${scale}x.png`, 'image/png');
        showToast(`Exported as PNG (${scale}×)`);
```

In `exportSVG`, after the `download(...)` call:

```ts
  download(svgString, 'drawdio-export.svg', 'image/svg+xml');
  showToast('Exported as SVG');
```

In `copyJSONToClipboard`, after the `navigator.clipboard.writeText` call:

```ts
  navigator.clipboard.writeText(str);
  showToast('JSON copied to clipboard');
```

- [ ] **Step 5: Wire toast into autosave.ts**

In `src/lib/io/autosave.ts`, add the import:

```ts
import { showToast } from '../state/toast.svelte.js';
```

Replace the dot-flash block with a toast call. In the `try` block of `startAutoSave`, after the `localStorage.setItem` calls, replace the dot flash code:

```ts
      showToast('Auto-saved', 1500);
```

(The `.autosave-dot` DOM manipulation can be removed since the toast replaces it.)

- [ ] **Step 6: Verify TypeScript compiles and test toasts**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

Open dev server. Export a PNG — verify a "Exported as PNG (1×)" toast appears top-right and fades after 2.5 seconds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/state/toast.svelte.ts src/lib/ui/Toast.svelte src/App.svelte src/lib/io/export.ts src/lib/io/autosave.ts
git commit -m "feat(ux): add toast notification system for export and autosave feedback"
```

---

### Task 14: Add placement mode indicator

**Files:**
- Modify: `src/lib/canvas/Canvas.svelte`

- [ ] **Step 1: Add placement chip to Canvas.svelte**

In `src/lib/canvas/Canvas.svelte`, add the import at the top of the script:

```ts
  import { appState } from '../state/app.svelte.js';
  import { getEntry } from '../components/registry.js';
```

(appState is already imported; add `getEntry` if not already present.)

In the template, after the opening `<div class="canvas-container"` block but before `<svg`, add:

```svelte
  {#if appState.placingType}
    {@const entry = getEntry(appState.placingType)}
    <div class="placement-chip" role="status" aria-live="polite">
      Placing: {entry?.displayName ?? appState.placingType}
      <button class="placement-chip-cancel"
              onclick={() => { appState.placingType = null; }}
              title="Cancel placement (Esc)"
              aria-label="Cancel placement">×</button>
    </div>
  {/if}
```

- [ ] **Step 2: Add placement chip CSS to app.css**

At the end of the `CANVAS` section in `src/app.css`:

```css
/* Placement mode indicator */
.placement-chip {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-menu);
  color: var(--text-secondary);
  border: 1px solid var(--accent);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  padding: 5px 10px 5px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 200;
  pointer-events: all;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  white-space: nowrap;
}
.placement-chip-cancel {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  border-radius: 2px;
}
.placement-chip-cancel:hover { color: var(--text); }
.placement-chip-cancel:focus-visible { outline: 2px solid var(--accent); }
```

The `.canvas-container` must have `position: relative` for this to work — check `src/app.css` for `.canvas-container` and ensure it has `position: relative`. If not, add it.

- [ ] **Step 3: Verify TypeScript compiles and test**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

Open dev server. Click a palette item. Verify the "Placing: X" chip appears centered at the top of the canvas. Click × or press Esc to cancel.

- [ ] **Step 4: Commit**

```bash
git add src/lib/canvas/Canvas.svelte src/app.css
git commit -m "feat(ux): add placement mode indicator chip to canvas"
```

---

### Task 15: Standardize labels and add title attributes

**Files:**
- Modify: `src/lib/toolbar/Toolbar.svelte`
- Modify: `src/lib/panels/PropertiesPanel.svelte`

- [ ] **Step 1: Read Toolbar.svelte template section to find icon-only buttons**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && grep -n 'title\|aria-label\|☰\|toolbar-btn' src/lib/toolbar/Toolbar.svelte | head -40
```

- [ ] **Step 2: Add title to hamburger button and all icon-only toolbar buttons**

In `src/lib/toolbar/Toolbar.svelte` template, find the hamburger button (`☰`) and add `title="Menu (file, export, settings)"` if missing.

Find all `.toolbar-btn` elements that contain only an icon character (no text label visible) and add `title` attributes. For example:

```svelte
<button class="toolbar-btn" class:active={appState.snapEnabled}
        onclick={() => appState.snapEnabled = !appState.snapEnabled}
        title="Snap to grid (S)">Snap</button>
```

Review each toolbar button and ensure every one has a `title` attribute explaining its action.

- [ ] **Step 3: Read PropertiesPanel.svelte to find Remove/Delete inconsistencies**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && grep -n 'Remove\|Delete\|Load\b' src/lib/panels/PropertiesPanel.svelte | head -20
```

- [ ] **Step 4: Standardize labels in PropertiesPanel.svelte**

- Change any "Remove" button labels to "Remove" (keep consistent — "Remove" is correct for non-destructive removal like clearing a texture or image, reserve "Delete" for permanent component deletion)
- Ensure all file-picker buttons end with `…` to signal dialog
- Ensure all button text is Title Case

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/toolbar/Toolbar.svelte src/lib/panels/PropertiesPanel.svelte
git commit -m "fix(ux): standardize button labels and add title attributes to toolbar"
```

---

### Task 16: Add keyboard shortcuts help overlay

**Files:**
- Create: `src/lib/ui/ShortcutsHelp.svelte`
- Modify: `src/lib/state/app.svelte.ts`
- Modify: `src/lib/interaction/shortcuts.ts`
- Modify: `src/App.svelte`

- [ ] **Step 1: Add showShortcutsHelp to appState**

In `src/lib/state/app.svelte.ts`, add to the `appState` object:

```ts
  showShortcutsHelp: false,
```

- [ ] **Step 2: Create ShortcutsHelp.svelte**

```svelte
<script lang="ts">
  import { appState } from '../state/app.svelte.js';

  const SHORTCUTS = [
    { category: 'File', items: [
      { key: 'Ctrl+S',      desc: 'Save' },
      { key: 'Ctrl+O',      desc: 'Open…' },
      { key: 'Ctrl+E',      desc: 'Export PNG' },
      { key: 'Ctrl+Shift+E', desc: 'Export SVG' },
      { key: 'Ctrl+Shift+C', desc: 'Copy JSON to clipboard' },
    ]},
    { category: 'Edit', items: [
      { key: 'Ctrl+Z',      desc: 'Undo' },
      { key: 'Ctrl+Shift+Z', desc: 'Redo' },
      { key: 'Ctrl+C',      desc: 'Copy' },
      { key: 'Ctrl+X',      desc: 'Cut' },
      { key: 'Ctrl+V',      desc: 'Paste' },
      { key: 'Ctrl+D',      desc: 'Duplicate' },
      { key: 'Delete',      desc: 'Delete selected' },
      { key: 'Ctrl+A',      desc: 'Select all' },
      { key: 'Escape',      desc: 'Deselect / cancel placing' },
    ]},
    { category: 'Arrange', items: [
      { key: 'Ctrl+G',       desc: 'Group' },
      { key: 'Ctrl+Shift+G', desc: 'Ungroup' },
      { key: 'Ctrl+]',       desc: 'Bring forward' },
      { key: 'Ctrl+[',       desc: 'Send backward' },
      { key: 'Ctrl+Shift+]', desc: 'Bring to front' },
      { key: 'Ctrl+Shift+[', desc: 'Send to back' },
      { key: ']',            desc: 'Rotate +step' },
      { key: '[',            desc: 'Rotate −step' },
    ]},
    { category: 'View', items: [
      { key: 'G',       desc: 'Toggle grid' },
      { key: '+  /  =', desc: 'Zoom in' },
      { key: '-',       desc: 'Zoom out' },
      { key: 'Ctrl+0',  desc: 'Reset zoom' },
      { key: 'Space',   desc: 'Pan mode (hold)' },
      { key: '?',       desc: 'Show this help' },
    ]},
  ];

  function close() {
    appState.showShortcutsHelp = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if appState.showShortcutsHelp}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="shortcuts-backdrop" onclick={close} role="presentation"></div>
  <div class="shortcuts-dialog"
       role="dialog"
       aria-label="Keyboard shortcuts"
       aria-modal="true"
       onkeydown={onKeyDown}>
    <div class="shortcuts-header">
      <span class="shortcuts-title">Keyboard Shortcuts</span>
      <button class="shortcuts-close" onclick={close} aria-label="Close shortcuts help">×</button>
    </div>
    <div class="shortcuts-grid">
      {#each SHORTCUTS as section}
        <div class="shortcuts-section">
          <div class="shortcuts-category">{section.category}</div>
          {#each section.items as item}
            <div class="shortcuts-row">
              <kbd class="shortcuts-key">{item.key}</kbd>
              <span class="shortcuts-desc">{item.desc}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .shortcuts-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 5000;
  }
  .shortcuts-dialog {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-menu);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    z-index: 5001;
    width: min(680px, 95vw);
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .shortcuts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .shortcuts-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .shortcuts-close {
    background: none; border: none; color: var(--text-muted);
    font-size: 20px; cursor: pointer; padding: 0 4px; border-radius: 4px;
  }
  .shortcuts-close:hover { color: var(--text); }
  .shortcuts-close:focus-visible { outline: 2px solid var(--accent); }
  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  @media (max-width: 500px) {
    .shortcuts-grid { grid-template-columns: 1fr; }
  }
  .shortcuts-category {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px;
  }
  .shortcuts-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 5px; font-size: 12px;
  }
  .shortcuts-key {
    font-family: monospace; font-size: 11px;
    background: var(--bg-input); color: var(--text-secondary);
    border: 1px solid var(--border-muted); border-radius: 3px;
    padding: 1px 6px; white-space: nowrap; flex-shrink: 0;
    min-width: 90px; text-align: center;
  }
  .shortcuts-desc { color: var(--text-secondary); }
</style>
```

- [ ] **Step 3: Add `?` shortcut to shortcuts.ts**

In `src/lib/interaction/shortcuts.ts`, add `showToast` and `showShortcutsHelp` toggle to the `onKeyDown` handler. Add before the final closing brace of `onKeyDown`:

```ts
    // ? — toggle shortcuts help
    if (key === '?' || (key === '/' && shift)) {
      appState.showShortcutsHelp = !appState.showShortcutsHelp;
      e.preventDefault();
      return;
    }
```

- [ ] **Step 4: Mount ShortcutsHelp in App.svelte**

```ts
  import ShortcutsHelp from './lib/ui/ShortcutsHelp.svelte';
```

After `<Toast />`:

```svelte
<ShortcutsHelp />
```

- [ ] **Step 5: Verify TypeScript compiles and test**

```bash
cd /mnt/c/Users/v-valykov/repos/drawdio && npm run build 2>&1 | head -20
```

Open dev server. Press `?`. Verify the shortcuts overlay appears with all categories. Press Esc or click backdrop to close.

- [ ] **Step 6: Commit**

```bash
git add src/lib/state/app.svelte.ts src/lib/ui/ShortcutsHelp.svelte src/lib/interaction/shortcuts.ts src/App.svelte
git commit -m "feat(ux): add keyboard shortcuts help overlay (? key)"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| Add `EffectKey` union, `ComponentProperties` interface | Task 1 |
| Remove unsafe casts in EffectsEditor | Task 2 |
| Fix `pop()!` non-null assertions | Task 3 |
| Use `structuredClone` instead of JSON round-trip | Task 3 |
| Fix empty catch blocks in autosave | Task 3 |
| Add schema validation in `fromJSON` | Task 3 |
| Extract `fetchAssetAsDataUrl` utility | Task 4 |
| Extract `loadImageFile` utility | Task 4 |
| Extract `createDragHandler` factory | Task 5 |
| Refactor Palette.svelte using `createDragHandler` | Task 5 |
| Use `loadImageFile` in Toolbar.svelte | Task 6 |
| Add 10 new component CSS variables | Task 7 |
| Fix `--surface-hover` undefined reference | Task 7 |
| Raise `--text-dimmer` and `--text-dim` for WCAG AA | Task 7 |
| Add `:focus-visible` rings to inputs and selects | Task 7 |
| Add `disabled` state styles | Task 7 |
| Replace hardcoded colors in display components | Task 8 |
| Replace hardcoded colors in control components | Task 9 |
| Add ARIA roles/labels to interactive SVG components | Task 10 |
| ContextMenu keyboard navigation + focus management | Task 11 |
| sr-only status region in App.svelte | Task 12 |
| Palette item keyboard support (Enter to place) | Task 12 |
| Toast notification system | Task 13 |
| Wire toasts into export.ts and autosave.ts | Task 13 |
| Placement mode indicator chip | Task 14 |
| Standardize labels and add title attributes | Task 15 |
| Keyboard shortcuts help overlay (`?` key) | Task 16 |

All spec requirements are covered. No gaps.

### Type consistency check

- `EffectKey` defined in Task 1, used in Task 2 — consistent.
- `ComponentProperties` defined in Task 1, referenced in PropertiesPanel (Task 15 via existing code) — consistent.
- `createDragHandler` defined in Task 5, used in Task 5 (Palette.svelte) — consistent.
- `fetchAssetAsDataUrl` defined in Task 4, used in Task 5 (knobs and textures) — consistent.
- `showToast` defined in Task 13 (`toast.svelte.ts`), called in `export.ts` and `autosave.ts` (Task 13) and `shortcuts.ts` (Task 16 — not needed there, removed) — consistent.
- `appState.showShortcutsHelp` added in Task 16, read in `ShortcutsHelp.svelte` (Task 16) — consistent.
