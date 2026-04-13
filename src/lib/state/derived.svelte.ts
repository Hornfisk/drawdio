import { appState } from './app.svelte.js';
import type { ComponentData } from '../components/types.js';

export function getComponentMap(): Map<string, ComponentData> {
  return new Map(appState.components.map((c: ComponentData) => [c.id, c]));
}

export function getSortedComponents(): ComponentData[] {
  return [...appState.components].sort((a: ComponentData, b: ComponentData) => a.zIndex - b.zIndex);
}

export function getSelectedComponents(): ComponentData[] {
  return appState.selectedIds
    .map((id: string) => appState.components.find((c: ComponentData) => c.id === id))
    .filter((c): c is ComponentData => c != null);
}
