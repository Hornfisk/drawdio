# SP-1 — Generic drawdio↔JUCE bridge + reusable JUCE adapter

**Date:** 2026-05-29
**Status:** Design approved, pending spec review
**Branch:** `feature/generic-juce-bridge` (off `feature/squelchpro-bridge`, the current dev tip)

## Summary

drawdio already has a working, bidirectional layout bridge proven with SquelchPro:
a JUCE plugin dumps a bounds manifest (`Layout.json`) + a faceplate snapshot
(`Layout.png`), drawdio renders typed components over the backdrop at real
positions, and dragging in drawdio writes bounds back to the plugin (hot-reloaded
with `Ctrl+R`). Round-trip carries **bounds + lock state**, plus a **type hint**
passed through verbatim — the plugin owns the component-type vocabulary. No colors,
themes, or code are exchanged.

This work **generalizes** that bridge so any JUCE plugin can adopt it from a single
source of truth, and proves genericity by wiring it into **Bombo** as a second
consumer. The drawdio (web) side is already ~90% generic; the SquelchPro-specific
weight is the C++ machinery, which gets lifted into a reusable JUCE module living
in the drawdio repo.

This is the first of three sub-projects from the "make drawdio more mature"
brainstorm:

- **SP-1 (this spec):** generic bridge + reusable JUCE adapter, Bombo as proof.
- **SP-2 (parked):** egui / nih-plug adapter so Niner gets the same round-trip.
- **SP-3 (separate spec):** Kittl-grade polish pass on drawdio's own UI.

## Goals

- One canonical, plugin-neutral JUCE adapter consumed by both SquelchPro and Bombo.
- Drawdio-side hardcodes neutralized so no plugin name is baked into the web app.
- A written protocol spec (`PROTOCOL.md`) both current and future adapters target.
- Bombo round-trips through drawdio with **zero** drawdio-side changes (the
  genericity proof).

## Non-goals (explicitly out of scope for SP-1)

- egui / nih-plug / Niner adapter (SP-2).
- Editing anything beyond bounds + lock + type hint (no colors, themes, codegen).
- drawdio UI polish (SP-3).
- Merging `feature/squelchpro-bridge` → `main` (pre-existing integration item, noted
  below; does not block SP-1).

## Hard constraints

1. **Do not break Bombo. At all.** Bombo is the KVRDC entry (go-live 2026-07-06).
   The adapter is fallback-based, opt-in, and env-gated *by design*: with no
   manifest file and edit mode off, the plugin must behave **byte-identically** to
   today. Bombo changes are **purely additive** — nothing in Bombo's audio,
   signal, or normal render path is touched. Verification explicitly asserts this.
