// Drawdio-side client for the flat-manifest WebSocket bridge.
// GUI-driven: connect/disconnect toggle, URL is user-editable, settings persist
// in localStorage. The `?bridge=1` URL parameter still auto-connects for the
// power-user flow.

import { appState } from '../state/app.svelte.js';
import { toFlatManifest, applyFlatManifest, type FlatManifest } from '../io/flatManifest.js';

const STORAGE_KEY = 'drawdio.bridge.settings.v1';
const DEFAULT_URL = 'ws://localhost:7878';

interface PersistedSettings {
  url: string;
  autoConnect: boolean;
  layoutPath: string;  // remembered for the launch-command helper
}

function loadPersisted(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        url: typeof obj.url === 'string' ? obj.url : DEFAULT_URL,
        autoConnect: !!obj.autoConnect,
        layoutPath: typeof obj.layoutPath === 'string' ? obj.layoutPath : '',
      };
    }
  } catch { /* noop */ }
  return { url: DEFAULT_URL, autoConnect: false, layoutPath: '' };
}

const initial = loadPersisted();

export const bridgeState = $state({
  url: initial.url,
  autoConnect: initial.autoConnect,
  layoutPath: initial.layoutPath,   // what the user expects / last used for the command helper
  targetFile: null as string | null, // what the server reports it's watching
  connected: false,
  connecting: false,
  lastError: null as string | null,
  lastSent: null as string | null,
  lastApplied: null as string | null,
  // True once the user has touched bridge settings; dims/brightens onboarding hints.
  firstRun: initial.layoutPath === '' && !initial.autoConnect,
});

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      url: bridgeState.url,
      autoConnect: bridgeState.autoConnect,
      layoutPath: bridgeState.layoutPath,
    } satisfies PersistedSettings));
  } catch { /* noop */ }
}

export function setUrl(url: string) { bridgeState.url = url || DEFAULT_URL; persist(); }
export function setAutoConnect(on: boolean) { bridgeState.autoConnect = on; persist(); }
export function setLayoutPath(p: string) { bridgeState.layoutPath = p; bridgeState.firstRun = false; persist(); }

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let outgoingTimer: number | null = null;
let explicitDisconnect = false;
// Serialized flat-manifest we last synchronized (either received or sent).
// Echo-suppression: emit only when current state diverges from this baseline.
let lastSerialized = '';
let effectsStarted = false;

function nonce(): string {
  return Math.random().toString(36).slice(2, 10);
}

function scheduleReconnect() {
  if (reconnectTimer != null || explicitDisconnect) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, 1500);
}

function openSocket() {
  if (ws) return;
  bridgeState.connecting = true;
  try {
    ws = new WebSocket(bridgeState.url);
  } catch (e) {
    bridgeState.lastError = String(e);
    bridgeState.connecting = false;
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    bridgeState.connected = true;
    bridgeState.connecting = false;
    bridgeState.lastError = null;
  };
  ws.onclose = () => {
    bridgeState.connected = false;
    bridgeState.connecting = false;
    bridgeState.targetFile = null;
    ws = null;
    if (!explicitDisconnect) scheduleReconnect();
  };
  ws.onerror = () => {
    bridgeState.lastError = 'connection error';
  };
  ws.onmessage = (ev) => {
    let msg: {
      type?: string; nonce?: string; json?: FlatManifest; file?: string;
      dataUrl?: string; width?: number; height?: number;
    };
    try { msg = JSON.parse(ev.data); } catch { return; }

    // Backdrop message: plugin dumped a PNG alongside Layout.json. Load it as
    // the reference image and resize the canvas so drawdio is a 1:1 preview.
    if (msg.type === 'backdrop' && msg.dataUrl) {
      appState.refImageDataUrl = msg.dataUrl;
      appState.refImageVisible = true;
      appState.refImageOffsetX = 0;
      appState.refImageOffsetY = 0;
      if (msg.width)  appState.canvasWidth  = msg.width;
      if (msg.height) appState.canvasHeight = msg.height;
      return;
    }

    if (msg.type !== 'manifest' || !msg.json) return;
    if (msg.file && !bridgeState.targetFile) bridgeState.targetFile = msg.file;
    if (msg.nonce && msg.nonce === bridgeState.lastSent) return; // echo
    applyFlatManifest(msg.json);
    lastSerialized = JSON.stringify(toFlatManifest());
    bridgeState.lastApplied = msg.nonce ?? null;
  };
}

function scheduleEmit() {
  if (outgoingTimer != null) return;
  outgoingTimer = window.setTimeout(() => {
    outgoingTimer = null;
    emitNow();
  }, 200);
}

function emitNow() {
  if (!ws || ws.readyState !== 1) return;
  const flat = toFlatManifest();
  const serialized = JSON.stringify(flat);
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;
  const n = nonce();
  bridgeState.lastSent = n;
  ws.send(JSON.stringify({ type: 'manifest', nonce: n, json: flat }));
}

function startEffectsOnce() {
  if (effectsStarted) return;
  effectsStarted = true;
  $effect.root(() => {
    $effect(() => {
      for (const c of appState.components) {
        void c.id; void c.x; void c.y; void c.width; void c.height; void c.locked;
      }
      if (!ws) return;
      scheduleEmit();
    });
  });
}

export function connect(): void {
  explicitDisconnect = false;
  startEffectsOnce();
  openSocket();
}

export function disconnect(): void {
  explicitDisconnect = true;
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try { ws.close(); } catch { /* noop */ }
    ws = null;
  }
  bridgeState.connected = false;
  bridgeState.connecting = false;
  bridgeState.targetFile = null;
}

export function toggleConnect(): void {
  if (bridgeState.connected || bridgeState.connecting) disconnect();
  else connect();
}

/** Called once on App mount. Honours auto-connect setting and the legacy
 *  ?bridge=1 URL parameter. Safe to call multiple times. */
export function initBridge(): void {
  const urlParam = (() => {
    try { return new URL(window.location.href).searchParams.get('bridge') === '1'; }
    catch { return false; }
  })();
  if (bridgeState.autoConnect || urlParam) connect();
}

/** Convenience: the shell command a user should paste into a terminal.
 *  Returns null when no target path has been entered, so the UI can disable
 *  the copy button instead of handing out a broken command. */
export function launchCommand(): string | null {
  const path = bridgeState.layoutPath.trim();
  if (!path) return null;
  // Quote so paths with spaces survive copy/paste.
  return `BRIDGE_TARGET='${path.replace(/'/g, `'\\''`)}' npm run bridge`;
}
