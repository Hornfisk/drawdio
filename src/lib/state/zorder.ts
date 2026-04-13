import { appState } from './app.svelte.js';

function reindex() {
  const sorted = [...appState.components].sort((a, b) => a.zIndex - b.zIndex);
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].zIndex = i;
  }
}

export function bringForward(ids: string[]) {
  reindex();
  for (const id of ids) {
    const c = appState.components.find(x => x.id === id);
    if (!c) continue;
    let above = null;
    let minAbove = Infinity;
    for (const other of appState.components) {
      if (!ids.includes(other.id) && other.zIndex > c.zIndex && other.zIndex < minAbove) {
        minAbove = other.zIndex;
        above = other;
      }
    }
    if (above) {
      const tmp = c.zIndex;
      c.zIndex = above.zIndex;
      above.zIndex = tmp;
    }
  }
  appState.isDirty = true;
}

export function sendBackward(ids: string[]) {
  reindex();
  for (const id of ids) {
    const c = appState.components.find(x => x.id === id);
    if (!c) continue;
    let below = null;
    let maxBelow = -1;
    for (const other of appState.components) {
      if (!ids.includes(other.id) && other.zIndex < c.zIndex && other.zIndex > maxBelow) {
        maxBelow = other.zIndex;
        below = other;
      }
    }
    if (below) {
      const tmp = c.zIndex;
      c.zIndex = below.zIndex;
      below.zIndex = tmp;
    }
  }
  appState.isDirty = true;
}

export function bringToFront(ids: string[]) {
  reindex();
  let maxZ = appState.components.length;
  for (const id of ids) {
    const c = appState.components.find(x => x.id === id);
    if (c) c.zIndex = maxZ++;
  }
  reindex();
  appState.isDirty = true;
}

export function sendToBack(ids: string[]) {
  reindex();
  for (let i = ids.length - 1; i >= 0; i--) {
    const c = appState.components.find(x => x.id === ids[i]);
    if (c) c.zIndex = -1 - i;
  }
  reindex();
  appState.isDirty = true;
}