2. **Pseudonymity.** drawdio is a public Hornfisk repo. All commits use
   `Hornfisk <30924992+Hornfisk@users.noreply.github.com>` (set locally on this
   clone; this WSL box's global identity wrongly carries `vlad@vantagroup.org`).
3. **Verification split.** The drawdio-side changes are verified here on WSL
   (`npm run dev`). The C++ work (SquelchPro rewire + Bombo adoption) is written
   here but **built and verified on geek** — WSL JUCE builds are unreliable
   (XWayland detach, stale-binary traps, out-of-tree `~/bombo-build`).

## Architecture

drawdio becomes the single home for the whole bridge ecosystem:

```
drawdio/
  tools/bridge/server.mjs          # JS bridge — already generic (BRIDGE_TARGET)
  src/lib/sync/bridge.svelte.ts    # drawdio WS client — generic
  src/lib/io/flatManifest.ts       # protocol mapping — generic except NS_COLORS
  adapters/
    juce/
      drawdio_layout/              # NEW — JUCE module, extracted from squelch_pro
        drawdio_layout.h           # juce_add_module declaration block
        LayoutManager.{h,cpp}      # de-namespaced (drawdio::), parameterized
        LayoutEditOverlay.{h,cpp}  # de-coupled from FaceplatePanel
        README.md                  # 3-terminal workflow + CMake snippet
    (later) egui/                  # SP-2 placeholder
  PROTOCOL.md                      # NEW — formal wire contract
```

### Protocol (formalized from what already ships)

- **Manifest file** (`<name>.json`):
  `{ "<ns>": { "<id>": { x, y, w, h, locked?, type? } } }`. Namespaced dotted ids
  (e.g. `faceplate.tuningKnob`). `type` is an optional drawdio component-type hint
  the plugin owns; unknown/missing types fall back to `panel_group`. Round-trip is
  **bounds + lock + type-passthrough** only.
- **Backdrop** (`<name>.png`, sibling of the manifest): faceplate snapshot,
  auto-loaded by drawdio as a 1:1 reference image (W/H read from the PNG header).
- **Transport:** WebSocket `ws://localhost:7878` (`BRIDGE_PORT` override). The
  bridge watches the JSON + PNG, broadcasts changes, writes client manifests back,
  with SHA-based echo suppression.
- **Env contract:** `BRIDGE_TARGET` = manifest path (bridge side); a plugin-side
  edit-mode gate env var (configurable per plugin, see below).

## Part 2 — drawdio-side neutralization (verified on WSL)

Small, web-only, testable with `npm run dev`:

1. **`src/lib/io/flatManifest.ts` — `NS_COLORS`:** replace the hardcoded
   `faceplate`/`fx`/`label` map with a deterministic `nsColor(ns)` that hashes the
   namespace string to a stable hue (HSL → hex). Any plugin's namespaces get
   distinct, consistent tints; no plugin name baked in. SquelchPro's panels simply
   receive auto-assigned colors (cosmetic, affects only newly-created rects — the
   manifest carries no color, so existing layouts are unaffected).
2. **`tools/bridge/server.mjs`:** drop the vestigial `SQUELCH_LAYOUT` env fallback;
   `BRIDGE_TARGET` (already used by the workflow) is the neutral name. Keep
   `process.argv[2]` and `./Layout.json` fallbacks.
3. No change to `bridge.svelte.ts` / `launchCommand()` — already generic.

**WSL acceptance:** load a manifest with arbitrary namespaces (e.g. `osc.tune`,
`amp.gain`) via the bridge; each namespace renders a distinct stable color; an
existing SquelchPro manifest still round-trips unchanged.

## Part 3 — reusable JUCE module + adoption (written here, verified on geek)

### 3a. Extract `drawdio_layout` module (from squelch_pro)

- **`LayoutManager.{h,cpp}`:** rename `squelch::` → `drawdio::`. The env override
  name and the dev-path fallback become **constructor parameters**
  (`LayoutManager(juce::String envVarName, juce::File defaultManifest)`) instead of
  hardcoded `$SQUELCH_LAYOUT_JSON` / `Resources/Layout.json`. All other behavior
  (dotted-id `boundsOr`, `setBounds`, lock get/set, `save`, fallback-when-absent)
  is already generic and unchanged.
- **`LayoutEditOverlay.{h,cpp}`:** cut the concrete `FaceplatePanel&` dependency.
  - Define a **module-owned** struct `drawdio::LayoutElem { juce::String id;
    juce::Rectangle<int> bounds; juce::String type; bool locked; }` (today nested
    in `FaceplatePanel`).
  - The overlay takes all elements through `std::function` registration — the same
    mechanism it already uses for the FX source (`setExtraSource`) — generalized to
    a primary `setElementSource(get, reload)`. No concrete panel type referenced.
  - Keep snapping, multi-select, undo/redo (`kUndoCap`), lock UI, and the
    `onDumpScreenshot` hook unchanged.
- **`drawdio_layout.h`:** JUCE module declaration block
  (`BEGIN_JUCE_MODULE_DECLARATION` … `END_JUCE_MODULE_DECLARATION`) so
  `juce_add_module(${DRAWDIO_ADAPTERS_DIR}/juce/drawdio_layout)` works.
- **`README.md`:** 3-terminal workflow + CMake snippet + `DRAWDIO_ADAPTERS_DIR`
  convention (env-overridable cache var, default search incl. `~/repos/drawdio`).

### 3b. Rewire SquelchPro onto the module (regression baseline)

- Replace `squelch::Layout*` usages with `drawdio::Layout*`.
- Feed `FaceplatePanel` / `FxPanel` element lists into the generic
  `setElementSource` / extra-source callbacks.
- Construct `LayoutManager("SQUELCH_LAYOUT_JSON", <repo>/Resources/Layout.json)` so
  SquelchPro's existing env var and path keep working — **no behavior change.**
- Acceptance: SquelchPro layout-edit + drawdio round-trip behaves exactly as before.

### 3c. Adopt in Bombo (genericity proof — additive only)

- CMake: `juce_add_module(${DRAWDIO_ADAPTERS_DIR}/juce/drawdio_layout)`, link it.
- Instantiate `LayoutManager("BOMBO_LAYOUT_JSON", <repo>/Resources/Layout.json)`.
- Wire Bombo's faceplate controls' `resized()` through `boundsOr(id, fallback)` —
  fallbacks are Bombo's **current** hardcoded bounds, so with no JSON the layout is
  identical to today.
- Add an edit-mode toggle (gated behind `BOMBO_LAYOUT_EDIT` env + a key chord) and
  the `onDumpScreenshot` hook; register controls with the overlay.
- **Bombo safety acceptance (mandatory):** with `BOMBO_LAYOUT_EDIT` unset and no
  `Resources/Layout.json` present, the Bombo build, UI, and audio path are
  unchanged from `main`. The edit overlay and manifest loading are fully inert.

## Verification plan

| Item | Where | Check |
|------|-------|-------|
| Part 2 namespace colors | WSL `npm run dev` | arbitrary namespaces → distinct stable colors |
| Part 2 back-compat | WSL | existing SquelchPro manifest round-trips unchanged |
| 3b SquelchPro regression | geek build | edit mode + round-trip identical to pre-extraction |
| 3c Bombo additive | geek build | no-manifest + edit-off ⇒ identical UI/audio to `main` |
| 3c Bombo round-trip | geek build | dump → drawdio renders backdrop+typed → drag → `Ctrl+R` moves controls, with **zero** drawdio-side edits |

## Risks & open items

- **Bombo regression risk** — mitigated by additive-only + env-gated + fallback
  design; the no-op acceptance test is the gate.
- **`DRAWDIO_ADAPTERS_DIR` path resolution** across machines — documented per-machine
  one-time set; geek's uniform `~/repos` makes it trivial.
- **Pre-existing:** `feature/squelchpro-bridge` is unmerged to `main` (6 generic
  commits ahead, 0 behind). SP-1 branches off it; merge ordering to be resolved at
  integration time, not in SP-1.
- **Module `juce::Font` deprecation warnings** carried over from
  `LayoutEditOverlay.cpp` — cosmetic; optionally swept to `FontOptions` during
  extraction.
