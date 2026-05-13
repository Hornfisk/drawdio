import { appState, type Workspace } from './app.svelte.js';
import { pushHistory } from './history.js';
import type { ComponentData, Group } from '../components/types.js';
import { expandSelection } from './groups.js';
import { syncActiveWorkspace, getActiveWorkspace, duplicateActiveWorkspace } from './workspaces.js';

const GROUP_PREFIX = 'group_';
const isGroupId = (id: string) => id.startsWith(GROUP_PREFIX);

/* ──────────────────────────────────────────────────────────────────────────
 * Workspace clipboard (frame-level copy/paste)
 * ────────────────────────────────────────────────────────────────────────── */

function copyActiveWorkspaceToClipboard(): void {
  syncActiveWorkspace();
  const active = getActiveWorkspace();
  if (!active) return;
  appState.workspaceClipboard = JSON.parse(JSON.stringify(active)) as Workspace;
}

function pasteWorkspaceFromClipboard(): void {
  const clip = appState.workspaceClipboard;
  if (!clip) return;
  syncActiveWorkspace();
  const newWs: Workspace = JSON.parse(JSON.stringify(clip));
  newWs.id = 'workspace_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  let rightmost = appState.workspaces[0];
  for (const w of appState.workspaces) {
    if (w.x + w.canvasWidth > rightmost.x + rightmost.canvasWidth) rightmost = w;
  }
  newWs.x = rightmost.x + rightmost.canvasWidth + 60;
  newWs.y = rightmost.y;
  if (!newWs.name.endsWith(' (paste)')) newWs.name = newWs.name + ' (paste)';
  appState.workspaces.push(newWs);
  appState.activeWorkspaceId = newWs.id;
  appState.canvasWidth = newWs.canvasWidth;
  appState.canvasHeight = newWs.canvasHeight;
  appState.bgColor = newWs.bgColor;
  appState.gridSize = newWs.gridSize;
  appState.gridDensity = newWs.gridDensity;
  appState.gridVisible = newWs.gridVisible;
  appState.refImageDataUrl = newWs.refImageDataUrl;
  appState.refImageOpacity = newWs.refImageOpacity;
  appState.refImageVisible = newWs.refImageVisible;
  appState.components.length = 0;
  for (const c of JSON.parse(JSON.stringify(newWs.components))) appState.components.push(c);
  appState.groups.length = 0;
  for (const g of JSON.parse(JSON.stringify(newWs.groups))) appState.groups.push(g);
  appState.nextId = newWs.nextId;
  appState.selectedIds = [];
  appState.selectedWorkspaceId = newWs.id;
  appState.isDirty = true;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Component clipboard with group preservation
 * ────────────────────────────────────────────────────────────────────────── */

/** A group is "fully contained" if every leaf component below it is in the set. */
function isGroupFullyContained(groupId: string, compSet: Set<string>): boolean {
  const g = appState.groups.find(x => x.id === groupId);
  if (!g) return false;
  for (const childId of g.children) {
    if (isGroupId(childId)) {
      if (!isGroupFullyContained(childId, compSet)) return false;
    } else {
      if (!compSet.has(childId)) return false;
    }
  }
  return true;
}

/**
 * Clone-and-remap a slice of components + groups so the paste/duplicate flow
 * can stamp them into the document with fresh IDs while keeping the group tree
 * intact (children + parent references swing to the new IDs).
 *
 * Returns the new component IDs (in the same order as the input components)
 * plus the new group records to push.
 */
function rehydrateClonedGroup(
  srcComponents: ComponentData[],
  srcGroups: Group[],
  opts: { offsetX: number; offsetY: number }
): { components: ComponentData[]; groups: Group[]; newCompIds: string[] } {
  const compIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();

  for (const c of srcComponents) {
    const newId = c.type + '_' + appState.nextId++;
    compIdMap.set(c.id, newId);
  }
  for (const g of srcGroups) {
    const newId = GROUP_PREFIX + appState.nextId++;
    groupIdMap.set(g.id, newId);
  }

  const remap = (oldId: string): string | null => {
    if (isGroupId(oldId)) return groupIdMap.get(oldId) ?? null;
    return compIdMap.get(oldId) ?? null;
  };

  const components: ComponentData[] = [];
  const newCompIds: string[] = [];
  for (const src of srcComponents) {
    const copy = JSON.parse(JSON.stringify(src)) as ComponentData;
    copy.id = compIdMap.get(src.id)!;
    copy.x += opts.offsetX;
    copy.y += opts.offsetY;
    // Re-point the group reference. If the parent group wasn't in the slice,
    // the copy becomes ungrouped — preferable to a dangling pointer.
    if (copy.group && groupIdMap.has(copy.group)) copy.group = groupIdMap.get(copy.group)!;
    else copy.group = null;
    components.push(copy);
    newCompIds.push(copy.id);
  }

  const groups: Group[] = [];
  for (const src of srcGroups) {
    const copy = JSON.parse(JSON.stringify(src)) as Group;
    copy.id = groupIdMap.get(src.id)!;
    copy.children = src.children
      .map(remap)
      .filter((x): x is string => x !== null);
    copy.parent = (src.parent && groupIdMap.has(src.parent))
      ? groupIdMap.get(src.parent)!
      : null;
    groups.push(copy);
  }

  return { components, groups, newCompIds };
}

/** Snapshot every group whose entire descendant tree is in the component set. */
function collectFullyContainedGroups(compIds: Set<string>): Group[] {
  return appState.groups
    .filter(g => isGroupFullyContained(g.id, compIds))
    .map(g => JSON.parse(JSON.stringify(g)) as Group);
}

/** Drop component references from groups + remove groups whose tree is empty. */
function cleanupOrphanGroupRefs(): void {
  const compIds = new Set(appState.components.map(c => c.id));
  // Trim children to remove deleted components; recursively prune empty groups.
  let changed = true;
  while (changed) {
    changed = false;
    const groupIds = new Set(appState.groups.map(g => g.id));
    for (const g of appState.groups) {
      const filtered = g.children.filter(cid => isGroupId(cid) ? groupIds.has(cid) : compIds.has(cid));
      if (filtered.length !== g.children.length) {
        g.children = filtered;
        changed = true;
      }
    }
    for (let i = appState.groups.length - 1; i >= 0; i--) {
      if (appState.groups[i].children.length === 0) {
        appState.groups.splice(i, 1);
        changed = true;
      }
    }
  }
}

export function doCopy() {
  if (appState.selectedWorkspaceId) {
    copyActiveWorkspaceToClipboard();
    return;
  }
  if (appState.selectedIds.length === 0) return;
  // Expand to pull whole groups in when any member is selected.
  const expanded = expandSelection([...appState.selectedIds]);
  const expandedSet = new Set(expanded);
  appState.clipboard = expanded
    .map(id => appState.components.find(c => c.id === id))
    .filter((c): c is ComponentData => c != null)
    .map(c => JSON.parse(JSON.stringify(c)) as ComponentData);
  appState.clipboardGroups = collectFullyContainedGroups(expandedSet);
}

export function doPaste() {
  if (appState.workspaceClipboard && appState.selectedIds.length === 0 && appState.clipboard.length === 0) {
    pasteWorkspaceFromClipboard();
    return;
  }
  if (appState.clipboard.length === 0) return;
  pushHistory();
  const offsetX = appState.gridSize;
  const offsetY = appState.gridSize;
  const { components, groups, newCompIds } = rehydrateClonedGroup(
    appState.clipboard,
    appState.clipboardGroups,
    { offsetX, offsetY }
  );
  for (const c of components) {
    c.zIndex = appState.components.length;
    appState.components.push(c);
  }
  for (const g of groups) appState.groups.push(g);
  // Bump clipboard offset so repeated paste fans out.
  for (const c of appState.clipboard) { c.x += offsetX; c.y += offsetY; }
  appState.selectedIds = newCompIds;
  appState.isDirty = true;
}

export function doCut() {
  if (appState.selectedWorkspaceId && appState.workspaces.length > 1) {
    copyActiveWorkspaceToClipboard();
    const idx = appState.workspaces.findIndex(w => w.id === appState.selectedWorkspaceId);
    if (idx !== -1) {
      appState.workspaces.splice(idx, 1);
      const next = appState.workspaces[Math.max(0, idx - 1)];
      appState.activeWorkspaceId = next.id;
      appState.selectedWorkspaceId = null;
      appState.canvasWidth = next.canvasWidth;
      appState.canvasHeight = next.canvasHeight;
      appState.bgColor = next.bgColor;
      appState.gridSize = next.gridSize;
      appState.gridDensity = next.gridDensity;
      appState.gridVisible = next.gridVisible;
      appState.refImageDataUrl = next.refImageDataUrl;
      appState.refImageOpacity = next.refImageOpacity;
      appState.refImageVisible = next.refImageVisible;
      appState.components.length = 0;
      for (const c of JSON.parse(JSON.stringify(next.components))) appState.components.push(c);
      appState.groups.length = 0;
      for (const g of JSON.parse(JSON.stringify(next.groups))) appState.groups.push(g);
      appState.nextId = next.nextId;
      appState.selectedIds = [];
      appState.isDirty = true;
    }
    return;
  }
  doCopy();
  pushHistory();
  // Delete the EXPANDED set so cutting any group member removes the whole group.
  const toRemove = new Set(expandSelection([...appState.selectedIds]));
  for (const id of toRemove) {
    const idx = appState.components.findIndex(c => c.id === id);
    if (idx !== -1) appState.components.splice(idx, 1);
  }
  cleanupOrphanGroupRefs();
  appState.selectedIds = [];
  appState.isDirty = true;
}

/**
 * Duplicate specific IDs in-place (no position offset). Groups containing the
 * full set are duplicated as new group records so the copies remain grouped.
 * Returns the new component IDs. Caller pushes history + sets isDirty.
 */
export function duplicateInPlace(ids: string[]): string[] {
  // Expand to include group siblings for parity with copy semantics.
  const expanded = expandSelection(ids);
  const expandedSet = new Set(expanded);
  const srcComponents = expanded
    .map(id => appState.components.find(c => c.id === id))
    .filter((c): c is ComponentData => c != null);
  const srcGroups = appState.groups
    .filter(g => isGroupFullyContained(g.id, expandedSet));
  const { components, groups, newCompIds } = rehydrateClonedGroup(
    srcComponents,
    srcGroups,
    { offsetX: 0, offsetY: 0 }
  );
  for (const c of components) {
    c.zIndex = appState.components.length;
    appState.components.push(c);
  }
  for (const g of groups) appState.groups.push(g);
  return newCompIds;
}

export function doDuplicate() {
  if (appState.selectedWorkspaceId) {
    duplicateActiveWorkspace();
    return;
  }
  if (appState.selectedIds.length === 0) return;
  pushHistory();
  const expanded = expandSelection([...appState.selectedIds]);
  const expandedSet = new Set(expanded);
  const srcComponents = expanded
    .map(id => appState.components.find(c => c.id === id))
    .filter((c): c is ComponentData => c != null);
  const srcGroups = appState.groups
    .filter(g => isGroupFullyContained(g.id, expandedSet));
  const { components, groups, newCompIds } = rehydrateClonedGroup(
    srcComponents,
    srcGroups,
    { offsetX: appState.gridSize, offsetY: appState.gridSize }
  );
  for (const c of components) {
    c.zIndex = appState.components.length;
    appState.components.push(c);
  }
  for (const g of groups) appState.groups.push(g);
  appState.selectedIds = newCompIds;
  appState.isDirty = true;
}
