<script lang="ts">
  import { untrack } from 'svelte';
  import type { ComponentData } from '../components/types.js';
  import { appState } from '../state/app.svelte.js';
  import { pushHistory } from '../state/history.js';
  import { buildCurvePath } from '../utils/curve.js';

  let { data, onclose }: { data: ComponentData; onclose: () => void } = $props();

  const DEFAULT_POINTS: number[] = [0, 0.5, 0.5, 0.5, 1, 0.5];

  // One-shot snapshot of the existing curve at modal-open time. Wrapped in untrack
  // so Svelte 5 doesn't flag the prop read as reactive (we want a static initial value).
  let points = $state<number[]>(untrack(() => {
    const p = data.properties.customCurvePoints as number[] | undefined;
    return (p && p.length >= 4 && p.length % 2 === 0) ? [...p] : [...DEFAULT_POINTS];
  }));
  let smooth = $state<boolean>(untrack(() => (data.properties.customCurveSmooth as boolean) ?? true));
  let dragIndex = $state<number | null>(null);
  let shiftLockedX = $state<number | null>(null); // when Shift is held, lock X to this value

  // Industry-standard preset waveforms — one full cycle, centered at 0.5, amplitude 0.4.
  const PRESETS: Record<string, () => { points: number[]; smooth: boolean }> = {
    sine: () => {
      const pts: number[] = [];
      for (let i = 0; i <= 16; i++) {
        const x = i / 16;
        const y = 0.5 - 0.4 * Math.sin(2 * Math.PI * x);
        pts.push(x, y);
      }
      return { points: pts, smooth: true };
    },
    triangle: () => ({
      points: [0, 0.5, 0.25, 0.1, 0.5, 0.5, 0.75, 0.9, 1, 0.5],
      smooth: false,
    }),
    square: () => ({
      // Tight x-spacing around 0.5 produces sharp vertical edges.
      points: [0, 0.5, 0.002, 0.1, 0.498, 0.1, 0.5, 0.5, 0.502, 0.9, 0.998, 0.9, 1, 0.5],
      smooth: false,
    }),
    saw: () => ({
      points: [0, 0.5, 0.498, 0.9, 0.5, 0.1, 1, 0.5],
      smooth: false,
    }),
    pulse: () => ({
      // 25% duty cycle pulse.
      points: [0, 0.9, 0.248, 0.9, 0.25, 0.1, 0.748, 0.1, 0.75, 0.9, 1, 0.9],
      smooth: false,
    }),
    ramp: () => ({
      points: [0, 0.9, 1, 0.1],
      smooth: false,
    }),
  };

  function applyPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    const r = p();
    points = [...r.points];
    smooth = r.smooth;
  }

  const W = 600;
  const H = 280;
  const PAD = 20;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  function toScreen(nx: number, ny: number): { x: number; y: number } {
    return { x: PAD + nx * innerW, y: PAD + ny * innerH };
  }
  function toNorm(sx: number, sy: number): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(1, (sx - PAD) / innerW)),
      y: Math.max(0, Math.min(1, (sy - PAD) / innerH)),
    };
  }

  // Path uses normalized point coords scaled to the inner-canvas size.
  // The path itself is rendered inside a <g transform="translate(PAD, PAD)"> below.
  const pathD = $derived(buildCurvePath(points, innerW, innerH, smooth));

  function svgPoint(e: PointerEvent | MouseEvent, svgEl: SVGSVGElement): { x: number; y: number } {
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svgEl.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const local = pt.matrixTransform(m.inverse());
    return { x: local.x, y: local.y };
  }

  function onCanvasPointerDown(e: PointerEvent) {
    const svgEl = e.currentTarget as SVGSVGElement;
    const loc = svgPoint(e, svgEl);
    // Hit-test points
    for (let i = 0; i < points.length; i += 2) {
      const s = toScreen(points[i], points[i + 1]);
      const dx = s.x - loc.x, dy = s.y - loc.y;
      if (dx * dx + dy * dy <= 64) {
        dragIndex = i;
        shiftLockedX = e.shiftKey ? points[i] : null;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        return;
      }
    }
    // Empty click — add a point, kept x-sorted
    const n = toNorm(loc.x, loc.y);
    let insertAt = points.length;
    for (let i = 0; i < points.length; i += 2) {
      if (n.x < points[i]) { insertAt = i; break; }
    }
    points.splice(insertAt, 0, n.x, n.y);
    dragIndex = insertAt;
    shiftLockedX = e.shiftKey ? n.x : null;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (dragIndex === null) return;
    const svgEl = e.currentTarget as SVGSVGElement;
    const loc = svgPoint(e, svgEl);
    const n = toNorm(loc.x, loc.y);
    // Re-evaluate shift live — user can press/release mid-drag.
    if (e.shiftKey && shiftLockedX === null) shiftLockedX = points[dragIndex];
    else if (!e.shiftKey) shiftLockedX = null;

    // Endpoints stay pinned to x=0 / x=1 to avoid degenerate curves.
    if (dragIndex === 0) {
      points[0] = 0; points[1] = n.y;
    } else if (dragIndex === points.length - 2) {
      points[dragIndex] = 1; points[dragIndex + 1] = n.y;
    } else {
      // Clamp x so points stay sorted between their neighbors.
      const minX = points[dragIndex - 2] + 0.001;
      const maxX = points[dragIndex + 2] - 0.001;
      const desiredX = shiftLockedX !== null ? shiftLockedX : n.x;
      points[dragIndex]     = Math.max(minX, Math.min(maxX, desiredX));
      points[dragIndex + 1] = n.y;
    }
  }

  function onCanvasPointerUp(e: PointerEvent) {
    dragIndex = null;
    shiftLockedX = null;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  }

  function onPointDoubleClick(i: number) {
    // Don't allow deleting endpoints.
    if (i === 0 || i === points.length - 2) return;
    points.splice(i, 2);
  }

  function reset() {
    points = [...DEFAULT_POINTS];
  }

  function commitAndClose() {
    pushHistory();
    data.properties.customCurvePoints = [...points];
    data.properties.customCurveSmooth = smooth;
    appState.isDirty = true;
    onclose();
  }
  function cancelAndClose() {
    onclose();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cancelAndClose(); }
    else if (e.key === 'Enter') { e.preventDefault(); commitAndClose(); }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="curve-modal-backdrop" role="presentation" onclick={cancelAndClose}>
  <div class="curve-modal" role="dialog" aria-label="Edit curve" tabindex="-1"
       onclick={(e) => e.stopPropagation()}>
    <div class="curve-modal-header">
      <span class="curve-modal-title">Edit curve</span>
      <span class="curve-modal-hint">Click empty space to add a point · Double-click a point to delete · Shift+drag to lock X (slope only) · Endpoints are pinned</span>
    </div>

    <div class="curve-presets">
      <span class="curve-presets-label">Presets:</span>
      {#each [
        { name: 'sine',     label: 'Sine' },
        { name: 'triangle', label: 'Triangle' },
        { name: 'square',   label: 'Square' },
        { name: 'saw',      label: 'Saw' },
        { name: 'pulse',    label: 'Pulse 25%' },
        { name: 'ramp',     label: 'Ramp' },
      ] as p}
        <button class="curve-preset-btn" onclick={() => applyPreset(p.name)}>{p.label}</button>
      {/each}
    </div>

    <svg class="curve-canvas" viewBox={`0 0 ${W} ${H}`} width={W} height={H}
         role="application" aria-label="Curve editor canvas"
         onpointerdown={onCanvasPointerDown}
         onpointermove={onCanvasPointerMove}
         onpointerup={onCanvasPointerUp}
         onpointercancel={onCanvasPointerUp}>
      <!-- Background -->
      <rect x="0" y="0" width={W} height={H} fill="var(--bg-input)" />
      <!-- Grid -->
      {#each [0.25, 0.5, 0.75] as t}
        <line x1={PAD} y1={PAD + t * innerH} x2={PAD + innerW} y2={PAD + t * innerH}
              stroke="var(--border-muted)" stroke-width="1" stroke-dasharray="2 3" />
        <line x1={PAD + t * innerW} y1={PAD} x2={PAD + t * innerW} y2={PAD + innerH}
              stroke="var(--border-muted)" stroke-width="1" stroke-dasharray="2 3" />
      {/each}
      <!-- Inner border -->
      <rect x={PAD} y={PAD} width={innerW} height={innerH}
            fill="none" stroke="var(--border)" stroke-width="1" />
      <!-- Curve + control points are rendered in normalized 0..innerW,0..innerH space,
           then translated by PAD into the canvas. -->
      <g transform="translate({PAD}, {PAD})">
        <path d={pathD} fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" />
        {#each points as _, i}
          {#if i % 2 === 0}
            <circle cx={points[i] * innerW} cy={points[i + 1] * innerH} r={6}
                    role="button" tabindex="0" aria-label="Control point — double-click to delete"
                    fill="var(--bg-app)" stroke="var(--accent)" stroke-width="2"
                    ondblclick={() => onPointDoubleClick(i)}
                    style="cursor: grab;" />
          {/if}
        {/each}
      </g>
    </svg>

    <div class="curve-modal-footer">
      <label class="curve-smooth-toggle">
        <input type="checkbox" bind:checked={smooth} />
        Smooth
      </label>
      <button class="curve-btn" onclick={reset}>Reset</button>
      <div class="curve-spacer"></div>
      <button class="curve-btn" onclick={cancelAndClose}>Cancel</button>
      <button class="curve-btn curve-btn-primary" onclick={commitAndClose}>Done</button>
    </div>
  </div>
</div>

<style>
  .curve-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 200;
  }
  .curve-modal {
    background: var(--bg-panel); border: 1px solid var(--border);
    border-radius: 6px; padding: 16px; min-width: 640px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  }
  .curve-modal-header {
    display: flex; flex-direction: column; gap: 4px;
  }
  .curve-modal-title { font-weight: 600; color: var(--text); font-size: 14px; }
  .curve-modal-hint { color: var(--text-muted); font-size: 11px; }
  .curve-canvas {
    display: block; border-radius: 4px; user-select: none; touch-action: none;
  }
  .curve-modal-footer {
    display: flex; align-items: center; gap: 8px;
  }
  .curve-spacer { flex: 1; }
  .curve-smooth-toggle {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-secondary); cursor: pointer;
  }
  .curve-btn {
    background: var(--bg-input); color: var(--text);
    border: 1px solid var(--border); border-radius: 4px;
    padding: 6px 12px; font-size: 12px; cursor: pointer;
    font-family: inherit;
  }
  .curve-btn:hover { background: var(--bg-hover); }
  .curve-btn-primary {
    background: var(--accent); color: var(--on-accent); border-color: var(--accent);
  }
  .curve-btn-primary:hover { filter: brightness(1.08); }

  .curve-presets {
    display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  }
  .curve-presets-label {
    font-size: 11px; color: var(--text-muted); margin-right: 4px;
  }
  .curve-preset-btn {
    background: var(--bg-input); color: var(--text-secondary);
    border: 1px solid var(--border-muted); border-radius: 3px;
    padding: 4px 9px; font-size: 11px; cursor: pointer;
    font-family: inherit;
  }
  .curve-preset-btn:hover {
    background: var(--bg-hover); color: var(--text); border-color: var(--border);
  }
</style>
