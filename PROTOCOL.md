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
  `json` is a JSON object (not a serialized string); only the outer WS frame is stringified.
  `nonce` is an opaque token set by the sender: the drawdio client uses a short random string
  (`Math.random().toString(36)`); the server uses `"init"` on connect and an 8-char SHA1 slice
  on file-change broadcasts. A receiver that sees a `nonce` equal to the one it last sent
  discards the message — this is how each side ignores its own change coming back.
  `file` (the manifest path the server is watching) is included only on the initial
  connect message; subsequent file-change broadcasts omit it. Clients need not send `file`.
- `{ type: "backdrop", dataUrl, width, height, file }` — server → client only.

## Host responsibilities

A host adapter must: (1) write the manifest with stable dotted ids, (2) read
positions back via the manifest as **overrides on top of code fallbacks** (so the
host runs unchanged with no manifest), and (3) optionally dump the backdrop PNG.
See `adapters/juce/drawdio_layout/README.md` for the JUCE reference adapter.
