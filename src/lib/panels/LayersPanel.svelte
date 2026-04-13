<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSortedComponents } from '../state/derived.svelte.js';
  import { select, isSelected } from '../state/selection.js';
  import { getEntry } from '../components/registry.js';
  import { bringForward, sendBackward } from '../state/zorder.js';

  // Sort by zIndex descending (top-most first in the list)
  const layerItems = $derived(
    [...getSortedComponents()].reverse()
  );

  function toggleVisibility(e: MouseEvent, comp: typeof layerItems[0]) {
    e.stopPropagation();
    comp.visible = comp.visible === false ? true : false;
    appState.isDirty = true;
  }

  function moveUp(e: MouseEvent, compId: string) {
    e.stopPropagation();
    bringForward([compId]);
  }

  function moveDown(e: MouseEvent, compId: string) {
    e.stopPropagation();
    sendBackward([compId]);
  }
</script>

<div class="layers-panel">
  <div class="layers-heading">Layers</div>
  {#each layerItems as comp (comp.id)}
    {@const entry = getEntry(comp.type)}
    <div class="layer-item"
         class:selected={isSelected(comp.id)}
         class:hidden-layer={comp.visible === false}
         onclick={() => select(comp.id)}
         role="button" tabindex="0">
      <span class="layer-eye"
            title={comp.visible !== false ? 'Hide' : 'Show'}
            onclick={(e) => toggleVisibility(e, comp)}
            role="button" tabindex="0">
        {comp.visible !== false ? '\u25C9' : '\u25CE'}
      </span>
      <span class="layer-name">{comp.label || comp.id}</span>
      <span class="layer-type">{entry?.displayName || ''}</span>
      <span class="layer-arrows">
        <span class="layer-arrow" title="Move up"
              onclick={(e) => moveUp(e, comp.id)}
              role="button" tabindex="0">{'\u25B4'}</span>
        <span class="layer-arrow" title="Move down"
              onclick={(e) => moveDown(e, comp.id)}
              role="button" tabindex="0">{'\u25BE'}</span>
      </span>
    </div>
  {/each}
</div>
