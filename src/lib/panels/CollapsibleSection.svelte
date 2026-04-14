<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';

  let { title, children, collapsed = false }: {
    title: string;
    children: Snippet;
    collapsed?: boolean;
  } = $props();

  // untrack tells Svelte this initial capture is intentional — locally mutable
  let isCollapsed = $state(untrack(() => collapsed));
</script>

<div
  class="props-heading"
  class:collapsed={isCollapsed}
  onclick={() => isCollapsed = !isCollapsed}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter') isCollapsed = !isCollapsed; }}
>
  {title}
</div>
<div class="props-section" class:collapsed={isCollapsed}>
  {@render children()}
</div>
