<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSnapGuides, getEqualSpacingGuides, type EqualSpacingGuide, type EqualSpacingSegment } from '../interaction/drag.svelte.js';

  const guides = $derived(getSnapGuides());
  const eqGuides = $derived(getEqualSpacingGuides());
  const stroke = $derived(appState.accentColor);
  // Distinct magenta for equal-spacing — Figma's standard signal color so users
  // can tell at a glance which kind of snap they hit.
  const eqStroke = '#FF1493';
  // End-cap tick half-length (in CSS px after non-scaling-stroke would resize,
  // we apply 1/zoom in world coords so the ticks stay ~6 px on screen).
  const tickHalf = $derived(3 / appState.zoom);

  // ---------------------------------------------------------------------------
  // Persistent equal-spacing indicators for the currently selected component.
  // When exactly one component is selected and it's part of an equally-spaced
  // arrangement (≥2 equal gaps along an axis among its aligned row/column),
  // surface ALL equal gaps as magenta segments so the user can verify the row's
  // spacing at a glance — like Figma's selection-hover indicator.
  // ---------------------------------------------------------------------------
  const EQUAL_TOL = 1;            // 1 px tolerance for "equal"
  const ALIGN_OVERLAP_MIN = 4;    // perpendicular overlap to count as same row/col

  type Bx = { x: number; y: number; w: number; h: number };

  function computeSelectionEqGuides(): EqualSpacingGuide[] {
    if (appState.selectedIds.length !== 1) return [];
    const sel = appState.components.find(c => c.id === appState.selectedIds[0]);
    if (!sel) return [];
    const s: Bx = { x: sel.x, y: sel.y, w: sel.width, h: sel.height };

    const out: EqualSpacingGuide[] = [];

    for (const axis of ['x', 'y'] as const) {
      const along      = (b: Bx) => axis === 'x' ? b.x : b.y;
      const alongSize  = (b: Bx) => axis === 'x' ? b.w : b.h;
      const cross      = (b: Bx) => axis === 'x' ? b.y : b.x;
      const crossSize  = (b: Bx) => axis === 'x' ? b.h : b.w;

      // Aligned set: components whose perpendicular bounds overlap selected by > 4 px.
      const aligned: Bx[] = appState.components
        .filter(c => c.id !== sel.id)
        .map(c => ({ x: c.x, y: c.y, w: c.width, h: c.height }))
        .filter(o => {
          const ov = Math.min(cross(o) + crossSize(o), cross(s) + crossSize(s))
                   - Math.max(cross(o), cross(s));
          return ov > ALIGN_OVERLAP_MIN;
        });

      // Full sequence including the selected one, sorted along the axis.
      const seq = [...aligned, s].sort((a, b) => along(a) - along(b));
      // Need at least one neighbor (2 boxes ⇒ 1 gap). The "equal spacing"
      // visual is the same magenta segment whether one gap is shown or many.
      if (seq.length < 2) continue;

      // Consecutive gaps.
      const gaps: number[] = [];
      for (let i = 0; i < seq.length - 1; i++) {
        gaps.push(along(seq[i + 1]) - (along(seq[i]) + alongSize(seq[i])));
      }

      const selIdx = seq.indexOf(s);
      // Gaps that directly touch the selected element — always shown.
      const adjacent: number[] = [];
      if (selIdx - 1 >= 0) adjacent.push(selIdx - 1);
      if (selIdx < gaps.length) adjacent.push(selIdx);

      const toShow = new Set<number>();
      // 1. Always show adjacent gaps — gives a distance indicator to the
      //    selected element's nearest aligned neighbors on this axis.
      for (const a of adjacent) {
        if (gaps[a] > 0) toShow.add(a);
      }
      // 2. Also surface any other gaps in the row/column that are equal to
      //    an adjacent gap. This is the equal-spacing case: the row reads
      //    as "all these gaps are the same."
      for (const a of adjacent) {
        if (gaps[a] <= 0) continue;
        for (let i = 0; i < gaps.length; i++) {
          if (gaps[i] <= 0) continue;
          if (Math.abs(gaps[i] - gaps[a]) <= EQUAL_TOL) {
            toShow.add(i);
          }
        }
      }
      if (toShow.size === 0) continue;

      const segments: EqualSpacingSegment[] = [];
      for (const i of toShow) {
        const A = seq[i];
        const B = seq[i + 1];
        const lo = Math.max(cross(A), cross(B), cross(s));
        const hi = Math.min(cross(A) + crossSize(A), cross(B) + crossSize(B), cross(s) + crossSize(s));
        segments.push({
          from: along(A) + alongSize(A),
          to: along(B),
          cross: (lo + hi) / 2,
        });
      }
      out.push({ axis, segments });
    }
    return out;
  }

  const selEqGuides = $derived(computeSelectionEqGuides());
  // Drag-time guides take precedence visually (they overlay): render them last.
  const allEqGuides = $derived([...selEqGuides, ...eqGuides]);
</script>

<!-- Edge-alignment guides — amber, span full canvas. -->
{#each guides as g}
  {#if g.axis === 'x'}
    <line
      x1={g.position} x2={g.position}
      y1={0} y2={appState.canvasHeight}
      stroke={stroke} stroke-width="1"
      vector-effect="non-scaling-stroke"
      pointer-events="none"
      shape-rendering="crispEdges"
    />
  {:else}
    <line
      x1={0} x2={appState.canvasWidth}
      y1={g.position} y2={g.position}
      stroke={stroke} stroke-width="1"
      vector-effect="non-scaling-stroke"
      pointer-events="none"
      shape-rendering="crispEdges"
    />
  {/if}
{/each}

<!-- Equal-spacing guides — magenta, both equal segments + end-cap ticks.
     Merged source: selection-based persistent indicators + drag-time snap guides. -->
{#each allEqGuides as g}
  {#each g.segments as seg}
    {#if g.axis === 'x'}
      <!-- Horizontal segment between two boxes on the same row. -->
      <line
        x1={seg.from} x2={seg.to}
        y1={seg.cross} y2={seg.cross}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
      <!-- End-cap ticks (perpendicular to the segment). -->
      <line
        x1={seg.from} x2={seg.from}
        y1={seg.cross - tickHalf} y2={seg.cross + tickHalf}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
      <line
        x1={seg.to} x2={seg.to}
        y1={seg.cross - tickHalf} y2={seg.cross + tickHalf}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
    {:else}
      <!-- Vertical segment between two boxes in the same column. -->
      <line
        x1={seg.cross} x2={seg.cross}
        y1={seg.from} y2={seg.to}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
      <line
        x1={seg.cross - tickHalf} x2={seg.cross + tickHalf}
        y1={seg.from} y2={seg.from}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
      <line
        x1={seg.cross - tickHalf} x2={seg.cross + tickHalf}
        y1={seg.to} y2={seg.to}
        stroke={eqStroke} stroke-width="1"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
        shape-rendering="crispEdges"
      />
    {/if}
  {/each}
{/each}
