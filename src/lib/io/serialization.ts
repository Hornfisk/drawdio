import { appState, inferGridDensity, type GridDensity, type Workspace } from '../state/app.svelte.js';
import { clearSelection } from '../state/selection.js';
import { clearHistory } from '../state/history.js';
import type { ComponentData, Group } from '../components/types.js';
import { createDefaultEffects } from '../components/types.js';
import { showToast } from '../state/toast.svelte.js';
import { applyFlatManifest, type FlatManifest } from './flatManifest.js';
import { syncActiveWorkspace, loadWorkspaces, ensureWorkspace } from '../state/workspaces.js';

// Native File System Access handle (Chromium). Null on unsupported browsers.
let fileHandle: FileSystemFileHandle | null = null;
const hasFSAccess = typeof (globalThis as any).showSaveFilePicker === 'function';

const FILE_PICKER_OPTS = {
  types: [{
    description: 'Drawdio project',
    accept: { 'application/json': ['.drawdio.json', '.json'] as string[] },
  }],
};

export function toJSON() {
  // Sync the active workspace snapshot from current appState before serialising,
  // otherwise the active slot would be stale (only inactive workspaces are
  // updated automatically on switch).
  ensureWorkspace();
  syncActiveWorkspace();
  return {
    drawdio_version: 2,
    activeWorkspaceId: appState.activeWorkspaceId,
    workspaces: JSON.parse(JSON.stringify(appState.workspaces)),
  };
}

