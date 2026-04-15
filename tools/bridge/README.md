# drawdio bridge

Tiny WebSocket relay between drawdio and a flat-manifest JSON file. Lets drawdio act as a live layout editor for any app that reads element bounds from JSON on disk.

## Install (once)

```
npm run bridge:install
```
(run from the drawdio repo root — installs `ws` and `chokidar` into `tools/bridge/node_modules`).

## Run

From the drawdio repo root:

```
SQUELCH_LAYOUT=/path/to/Layout.json npm run bridge
```

Or invoke the script directly with a positional arg:

```
node tools/bridge/server.mjs /path/to/Layout.json
```

Then, in drawdio's toolbar → ☰ → **Bridge** → **Connect**. Paste the same path into the "Target file" field for the launch-command helper.

Env vars:
- `SQUELCH_LAYOUT` — absolute path to the JSON file to sync. Default `./Layout.json`.
- `BRIDGE_PORT` — WS port. Default `7878`.

The server prints:
```
[bridge] watching /path/to/Layout.json
[bridge] listening ws://localhost:7878
```

## Protocol

Single message shape:

```json
{ "type": "manifest", "nonce": "<short>", "json": { ... } }
```

- On client connect the server immediately sends the current file contents with `nonce: "init"`.
- When a client sends a manifest, the server writes it to disk (pretty-printed, 2-space indent, trailing newline) and broadcasts to the other clients.
- When the file changes on disk (outside the bridge), the server broadcasts to all clients. Echoes of our own writes are suppressed via SHA-1 content hashing.

## Pairing with drawdio

Toolbar → ☰ → **Bridge** → **Connect**. A green pill bottom-right confirms the link; the panel shows which file is being edited. Tick **Auto-connect on startup** so drawdio reconnects on reload. (The old `?bridge=1` URL parameter still works as a one-off override.)

Dragging rects in drawdio writes the target file within ~200 ms; editing the file externally (vim, the plugin) pushes the change back to drawdio live.

## Pairing with a plugin

The plugin just needs to read the JSON on demand. For SquelchPro: press **Ctrl+R** in the plugin to reload after a drawdio edit.
