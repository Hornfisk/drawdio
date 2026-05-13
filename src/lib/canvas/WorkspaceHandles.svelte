<script lang="ts">
  import { appState } from '../state/app.svelte.js';

  const hs = 8;        // handle size
  const gap = 6;       // distance from canvas edge

  // Same 8-handle layout as SelectionHandles, but anchored to the workspace rect.
  function getHandles(w: number, h: number) {
    const left = -gap - hs;
    const right = w + gap;
    const top = -gap - hs;
    const bottom = h + gap;
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

  const accent = $derived(appState.accentColor);
  const fill   = $derived(appState.theme === 'light' ? '#F4F1EA' : '#0E0F12');
  const visible = $derived(appState.selectedIds.length === 0);
</script>

{#if visible}
  <g data-selection-for="__workspace__" pointer-events="auto">
    <!-- Faint outline around the canvas, hairline so it doesn't dominate when zoomed in -->
    <rect x="-1" y="-1"
          width={appState.canvasWidth + 2}
          height={appState.canvasHeight + 2}
          fill="none" stroke={accent} stroke-width="1"
          stroke-dasharray="2,3"
          opacity="0.5"
          vector-effect="non-scaling-stroke"
          pointer-events="none" />
    {#each getHandles(appState.canvasWidth, appState.canvasHeight) as handle}
      <rect x={handle.x} y={handle.y}
            width={hs} height={hs}
            fill={accent} stroke={fill} stroke-width="1"
            data-handle={handle.pos} rx="1.5"
            style="cursor: {handle.cursor};">
        {#if appState.tooltipsEnabled}
          <title>Drag to resize workspace</title>
        {/if}
      </rect>
    {/each}
  </g>
{/if}
