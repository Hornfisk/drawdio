#!/usr/bin/env node
// Drawdio ↔ flat-manifest JSON bridge.
// Watches a target JSON file and broadcasts changes to WS clients; writes
// client-sent manifests back to the file. Echo-suppression via content hash.

import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const LAYOUT = path.resolve(process.env.SQUELCH_LAYOUT || process.argv[2] || './Layout.json');
const PORT = Number(process.env.BRIDGE_PORT || 7878);

function sha(s) { return crypto.createHash('sha1').update(s).digest('hex'); }

// Hash of the last bytes we wrote; watcher ignores the matching change event.
let lastWriteHash = '';

async function readText() {
  try { return await fs.readFile(LAYOUT, 'utf8'); }
  catch { return '{}'; }
}

function broadcast(wss, payload, except) {
  const raw = JSON.stringify(payload);
  for (const c of wss.clients) {
    if (c === except) continue;
    if (c.readyState === 1) c.send(raw);
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', async (ws) => {
  console.log('[bridge] client connected');
  const txt = await readText();
  let json;
  try { json = JSON.parse(txt); } catch { json = {}; }
  ws.send(JSON.stringify({ type: 'manifest', nonce: 'init', json, file: LAYOUT }));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type !== 'manifest' || !msg.json) return;
    const out = JSON.stringify(msg.json, null, 2) + '\n';
    lastWriteHash = sha(out);
    try {
      await fs.writeFile(LAYOUT, out);
      console.log(`[bridge] wrote ${LAYOUT} (nonce=${msg.nonce})`);
    } catch (e) {
      console.error('[bridge] write failed', e.message);
      return;
    }
    broadcast(wss, msg, ws);
  });

  ws.on('close', () => console.log('[bridge] client disconnected'));
});

const watcher = chokidar.watch(LAYOUT, { ignoreInitial: true });
watcher.on('all', async (event) => {
  if (event !== 'change' && event !== 'add') return;
  const txt = await readText();
  const h = sha(txt);
  if (h === lastWriteHash) return; // our own write
  lastWriteHash = h;
  let json;
  try { json = JSON.parse(txt); }
  catch (e) { console.error('[bridge] invalid JSON, skipping broadcast'); return; }
  const payload = { type: 'manifest', nonce: h.slice(0, 8), json };
  broadcast(wss, payload, null);
  console.log(`[bridge] file change → broadcast (nonce=${payload.nonce})`);
});

console.log(`[bridge] watching ${LAYOUT}`);
console.log(`[bridge] listening ws://localhost:${PORT}`);
