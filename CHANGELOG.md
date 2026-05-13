# Changelog

## [Unreleased]

### Added — Hyperfocus DSP Brand + Workspaces + Multi-select Polish

#### Brand re-skin
- **Hyperfocus DSP palette** pulled from `hyperfocusdsp/hyperfocus@origin/main:src/styles/global.css`. Sixteen-token system rewritten to graphite (#0E0F12), slate-surface (#2A2D33), bone (#F4F1EA), amber (#FFB800), muted (#8E93A0) in dark theme; inverted bone-on-graphite for light. Logo gets an amber dot before the wordmark instead of tinting the text. Default canvas background bumped to graphite. WCAG AA holds across all token pairings; amber-on-graphite hits 13:1.
- **Accent presets** reordered with **Amber** first; **Bone** replaces "White". Swatch defaults switched from rainbow to a brand-aligned plugin-design palette (amber, bone, muted, slate, graphite + meter green/red + scope cyan).
- **Accent + theme persistence** — both saved to `localStorage` (`drawdio_accent`, `drawdio_theme`) so picks survive reloads.
- Fixed an undefined `--surface-hover` CSS variable that left palette hover backgrounds invisible.

#### Workspaces (frames)
- **Multiple workspaces per project** — each project can host any number of independent canvas frames laid out side-by-side in world space. Switch by clicking another frame's header or background; move a whole frame by dragging its header.
- **Frame management** — `+ New`, `Duplicate`, rename (✎ or double-click the header label on canvas), delete (×, hidden on the last remaining frame). Lives in the right-panel `Workspaces` section + right-click on empty canvas → `New Workspace Here`.
- **Frame-level Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+D / Delete** — clicking a workspace header marks it as "selected as an entity"; clipboard ops act on the whole frame instead of components. A `(paste)` suffix marks pasted frames.
- **Ctrl/Alt-drag header to copy-drag** — duplicates the frame at the original's position, then drags the copy to the new location in one gesture.
- **Workspace dimensions editable two ways** — drag the 8 handles around the active frame (top/left handles now move the frame origin so the edge stays under the cursor), or edit `W` / `H` in the right-panel Canvas section.
- **Auto-pan** — creating, duplicating, or switching to a workspace that isn't already visible scrolls the viewBox to bring it on screen. Fresh-project's first workspace anchors top-left of viewport.
- **Project file format v2** — workspaces array at top level. Old v1 files load by wrapping the canvas + components into a single workspace.

#### Snap, grid, selection
- **Visible snap guides** — thin amber lines spanning the canvas appear during drag/resize whenever alignment snap fires. Uses `vector-effect="non-scaling-stroke"` for crisp 1px lines at any zoom. Cleared on mouseup. Alt during drag disables snap and hides guides.
- **Grid density presets** — `F | M | C` segmented control next to the Grid toggle. Maps to 16 / 32 / 64 px (32 mirrors hyperfocusdsp.com's body grid). Real `gridSize` persisted in `.drawdio.json`; old files infer density from their saved size.
- **Zoom-aware grid LOD** — visible grid spacing auto-doubles when a cell would render below 8 screen pixels, so the grid stays useful when you zoom out. Snap target stays at the real grid size.
- **Brand-aligned grid pattern** — crossed 1px slate-surface lines instead of the old single-dot pattern; mirrors the hyperfocusdsp.com body grid aesthetic, and stays visible under Chromium's Force Dark Mode (`color-scheme: dark` defended).
- **Multi-select union bbox + proportional resize** — 2+ components show a single bounding box with 8 handles; dragging any handle scales every selected component proportionally relative to the bbox. Shift on corners locks aspect ratio. Per-component faint outlines stay visible so you can see what's in the selection.
- **Multi-select property editing** — Properties panel fans every edit across the selection. Common values shown; mixed values render as `—` placeholder or "Mixed" hint. Type-specific Parameters appear only when all selected share a type.
- **Lock/unlock** — `Ctrl+L`, context-menu entry, and a lock badge rendered on locked components in canvas. Locked items can be selected (so you can unlock) but skip drag/resize/rotate handles.
- **Rubber-band-anywhere** — components that drift outside their workspace's rect (after shrink-resize, paste-offset, etc.) are now reachable via box-select. The SVG now fills the canvas container (`width="100%" height="100%"` with `preserveAspectRatio="xMidYMid meet"`) so events fire across the whole visible area, not just the active workspace's pixel bbox.

#### Groups
- **Nested groups** — `Group.parent: string | null` added; `children` may hold component IDs or sub-group IDs. `createGroup` promotes selected items to their top-level ancestor, so grouping items that are already grouped nests the existing groups instead of flattening them.
- **One level per ungroup** — `Ctrl+Shift+G` collapses exactly one nesting level (sub-groups stay intact). Repeat to flatten further. Fixes a bug where iteration after ungrouping a parent dissolved its children too.
- **Group-preserving copy / paste / duplicate** — clipboard captures every group whose entire descendant tree is in the selection; paste regenerates fresh IDs for both components and groups and remaps `children`/`parent` references so structure survives the round-trip. `Ctrl+drag` to duplicate keeps group membership.
- **Orphan-group cleanup** — deletes and cuts now prune empty group records and trim dangling child references recursively.

#### Multi-color components
- `editableProperties` with `type: 'color'` now actually renders a ColorField in the Properties panel (was previously falling through to a text input). Same for `type: 'range'`.
- **Step Seq (grid)** exposes `Active`, `BG`, `Inactive` color slots.
- **Step Seq (acid)** exposes `Accent`, `Slide`, `Rest` (replaces hardcoded `#c42a2a` / `#f0dc3c` / `#d6d6da`).
- **Level Meter** exposes `Low`, `Mid`, `High` (replaces hardcoded `--meter-green/yellow/red`).
- **MIDI Keyboard** — `Ports` is now a Front / Back / None dropdown (None hides the `⊕` glyph entirely), and a `C labels` checkbox toggles the octave markers.

#### Shortcuts
- **Ctrl+Y** as a redo alternative (alongside Ctrl+Shift+Z).
- **Ctrl+L** to lock/unlock the selection (matches the right-click menu entry).
- **Ctrl+N** for new project (mirrors ☰ → File → New).

### Fixed
- **Workspace resize ran away in one direction** when a user adjusted the canvas size manually then dragged a handle. Resize math switched from world deltas (which fed back as the viewBox grew with the workspace) to screen-pixel deltas multiplied by the world-per-pixel ratio captured at drag-start.
- **New project showed a blank canvas** — `newProject()` now resets zoom and pan, and `ensureWorkspace` re-anchors the viewBox to the freshly created workspace.
- **Drag from palette landed in the wrong place** with non-zero workspace offsets. Drop now converts the world point to the destination workspace's local coords (and switches active to the drop target).
- **Components outside the active workspace rect were unclickable** — hit-test now runs before the workspace-bg check, so components remain reachable regardless of where they drift.
- **Grid invisible under Force Dark Mode** (`--border-muted` was ~1.2:1 against graphite); now uses `--border` (slate-surface) at ~1.5:1 via crossed-line pattern.

### Changed
- Default canvas dimensions stay at 900×600 but default `bgColor` is now `#0E0F12` (graphite) instead of `#1a1a1a`.
- Default grid size moved from 20 px to 32 px (matches brand grid). Existing files keep their saved grid size; only the density toggle indicator infers based on proximity to presets.
- Selection-handle accent colours sync to the chosen accent (default amber).
- `<svg>` element fills the canvas container so the viewBox can pan/zoom over the full multi-workspace world.

---

## [Previous Unreleased — Flat-Manifest Bridge]

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
