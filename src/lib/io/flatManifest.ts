// Flat-manifest JSON <-> drawdio ComponentData converters.
// Shape: { "<ns>": { "<id>": { x, y, w, h, locked? } } }
// Drawdio encodes entries as panel_group rects with id = "<ns>.<id>".

import { appState } from '../state/app.svelte.js';
import { createDefaultEffects, type ComponentData } from '../components/types.js';

export interface FlatEntry { x: number; y: number; w: number; h: number; locked?: boolean }
export type FlatManifest = Record<string, Record<string, FlatEntry>>;

const NS_COLORS: Record<string, string> = {
  faceplate: '#c9a94e',
  fx:        '#4fc3f7',
  label:     '#888888',
};
const DEFAULT_COLOR = '#7a7a7a';

function isDottedManifestId(id: string): { ns: string; name: string } | null {
  const i = id.indexOf('.');
  if (i <= 0 || i === id.length - 1) return null;
  const ns = id.slice(0, i);
  const name = id.slice(i + 1);
  // Namespace must look like a simple word. Anything else (e.g. drawdio's
  // internal "panel_group_1") passes through unmolested.
  if (!/^[a-zA-Z][\w-]*$/.test(ns)) return null;
  return { ns, name };
}

/** Convert drawdio state → flat manifest. Only components with dotted ids participate. */
export function toFlatManifest(): FlatManifest {
  const out: FlatManifest = {};
  for (const c of appState.components) {
    const parsed = isDottedManifestId(c.id);
    if (!parsed) continue;
    const { ns, name } = parsed;
    if (!out[ns]) out[ns] = {};
    out[ns][name] = {
      x: Math.round(c.x),
      y: Math.round(c.y),
      w: Math.round(c.width),
      h: Math.round(c.height),
      locked: !!c.locked,
    };
  }
  return out;
}

/** Apply a flat manifest to drawdio state. Updates existing dotted-id components in-place;
 *  creates minimal panel_group rects for new entries. Non-dotted components are untouched.
 *  Returns count of entries applied (created + updated). */
export function applyFlatManifest(json: FlatManifest): number {
  if (!json || typeof json !== 'object') return 0;
  let applied = 0;
  const byId = new Map(appState.components.map(c => [c.id, c]));
  const seen = new Set<string>();
  let nextZ = appState.components.reduce((m, c) => Math.max(m, c.zIndex), 0);

  for (const ns of Object.keys(json)) {
    const bucket = json[ns];
    if (!bucket || typeof bucket !== 'object') continue;
    for (const name of Object.keys(bucket)) {
      const entry = bucket[name];
      if (!entry || typeof entry !== 'object') continue;
      const id = `${ns}.${name}`;
      seen.add(id);
      const existing = byId.get(id);
      const x = Number(entry.x) || 0;
      const y = Number(entry.y) || 0;
      const w = Math.max(2, Number(entry.w) || 10);
      const h = Math.max(2, Number(entry.h) || 10);
      const locked = !!entry.locked;
      applied++;
      if (existing) {
        existing.x = x;
        existing.y = y;
        existing.width = w;
        existing.height = h;
        existing.locked = locked;
      } else {
        const color = NS_COLORS[ns] || DEFAULT_COLOR;
        const comp: ComponentData = {
          id,
          type: 'panel_group',
          x, y, width: w, height: h,
          rotation: 0,
          color,
          label: name,
          properties: {
            bgColor: color,
            bgOpacity: 0.35,
            cornerRadius: 2,
            borderWidth: 1,
          },
          effects: createDefaultEffects(),
          group: null,
          visible: true,
          zIndex: ++nextZ,
          locked,
        };
        appState.components.push(comp);
      }
    }
  }
  return applied;
}
