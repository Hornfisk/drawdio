import { appState } from './app.svelte.js';
import { select } from './selection.js';
import { pushHistory } from './history.js';
import type { ComponentData } from '../components/types.js';

export function doCopy() {
  if (appState.selectedIds.length === 0) return;
  appState.clipboard = [];
  for (const id of appState.selectedIds) {
    const src = appState.components.find(c => c.id === id);
    if (src) appState.clipboard.push(structuredClone(src));
  }
}

export function doPaste() {
  if (appState.clipboard.length === 0) return;
  pushHistory();
  const pastedIds: string[] = [];
  for (const item of appState.clipboard) {
    const copy: ComponentData = structuredClone(item);
    copy.id = copy.type + '_' + appState.nextId++;
    copy.x += appState.gridSize;
    copy.y += appState.gridSize;
    copy.zIndex = appState.components.length;
    appState.components.push(copy);
    pastedIds.push(copy.id);
  }
  // Offset clipboard for next paste
  for (const item of appState.clipboard) {
    item.x += appState.gridSize;
    item.y += appState.gridSize;
  }
  appState.selectedIds = pastedIds;
  appState.isDirty = true;
}

export function doCut() {
  doCopy();
  pushHistory();
  const ids = [...appState.selectedIds];
  for (const id of ids) {
    const idx = appState.components.findIndex(c => c.id === id);
    if (idx !== -1) appState.components.splice(idx, 1);
  }
  appState.selectedIds = [];
  appState.isDirty = true;
}

// Duplicate specific IDs in-place (no position offset). Returns new IDs.
// Caller is responsible for pushHistory() and isDirty.
export function duplicateInPlace(ids: string[]): string[] {
  const newIds: string[] = [];
  for (const id of ids) {
    const src = appState.components.find(c => c.id === id);
    if (!src) continue;
    const copy: ComponentData = structuredClone(src);
    copy.id = copy.type + '_' + appState.nextId++;
    copy.group = null;
    copy.zIndex = appState.components.length;
    appState.components.push(copy);
    newIds.push(copy.id);
  }
  return newIds;
}

export function doDuplicate() {
  if (appState.selectedIds.length === 0) return;
  pushHistory();
  const newIds: string[] = [];
  for (const id of appState.selectedIds) {
    const src = appState.components.find(c => c.id === id);
    if (!src) continue;
    const copy: ComponentData = structuredClone(src);
    copy.id = copy.type + '_' + appState.nextId++;
    copy.x += appState.gridSize;
    copy.y += appState.gridSize;
    copy.zIndex = appState.components.length;
    appState.components.push(copy);
    newIds.push(copy.id);
  }
  appState.selectedIds = newIds;
  appState.isDirty = true;
}
