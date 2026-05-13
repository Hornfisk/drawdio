import { appState } from './app.svelte.js';
import { pushHistory } from './history.js';
import { deleteWorkspace } from './workspaces.js';

export function select(id: string): void {
  appState.selectedIds = [id];
  appState.selectedWorkspaceId = null;
}

export function addToSelection(id: string): void {
  if (!appState.selectedIds.includes(id)) {
    appState.selectedIds = [...appState.selectedIds, id];
  }
  appState.selectedWorkspaceId = null;
}

export function removeFromSelection(id: string): void {
  appState.selectedIds = appState.selectedIds.filter(sid => sid !== id);
}

export function clearSelection(): void {
  appState.selectedIds = [];
  appState.selectedWorkspaceId = null;
}

export function isSelected(id: string): boolean {
  return appState.selectedIds.includes(id);
}

export function selectAll(): void {
  appState.selectedIds = appState.components.map(c => c.id);
}

export function deleteSelected(): void {
  // If a workspace is selected as an entity, delete the whole frame.
  if (appState.selectedWorkspaceId && appState.workspaces.length > 1) {
    const wsId = appState.selectedWorkspaceId;
    appState.selectedWorkspaceId = null;
    deleteWorkspace(wsId);
    return;
  }
  const ids = [...appState.selectedIds];
  if (ids.length === 0) return;
  pushHistory();
  for (const id of ids) {
    const idx = appState.components.findIndex(c => c.id === id);
    if (idx !== -1) {
      appState.components.splice(idx, 1);
    }
  }
  // Prune any group records that now point at deleted components / collapse empties.
  const compIds = new Set(appState.components.map(c => c.id));
  let changed = true;
  while (changed) {
    changed = false;
    const groupIds = new Set(appState.groups.map(g => g.id));
    for (const g of appState.groups) {
      const filtered = g.children.filter(cid => cid.startsWith('group_') ? groupIds.has(cid) : compIds.has(cid));
      if (filtered.length !== g.children.length) { g.children = filtered; changed = true; }
    }
    for (let i = appState.groups.length - 1; i >= 0; i--) {
      if (appState.groups[i].children.length === 0) { appState.groups.splice(i, 1); changed = true; }
    }
  }
  appState.selectedIds = [];
  appState.isDirty = true;
}

/**
 * Toggle the `locked` flag on all selected components. If any selected component
 * is currently unlocked, lock them all; otherwise unlock them all.
 * Returns the new lock state applied (`true` = now locked, `false` = now unlocked).
 */
export function toggleLockForSelection(): boolean | null {
  const ids = appState.selectedIds;
  if (ids.length === 0) return null;
  const comps = ids
    .map(id => appState.components.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c != null);
  if (comps.length === 0) return null;
  const anyUnlocked = comps.some(c => !c.locked);
  const next = anyUnlocked;  // lock everything if any was unlocked, else unlock
  pushHistory();
  for (const c of comps) c.locked = next;
  appState.isDirty = true;
  return next;
}
