<script lang="ts">
  import { getRubberBand } from '../interaction/drag.svelte.js';

  const rb = $derived(getRubberBand());
</script>

{#if rb}
  <rect x={rb.x} y={rb.y} width={rb.w} height={rb.h}
        fill="#4fc3f7" fill-opacity="0.1"
        stroke="#4fc3f7" stroke-width="0.5"
        stroke-dasharray="4,3" />
{/if}