export function fromJSON(json: Record<string, unknown>) {
  if (!json || typeof json.drawdio_version !== 'number') {
    if (looksLikeFlatManifest(json)) {
      alert('This looks like a flat manifest (no drawdio_version).\n\n'
        + 'Use ☰ \u2192 File \u2192 Import Flat Manifest\u2026 to load it,\n'
        + 'or open it via the Bridge for live two-way sync.');
    } else {
      alert('Invalid Drawdio file: missing version field.');
    }
    return;
  }
  const version = json.drawdio_version;

  // --- V2: multi-workspace ---
  if (version >= 2 && Array.isArray(json.workspaces)) {
    const wsList = (json.workspaces as unknown[]).map((raw): Workspace => {
      const w = raw as Partial<Workspace>;
      const components = Array.isArray(w.components) ? w.components : [];
      for (const c of components) if (!c.effects) c.effects = createDefaultEffects();
      const groups = (Array.isArray(w.groups) ? w.groups : []).map((g) => ({
        ...g,
        parent: (g as { parent?: string | null }).parent ?? null,
      }));
      let maxNum = 0;
      for (const c of components) {
        const m = c.id.match(/_(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
      }
      const gridSize = typeof w.gridSize === 'number' ? w.gridSize : 32;
      return {
        id: w.id || 'workspace_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        name: w.name || 'Workspace',
        x: typeof w.x === 'number' ? w.x : 0,
        y: typeof w.y === 'number' ? w.y : 0,
        canvasWidth: w.canvasWidth || 900,
        canvasHeight: w.canvasHeight || 600,
        bgColor: w.bgColor || '#0E0F12',
        gridSize,
        gridDensity: w.gridDensity ?? inferGridDensity(gridSize),
        gridVisible: w.gridVisible ?? true,
        refImageDataUrl: w.refImageDataUrl ?? null,
        refImageOpacity: w.refImageOpacity ?? 0.5,
        refImageVisible: w.refImageVisible ?? true,
        refImageOffsetX: typeof w.refImageOffsetX === 'number' ? w.refImageOffsetX : 0,
        refImageOffsetY: typeof w.refImageOffsetY === 'number' ? w.refImageOffsetY : 0,
        components,
        groups,
        nextId: typeof w.nextId === 'number' ? w.nextId : maxNum + 1,
      };
    });
    appState.selectedIds = [];
    appState.clipboard = [];
    clearHistory();
    loadWorkspaces(wsList, typeof json.activeWorkspaceId === 'string' ? json.activeWorkspaceId : undefined);
    appState.isDirty = false;
    return;
  }

  // --- V1: single workspace at top level (legacy) ---
  if (!Array.isArray(json.components) || !Array.isArray(json.groups)) {
    alert('Invalid Drawdio file: malformed components or groups.');
    return;
  }
  const data = json as {
    drawdio_version: number;
    canvas?: {
      width?: number; height?: number; bgColor?: string; gridSize?: number; gridDensity?: GridDensity;
      refImageDataUrl?: string | null; refImageOpacity?: number; refImageVisible?: boolean;
      refImageOffsetX?: number; refImageOffsetY?: number;
    };
    components?: ComponentData[];
    groups?: Group[];
  };

  appState.components.length = 0;
  appState.groups.length = 0;
  appState.selectedIds = [];
  appState.clipboard = [];
  clearHistory();

  if (data.canvas) {
    appState.canvasWidth = data.canvas.width || 900;
    appState.canvasHeight = data.canvas.height || 600;
    appState.bgColor = data.canvas.bgColor || '#0E0F12';
    appState.gridSize = data.canvas.gridSize || 32;
    appState.gridDensity = data.canvas.gridDensity ?? inferGridDensity(appState.gridSize);
    appState.refImageDataUrl = data.canvas.refImageDataUrl ?? null;
    appState.refImageOpacity = data.canvas.refImageOpacity ?? 0.5;
    appState.refImageVisible = data.canvas.refImageVisible ?? true;
    appState.refImageOffsetX = data.canvas.refImageOffsetX ?? 0;
    appState.refImageOffsetY = data.canvas.refImageOffsetY ?? 0;
  }

  if (data.components) {
    let maxNum = 0;
    for (const c of data.components) {
      if (!c.effects) c.effects = createDefaultEffects();
      appState.components.push(c);
      const m = c.id.match(/_(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    }
    appState.nextId = maxNum + 1;
  }

  if (data.groups) {
    for (const g of data.groups) {
      // Backfill nested-group parent field for legacy files.
      if ((g as { parent?: string | null }).parent === undefined) {
        (g as Group).parent = null;
      }
      appState.groups.push(g);
    }
  }

  // Wrap legacy single-workspace state into the new workspaces array.
  appState.workspaces.length = 0;
  appState.activeWorkspaceId = '';
  ensureWorkspace();

  clearSelection();
  appState.isDirty = false;
}

export function newProject() {
  if (appState.isDirty) {
    if (!confirm('Unsaved changes will be lost. Continue?')) return;
  }
  // Reset view so the fresh workspace lands in the viewport. fromJSON's
  // ensureWorkspace() will then pan to the new workspace.
  appState.zoom = 1;
  appState.panX = 0;
  appState.panY = 0;
  fromJSON({
    drawdio_version: 1,
    canvas: { width: 900, height: 600, bgColor: '#0E0F12', gridSize: 32, gridDensity: 'medium', refImageDataUrl: null },
    components: [],
    groups: [],
  });
  appState.fileName = null;
  fileHandle = null;
  document.title = 'Drawdio';
}

async function writeToHandle(handle: FileSystemFileHandle, str: string) {
  const writable = await (handle as any).createWritable();
  await writable.write(str);
  await writable.close();
}

async function saveToHandle(handle: FileSystemFileHandle) {
  const str = JSON.stringify(toJSON(), null, 2);
  await writeToHandle(handle, str);
  fileHandle = handle;
  appState.fileName = handle.name;
  appState.isDirty = false;
  document.title = 'Drawdio \u2014 ' + handle.name;
  showToast('Saved to ' + handle.name);
}

export async function save() {
  const str = JSON.stringify(toJSON(), null, 2);

  if (hasFSAccess) {
    try {
      if (fileHandle) {
        await writeToHandle(fileHandle, str);
        appState.isDirty = false;
        showToast('Saved to ' + fileHandle.name);
        return;
      }
      const suggestedName = appState.fileName || 'untitled.drawdio.json';
      const handle: FileSystemFileHandle = await (globalThis as any).showSaveFilePicker({
        suggestedName,
        ...FILE_PICKER_OPTS,
      });
      await saveToHandle(handle);
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      console.warn('FS Access save failed, falling back to download:', err);
    }
  }

  // Fallback: anchor-tag download (goes to browser Downloads folder)
  const name = appState.fileName || 'untitled.drawdio.json';
  download(str, name, 'application/json');
  appState.isDirty = false;
  appState.fileName = name;
  document.title = 'Drawdio \u2014 ' + name;
  showToast('Downloaded ' + name + ' (check your Downloads folder)');
}

export async function saveAs() {
  if (hasFSAccess) {
    try {
      const suggestedName = appState.fileName || 'untitled.drawdio.json';
      const handle: FileSystemFileHandle = await (globalThis as any).showSaveFilePicker({
        suggestedName,
        ...FILE_PICKER_OPTS,
      });
      await saveToHandle(handle);
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      console.warn('FS Access saveAs failed, falling back:', err);
    }
  }

  const name = prompt('File name:', appState.fileName || 'untitled.drawdio.json');
  if (!name) return;
  let fileName = name;
  if (!fileName.endsWith('.drawdio.json') && !fileName.endsWith('.json')) {
    fileName += '.drawdio.json';
  }
  appState.fileName = fileName;
  const str = JSON.stringify(toJSON(), null, 2);
  download(str, fileName, 'application/json');
  appState.isDirty = false;
  document.title = 'Drawdio \u2014 ' + fileName;
  showToast('Downloaded ' + fileName + ' (check your Downloads folder)');
}

export async function openProject() {
  if (hasFSAccess) {
    try {
      const [handle]: FileSystemFileHandle[] = await (globalThis as any).showOpenFilePicker(FILE_PICKER_OPTS);
      const file = await handle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);
      fromJSON(json);
      fileHandle = handle;
      appState.fileName = handle.name;
      document.title = 'Drawdio \u2014 ' + handle.name;
      showToast('Opened ' + handle.name);
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      console.warn('FS Access open failed, falling back to <input>:', err);
    }
  }
  document.getElementById('file-input')?.click();
}

export function loadFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target?.result as string);
      fromJSON(json);
      fileHandle = null;
      appState.fileName = file.name;
      document.title = 'Drawdio \u2014 ' + file.name;
      showToast('Loaded ' + file.name);
    } catch (err) {
      alert(`Failed to load "${file.name}": ${(err as Error).message}`);
    }
  };
  reader.readAsText(file);
}

