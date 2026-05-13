<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSnapGuides } from '../interaction/drag.svelte.js';

  const guides = $derived(getSnapGuides());
  const stroke = $derived(appState.accentColor);
</script>

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
