# Flat Manifest Schema

A minimal JSON shape for positioning named rectangles. Designed so drawdio can be used as a WYSIWYG layout editor for plugins (JUCE, nih-plug, etc.) whose UI code reads element bounds from a JSON file.

## Shape

```json
{
  "<namespace>": {
    "<id>": { "x": 0, "y": 0, "w": 0, "h": 0, "locked": false }
  }
}
```

- **Top-level keys** are arbitrary namespaces (e.g., `faceplate`, `fx`, `label`). drawdio treats them as opaque strings.
- **Second-level keys** are element ids within that namespace.
- Each leaf object carries:
  - `x`, `y`, `w`, `h` — integer pixels, required.
  - `locked` — optional boolean. Default `false`. Locked elements are not draggable/resizable in drawdio and are skipped by bulk-move operations.

Unknown fields on leaves are preserved round-trip if the consumer extends the schema. Drawdio writes only the four standard fields plus `locked`.

## Dotted ids

When drawdio maps a manifest entry to one of its internal components, it uses `<namespace>.<id>` as the component's id (e.g., `faceplate.tuningKnob`). This lets drawdio host multiple namespaces in one canvas without collision.

## Coordinate space

Pixel coordinates in the target application's canvas. Drawdio does not interpret them — whatever space the producer writes, the consumer reads back. For SquelchPro this is the 780×220 faceplate region.

## Round-trip contract

- **Import**: drawdio reads the manifest, creates/updates one `panel_group` rect per entry with id `<ns>.<id>`, width/height from `w`/`h`, position from `x`/`y`, `locked` flag applied.
- **Export**: drawdio walks components with ids matching `<ns>.<id>` (where `<ns>` is one of the top-level namespaces present in the source manifest, or a configured allow-list) and emits `{x, y, w, h, locked}` for each.
- Components whose ids don't fit the pattern stay in drawdio's native save file (`.drawdio.json`) and are not exported to the flat manifest.

## WebSocket wire format (bridge)

```json
{ "type": "manifest", "nonce": "<short-string>", "json": { ... } }
```

- `nonce` — any short string; producers use it to suppress echoes (if the client receives a manifest whose nonce matches one it just sent, ignore).

## Example

```json
{
  "faceplate": {
    "tuningKnob": { "x": 334, "y": 42, "w": 48, "h": 52 },
    "cutoffKnob": { "x": 391, "y": 40, "w": 48, "h": 52, "locked": true }
  },
  "label": {
    "brandTitle": { "x": 624, "y": 40, "w": 140, "h": 20 }
  }
}
```
