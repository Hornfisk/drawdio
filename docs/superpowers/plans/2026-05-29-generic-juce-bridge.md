# Generic drawdio↔JUCE Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the SquelchPro-proven layout bridge into a plugin-neutral JUCE module consumed from one source of truth, neutralize the drawdio-side hardcodes, and prove genericity by adopting it in Bombo without touching Bombo's normal behavior.

**Architecture:** drawdio (Svelte/Vite web app) already hosts a generic WebSocket bridge + flat-manifest protocol. The reusable C++ machinery (`LayoutManager`, `LayoutEditOverlay`) moves into a new `juce_add_module`-able module at `adapters/juce/drawdio_layout/` in the drawdio repo. Plugins reference it via a `DRAWDIO_ADAPTERS_DIR` CMake cache var. The adapter is fallback-based and env-gated, so a plugin with no manifest and edit-mode off behaves identically to before.

**Tech Stack:** Svelte 5 + Vite 6 + TypeScript 5.7, Vitest (added here), Node WebSocket bridge (`ws` + `chokidar`), JUCE C++17, CMake.

---

## Execution context

- **Part A (Tasks 1–5):** drawdio web side. Fully executable and verifiable on this WSL box (`npm run dev`, `npm test`).
- **Part B (Tasks 6–9):** writes C++ source + docs into the drawdio repo. These are text files — fine to author on WSL; **not built here.**
- **Part C (Tasks 10–11):** edits the separate `squelch_pro` and `bombo` repos and **builds/verifies on geek** (WSL JUCE builds are unreliable). Do the edit + build together on geek to avoid cross-machine half-states.

All commits use the Hornfisk identity (already set locally on this clone:
`Hornfisk <30924992+Hornfisk@users.noreply.github.com>`). Bombo/squelch_pro commits must use the same per-repo identity on geek.

---

## File Structure

**drawdio repo (this repo):**
- `package.json` — add `vitest` devDep + `test` script (Task 1)
- `vitest.config.ts` — Vitest config (Task 1)
- `src/lib/io/nsColor.ts` — NEW: deterministic namespace→color hash (Task 2)
- `src/lib/io/nsColor.test.ts` — NEW: unit tests (Task 2)
- `src/lib/io/flatManifest.ts` — MODIFY: use `nsColor()`, drop hardcoded map (Task 2)
- `src/lib/io/flatManifest.test.ts` — NEW: round-trip back-compat tests (Task 3)
- `tools/bridge/server.mjs` — MODIFY: drop `SQUELCH_LAYOUT` fallback (Task 4)
- `PROTOCOL.md` — NEW: formal wire contract (Task 5)
- `adapters/juce/drawdio_layout/drawdio_layout.h` — NEW: module decl + `LayoutElem` (Task 6)
- `adapters/juce/drawdio_layout/LayoutManager.{h,cpp}` — NEW: ported, parameterized (Task 7)
- `adapters/juce/drawdio_layout/LayoutEditOverlay.{h,cpp}` — NEW: ported, decoupled (Task 8)
- `adapters/juce/drawdio_layout/README.md` — NEW: workflow + CMake (Task 9)

**squelch_pro repo (geek):**
- `Source/GUI/LayoutManager.*`, `LayoutEditOverlay.*` — DELETE (now from module)
- `Source/GUI/FaceplatePanel.{h,cpp}`, `FxPanel.cpp`, `PluginEditor.cpp`, `CMakeLists.txt` — MODIFY (Task 10)

**bombo repo (geek):**
- `CMakeLists.txt`, editor + faceplate sources — MODIFY, additive only (Task 11)

---

## PART A — drawdio-side neutralization (WSL-verifiable)

### Task 1: Add Vitest tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd ~/repos/drawdio && npm install -D vitest@^2
```
Expected: `vitest` added to devDependencies, no errors.

- [ ] **Step 2: Add the test script**

Edit `package.json` `scripts` to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify the runner starts (no tests yet)**

Run: `npm test`
Expected: Vitest runs, reports "No test files found" (exit 0 or the "no tests" notice) — confirms tooling works.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "build: add Vitest for unit tests"
```

### Task 2: Deterministic namespace→color hashing

