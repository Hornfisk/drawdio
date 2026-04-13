<script lang="ts">
  import type { ComponentData } from '../types.js';
  import { getEntry } from '../registry.js';
  import EffectsOverlay from './EffectsOverlay.svelte';

  let { data }: { data: ComponentData } = $props();

  const entry = $derived(getEntry(data.type));
  const filterId = $derived('fx-' + data.id);

  const hasFilter = $derived(
    data.effects?.drop_shadow?.enabled ||
    data.effects?.inner_shadow?.enabled ||
    data.effects?.blur_glow?.enabled ||
    data.effects?.bevel?.enabled
  );
</script>

{#if entry}
  {@const Component = entry.component}
  <g data-id={data.id}
     transform="translate({data.x}, {data.y})"
     style="cursor: move;"
     filter={hasFilter ? `url(#${filterId})` : undefined}>
    <Component {data} />
    <EffectsOverlay {data} />
  </g>
{/if}
