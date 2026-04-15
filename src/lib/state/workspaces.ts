import { appState, type Workspace } from './app.svelte.js';
import { clearSelection } from './selection.js';
import { clearHistory } from './history.js';

/**
 * Workspace (frame) management — see `Workspace` doc in app.svelte.ts.
 *
 * Active-workspace data lives in the top-level appState fields. Non-active
 * workspaces hold full snapshots in `appState.workspaces`. Switching = write
 * appState back into outgoing slot + load incoming slot into appState.
 */

function newId(): string {
  return 'workspace_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Read the current top-level appState into the given workspace snapshot. */
function snapshotInto(ws: Workspace): void {
  // x and y are workspace-frame metadata, not part of appState — preserved as-is.
  ws.canvasWidth = appState.canvasWidth;
  ws.canvasHeight = appState.canvasHeight;
  ws.bgColor = appState.bgColor;
  ws.gridSize = appState.gridSize;
  ws.gridDensity = appState.gridDensity;
  ws.gridVisible = appState.gridVisible;
  ws.refImageDataUrl = appState.refImageDataUrl;
  ws.refImageOpacity = appState.refImageOpacity;
  ws.refImageVisible = appState.refImageVisible;
  ws.refImageOffsetX = appState.refImageOffsetX;
  ws.refImageOffsetY = appState.refImageOffsetY;
  ws.components = deepClone(appState.components);
  ws.groups = deepClone(appState.groups);
  ws.nextId = appState.nextId;
}

/** Apply a workspace snapshot to the top-level appState. */
function loadFrom(ws: Workspace): void {
  appState.canvasWidth = ws.canvasWidth;
  appState.canvasHeight = ws.canvasHeight;
  appState.bgColor = ws.bgColor;
  appState.gridSize = ws.gridSize;
  appState.gridDensity = ws.gridDensity;
  appState.gridVisible = ws.gridVisible;
  appState.refImageDataUrl = ws.refImageDataUrl;
  appState.refImageOpacity = ws.refImageOpacity;
  appState.refImageVisible = ws.refImageVisible;
  appState.refImageOffsetX = ws.refImageOffsetX;
  appState.refImageOffsetY = ws.refImageOffsetY;
  appState.components.length = 0;
  for (const c of deepClone(ws.components)) appState.components.push(c);
  appState.groups.length = 0;
  for (const g of deepClone(ws.groups)) appState.groups.push(g);
  appState.nextId = ws.nextId;
  clearSelection();
  clearHistory();
}

function makeFromAppState(name: string): Workspace {
  return {
    id: newId(),
    name,
    x: 0,
    y: 0,
    canvasWidth: appState.canvasWidth,
    canvasHeight: appState.canvasHeight,
    bgColor: appState.bgColor,
    gridSize: appState.gridSize,
    gridDensity: appState.gridDensity,
    gridVisible: appState.gridVisible,
    refImageDataUrl: appState.refImageDataUrl,
    refImageOpacity: appState.refImageOpacity,
    refImageVisible: appState.refImageVisible,
    refImageOffsetX: appState.refImageOffsetX,
    refImageOffsetY: appState.refImageOffsetY,
    components: deepClone(appState.components),
    groups: deepClone(appState.groups),
    nextId: appState.nextId,
  };
}

function nextFramePosition(): { x: number; y: number } {
  // Place new frames to the right of the rightmost existing frame with a 60px gap,
  // matching the y of that anchor so they line up horizontally by default.
  if (appState.workspaces.length === 0) return { x: 0, y: 0 };
  let rightmost = appState.workspaces[0];
  for (const w of appState.workspaces) {
    if (w.x + w.canvasWidth > rightmost.x + rightmost.canvasWidth) rightmost = w;
  }
  return { x: rightmost.x + rightmost.canvasWidth + 60, y: rightmost.y };
}

/**
 * Pan the viewBox so the given workspace is comfortably inside the viewport.
 * Without this, a freshly created frame to the right of existing ones is
 * off-screen and the user sees a blank canvas.
 */
function panViewToWorkspace(ws: Workspace): void {
  // viewBox = (panX, panY, canvasW/zoom, canvasH/zoom). Centre the new frame in it.
  const viewW = appState.canvasWidth / Math.max(0.01, appState.zoom);
  const viewH = appState.canvasHeight / Math.max(0.01, appState.zoom);
  appState.panX = Math.round(ws.x + ws.canvasWidth / 2 - viewW / 2);
  appState.panY = Math.round(ws.y + ws.canvasHeight / 2 - viewH / 2);
}

/**
 * Anchor the workspace to the top-left of the viewport with a small margin —
 * used for the initial workspace of a new project so the layout matches the
 * "fresh canvas" intuition (work flows top-down, left-right).
 */
function panViewToWorkspaceTopLeft(ws: Workspace): void {
  // 40px world margin on the left, 50px on top — leaves room for the header label
  // (which sits at y=-22 above the workspace) plus some breathing room.
  appState.panX = Math.round(ws.x - 40);
  appState.panY = Math.round(ws.y - 50);
}

function makeBlank(name: string): Workspace {
  const pos = nextFramePosition();
  return {
    id: newId(),
    name,
    x: pos.x,
    y: pos.y,
    canvasWidth: 900,
    canvasHeight: 600,
    bgColor: '#0E0F12',
    gridSize: 32,
    gridDensity: 'medium',
    gridVisible: true,
    refImageDataUrl: null,
    refImageOpacity: 0.5,
    refImageVisible: true,
    refImageOffsetX: 0,
    refImageOffsetY: 0,
    components: [],
    groups: [],
    nextId: 1,
  };
}

export function getActiveWorkspace(): Workspace | undefined {
  return appState.workspaces.find(w => w.id === appState.activeWorkspaceId);
}

/**
 * Ensure at least one workspace exists. Called once during app init *and* after
 * newProject() wipes the workspaces array. Also re-aligns the viewBox so the
 * default workspace is visible — otherwise a stale panX/panY from the previous
 * project can leave the new workspace off-screen and the canvas looks empty.
 */
export function ensureWorkspace(): void {
  if (appState.workspaces.length === 0) {
    const ws = makeFromAppState('Workspace 1');
    appState.workspaces.push(ws);
    appState.activeWorkspaceId = ws.id;
    // First workspace ever — anchor to top-left of viewport (most natural for
    // a fresh project; matches users' intuition of "starting from the corner").
    panViewToWorkspaceTopLeft(ws);
    return;
  }
  if (!appState.activeWorkspaceId || !getActiveWorkspace()) {
    appState.activeWorkspaceId = appState.workspaces[0].id;
    loadFrom(appState.workspaces[0]);
    panViewToWorkspaceTopLeft(appState.workspaces[0]);
  }
}

export function switchWorkspace(id: string): void {
  if (id === appState.activeWorkspaceId) return;
  const current = getActiveWorkspace();
  if (current) snapshotInto(current);
  const next = appState.workspaces.find(w => w.id === id);
  if (!next) return;
  appState.activeWorkspaceId = id;
  loadFrom(next);
  // If the next workspace lies outside the current viewport, pan to it so the
  // user actually sees where they switched to.
  const viewW = appState.canvasWidth / Math.max(0.01, appState.zoom);
  const viewH = appState.canvasHeight / Math.max(0.01, appState.zoom);
  const visibleL = appState.panX, visibleR = visibleL + viewW;
  const visibleT = appState.panY, visibleB = visibleT + viewH;
  const wsL = next.x, wsR = next.x + next.canvasWidth;
  const wsT = next.y, wsB = next.y + next.canvasHeight;
  const overlapsX = wsR > visibleL && wsL < visibleR;
  const overlapsY = wsB > visibleT && wsT < visibleB;
  if (!(overlapsX && overlapsY)) panViewToWorkspace(next);
}

export function createWorkspace(opts?: { x?: number; y?: number }): Workspace {
  const current = getActiveWorkspace();
  if (current) snapshotInto(current);
  const ws = makeBlank(`Workspace ${appState.workspaces.length + 1}`);
  // Explicit position means the caller chose where (e.g. right-click on canvas);
  // skip the auto-pan so we don't yank the viewport away from the user's gesture.
  const placedAtCursor = !!opts && (typeof opts.x === 'number' || typeof opts.y === 'number');
  if (opts && typeof opts.x === 'number') ws.x = opts.x;
  if (opts && typeof opts.y === 'number') ws.y = opts.y;
  appState.workspaces.push(ws);
  appState.activeWorkspaceId = ws.id;
  loadFrom(ws);
  if (!placedAtCursor) panViewToWorkspace(ws);
  appState.isDirty = true;
  return ws;
}

export function duplicateActiveWorkspace(): Workspace | null {
  const current = getActiveWorkspace();
  if (!current) return null;
  snapshotInto(current);
  const pos = nextFramePosition();
  const copy: Workspace = {
    ...deepClone(current),
    id: newId(),
    name: `${current.name} copy`,
    x: pos.x,
    y: pos.y,
  };
  appState.workspaces.push(copy);
  appState.activeWorkspaceId = copy.id;
  loadFrom(copy);
  panViewToWorkspace(copy);
  appState.isDirty = true;
  return copy;
}

export function renameWorkspace(id: string, name: string): void {
  const ws = appState.workspaces.find(w => w.id === id);
  if (!ws) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  ws.name = trimmed;
  appState.isDirty = true;
}

export function deleteWorkspace(id: string): void {
  if (appState.workspaces.length <= 1) return; // keep at least one
  const idx = appState.workspaces.findIndex(w => w.id === id);
  if (idx === -1) return;
  const wasActive = appState.activeWorkspaceId === id;
  appState.workspaces.splice(idx, 1);
  if (wasActive) {
    const next = appState.workspaces[Math.max(0, idx - 1)];
    appState.activeWorkspaceId = next.id;
    loadFrom(next);
  }
  appState.isDirty = true;
}

/**
 * Sync the active workspace snapshot from current appState. Call before
 * serializing so the active slot is up to date.
 */
export function syncActiveWorkspace(): void {
  const current = getActiveWorkspace();
  if (current) snapshotInto(current);
}

/** Replace the workspace list (e.g. when loading a project). */
export function loadWorkspaces(workspaces: Workspace[], activeId?: string): void {
  if (workspaces.length === 0) return;
  appState.workspaces.length = 0;
  for (const w of workspaces) appState.workspaces.push(w);
  const target = (activeId && appState.workspaces.find(w => w.id === activeId)) || appState.workspaces[0];
  appState.activeWorkspaceId = target.id;
  loadFrom(target);
}
