# Drawdio

Drag-and-drop mockup tool for audio plugin UIs. Design knobs, faders, meters, sequencers, and more — then export as PNG, SVG, or JSON for implementation in JUCE, nih-plug, iPlug2, or any framework.

## Quick start

```bash
nvm use 22
npm install
npm run dev   # http://localhost:5173
```

Or open `drawdio.html` in any modern browser for the original single-file version.

## Features

- **Component palette** — rotary knobs, faders, buttons, toggles, dropdowns, XY pads, meters, step sequencer, spectrum analyzer, and more
- **Drag to canvas** — drag from palette or click to enter place-mode, then click on canvas
- **Rotation** — drag the rotation handle above any selected component; hold Shift to snap; `[` / `]` to rotate by step, Shift+`[`/`]` for ±45°; configure step in toolbar (∠)
- **Proportional resize** — drag any corner handle; hold Shift to lock aspect ratio
- **Ctrl+drag** — duplicate components by holding Ctrl while dragging
- **Snap-to-grid** — configurable grid with optional free placement (hold Alt)
- **Properties panel** — edit position, size, rotation, color, and type-specific parameters
- **Canvas presets** — Full Synth (900×600), Compact Effect (400×300), Channel Strip (200×500), and custom sizes
- **Export** — PNG (1×/2×/3×/transparent), SVG, JSON layout with full component data
- **Effects** — drop shadow, inner shadow, glow, bevel, gloss, texture fills, gradients
- **Layers panel** — z-order control with visibility toggles
- **Undo/Redo** — full snapshot history (Ctrl+Z / Ctrl+Shift+Z)
- **Save/Load** — `.drawdio.json` files; autosave to localStorage
- **Keyboard shortcuts** — see below

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+X` | Copy / Paste / Cut |
| `Ctrl+D` | Duplicate (offset by grid step) |
| `Ctrl+drag` | Duplicate in-place and move copy |
| `Ctrl+A` | Select all |
| `Delete` / `Backspace` | Delete selection |
| `[` / `]` | Rotate by step (default 15°) |
| `Shift+[` / `Shift+]` | Rotate by ±45° |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / Ungroup |
| `Ctrl+]` / `Ctrl+[` | Bring forward / Send backward |
| `Ctrl+Shift+]` / `Ctrl+Shift+[` | Bring to front / Send to back |
| `Ctrl+S` | Save |
| `Ctrl+O` | Open |
| `Ctrl+E` / `Ctrl+Shift+E` | Export PNG / SVG |
| `G` | Toggle grid |
| `+` / `-` | Zoom in / out |
| `Ctrl+0` | Reset zoom |
| `Space+drag` or middle-click drag | Pan |
| `Escape` | Clear selection / cancel placement |

## Usage with AI

Export your mockup as PNG (screenshot) or JSON (structured layout), then share it with Claude, ChatGPT, or any AI assistant to guide plugin UI implementation. The JSON format includes exact positions, sizes, types, rotation, and properties for every component.

## License

MIT — use it however you want, including commercially.
