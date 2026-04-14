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
              {#if item.type === 'rotary_knob'}
                <circle cx="10" cy="10" r="8" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>
                <line x1="10" y1="10" x2="10" y2="3" stroke="#4fc3f7" stroke-width="1.5" stroke-linecap="round"/>
              {:else if item.type === 'horizontal_slider'}
                <rect x="0" y="7.5" width="20" height="3.5" rx="1.5" fill="#555"/>
                <circle cx="12" cy="9.25" r="5" fill="#4fc3f7"/>
              {:else if item.type === 'vertical_slider'}
                <rect x="8.5" y="0" width="3" height="20" rx="1.5" fill="#555"/>
                <rect x="4" y="7" width="12" height="5" rx="2" fill="#4fc3f7"/>
              {:else if item.type === 'momentary_button'}
                <rect x="1" y="3" width="18" height="14" rx="3" fill="#333" stroke="#4fc3f7" stroke-width="1"/>
              {:else if item.type === 'toggle_switch'}
                <rect x="1" y="5" width="18" height="10" rx="5" fill="#333"/>
                <circle cx="14" cy="10" r="4" fill="#4fc3f7"/>
              {:else if item.type === 'dropdown'}
                <rect x="1" y="4" width="18" height="12" rx="2" fill="#222" stroke="#555" stroke-width="1"/>
                <path d="M 12 8 L 15 12 L 18 8" fill="none" stroke="#888" stroke-width="1"/>
              {:else if item.type === 'xy_pad'}
                <rect x="1" y="1" width="18" height="18" rx="1" fill="none" stroke="#555" stroke-width="1"/>
                <line x1="10" y1="1" x2="10" y2="19" stroke="#333" stroke-width="0.5"/>
                <line x1="1" y1="10" x2="19" y2="10" stroke="#333" stroke-width="0.5"/>
                <circle cx="14" cy="6" r="3" fill="#4fc3f7"/>
              {:else if item.type === 'level_meter'}
                <rect x="1" y="13" width="4" height="6" fill="#66bb6a"/>
                <rect x="6" y="9" width="4" height="10" fill="#66bb6a"/>
                <rect x="11" y="5" width="4" height="14" fill="#66bb6a"/>
                <rect x="11" y="1" width="4" height="3" fill="#ef5350" fill-opacity="0.5"/>
              {:else if item.type === 'waveform_display'}
                <rect x="0" y="0" width="20" height="20" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
                <path d="M 1 10 Q 4 3 7 10 Q 10 17 13 10 Q 16 3 19 10" fill="none" stroke="#4fc3f7" stroke-width="1.2"/>
              {:else if item.type === 'spectrum_analyzer'}
                <rect x="0" y="0" width="20" height="20" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
                <rect x="2" y="12" width="2" height="7" fill="#4fc3f7"/>
                <rect x="5.5" y="7" width="2" height="12" fill="#4fc3f7"/>
                <rect x="9" y="9" width="2" height="10" fill="#4fc3f7"/>
                <rect x="12.5" y="4" width="2" height="15" fill="#4fc3f7"/>
                <rect x="16" y="11" width="2" height="8" fill="#4fc3f7"/>
              {:else if item.type === 'step_sequencer'}
                <rect x="0" y="4" width="4" height="12" rx="1" fill="#4fc3f7"/>
                <rect x="5" y="4" width="4" height="12" rx="1" fill="#1a1a2a" stroke="#444" stroke-width="0.5"/>
                <rect x="10" y="4" width="4" height="12" rx="1" fill="#4fc3f7"/>
                <rect x="15" y="4" width="4" height="12" rx="1" fill="#4fc3f7"/>
              {:else if item.type === 'label_text'}
                <text x="2" y="14" fill="#ccc" font-size="12" font-family="system-ui, sans-serif" font-weight="bold">Aa</text>
              {:else if item.type === 'led_indicator'}
                <circle cx="10" cy="10" r="7" fill="#ef5350"/>
                <circle cx="7.5" cy="7.5" r="2.5" fill="#fff" fill-opacity="0.25"/>
              {:else if item.type === 'value_readout'}
                <rect x="0" y="3" width="20" height="14" rx="2" fill="#111" stroke="#333" stroke-width="0.5"/>
                <text x="10" y="13" text-anchor="middle" fill="#4fc3f7" font-size="7" font-family="monospace">440Hz</text>
              {:else if item.type === 'panel_group'}
                <rect x="0" y="2" width="20" height="16" rx="3" fill="#1a1a2a" fill-opacity="0.6" stroke="#555" stroke-width="1"/>
                <text x="3" y="14" fill="#888" font-size="6" font-family="system-ui">Panel</text>
              {:else if item.type === 'separator'}
                <line x1="0" y1="10" x2="20" y2="10" stroke="#666" stroke-width="1.5"/>
              {:else if item.type === 'section_header'}
                <text x="1" y="10" fill="#ccc" font-size="7" font-weight="bold" font-family="system-ui">HDR</text>
                <line x1="0" y1="13" x2="20" y2="13" stroke="#555" stroke-width="0.75"/>
              {:else if item.type === 'image_placeholder'}
                <rect x="1" y="2" width="18" height="16" fill="none" stroke="#555" stroke-width="1" stroke-dasharray="2,2"/>
                <line x1="1" y1="2" x2="19" y2="18" stroke="#555" stroke-width="0.5"/>
                <line x1="19" y1="2" x2="1" y2="18" stroke="#555" stroke-width="0.5"/>
              {:else}
                <rect x="2" y="2" width="16" height="16" rx="2" fill="#333"/>
              {/if}
            </svg>
          </div>
          <span class="palette-label">{item.entry.displayName}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>
