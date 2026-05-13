<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';
  import { getActiveRotation } from '../interaction/drag.svelte.js';

  const hs = 6; // handle size

  interface HandlePos {
    x: number;
    y: number;
    cursor: string;
    pos: string;
  }

  // Handles sit fully outside the dashed border (which is inset by 2px on each side)
  // so they don't obscure the component being resized.
  const gap = 3;
  function getHandles(w: number, h: number): HandlePos[] {
    const left = -2 - gap - hs;
    const right = w + 2 + gap;
    const top = -2 - gap - hs;
    const bottom = h + 2 + gap;
    const midX = w / 2 - hs / 2;
    const midY = h / 2 - hs / 2;
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

  // Union bounding box (axis-aligned, ignores rotation).
  // For a multi-selection that includes rotated components, the bbox hugs
  // their unrotated x/y/w/h — acceptable since rotated bounds would require
  // matrix math and visually wouldn't change resize behavior meaningfully.
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
</script>

{#if multi && bbox}
  <!-- Faint per-component outlines so user can see what's in the multi-selection -->
  {#each selectedComps as comp (comp.id)}
    <g transform="translate({comp.x}, {comp.y}) rotate({comp.rotation || 0}, {comp.width / 2}, {comp.height / 2})">
      <rect x="-1" y="-1"
            width={comp.width + 2} height={comp.height + 2}
            fill="none" stroke={accent} stroke-width="0.5"
            stroke-dasharray="3,2" opacity="0.55"
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

  <!-- Union bbox + handles -->
  <g data-selection-for="__multi__" transform="translate({bbox.x}, {bbox.y})">
    <rect x="-2" y="-2"
          width={bbox.w + 4} height={bbox.h + 4}
          fill="none" stroke={accent} stroke-width="1"
          stroke-dasharray="4,3" />
    {#each getHandles(bbox.w, bbox.h) as handle}
      {@const isCorner = (handle.pos === 'tl' || handle.pos === 'tr' || handle.pos === 'br' || handle.pos === 'bl')}
      <rect x={handle.x} y={handle.y}
            width={hs} height={hs}
            fill={accent} stroke={handleFill} stroke-width="1"
            data-handle={handle.pos} rx="1"
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
    <g data-selection-for={comp.id}
       transform="translate({comp.x}, {comp.y}) rotate({rot}, {comp.width / 2}, {comp.height / 2})">

      <!-- Dashed border -->
      <rect x="-2" y="-2"
            width={comp.width + 4} height={comp.height + 4}
            fill="none" stroke={accent} stroke-width="0.8"
            stroke-dasharray="4,3" />

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
        {#each getHandles(comp.width, comp.height) as handle}
          {@const isCorner = (handle.pos === 'tl' || handle.pos === 'tr' || handle.pos === 'br' || handle.pos === 'bl')}
          <rect x={handle.x} y={handle.y}
                width={hs} height={hs}
                fill={accent} stroke={handleFill} stroke-width="1"
                data-handle={handle.pos} rx="1"
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
