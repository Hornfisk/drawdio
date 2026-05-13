import { appState } from './app.svelte.js';
import { pushHistory } from './history.js';

const GROUP_PREFIX = 'group_';

function isGroupId(id: string): boolean {
  return id.startsWith(GROUP_PREFIX);
}

function findGroup(id: string) {
  return appState.groups.find(g => g.id === id) ?? null;
}

function findComp(id: string) {
  return appState.components.find(c => c.id === id) ?? null;
}

/** Walk up the group tree from a component or group id to its top-level ancestor id. */
function rootAncestorIdOf(itemId: string): string {
  if (isGroupId(itemId)) {
    let g = findGroup(itemId);
    while (g && g.parent) {
      const parent = findGroup(g.parent);
      if (!parent) break;
      g = parent;
    }
    return g?.id ?? itemId;
  }
  const c = findComp(itemId);
  if (!c || !c.group) return itemId;
  return rootAncestorIdOf(c.group);
}

/** Add every leaf component reachable from a group into `out`. */
function collectDescendantComponentIds(groupId: string, out: Set<string>): void {
  const g = findGroup(groupId);
  if (!g) return;
  for (const childId of g.children) {
    if (isGroupId(childId)) collectDescendantComponentIds(childId, out);
    else out.add(childId);
  }
}

/** Set the parent link on a child item (component or group). */
function setParent(childId: string, parentGroupId: string | null): void {
  if (isGroupId(childId)) {
    const g = findGroup(childId);
    if (g) g.parent = parentGroupId;
  } else {
    const c = findComp(childId);
    if (c) c.group = parentGroupId;
  }
}

/**
 * Create a new group from a set of selected items. Items are typically component
 * IDs (from selectedIds); each is promoted up to its top-level ancestor (so
 * grouping components that are already in a sub-group nests that sub-group as a
 * whole, rather than tearing it apart).
 */
export function createGroup(ids: string[]) {
  if (ids.length < 2) return;
  // Promote each id to its top-level ancestor and dedupe.
  const ancestorSet = new Set<string>();
  for (const id of ids) ancestorSet.add(rootAncestorIdOf(id));
  if (ancestorSet.size < 2) return;
  pushHistory();
  const groupId = GROUP_PREFIX + appState.nextId++;
  const ancestors = [...ancestorSet];
  appState.groups.push({ id: groupId, label: 'Group', children: ancestors, parent: null });
  for (const id of ancestors) setParent(id, groupId);
  appState.isDirty = true;
  // Keep selection — selectedIds still references the leaf components, and
  // expandSelection() will pull them all into the same operation now.
}

/**
 * Dissolve a group, promoting its direct children (components and/or nested
 * groups) up to its parent. Sub-groups stay intact — ungrouping a parent does
 * not flatten the whole tree, only one level.
 */
export function ungroupById(groupId: string) {
  const idx = appState.groups.findIndex(g => g.id === groupId);
  if (idx === -1) return;
  pushHistory();
  const group = appState.groups[idx];
  const newParent = group.parent;
  for (const childId of group.children) {
    setParent(childId, newParent);
  }
  // If this group is itself a child of a parent group, swap us out for our children.
  if (newParent) {
    const parentGroup = findGroup(newParent);
    if (parentGroup) {
      const myIdx = parentGroup.children.indexOf(groupId);
      if (myIdx !== -1) parentGroup.children.splice(myIdx, 1, ...group.children);
    }
  }
  appState.groups.splice(idx, 1);
  appState.isDirty = true;
}

export function getGroupOf(compId: string) {
  const c = findComp(compId);
  if (!c || !c.group) return null;
  return findGroup(c.group);
}

/**
 * Expand a selection to include every component that shares a top-level
 * ancestor group with any of the input ids. Walks the tree recursively so
 * nested groups are pulled in as units.
 */
export function expandSelection(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (isGroupId(id)) {
      const rootId = rootAncestorIdOf(id);
      collectDescendantComponentIds(rootId, out);
      continue;
    }
    const c = findComp(id);
    if (!c) continue;
    if (!c.group) {
      out.add(id);
      continue;
    }
    const rootId = rootAncestorIdOf(c.group);
    collectDescendantComponentIds(rootId, out);
  }
  return [...out];
}

/**
 * Ungroup every top-level group reachable from the current selection. Children
 * of those groups (including nested sub-groups) are promoted one level. Run it
 * again to flatten further.
 *
 * Critical: collect all the target root groups *before* any ungroup runs.
 * Otherwise, after the first ungroupById dissolves the parent, later iterations
 * of the loop see the previous sub-groups as the new "root" (because their
 * parent link was nulled) and continue ungrouping them — flattening more than
 * one level per call.
 */
export function ungroupSelected() {
  const rootIds = new Set<string>();
  for (const id of appState.selectedIds) {
    const c = findComp(id);
    if (!c || !c.group) continue;
    rootIds.add(rootAncestorIdOf(c.group));
  }
  for (const rootId of rootIds) {
    ungroupById(rootId);
  }
}
