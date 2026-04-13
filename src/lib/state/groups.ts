import { appState } from './app.svelte.js';
import { pushHistory } from './history.js';

export function createGroup(ids: string[]) {
  if (ids.length < 2) return;
  pushHistory();
  const groupId = 'group_' + appState.nextId++;
  appState.groups.push({ id: groupId, label: 'Group', children: [...ids] });
  for (const id of ids) {
    const c = appState.components.find(x => x.id === id);
    if (c) c.group = groupId;
  }
  appState.isDirty = true;
}

export function ungroupById(groupId: string) {
  const idx = appState.groups.findIndex(g => g.id === groupId);
  if (idx === -1) return;
  pushHistory();
  const group = appState.groups[idx];
  for (const childId of group.children) {
    const c = appState.components.find(x => x.id === childId);
    if (c) c.group = null;
  }
  appState.groups.splice(idx, 1);
  appState.isDirty = true;
}

export function getGroupOf(compId: string) {
  const c = appState.components.find(x => x.id === compId);
  if (!c || !c.group) return null;
  return appState.groups.find(g => g.id === c.group) || null;
}

export function expandSelection(ids: string[]): string[] {
  const expanded = [...ids];
  for (const id of ids) {
    const group = getGroupOf(id);
    if (group) {
      for (const childId of group.children) {
        if (!expanded.includes(childId)) expanded.push(childId);
      }
    }
  }
  return expanded;
}

export function ungroupSelected() {
  const seen = new Set<string>();
  for (const id of appState.selectedIds) {
    const group = getGroupOf(id);
    if (group && !seen.has(group.id)) {
      seen.add(group.id);
      ungroupById(group.id);
    }
  }
}
