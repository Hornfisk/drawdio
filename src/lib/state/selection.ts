import { appState } from './app.svelte.js';
import { pushHistory } from './history.js';

export function select(id: string): void {
  appState.selectedIds = [id];
}

export function addToSelection(id: string): void {
  if (!appState.selectedIds.includes(id)) {
    appState.selectedIds = [...appState.selectedIds, id];
  }
}

export function removeFromSelection(id: string): void {
  appState.selectedIds = appState.selectedIds.filter(sid => sid !== id);
}

export function clearSelection(): void {
  appState.selectedIds = [];
}

export function isSelected(id: string): boolean {
  return appState.selectedIds.includes(id);
}

export function selectAll(): void {
  appState.selectedIds = appState.components.map(c => c.id);
}

export function deleteSelected(): void {
  const ids = [...appState.selectedIds];
  if (ids.length === 0) return;
  pushHistory();
  for (const id of ids) {
    const idx = appState.components.findIndex(c => c.id === id);
    if (idx !== -1) {
      appState.components.splice(idx, 1);
    }
  }
  appState.selectedIds = [];
  appState.isDirty = true;
}
