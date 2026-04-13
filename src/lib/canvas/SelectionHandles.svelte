<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';

  const hs = 6; // handle size

  interface HandlePos {
    x: number;
    y: number;
    cursor: string;
    pos: string;
  }

  function getHandles(w: number, h: number): HandlePos[] {
    return [
      { x: -hs / 2 - 2, y: -hs / 2 - 2, cursor: 'nwse-resize', pos: 'tl' },
      { x: w / 2 - hs / 2, y: -hs / 2 - 2, cursor: 'ns-resize', pos: 'tc' },
      { x: w + 2 - hs / 2, y: -hs / 2 - 2, cursor: 'nesw-resize', pos: 'tr' },
      { x: w + 2 - hs / 2, y: h / 2 - hs / 2, cursor: 'ew-resize', pos: 'mr' },
      { x: w + 2 - hs / 2, y: h + 2 - hs / 2, cursor: 'nwse-resize', pos: 'br' },
      { x: w / 2 - hs / 2, y: h + 2 - hs / 2, cursor: 'ns-resize', pos: 'bc' },
      { x: -hs / 2 - 2, y: h + 2 - hs / 2, cursor: 'nesw-resize', pos: 'bl' },
      { x: -hs / 2 - 2, y: h / 2 - hs / 2, cursor: 'ew-resize', pos: 'ml' },
    ];
  }
</script>

{#each getSelectedComponents() as comp (comp.id)}
  <g data-selection-for={comp.id}
     transform="translate({comp.x}, {comp.y})">
    <!-- Dashed border -->
    <rect x="-2" y="-2"
          width={comp.width + 4} height={comp.height + 4}
          fill="none" stroke="#4fc3f7" stroke-width="0.8"
          stroke-dasharray="4,3" />

    <!-- 8 resize handles -->
    {#each getHandles(comp.width, comp.height) as handle}
      <rect x={handle.x} y={handle.y}
            width={hs} height={hs}
            fill="#4fc3f7" stroke="#0d0d1a" stroke-width="1"
            data-handle={handle.pos} rx="1"
            style="cursor: {handle.cursor};" />
    {/each}
  </g>
{/each}
