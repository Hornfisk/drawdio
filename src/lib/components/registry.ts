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
