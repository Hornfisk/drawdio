import { appState } from './app.svelte.js';
import type { ComponentData, Group } from '../components/types.js';

interface Snapshot {
  components: ComponentData[];
  groups: Group[];
  selectedIds: string[];
}

const MAX_HISTORY = 50;
let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];

function takeSnapshot(): Snapshot {
  return {
    components: structuredClone(appState.components),
    groups: structuredClone(appState.groups),
    selectedIds: [...appState.selectedIds],
  };
}

function applySnapshot(snap: Snapshot) {
  appState.components.length = 0;
  for (const c of snap.components) appState.components.push(c);
  appState.groups.length = 0;
  for (const g of snap.groups) appState.groups.push(g);
  appState.selectedIds = [...snap.selectedIds];
  appState.isDirty = true;
}

export function pushHistory() {
  undoStack.push(takeSnapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length === 0) return;
  undoStack.push(takeSnapshot());
  const prev = undoStack.pop();
  if (prev) applySnapshot(prev);
}

export function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(takeSnapshot());
  const next = redoStack.pop();
  if (next) applySnapshot(next);
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
}
