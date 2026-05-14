import type { Component } from 'svelte';
import type { ComponentData, PropertySpec } from './types.js';

export interface RegistryEntry {
  component: Component<{ data: ComponentData }>;
  category: string;
  displayName: string;
  defaultProps: {
    width: number;
    height: number;
    color: string;
    label: string;
    properties: Record<string, unknown>;
  };
  editableProperties: PropertySpec[];
  /** If set, this entry is grouped with others sharing the same variantGroup in the palette */
  variantGroup?: string;
  /** Short label shown on the variant tab, e.g. "Grid", "Acid" */
  variantLabel?: string;
  /**
   * Tight visual bounds in component-local coords (relative to data.x/data.y).
   * When defined, the selection dashed-rect hugs this rect instead of the full
   * data.width × data.height box — useful for components that reserve internal
   * space for labels (knob, slider) where the painted "object" is smaller than
   * the data bounds. Resize handles still operate on the data bounds.
   * Returns {x, y, w, h} in local coords; falls back to (0, 0, width, height).
   */
  getVisualBounds?: (data: ComponentData) => { x: number; y: number; w: number; h: number };
}

const entries = new Map<string, RegistryEntry>();

export function register(type: string, entry: RegistryEntry): void {
  entries.set(type, entry);
}

export function getEntry(type: string): RegistryEntry | undefined {
  return entries.get(type);
}

export function allEntries(): [string, RegistryEntry][] {
  return [...entries.entries()];
}

export function entriesByCategory(): Map<string, { type: string; entry: RegistryEntry }[]> {
  const cats = new Map<string, { type: string; entry: RegistryEntry }[]>();
  for (const [type, entry] of entries) {
    const list = cats.get(entry.category) || [];
    list.push({ type, entry });
    cats.set(entry.category, list);
  }
  // Sort within categories alphabetically by displayName
  for (const list of cats.values()) {
    list.sort((a, b) => a.entry.displayName.localeCompare(b.entry.displayName));
  }
  return cats;
}
