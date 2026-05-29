import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { registerAllComponents } from '../components/register-all';
import { applyFlatManifest, toFlatManifest, type FlatManifest } from './flatManifest';
import { appState } from '../state/app.svelte.js';

describe('flatManifest round-trip', () => {
  beforeAll(() => { registerAllComponents(); });

  beforeEach(() => {
    appState.components.length = 0;
    appState.groups.length = 0;
    appState.selectedIds.length = 0;
    appState.nextId = 1;
  });

  it('applies bounds, lock, and type for a dotted id', () => {
    const m: FlatManifest = {
      faceplate: { tuningKnob: { x: 10, y: 20, w: 80, h: 80, locked: true, type: 'rotary_knob' } },
    };
    const applied = applyFlatManifest(m);
    expect(applied).toBe(1);
    const c = appState.components.find((c) => c.id === 'faceplate.tuningKnob')!;
    expect([c.x, c.y, c.width, c.height]).toEqual([10, 20, 80, 80]);
    expect(c.locked).toBe(true);
    expect(c.type).toBe('rotary_knob');
  });

  it('preserves bounds + type on a full round-trip', () => {
    const m: FlatManifest = {
      fx: { delayMix: { x: 5, y: 6, w: 40, h: 40, locked: false, type: 'rotary_knob' } },
    };
    applyFlatManifest(m);
    const out = toFlatManifest();
    expect(out.fx.delayMix).toMatchObject({ x: 5, y: 6, w: 40, h: 40, type: 'rotary_knob', locked: false });
  });

  it('falls back to panel_group for unknown types', () => {
    applyFlatManifest({ osc: { tune: { x: 0, y: 0, w: 30, h: 30, type: 'not_a_real_type' } } });
    const c = appState.components.find((c) => c.id === 'osc.tune')!;
    expect(c.type).toBe('panel_group');
  });
});
