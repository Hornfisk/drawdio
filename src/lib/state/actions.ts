import { appState } from './app.svelte.js';
import { getEntry } from '../components/registry.js';
import { createDefaultEffects } from '../components/types.js';
import type { ComponentData } from '../components/types.js';

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
  // Walk backwards (top-most first by array order — sorted by zIndex on render)
  const sorted = [...appState.components].sort((a, b) => b.zIndex - a.zIndex);
  for (const c of sorted) {
    if (c.visible !== false && x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) {
      return c;
    }
  }
  return null;
}