**Files:**
- Create: `src/lib/io/nsColor.ts`
- Create: `src/lib/io/nsColor.test.ts`
- Modify: `src/lib/io/flatManifest.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/io/nsColor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nsColor } from './nsColor';

describe('nsColor', () => {
  it('returns a valid hex color', () => {
    expect(nsColor('faceplate')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic for the same namespace', () => {
    expect(nsColor('osc')).toBe(nsColor('osc'));
  });

  it('gives different namespaces different colors', () => {
    expect(nsColor('osc')).not.toBe(nsColor('amp'));
  });

  it('handles empty and single-char namespaces without throwing', () => {
    expect(nsColor('')).toMatch(/^#[0-9a-f]{6}$/i);
    expect(nsColor('x')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- nsColor`
Expected: FAIL — "Cannot find module './nsColor'".

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/io/nsColor.ts`:
```ts
// Deterministic namespace → color. Hashes the namespace string to a stable hue
// so any plugin's namespaces render as distinct, consistent tints — no plugin
// name is baked into drawdio. Saturation/lightness are fixed for a cohesive
// palette against the dark canvas.

function hashString(s: string): number {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function nsColor(ns: string): string {
  const hue = hashString(ns) % 360;
  return hslToHex(hue, 0.45, 0.55);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- nsColor`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into `flatManifest.ts`**

In `src/lib/io/flatManifest.ts`, remove the `NS_COLORS` map and `DEFAULT_COLOR` constant (lines ~23-28), add `import { nsColor } from './nsColor';` near the top, and replace the body of the color lookup. Find:
```ts
        const nsColor = NS_COLORS[ns] || DEFAULT_COLOR;
        const color = resolvedEntry?.defaultProps.color ?? nsColor;
```
Replace with:
```ts
        const fallbackColor = nsColor(ns);
        const color = resolvedEntry?.defaultProps.color ?? fallbackColor;
```
And in the `properties` fallback just below, replace the two `nsColor` references (the old local `const`) with `fallbackColor`:
```ts
          : { bgColor: fallbackColor, bgOpacity: 0.35, cornerRadius: 2, borderWidth: 1 };
```

- [ ] **Step 6: Type-check + build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors (confirms the rename + import resolve).

- [ ] **Step 7: Commit**

```bash
git add src/lib/io/nsColor.ts src/lib/io/nsColor.test.ts src/lib/io/flatManifest.ts
git commit -m "feat(manifest): hash namespaces to stable colors, drop hardcoded names"
```

### Task 3: Flat-manifest round-trip back-compat test

**Files:**
- Create: `src/lib/io/flatManifest.test.ts`

This guards that generalizing colors did NOT change bounds/lock/type round-tripping.

- [ ] **Step 1: Write the test**

Create `src/lib/io/flatManifest.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyFlatManifest, toFlatManifest, type FlatManifest } from './flatManifest';
import { appState } from '../state/app.svelte.js';

describe('flatManifest round-trip', () => {
  beforeEach(() => {
    appState.components.length = 0;
  });

  it('applies bounds, lock, and type for a dotted id', () => {
    const m: FlatManifest = {
      faceplate: { tuningKnob: { x: 10, y: 20, w: 80, h: 80, locked: true, type: 'rotary_knob' } },
    };
    const applied = applyFlatManifest(m);
    expect(applied).toBe(1);
    const c = appState.components.find((c) => c.id === 'faceplate.tuningKnob')!;
    expect([c.x, c.y, c.width, c.height]).toEqual([10, 20, 80, 80]);
    expect(c.locked).toBe(true);
    expect(c.type).toBe('rotary_knob');
  });

  it('preserves bounds + type on a full round-trip', () => {
    const m: FlatManifest = {
      fx: { delayMix: { x: 5, y: 6, w: 40, h: 40, locked: false, type: 'rotary_knob' } },
    };
    applyFlatManifest(m);
    const out = toFlatManifest();
    expect(out.fx.delayMix).toMatchObject({ x: 5, y: 6, w: 40, h: 40, type: 'rotary_knob' });
  });

  it('falls back to panel_group for unknown types', () => {
    applyFlatManifest({ osc: { tune: { x: 0, y: 0, w: 30, h: 30, type: 'not_a_real_type' } } });
    const c = appState.components.find((c) => c.id === 'osc.tune')!;
    expect(c.type).toBe('panel_group');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- flatManifest`
Expected: PASS (3 tests). If `appState` import requires a Svelte/runes env, switch `vitest.config.ts` `environment` to `'jsdom'` (install `jsdom` as devDep) and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/lib/io/flatManifest.test.ts vitest.config.ts package.json package-lock.json
git commit -m "test(manifest): guard bounds/lock/type round-trip back-compat"
```

### Task 4: Drop the SquelchPro env fallback in the bridge

**Files:**
- Modify: `tools/bridge/server.mjs:12-14`

- [ ] **Step 1: Edit the env resolution**

Find:
```js
const LAYOUT = path.resolve(
  process.env.BRIDGE_TARGET || process.env.SQUELCH_LAYOUT || process.argv[2] || './Layout.json'
);
```
Replace with:
```js
const LAYOUT = path.resolve(
  process.env.BRIDGE_TARGET || process.argv[2] || './Layout.json'
);
```

- [ ] **Step 2: Smoke-test the bridge starts**

Run:
```bash
cd ~/repos/drawdio && BRIDGE_TARGET=/tmp/probe.json timeout 2 npm run bridge 2>&1 | grep -q "listening ws" && echo OK
```
Expected: `OK` (bridge boots and prints the listening line; `timeout` ends it).

- [ ] **Step 3: Commit**

```bash
git add tools/bridge/server.mjs
git commit -m "refactor(bridge): drop vestigial SQUELCH_LAYOUT env fallback"
```

### Task 5: Write PROTOCOL.md

**Files:**
- Create: `PROTOCOL.md`

- [ ] **Step 1: Write the contract**

Create `PROTOCOL.md`:
```markdown
# drawdio bridge protocol

The drawdio layout bridge lets any host (currently JUCE plugins; egui planned)
edit a UI layout visually and round-trip positions back to the host. The wire
contract is intentionally minimal: **bounds + lock + a type hint.** No colors,
themes, or code are exchanged — the host owns its component vocabulary and look.

## Manifest file `<name>.json`

```json
{
  "<namespace>": {
    "<element-id>": { "x": 0, "y": 0, "w": 10, "h": 10, "locked": false, "type": "rotary_knob" }
  }
}
```

- Ids are dotted: `<namespace>.<element-id>` (e.g. `faceplate.tuningKnob`).
- `locked` (optional) — element is non-movable in the editor.
- `type` (optional) — a drawdio component-type id, passed through verbatim.
  Unknown/missing types render as `panel_group`. The host, not drawdio, decides
  the vocabulary (`rotary_knob`, `toggle_switch`, `momentary_button`,
  `value_readout`, `label_text`, …).
- Namespaces are colored deterministically in drawdio via a hash of the name —
  no namespace is special-cased.

## Backdrop `<name>.png`

A sibling PNG (same path, `.png` extension). The host dumps a 1:1 faceplate
snapshot; drawdio auto-loads it as the reference image and sizes the canvas to
match (W/H read from the PNG IHDR header).

## Transport

WebSocket `ws://localhost:7878` (`BRIDGE_PORT` env to override). The bridge
(`tools/bridge/server.mjs`, started with `BRIDGE_TARGET=<manifest> npm run bridge`)
watches the JSON + PNG, broadcasts changes to clients, and writes client-sent
manifests back to the file. Echo is suppressed by SHA of the last bytes written.

Messages:
- `{ type: "manifest", nonce, json, file? }` — full manifest, both directions.
- `{ type: "backdrop", dataUrl, width, height, file }` — server → client only.

## Host responsibilities

A host adapter must: (1) write the manifest with stable dotted ids, (2) read
positions back via the manifest as **overrides on top of code fallbacks** (so the
host runs unchanged with no manifest), and (3) optionally dump the backdrop PNG.
See `adapters/juce/drawdio_layout/README.md` for the JUCE reference adapter.
```

- [ ] **Step 2: Commit**

```bash
git add PROTOCOL.md
git commit -m "docs: formalize the drawdio bridge wire protocol"
```

---

## PART B — reusable JUCE module (authored here, built on geek)

> No WSL build. These tasks create source files in the drawdio repo. Compilation is verified in Part C when a plugin links the module on geek.

### Task 6: Module skeleton + `LayoutElem`

**Files:**
- Create: `adapters/juce/drawdio_layout/drawdio_layout.h`

- [ ] **Step 1: Write the module header**

Create `adapters/juce/drawdio_layout/drawdio_layout.h`:
```cpp
#pragma once

/* BEGIN_JUCE_MODULE_DECLARATION

    ID:               drawdio_layout
    vendor:           Hornfisk
    version:          0.1.0
    name:             drawdio_layout
    description:      Runtime layout-manifest loader + in-plugin edit overlay for the drawdio bridge.
    website:          https://github.com/Hornfisk/drawdio
    license:          MIT
    minimumCppStandard: 17
    dependencies:     juce_gui_basics

   END_JUCE_MODULE_DECLARATION */

#include <juce_gui_basics/juce_gui_basics.h>
#include <vector>
#include <functional>

namespace drawdio
{
/** One editable element, in editor-absolute coordinates. Plugin-neutral
    replacement for the former FaceplatePanel::LayoutElem. */
struct LayoutElem
{
    juce::String id;                 // dotted, e.g. "faceplate.tuningKnob"
    juce::Rectangle<int> bounds;
    bool locked = false;
    juce::String type;               // drawdio component type; empty = unspecified
};
}

#include "LayoutManager.h"
#include "LayoutEditOverlay.h"
```

- [ ] **Step 2: Commit**

```bash
git add adapters/juce/drawdio_layout/drawdio_layout.h
git commit -m "feat(juce): add drawdio_layout module skeleton + LayoutElem"
```

### Task 7: Port `LayoutManager` (de-namespace + parameterize)

**Files:**
- Create: `adapters/juce/drawdio_layout/LayoutManager.{h,cpp}`

Source of truth to port from: `squelch_pro/Source/GUI/LayoutManager.{h,cpp}` (read these from the squelch_pro checkout). The logic is unchanged; three mechanical edits:

1. Namespace `squelch` → `drawdio`.
2. The env-var name and dev-path fallback (hardcoded `"SQUELCH_LAYOUT_JSON"` and `"Resources/Layout.json"` in `resolveFile()` ~lines 11-26 and `save()` ~lines 214-226) become **constructor parameters** stored as members.
3. Drop the `#include "FaceplatePanel.h"` if present; this class has no panel dependency.

- [ ] **Step 1: Write `LayoutManager.h`**

```cpp
#pragma once
#include <juce_core/juce_core.h>
#include <juce_graphics/juce_graphics.h>

namespace drawdio
{
/** Runtime layout-manifest loader. Loads a JSON file keyed by stable dotted
    ids ("faceplate.tuningKnob" → {x,y,w,h}) and returns bounds for any id,
    falling back to a caller-supplied default when missing or absent.

    Load priority:
      1. $<envVarName> (absolute path — dev override)
      2. <walk-up-from-exe>/<defaultRelPath> (dev build convenience)
      3. nothing — every call returns its fallback

    Fallback-based API: the plugin always builds and runs correctly with no
    JSON present; JSON only overrides positions when found. Keeps the drawdio
    round-trip opt-in and non-destructive. */
class LayoutManager
{
public:
    /** @param envVarName     env var checked first for an absolute manifest path
        @param defaultRelPath repo-relative manifest path used when walking up
                              from the executable (e.g. "Resources/Layout.json") */
    LayoutManager (juce::String envVarName, juce::String defaultRelPath);

    void reload();
    juce::Rectangle<int> boundsOr (const juce::String& id, juce::Rectangle<int> fallback) const;
    void setBounds (const juce::String& id, juce::Rectangle<int> r, const juce::String& type = {});
    bool isLocked (const juce::String& id) const;
    void setLocked (const juce::String& id, bool locked);
    bool save();
    bool isLoaded() const noexcept { return loaded; }
    juce::String getSourcePath() const { return sourcePath; }

private:
    juce::var root;
    juce::String sourcePath;
    bool loaded = false;
    juce::String envVar;       // NEW
    juce::String defaultPath;  // NEW

    juce::File resolveFile() const;
};
}
```

- [ ] **Step 2: Write `LayoutManager.cpp`**

Copy `squelch_pro/Source/GUI/LayoutManager.cpp` verbatim, then apply:
- Replace `namespace squelch` → `namespace drawdio`.
- Constructor: add
```cpp
LayoutManager::LayoutManager (juce::String envVarName, juce::String defaultRelPath)
    : envVar (std::move (envVarName)), defaultPath (std::move (defaultRelPath))
{
    reload();
}
```
(replace the old parameterless `LayoutManager()` if present).
- In `resolveFile()`: replace the literal `"SQUELCH_LAYOUT_JSON"` with `envVar`, and the literal `"Resources/Layout.json"` with `defaultPath` (both the env lookup ~line 13 and the `getChildFile` ~line 26).
- In `save()`: replace the hardcoded `"Resources/Layout.json"` / `"Resources"` + `"Layout.json"` (~lines 220-226) so the target derives from `defaultPath` (split into parent dir + filename, or simply reuse `resolveFile()`'s logic). Keep behavior identical for SquelchPro's `"Resources/Layout.json"`.

- [ ] **Step 3: Commit**

```bash
git add adapters/juce/drawdio_layout/LayoutManager.h adapters/juce/drawdio_layout/LayoutManager.cpp
git commit -m "feat(juce): port LayoutManager, parameterize env var + manifest path"
```

### Task 8: Port `LayoutEditOverlay` (de-namespace + decouple from FaceplatePanel)

**Files:**
- Create: `adapters/juce/drawdio_layout/LayoutEditOverlay.{h,cpp}`

Source: `squelch_pro/Source/GUI/LayoutEditOverlay.{h,cpp}` (680-line `.cpp`). Snapping, multi-select, undo/redo, lock UI, paint, and the `onDumpScreenshot` hook are unchanged. The only structural change is removing the concrete `FaceplatePanel&` dependency in favor of a generic element source.

- [ ] **Step 1: Write `LayoutEditOverlay.h`**

```cpp
#pragma once
#include <juce_gui_basics/juce_gui_basics.h>
#include <set>
#include <functional>
#include <vector>
#include "drawdio_layout.h"   // drawdio::LayoutElem

namespace drawdio
{
/** In-plugin "layout edit mode" overlay. When visible, sits on top of the host
    panel and intercepts mouse events; each editable element is outlined with a
    dashed rect + label, click-drag repositions, handle/Shift+drag resizes, and
    mutations persist via a host-provided reload callback. Plugin-neutral: the
    host supplies elements through callbacks, not a concrete panel type. */
class LayoutEditOverlay : public juce::Component
{
public:
    LayoutEditOverlay() = default;

    /** Primary element source. `getElements` returns LayoutElems in
        editor-absolute coords; `reload` is invoked after any mutation so the
        host re-applies its layout (e.g. LayoutManager::save() then resized()). */
    void setElementSource (std::function<std::vector<LayoutElem>()> getElements,
                           std::function<void()> reload);

    /** Optional additional source merged with the primary (e.g. a sibling FX
        panel). Same contract as setElementSource. */
    void setExtraSource (std::function<std::vector<LayoutElem>()> getElements,
                         std::function<void()> reload);

    void setEditMode (bool shouldBeActive);
    bool isEditMode() const noexcept { return editMode; }
    bool handleKey (const juce::KeyPress& key);

    void paint (juce::Graphics& g) override;
    void mouseDown (const juce::MouseEvent& e) override;
    void mouseDrag (const juce::MouseEvent& e) override;
    void mouseUp   (const juce::MouseEvent& e) override;

    void toggleLockOnSelection();
    void setLockAll (bool locked);
    void refreshElements();

    /** Host hook: write a PNG snapshot of the faceplate to the given file. */
    std::function<void (juce::File)> onDumpScreenshot;

private:
    int hitTest (juce::Point<int> p) const;
    struct SnapResult { int delta = 0; int guideCoord = 0; bool active = false; };
    static SnapResult bestSnap (const std::vector<int>& movingEdges,
                                const std::vector<int>& staticEdges, int threshold);

    std::function<std::vector<LayoutElem>()> primaryGetElements, extraGetElements;
    std::function<void()> primaryReload, extraReload;
    std::vector<LayoutElem> elements;

    bool editMode = false;
    std::set<int> selection;
    int  draggingIndex = -1;
    bool resizing = false;
    juce::Point<int> dragAnchor;
    juce::Rectangle<int> startBounds;
    std::vector<juce::Rectangle<int>> moveStartAll;
    int  gridSize = 4;
    int  snapThresholdPx = 4;
    std::vector<juce::Line<int>> activeGuides;
    std::vector<std::vector<juce::Rectangle<int>>> undoStack, redoStack;
    static constexpr int kUndoCap = 100;

    void pushUndoSnapshot();
    bool popUndo();
    bool popRedo();
    std::vector<juce::Rectangle<int>> currentBoundsSnapshot() const;
    void applyBoundsToAll (const std::vector<juce::Rectangle<int>>& snap);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LayoutEditOverlay)
};
}
```

- [ ] **Step 2: Write `LayoutEditOverlay.cpp`**

Copy `squelch_pro/Source/GUI/LayoutEditOverlay.cpp` verbatim, then apply:
- Replace `namespace squelch` → `namespace drawdio`.
- Remove `#include "FaceplatePanel.h"`; add `#include "drawdio_layout.h"`.
- Replace every `FaceplatePanel::LayoutElem` with `LayoutElem`.
- Delete the constructor that took `FaceplatePanel& face` and the `faceplate` member usage. Wherever the old code read `faceplate.getEditableElements()` for the primary source, read `primaryGetElements()` instead.
- In `refreshElements()`: build `elements` by concatenating `primaryGetElements()` (if set) and `extraGetElements()` (if set).
- Anywhere the old code called the faceplate's reload directly, call `primaryReload()` (and `extraReload()` if the extra source was mutated), guarding for null `std::function`.
- `setElementSource` stores `primaryGetElements`/`primaryReload`; the existing `setExtraSource` body is unchanged except for the `LayoutElem` type.

- [ ] **Step 3: Commit**

```bash
git add adapters/juce/drawdio_layout/LayoutEditOverlay.h adapters/juce/drawdio_layout/LayoutEditOverlay.cpp
git commit -m "feat(juce): port LayoutEditOverlay, decouple from FaceplatePanel"
```

### Task 9: Module README + CMake convention

**Files:**
- Create: `adapters/juce/drawdio_layout/README.md`

- [ ] **Step 1: Write the README**

Create `adapters/juce/drawdio_layout/README.md`:
```markdown
# drawdio_layout (JUCE module)

Drop-in layout-manifest loader + in-plugin edit overlay for the drawdio bridge.
See `../../../PROTOCOL.md` for the wire contract.

## Add to a plugin (CMake)

```cmake
# Point at your drawdio checkout once per machine (cache var; env override ok).
set(DRAWDIO_ADAPTERS_DIR "$ENV{HOME}/repos/drawdio/adapters" CACHE PATH "drawdio adapters dir")
juce_add_module(${DRAWDIO_ADAPTERS_DIR}/juce/drawdio_layout)
target_link_libraries(MyPlugin PRIVATE drawdio_layout)
```

## Use in code

```cpp
#include <drawdio_layout/drawdio_layout.h>

// Manifest loader: env override name + repo-relative dev fallback.
drawdio::LayoutManager layout { "MYPLUGIN_LAYOUT_JSON", "Resources/Layout.json" };

// In a panel's resized(): JSON overrides code fallbacks (identical with no JSON).
knob.setBounds (layout.boundsOr ("faceplate.tuningKnob", { 40, 60, 80, 80 }));

// Edit overlay: register the element source + reload, gate behind an env var.
overlay.setElementSource ([this] { return collectElems(); }, [this] { layout.save(); resized(); });
overlay.onDumpScreenshot = [this] (juce::File f) { /* snapshot faceplate to f */ };
if (juce::SystemStats::getEnvironmentVariable ("MYPLUGIN_LAYOUT_EDIT", {}).isNotEmpty())
    overlay.setEditMode (true);
```

## Round-trip workflow (3 terminals)

```bash
# 1) plugin in edit mode
MYPLUGIN_LAYOUT_EDIT=1 ./build/.../MyPlugin
# 2) bridge (from drawdio repo)
BRIDGE_TARGET="$HOME/repos/myplugin/Resources/Layout.json" npm run bridge
# 3) drawdio UI
npm run dev   # http://localhost:5173 — auto-connects to ws://localhost:7878
```

In the plugin, dump the manifest + backdrop PNG (host-defined key chord). Drag in
drawdio → bridge writes Layout.json → reload in the plugin.
```

- [ ] **Step 2: Commit**

```bash
git add adapters/juce/drawdio_layout/README.md
git commit -m "docs(juce): drawdio_layout usage + CMake convention"
git push -u origin feature/generic-juce-bridge
```

---

## PART C — adoption (geek: edit + build + verify together)

> Run on geek. Set the per-repo Hornfisk identity in each repo first if not already:
> `git config user.email 30924992+Hornfisk@users.noreply.github.com && git config user.name Hornfisk`.
> Pull the drawdio branch on geek so the module exists at `~/repos/drawdio/adapters/juce/drawdio_layout`.

### Task 10: Rewire SquelchPro onto the module (regression baseline)

**Files (squelch_pro repo):**
- Delete: `Source/GUI/LayoutManager.{h,cpp}`, `Source/GUI/LayoutEditOverlay.{h,cpp}`
- Modify: `CMakeLists.txt`, `Source/GUI/FaceplatePanel.{h,cpp}`, `Source/GUI/FxPanel.cpp`, `Source/PluginEditor.cpp`

- [ ] **Step 1: Link the module in CMake**

In `squelch_pro/CMakeLists.txt`, add (near other `juce_add_module`/link calls):
```cmake
set(DRAWDIO_ADAPTERS_DIR "$ENV{HOME}/repos/drawdio/adapters" CACHE PATH "drawdio adapters dir")
juce_add_module(${DRAWDIO_ADAPTERS_DIR}/juce/drawdio_layout)
target_link_libraries(SquelchPro PRIVATE drawdio_layout)
```

- [ ] **Step 2: Delete the in-repo copies + swap includes/types**

- Delete the four files above.
- Replace `#include "GUI/LayoutManager.h"` / `LayoutEditOverlay.h` with `#include <drawdio_layout/drawdio_layout.h>`.
- Replace `squelch::LayoutManager` → `drawdio::LayoutManager`, constructed as
  `{ "SQUELCH_LAYOUT_JSON", "Resources/Layout.json" }` (preserves the existing env var + path).
- Replace `squelch::LayoutEditOverlay` → `drawdio::LayoutEditOverlay` (now default-constructed; no `FaceplatePanel&`).
- In `FaceplatePanel.h`: remove the now-duplicate `struct LayoutElem` and make `getEditableElements()` return `std::vector<drawdio::LayoutElem>`.
- In `PluginEditor.cpp`: wire the overlay via `overlay.setElementSource(...)` using the faceplate's element getter + a reload lambda (`layout.save(); faceplate.resized();`), and keep the FX `setExtraSource(...)` call (now `drawdio::LayoutElem`).

- [ ] **Step 3: Build**

Run:
```bash
cmake --build <squelchpro-build-dir> --target SquelchPro -j4
```
Expected: compiles clean (module resolves, no `squelch::Layout*` references remain).

- [ ] **Step 4: Regression-verify the round-trip**

Run the SquelchPro standalone with `SQUELCH_LAYOUT_EDIT=1`, start the bridge against its `Resources/Layout.json`, open drawdio. Confirm: edit-mode overlay appears, drag-to-move + lock + `Ctrl+R` reload behave exactly as before, and drawdio renders the typed components over the backdrop. No visual/behavioral change vs. pre-extraction.

- [ ] **Step 5: Commit (squelch_pro repo)**

```bash
git add -A
git commit -m "refactor(layout): consume drawdio_layout module instead of in-repo copy"
```

### Task 11: Adopt in Bombo (additive, gated — Bombo safety gate)

**Files (bombo repo):**
- Modify: `CMakeLists.txt`, Bombo's editor + faceplate sources (additive only)

- [ ] **Step 1: Link the module in CMake**

In `bombo/CMakeLists.txt`:
```cmake
set(DRAWDIO_ADAPTERS_DIR "$ENV{HOME}/repos/drawdio/adapters" CACHE PATH "drawdio adapters dir")
juce_add_module(${DRAWDIO_ADAPTERS_DIR}/juce/drawdio_layout)
target_link_libraries(Bombo PRIVATE drawdio_layout)
```

- [ ] **Step 2: Add the manifest loader as position overrides**

Add a `drawdio::LayoutManager layout { "BOMBO_LAYOUT_JSON", "Resources/Layout.json" };` member to Bombo's editor/faceplate. In the faceplate `resized()`, wrap each control's existing `setBounds(...)` so the current hardcoded rect becomes the **fallback**:
```cpp
// before: kickKnob.setBounds (40, 60, 80, 80);
kickKnob.setBounds (layout.boundsOr ("faceplate.kickKnob", { 40, 60, 80, 80 }));
```
Use the existing literal bounds as each fallback so **with no JSON the layout is byte-identical to today.**

- [ ] **Step 3: Add the gated edit overlay**

Add a `drawdio::LayoutEditOverlay` as a child component, initially hidden. Register the element source + reload + dump hook, and enable edit mode ONLY when gated:
```cpp
overlay.setElementSource ([this] { return collectElems(); },
                          [this] { layout.save(); resized(); });
overlay.onDumpScreenshot = [this] (juce::File f) {
    auto img = faceplate.createComponentSnapshot (faceplate.getLocalBounds());
    f.deleteFile();
    juce::FileOutputStream os (f);
    if (os.openedOk()) { juce::PNGImageFormat png; png.writeImageToStream (img, os); }
};
if (juce::SystemStats::getEnvironmentVariable ("BOMBO_LAYOUT_EDIT", {}).isNotEmpty())
{
    addAndMakeVisible (overlay);
    overlay.setBounds (getLocalBounds());
    overlay.setEditMode (true);
}
```
`collectElems()` returns `drawdio::LayoutElem{ id, control.getBounds(), layout.isLocked(id), type }` for each editable control.

- [ ] **Step 4: Build**

Run:
```bash
cmake --build ~/bombo-build --target Bombo_Standalone -j4
```
Expected: compiles clean.

- [ ] **Step 5: BOMBO SAFETY GATE — verify no-op when inert (mandatory)**

With `BOMBO_LAYOUT_EDIT` UNSET and **no** `Resources/Layout.json` present, launch Bombo. Confirm:
- The UI is pixel-identical to the pre-change build (every control at its old position).
- No overlay, no edit affordances, no new logs.
- Audio path untouched (the change only touches `resized()` fallbacks + a hidden child).
If any difference appears, STOP — the fallbacks don't match the old literals; fix before proceeding.

- [ ] **Step 6: Verify the round-trip (genericity proof)**

With `BOMBO_LAYOUT_EDIT=1`, start the bridge against Bombo's `Resources/Layout.json`, open drawdio. Dump manifest + backdrop, confirm drawdio renders typed components over Bombo's faceplate, drag a control, `Ctrl+R` in Bombo moves it. **This must work with ZERO drawdio-side changes** — if it does, the protocol is proven plugin-agnostic.

- [ ] **Step 7: Commit (bombo repo)**

```bash
git add -A
git commit -m "feat(layout): opt-in drawdio_layout round-trip (additive, env-gated)"
```

---

## Self-review notes

- **Spec coverage:** Part 2 (Tasks 2,4) ✓; protocol doc (Task 5) ✓; module extraction (Tasks 6-9) ✓; SquelchPro rewire (Task 10) ✓; Bombo additive adoption + no-op gate (Task 11, Steps 5-6) ✓; verification matrix mapped to Task acceptance steps ✓.
- **Out of scope honored:** no egui, no beyond-bounds editing, no `main` merge.
- **Identity:** Hornfisk identity reaffirmed for drawdio (set) and for squelch_pro/bombo (Task 10/11 preamble).
- **Known carry-over:** `juce::Font` deprecation warnings travel with `LayoutEditOverlay.cpp`; cosmetic, optional `FontOptions` sweep during Task 8 if desired.