export function restoreFromAutosave() {
  try {
    const saved = localStorage.getItem('drawdio_autosave');
    const time = localStorage.getItem('drawdio_autosave_time');
    if (!saved) {
      showToast('No autosave found');
      return;
    }
    const ago = time ? Math.round((Date.now() - parseInt(time)) / 60000) : -1;
    const label = ago < 0 ? 'unknown time' : ago < 1 ? 'just now' : ago + ' min ago';
    if (appState.isDirty && !confirm('Replace current work with autosave from ' + label + '?')) return;
    fromJSON(JSON.parse(saved));
    fileHandle = null;
    appState.fileName = null;
    showToast('Restored autosave (' + label + ')');
  } catch (err) {
    alert('Failed to restore autosave: ' + (err as Error).message);
  }
}

function download(data: string | Blob, filename: string, mimeType: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { download };

/** Heuristic: top-level keys map to objects of {x,y,w,h} rects. */
function looksLikeFlatManifest(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const top = Object.values(json as Record<string, unknown>);
  if (top.length === 0) return false;
  let hits = 0;
  for (const v of top) {
    if (!v || typeof v !== 'object') continue;
    const leaves = Object.values(v as Record<string, unknown>);
    for (const leaf of leaves) {
      if (leaf && typeof leaf === 'object'
          && 'x' in leaf && 'y' in leaf && 'w' in leaf && 'h' in leaf) {
        hits++;
        if (hits >= 2) return true;
      }
    }
  }
  return false;
}

/** Open a JSON file as a flat manifest, applied additively over current state. */
export function importFlatManifest(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const n = applyFlatManifest(json as FlatManifest);
        if (n === 0) {
          alert('No entries found in ' + file.name + '.\n\n'
            + 'The file is a valid JSON object but contains no '
            + '{x, y, w, h} rects under any namespace.\n\n'
            + 'Flat manifests are populated by the source app — e.g. in '
            + 'SquelchPro, Layout.json stays empty until you drag a '
            + 'component in the plugin and save. Once the file has entries, '
            + 'drawdio can edit them.');
          return;
        }
        appState.isDirty = true;
        showToast('Imported ' + n + ' entries from ' + file.name);
      } catch (err) {
        alert('Failed to import: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
