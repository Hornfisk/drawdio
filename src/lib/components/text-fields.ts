import type { ComponentData } from './types.js';

// Maps component type → path into ComponentData for its primary editable text.
// Path is dot-separated and starts at the ComponentData root. Types absent from
// this map have no meaningful inline-editable text (separators, LEDs, meters, …).
const PRIMARY_TEXT_PATH: Record<string, string> = {
  label_text: 'label',
  section_header: 'label',
  momentary_button: 'label',
  toggle_switch: 'label',
  rotary_knob: 'label',
  horizontal_slider: 'label',
  vertical_slider: 'label',
  panel_group: 'label',
  image_placeholder: 'label',
  dropdown: 'properties.selected',
  value_readout: 'properties.value',
};

export function getTextPath(type: string): string | null {
  return PRIMARY_TEXT_PATH[type] ?? null;
}

export function getTextValue(comp: ComponentData): string | null {
  const path = getTextPath(comp.type);
  if (!path) return null;
  const segs = path.split('.');
  let cur: unknown = comp;
  for (const s of segs) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[s];
  }
  return cur == null ? '' : String(cur);
}

export function setTextValue(comp: ComponentData, value: string): void {
  const path = getTextPath(comp.type);
  if (!path) return;
  const segs = path.split('.');
  let cur: Record<string, unknown> = comp as unknown as Record<string, unknown>;
  for (let i = 0; i < segs.length - 1; i++) {
    const next = cur[segs[i]];
    if (next == null || typeof next !== 'object') return;
    cur = next as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]] = value;
}
