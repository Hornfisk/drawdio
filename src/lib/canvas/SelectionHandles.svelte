<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';
  import { getActiveRotation } from '../interaction/drag.svelte.js';
  import { getEntry } from '../components/registry.js';
  import type { ComponentData } from '../components/types.js';

  // Per-component visual bounds (LOCAL coords, relative to comp.x/comp.y).
  // For components that reserve internal label space (knob, etc.), this is
  // smaller than the full data bounds. Falls back to (0, 0, w, h).
  function visualLocal(c: ComponentData): { x: number; y: number; w: number; h: number } {
    const fn = getEntry(c.type)?.getVisualBounds;
    if (fn) return fn(c);
    return { x: 0, y: 0, w: c.width, h: c.height };
  }

  // Handle size scales inversely with zoom so handles stay ~6 CSS px on screen at any zoom.
  // Hit target is ~2× larger (transparent) to make clicks forgiving near the edge.
  const hs    = $derived(6 / appState.zoom);
  const hsHit = $derived(12 / appState.zoom);
  const gap   = $derived(3 / appState.zoom);
  // Constant 0.8 CSS px stroke regardless of zoom — see vector-effect below.
  const dashedSw = $derived(0.8 / appState.zoom);

  // Shrink handles when the rendered component is small on screen, otherwise
  // they (and their hit targets) eclipse the component and block clicks on
  // anything adjacent. Returns a scalar in [0.3, 1] applied to hs/hsHit/gap.
  // At ≥24 CSS px min-dimension on screen: full-size handles.
  // At ≤4 CSS px: clamped to 0.3 (tiny but visible/grabbable).
  function handleScale(w: number, h: number): number {
    const minCss = Math.min(w, h) * appState.zoom;
    return Math.min(1, Math.max(0.3, (minCss - 4) / 20));
  }

  interface HandlePos {
    x: number;
    y: number;
    cursor: string;
    pos: string;
  }

  // Handles sit fully outside the dashed border (which is inset by 2px on each side)
  // so they don't obscure the component being resized.
  function getHandles(w: number, h: number, hsv: number, gapv: number): HandlePos[] {
    const left = -2 - gapv - hsv;
    const right = w + 2 + gapv;
    const top = -2 - gapv - hsv;
    const bottom = h + 2 + gapv;
    const midX = w / 2 - hsv / 2;
    const midY = h / 2 - hsv / 2;
    return [
      { x: left,  y: top,    cursor: 'nwse-resize', pos: 'tl' },
      { x: midX,  y: top,    cursor: 'ns-resize',   pos: 'tc' },
      { x: right, y: top,    cursor: 'nesw-resize', pos: 'tr' },
      { x: right, y: midY,   cursor: 'ew-resize',   pos: 'mr' },
      { x: right, y: bottom, cursor: 'nwse-resize', pos: 'br' },
      { x: midX,  y: bottom, cursor: 'ns-resize',   pos: 'bc' },
      { x: left,  y: bottom, cursor: 'nesw-resize', pos: 'bl' },
      { x: left,  y: midY,   cursor: 'ew-resize',   pos: 'ml' },
    ];
  }

  const activeRotation = $derived(getActiveRotation());
  const accent      = $derived(appState.accentColor);
  const handleFill  = $derived(appState.theme === 'light' ? '#F4F1EA' : '#0E0F12');
  const hintColor   = $derived(appState.theme === 'light' ? '#6B6E78' : '#8E93A0');

  const selectedComps = $derived(getSelectedComponents());
  const multi = $derived(selectedComps.length > 1);

  // Data union — drives handle positions and the `<g>` translate so the
  // resize handler in drag.svelte.ts (which recaptures from data bounds)
  // stays consistent with what the user grabs.
  const bbox = $derived.by(() => {
    if (!multi || selectedComps.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of selectedComps) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });

  // Visual union — drives the dashed selection rect so it hugs the painted
  // shapes (knob circles etc.) rather than the data box reserved for labels.
  const visualBbox = $derived.by(() => {
    if (!multi || selectedComps.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of selectedComps) {
      const vb = visualLocal(c);
      minX = Math.min(minX, c.x + vb.x);
      minY = Math.min(minY, c.y + vb.y);
      maxX = Math.max(maxX, c.x + vb.x + vb.w);
      maxY = Math.max(maxY, c.y + vb.y + vb.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });
</script>

{#if multi && bbox}
  <!-- Faint per-component outlines so user can see what's in the multi-selection.
       Hugs each component's visual bounds (no outset) so the shapes are tight. -->
  {#each selectedComps as comp (comp.id)}
    {@const vb = visualLocal(comp)}
    <g transform="translate({comp.x}, {comp.y}) rotate({comp.rotation || 0}, {comp.width / 2}, {comp.height / 2})">
      <rect x={vb.x} y={vb.y}
            width={vb.w} height={vb.h}
            fill="none" stroke={accent} stroke-width="0.5"
            stroke-dasharray="3,2" opacity="0.55"
            vector-effect="non-scaling-stroke"
            pointer-events="none" />
      {#if comp.locked}
        <!-- Tiny lock badge in top-left corner -->
        <rect x="2" y="2" width="10" height="10" rx="1.5"
              fill={accent} opacity="0.9" pointer-events="none" />
        <path d="M 5 7 v -1 a 2 2 0 0 1 4 0 v 1 M 4 7 h 6 v 4 h -6 z"
              fill="none" stroke={handleFill} stroke-width="0.8"
              pointer-events="none" />
      {/if}
    </g>
  {/each}

  <!-- Union bbox + handles.
       <g> translates to the DATA bbox so handle positions match what
       drag.svelte.ts captures on resize-start. The dashed rect renders at
       VISUAL-bbox offsets (in local coords) so it hugs painted content. -->
  {@const bScale  = handleScale(bbox.w, bbox.h)}
  {@const bHs     = hs * bScale}
  {@const bHsHit  = hsHit * bScale}
  {@const bGap    = gap * bScale}
  <g data-selection-for="__multi__" transform="translate({bbox.x}, {bbox.y})">
    {#if visualBbox}
      <rect x={visualBbox.x - bbox.x} y={visualBbox.y - bbox.y}
            width={visualBbox.w} height={visualBbox.h}
            fill="none" stroke={accent} stroke-width="1"
            stroke-dasharray="4,3" vector-effect="non-scaling-stroke" />
    {/if}
    {#each getHandles(bbox.w, bbox.h, bHs, bGap) as handle}
      {@const isCorner = (handle.pos === 'tl' || handle.pos === 'tr' || handle.pos === 'br' || handle.pos === 'bl')}
      <!-- Larger transparent hit target -->
      <rect x={handle.x - (bHsHit - bHs) / 2} y={handle.y - (bHsHit - bHs) / 2}
            width={bHsHit} height={bHsHit}
            fill="transparent" data-handle={handle.pos}
            style="cursor: {handle.cursor};" />
      <!-- Visible handle (above the hit target so cursor/tooltip still work) -->
      <rect x={handle.x} y={handle.y}
            width={bHs} height={bHs}
            fill={accent} stroke={handleFill} stroke-width={dashedSw}
            data-handle={handle.pos} rx={1 / appState.zoom}
            vector-effect="non-scaling-stroke"
            style="cursor: {handle.cursor};">
        {#if appState.tooltipsEnabled}
          <title>{isCorner ? 'Drag to scale selection · Shift: lock ratio' : 'Drag to scale selection'}</title>
        {/if}
      </rect>
    {/each}
  </g>
{:else}
  {#each selectedComps as comp (comp.id)}
    {@const rot = comp.rotation || 0}
    {@const isRotated = rot !== 0}
    {@const vb = visualLocal(comp)}
    <g data-selection-for={comp.id}
       transform="translate({comp.x}, {comp.y}) rotate({rot}, {comp.width / 2}, {comp.height / 2})">

      <!-- Dashed border — hugs the component's visual bounds (no outset). -->
      <rect x={vb.x} y={vb.y}
            width={vb.w} height={vb.h}
            fill="none" stroke={accent} stroke-width="0.8"
            stroke-dasharray="4,3" vector-effect="non-scaling-stroke" />

      <!-- Lock badge when component is locked -->
      {#if comp.locked}
        <rect x="2" y="2" width="14" height="14" rx="2"
              fill={accent} opacity="0.9" pointer-events="none" />
        <path d="M 7 10 v -1.5 a 2 2 0 0 1 4 0 v 1.5 M 6 10 h 6 v 5 h -6 z"
              fill="none" stroke={handleFill} stroke-width="1"
              pointer-events="none" />
      {/if}

      <!-- Resize handles — hidden when component is rotated or locked -->
      {#if !isRotated && !comp.locked}
        {@const cScale = handleScale(comp.width, comp.height)}
        {@const cHs    = hs * cScale}
        {@const cHsHit = hsHit * cScale}
        {@const cGap   = gap * cScale}
        {#each getHandles(comp.width, comp.height, cHs, cGap) as handle}
          {@const isCorner = (handle.pos === 'tl' || handle.pos === 'tr' || handle.pos === 'br' || handle.pos === 'bl')}
          <!-- Larger transparent hit target -->
          <rect x={handle.x - (cHsHit - cHs) / 2} y={handle.y - (cHsHit - cHs) / 2}
                width={cHsHit} height={cHsHit}
                fill="transparent" data-handle={handle.pos}
                style="cursor: {handle.cursor};" />
          <!-- Visible handle -->
          <rect x={handle.x} y={handle.y}
                width={cHs} height={cHs}
                fill={accent} stroke={handleFill} stroke-width={dashedSw}
                data-handle={handle.pos} rx={1 / appState.zoom}
                vector-effect="non-scaling-stroke"
                style="cursor: {handle.cursor};">
            {#if appState.tooltipsEnabled}
              <title>{isCorner ? 'Drag to resize · Shift: lock ratio' : 'Drag to resize'}</title>
            {/if}
          </rect>
        {/each}
      {/if}
      {#if isRotated && appState.tooltipsEnabled}
        <!-- Hint that resize is available at 0° -->
        <text x={comp.width / 2} y={comp.height + 14} text-anchor="middle"
              fill={hintColor} font-size="8" font-family="system-ui"
              pointer-events="none">Set rotation to 0° to resize</text>
      {/if}

      <!-- Rotation handle (single selection, not locked) -->
      {#if !comp.locked}
        {@const hx = comp.width / 2}
        <!-- Stem line -->
        <line x1={hx} y1="-2" x2={hx} y2="-18"
              stroke={accent} stroke-width="0.8" stroke-dasharray="2,2" />
        <!-- Handle circle -->
        <circle cx={hx} cy="-22" r="5"
                fill={handleFill} stroke={accent} stroke-width="1.2"
                data-rotate-handle="true"
                style="cursor: crosshair;">
          {#if appState.tooltipsEnabled}
            <title>Drag to rotate · Shift: snap 15°</title>
          {/if}
        </circle>
        <!-- Rotation symbol inside handle -->
        <path d="M {hx - 2.5} -24 A 2.5 2.5 0 1 1 {hx + 1.5} -19.5"
              fill="none" stroke={accent} stroke-width="1"
              stroke-linecap="round"
              pointer-events="none" />
        <polygon points="{hx + 1.5},-19.5 {hx + 3.5},-21.5 {hx - 0.5},-21"
                 fill={accent} pointer-events="none" />

        <!-- Angle label during active rotation drag -->
        {#if activeRotation !== null}
          <rect x={hx - 14} y="-38" width="28" height="12" rx="2"
                fill={handleFill} fill-opacity="0.85" />
          <text x={hx} y="-29" text-anchor="middle"
                fill={accent} font-size="8" font-family="monospace">{Math.round(activeRotation)}°</text>
        {/if}
      {/if}
    </g>
  {/each}
{/if}
