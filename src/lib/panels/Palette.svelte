<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { entriesByCategory } from '../components/registry.js';
  import { createComponent } from '../state/actions.js';
  import { select } from '../state/selection.js';
  import { snap } from '../utils/geometry.js';

  let searchQuery = $state('');
  let collapsedCats = $state(new Set<string>());

  const categories = $derived(entriesByCategory());
  const CATEGORY_ORDER = ['Controls', 'Display', 'Layout'];

  const filteredCategories = $derived.by(() => {
    const q = searchQuery.toLowerCase();
    const result = new Map<string, { type: string; entry: ReturnType<typeof entriesByCategory> extends Map<string, (infer T)[]> ? T : never }[]>();
    for (const cat of CATEGORY_ORDER) {
      const items = categories.get(cat);
      if (!items) continue;
      const filtered = q
        ? items.filter(i => i.entry.displayName.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
        : items;
      if (filtered.length > 0) result.set(cat, filtered);
    }
    return result;
  });

  // Drag-to-canvas state
  let dragGhost: HTMLDivElement | null = null;
  let dragType: string | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  const DRAG_THRESHOLD = 4;

  function onItemMouseDown(e: MouseEvent, type: string) {
    dragType = type;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    function onMouseMove(me: MouseEvent) {
      const dist = Math.abs(me.clientX - dragStartX) + Math.abs(me.clientY - dragStartY);
      if (dist > DRAG_THRESHOLD && !dragGhost && dragType) {
        const entry = categories.get('Controls')?.find(i => i.type === dragType)
          || categories.get('Display')?.find(i => i.type === dragType)
          || categories.get('Layout')?.find(i => i.type === dragType);
        if (entry) {
          dragGhost = document.createElement('div');
          dragGhost.className = 'palette-drag-ghost';
          dragGhost.textContent = entry.entry.displayName;
          document.body.appendChild(dragGhost);
        }
      }
      if (dragGhost) {
        dragGhost.style.left = me.clientX + 12 + 'px';
        dragGhost.style.top = me.clientY - 12 + 'px';
        document.body.style.cursor = 'grabbing';
      }
    }

    function onMouseUp(me: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';

      if (dragGhost) {
        dragGhost.remove();
        dragGhost = null;

        // Check if dropped on canvas
        const canvasContainer = document.querySelector('.canvas-container');
        const svgEl = canvasContainer?.querySelector('svg');
        if (canvasContainer && svgEl) {
          const rect = canvasContainer.getBoundingClientRect();
          if (me.clientX >= rect.left && me.clientX <= rect.right &&
              me.clientY >= rect.top && me.clientY <= rect.bottom) {
            // Import screenToCanvas
            const ctm = svgEl.getScreenCTM();
            if (ctm && dragType) {
              const inv = ctm.inverse();
              const cx = inv.a * me.clientX + inv.c * me.clientY + inv.e;
              const cy = inv.b * me.clientX + inv.d * me.clientY + inv.f;
              const snapped = snap(cx, cy);
              const comp = createComponent(dragType, snapped.x, snapped.y);
              if (comp) select(comp.id);
            }
          }
        }
      } else if (dragType) {
        // Click-to-place mode
        appState.placingType = dragType;
      }

      dragType = null;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }

  function toggleCategory(cat: string) {
    const next = new Set(collapsedCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    collapsedCats = next;
  }
</script>

<div class="palette">
  <input class="palette-search" type="text" placeholder="Search..."
         bind:value={searchQuery} />

  {#each [...filteredCategories.entries()] as [cat, items]}
    <div class="palette-category" class:collapsed={collapsedCats.has(cat)}>
      <div class="palette-heading" class:collapsed={collapsedCats.has(cat)}
           onclick={() => toggleCategory(cat)}
           role="button" tabindex="0"
           onkeydown={(e) => { if (e.key === 'Enter') toggleCategory(cat); }}>
        {cat}
      </div>
      {#each items as item}
        <div class="palette-item"
             class:placing={appState.placingType === item.type}
             onmousedown={(e) => onItemMouseDown(e, item.type)}
             role="button" tabindex="0">
          <div class="palette-icon">
            <svg width="20" height="20" viewBox="0 0 20 20">
              {#if item.entry.category === 'Controls'}
                <circle cx="10" cy="10" r="7" fill="none" stroke="#4fc3f7" stroke-width="1" />
              {:else if item.entry.category === 'Display'}
                <rect x="3" y="3" width="14" height="14" rx="2" fill="none" stroke="#66bb6a" stroke-width="1" />
              {:else}
                <rect x="2" y="2" width="16" height="16" rx="1" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="2,2" />
              {/if}
            </svg>
          </div>
          <span class="palette-label">{item.entry.displayName}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>
