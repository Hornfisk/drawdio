import { appState } from './app.svelte.js';
import { getEntry } from '../components/registry.js';
import { createDefaultEffects } from '../components/types.js';
import type { ComponentData } from '../components/types.js';
import { pushHistory } from './history.js';

export function createComponent(type: string, x: number, y: number): ComponentData | null {
  const entry = getEntry(type);
  if (!entry) return null;

  const dp = entry.defaultProps;
  const id = `${type}_${appState.nextId++}`;
  const data: ComponentData = {
    id,
    type,
    x, y,
    width: dp.width,
    height: dp.height,
    rotation: 0,
    color: dp.color,
    label: dp.label,
    properties: structuredClone(dp.properties),
    effects: createDefaultEffects(),
    group: null,
    visible: true,
    zIndex: appState.components.length,
  };
  appState.components.push(data);
  appState.isDirty = true;
  return data;
}

export function removeComponent(id: string): void {
  const idx = appState.components.findIndex(c => c.id === id);
  if (idx !== -1) {
    appState.components.splice(idx, 1);
    appState.isDirty = true;
  }
}

export function getComponentById(id: string): ComponentData | undefined {
  return appState.components.find(c => c.id === id);
}

export function getComponentAtPoint(x: number, y: number): ComponentData | null {
  const sorted = [...appState.components].sort((a, b) => b.zIndex - a.zIndex);
  for (const c of sorted) {
    if (c.visible !== false && pointInRotatedRect(x, y, c)) {
      return c;
    }
  }
  return null;
}

function pointInRotatedRect(px: number, py: number, c: ComponentData): boolean {
  const rot = -(c.rotation || 0) * Math.PI / 180;
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
  const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
  return lx >= -c.width / 2 && lx <= c.width / 2 && ly >= -c.height / 2 && ly <= c.height / 2;
}

export function rotateSelectedBy(delta: number): void {
  if (appState.selectedIds.length === 0) return;
  pushHistory();
  for (const id of appState.selectedIds) {
    const comp = appState.components.find(c => c.id === id);
    if (comp) {
      comp.rotation = normalizeAngle((comp.rotation || 0) + delta);
    }
  }
  appState.isDirty = true;
}

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}
