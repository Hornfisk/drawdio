<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getRubberBand } from '../interaction/drag.svelte.js';

  const rb = $derived(getRubberBand());
</script>

{#if rb}
  <rect x={rb.x} y={rb.y} width={rb.w} height={rb.h}
        fill={appState.accentColor} fill-opacity="0.1"
        stroke={appState.accentColor} stroke-width="0.5"
        stroke-dasharray="4,3" />
{/if}
