import { appState } from '../state/app.svelte.js';
import { clearSelection } from '../state/selection.js';
import { clearHistory } from '../state/history.js';
import type { ComponentData, Group } from '../components/types.js';
import { createDefaultEffects } from '../components/types.js';

export function toJSON() {
  return {
    drawdio_version: 1,
    canvas: {
      width: appState.canvasWidth,
      height: appState.canvasHeight,
      bgColor: appState.bgColor,
      gridSize: appState.gridSize,
    },
    components: structuredClone(appState.components),
    groups: structuredClone(appState.groups),
  };
}

export function fromJSON(json: Record<string, unknown>) {
  if (!json || typeof json.drawdio_version !== 'number') {
    alert('Invalid Drawdio file: missing version field.');
    return;
  }
  if (!Array.isArray(json.components) || !Array.isArray(json.groups)) {
    alert('Invalid Drawdio file: malformed components or groups.');
    return;
  }
  const data = json as {
    drawdio_version: number;
    canvas?: { width?: number; height?: number; bgColor?: string; gridSize?: number };
    components?: ComponentData[];
    groups?: Group[];
  };

  // Clear state
  appState.components.length = 0;
  appState.groups.length = 0;
  appState.selectedIds = [];
  appState.clipboard = [];
  clearHistory();

  if (data.canvas) {
    appState.canvasWidth = data.canvas.width || 900;
    appState.canvasHeight = data.canvas.height || 600;
    appState.bgColor = data.canvas.bgColor || '#1a1a1a';
    appState.gridSize = data.canvas.gridSize || 20;
  }

  if (data.components) {
    let maxNum = 0;
    for (const c of data.components) {
      // Ensure effects exist (backward compat)
      if (!c.effects) c.effects = createDefaultEffects();
      appState.components.push(c);
      const m = c.id.match(/_(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    }
    appState.nextId = maxNum + 1;
  }

  if (data.groups) {
    for (const g of data.groups) appState.groups.push(g);
  }

  clearSelection();
  appState.isDirty = false;
}

export function newProject() {
  if (appState.isDirty) {
    if (!confirm('Unsaved changes will be lost. Continue?')) return;
  }
  fromJSON({
    drawdio_version: 1,
    canvas: { width: 900, height: 600, bgColor: '#1a1a1a', gridSize: 20 },
    components: [],
    groups: [],
  });
  appState.fileName = null;
  document.title = 'Drawdio';
}

export function save() {
  const json = toJSON();
  const str = JSON.stringify(json, null, 2);
  const name = appState.fileName || 'untitled.drawdio.json';
  download(str, name, 'application/json');
  appState.isDirty = false;
  appState.fileName = name;
  document.title = 'Drawdio \u2014 ' + name;
}

export function saveAs() {
  const name = prompt('File name:', appState.fileName || 'untitled.drawdio.json');
  if (!name) return;
  let fileName = name;
  if (!fileName.endsWith('.drawdio.json') && !fileName.endsWith('.json')) {
    fileName += '.drawdio.json';
  }
  appState.fileName = fileName;
  save();
}

export function loadFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target?.result as string);
      fromJSON(json);
      appState.fileName = file.name;
      document.title = 'Drawdio \u2014 ' + file.name;
    } catch (err) {
      alert(`Failed to load "${file.name}": ${(err as Error).message}`);
    }
  };
  reader.readAsText(file);
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
