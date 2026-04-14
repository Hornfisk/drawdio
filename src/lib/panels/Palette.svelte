<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import type { UserAsset } from '../state/app.svelte.js';
  import { entriesByCategory } from '../components/registry.js';
  import type { RegistryEntry } from '../components/registry.js';
  import { createComponent } from '../state/actions.js';
  import { select } from '../state/selection.js';
  import PaletteIcon from './PaletteIcon.svelte';
  import { BUILTIN_KNOBS } from '../components/builtin-knobs.js';
  import type { BuiltinKnob } from '../components/builtin-knobs.js';
  import { BUILTIN_TEXTURES } from '../components/builtin-textures.js';
  import type { BuiltinTexture } from '../components/builtin-textures.js';
  import { createDragHandler } from '../utils/drag-to-canvas.js';
  import { fetchAssetAsDataUrl } from '../utils/fetch-asset.js';

  let searchQuery = $state('');
  let collapsedCats = $state(new Set<string>());
  let activeVariants = $state(new Map<string, string>());

  const categories = $derived(entriesByCategory());
  const CATEGORY_ORDER = ['Controls', 'Display', 'Layout'];

  interface DisplayItem {
    type: string;
    entry: RegistryEntry;
    variants?: { type: string; label: string }[];
  }

  const filteredCategories = $derived.by(() => {
    const q = searchQuery.toLowerCase();
    const result = new Map<string, DisplayItem[]>();

    for (const cat of CATEGORY_ORDER) {
      const items = categories.get(cat);
      if (!items) continue;
      const filtered = q
        ? items.filter(i => i.entry.displayName.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
        : items;
      if (filtered.length === 0) continue;

      const seen = new Set<string>();
      const display: DisplayItem[] = [];

      for (const item of filtered) {
        const vg = item.entry.variantGroup;
        if (vg) {
          if (seen.has(vg)) continue;
          seen.add(vg);
          const allVariants = (categories.get(cat) || []).filter(i => i.entry.variantGroup === vg);
          const variants = allVariants.map(v => ({ type: v.type, label: v.entry.variantLabel || v.entry.displayName }));
          const activeType = activeVariants.get(vg) ?? allVariants[0].type;
          const activeItem = allVariants.find(v => v.type === activeType) || allVariants[0];
          display.push({ type: activeItem.type, entry: activeItem.entry, variants });
        } else {
          display.push({ type: item.type, entry: item.entry });
        }
      }

      result.set(cat, display);
    }
    return result;
  });

  // Lazily initialise missing variant selections whenever categories change.
  $effect(() => {
    for (const [, items] of categories) {
      for (const item of items) {
        const vg = item.entry.variantGroup;
        if (vg && !activeVariants.has(vg)) {
          activeVariants = new Map(activeVariants).set(vg, item.type);
        }
      }
    }
  });

  function setVariant(group: string, type: string) {
    activeVariants = new Map(activeVariants).set(group, type);
  }

  function toggleCategory(cat: string) {
    const next = new Set(collapsedCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    collapsedCats = next;
  }

  // ---- Component items ----
  let knobLibExpanded = $state(false);
  let seqLibExpanded = $state(false);

  function onItemMouseDown(e: MouseEvent, type: string) {
    const entry =
      categories.get('Controls')?.find(i => i.type === type) ||
      categories.get('Display')?.find(i => i.type === type) ||
      categories.get('Layout')?.find(i => i.type === type);
    const label = entry?.entry.displayName ?? type;

    createDragHandler({
      label,
      onDrop(cx, cy) {
        const comp = createComponent(type, cx, cy);
        if (comp) select(comp.id);
      },
      onClick() {
        appState.placingType = type;
      },
    })(e);
  }

  // ---- Builtin knobs ----
  function onKnobMouseDown(e: MouseEvent, knob: BuiltinKnob) {
    appState.placingType = null;
    createDragHandler({
      label: knob.name,
      async onDrop(cx, cy) {
        try {
          const dataUrl = await fetchAssetAsDataUrl(knob.src);
          const comp = createComponent('image_placeholder', cx, cy);
          if (comp) {
            comp.width = 80; comp.height = 80;
            comp.properties.imageDataUrl = dataUrl;
            comp.properties.imageName = knob.name;
            comp.label = knob.name;
            select(comp.id);
          }
        } catch (err) {
          console.error('Failed to load knob:', err);
        }
      },
      async onClick() {
        try {
          const dataUrl = await fetchAssetAsDataUrl(knob.src);
          const comp = createComponent('image_placeholder',
            appState.canvasWidth / 2 - 40,
            appState.canvasHeight / 2 - 40);
          if (comp) {
            comp.width = 80; comp.height = 80;
            comp.properties.imageDataUrl = dataUrl;
            comp.properties.imageName = knob.name;
            comp.label = knob.name;
            select(comp.id);
          }
        } catch (err) {
          console.error('Failed to load knob:', err);
        }
      },
    })(e);
  }

  // ---- Builtin textures ----
  let texturesCollapsed = $state(true);

  function applyTextureToSelectedPanel(dataUrl: string, name: string): boolean {
    if (appState.selectedIds.length !== 1) return false;
    const comp = appState.components.find(c => c.id === appState.selectedIds[0]);
    if (!comp || comp.type !== 'panel_group') return false;
    comp.properties.textureDataUrl = dataUrl;
    comp.properties.textureOpacity = comp.properties.textureOpacity ?? 0.8;
    comp.properties.textureOffsetX = 0;
    comp.properties.textureOffsetY = 0;
    comp.properties.textureScale = 1;
    comp.properties.textureBlend = comp.properties.textureBlend ?? 'multiply';
    appState.isDirty = true;
    return true;
  }

  function onTextureMouseDown(e: MouseEvent, tex: BuiltinTexture) {
    appState.placingType = null;
    createDragHandler({
      label: tex.name,
      async onDrop(cx, cy) {
        try {
          const dataUrl = await fetchAssetAsDataUrl(tex.src);
          if (!applyTextureToSelectedPanel(dataUrl, tex.name)) {
            const comp = createComponent('image_placeholder', cx, cy);
            if (comp) {
              comp.properties.imageDataUrl = dataUrl;
              comp.properties.imageName = tex.name;
              comp.label = tex.name;
              select(comp.id);
            }
          }
        } catch (err) {
          console.error('Failed to load texture:', err);
        }
      },
      async onClick() {
        try {
          const dataUrl = await fetchAssetAsDataUrl(tex.src);
          if (!applyTextureToSelectedPanel(dataUrl, tex.name)) {
            const comp = createComponent('image_placeholder',
              appState.canvasWidth / 2,
              appState.canvasHeight / 2);
            if (comp) {
              comp.properties.imageDataUrl = dataUrl;
              comp.properties.imageName = tex.name;
              comp.label = tex.name;
              select(comp.id);
            }
          }
        } catch (err) {
          console.error('Failed to load texture:', err);
        }
      },
    })(e);
  }

  // ---- User assets ----
  let assetsCollapsed = $state(false);

  function addAssets() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          const asset: UserAsset = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^.]+$/, ''),
            dataUrl: reader.result as string,
          };
          appState.userAssets = [...appState.userAssets, asset];
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function removeAsset(id: string) {
    appState.userAssets = appState.userAssets.filter(a => a.id !== id);
  }

  function onAssetMouseDown(e: MouseEvent, asset: UserAsset) {
    appState.placingType = null;
    createDragHandler({
      label: asset.name,
      onDrop(cx, cy) {
        const comp = createComponent('image_placeholder', cx, cy);
        if (comp) {
          comp.properties.imageDataUrl = asset.dataUrl;
          comp.properties.imageName = asset.name;
          comp.label = asset.name;
          select(comp.id);
        }
      },
      // Assets don't support click-to-place
    })(e);
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
        {@const vg = item.entry.variantGroup}
        <div class="palette-item-group">
          {#if item.variants && item.variants.length > 1 && vg}
            <div class="palette-variant-tabs">
              {#each item.variants as v}
                <button class="palette-variant-tab" class:active={item.type === v.type}
                        onclick={(e) => { e.stopPropagation(); setVariant(vg, v.type); }}
                        tabindex="0">
                  {v.label}
                </button>
              {/each}
            </div>
          {/if}
          <div class="palette-item"
               class:placing={appState.placingType === item.type}
               onmousedown={(e) => onItemMouseDown(e, item.type)}
               onkeydown={(e) => {
                 if ((e.key === 'Enter' || e.key === ' ') && vg !== 'sequencer') {
                   e.preventDefault();
                   appState.placingType = item.type;
                 }
               }}
               role="button" tabindex="0"
               aria-label="{vg === 'sequencer' ? 'Sequencer — click arrow for variants' : item.entry.displayName + ' — drag to canvas or press Enter to place'}"
               aria-pressed={appState.placingType === item.type}
               title="{vg === 'sequencer' ? 'Sequencer — click arrow for variants' : item.entry.displayName + ' — drag to canvas or press Enter to place'}">
            <div class="palette-icon">
              <svg width="20" height="20" viewBox="0 0 20 20">
                {#if item.type === 'rotary_knob'}
                  <circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
                  <line x1="10" y1="10" x2="10" y2="3" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
                {:else if item.type === 'vertical_slider'}
                  <rect x="8.5" y="0" width="3" height="20" rx="1.5" fill="#555"/>
                  <rect x="4" y="7" width="12" height="5" rx="2" fill="var(--accent)"/>
                {:else if item.type === 'momentary_button'}
                  <rect x="1" y="3" width="18" height="14" rx="3" fill="#333" stroke="var(--accent)" stroke-width="1"/>
                {:else if item.type === 'toggle_switch'}
                  <rect x="1" y="5" width="18" height="10" rx="5" fill="#333"/>
                  <circle cx="14" cy="10" r="4" fill="var(--accent)"/>
                {:else if item.type === 'dropdown'}
                  <rect x="1" y="4" width="18" height="12" rx="2" fill="#222" stroke="#555" stroke-width="1"/>
                  <path d="M 12 8 L 15 12 L 18 8" fill="none" stroke="#888" stroke-width="1"/>
                {:else if item.type === 'xy_pad'}
                  <rect x="1" y="1" width="18" height="18" rx="1" fill="none" stroke="#555" stroke-width="1"/>
                  <line x1="10" y1="1" x2="10" y2="19" stroke="#333" stroke-width="0.5"/>
                  <line x1="1" y1="10" x2="19" y2="10" stroke="#333" stroke-width="0.5"/>
                  <circle cx="14" cy="6" r="3" fill="var(--accent)"/>
                {:else if item.type === 'midi_keyboard'}
                  <!-- White keys -->
                  <rect x="0" y="4" width="3" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <rect x="3.5" y="4" width="3" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <rect x="7" y="4" width="3" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <rect x="10.5" y="4" width="3" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <rect x="14" y="4" width="3" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <rect x="17.5" y="4" width="2.5" height="12" rx="0.5" fill="#e0e0dc" stroke="#555" stroke-width="0.4"/>
                  <!-- Black keys -->
                  <rect x="2" y="4" width="2.2" height="7.5" rx="0.5" fill="#1a1a1a"/>
                  <rect x="5.5" y="4" width="2.2" height="7.5" rx="0.5" fill="#1a1a1a"/>
                  <rect x="12" y="4" width="2.2" height="7.5" rx="0.5" fill="#1a1a1a"/>
                  <rect x="15.5" y="4" width="2.2" height="7.5" rx="0.5" fill="#1a1a1a"/>
                {:else if item.type === 'level_meter'}
                  <rect x="1" y="13" width="4" height="6" fill="#66bb6a"/>
                  <rect x="6" y="9" width="4" height="10" fill="#66bb6a"/>
                  <rect x="11" y="5" width="4" height="14" fill="#66bb6a"/>
                  <rect x="11" y="1" width="4" height="3" fill="#ef5350" fill-opacity="0.5"/>
                {:else if item.type === 'waveform_display'}
                  <rect x="0" y="0" width="20" height="20" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
                  <path d="M 1 10 Q 4 3 7 10 Q 10 17 13 10 Q 16 3 19 10" fill="none" stroke="var(--accent)" stroke-width="1.2"/>
                {:else if item.type === 'spectrum_analyzer'}
                  <rect x="0" y="0" width="20" height="20" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
                  <rect x="2" y="12" width="2" height="7" fill="var(--accent)"/>
                  <rect x="5.5" y="7" width="2" height="12" fill="var(--accent)"/>
                  <rect x="9" y="9" width="2" height="10" fill="var(--accent)"/>
                  <rect x="12.5" y="4" width="2" height="15" fill="var(--accent)"/>
                  <rect x="16" y="11" width="2" height="8" fill="var(--accent)"/>
                {:else if item.type === 'step_sequencer'}
                  <rect x="0" y="4" width="4" height="12" rx="1" fill="var(--accent)"/>
                  <rect x="5" y="4" width="4" height="12" rx="1" fill="#2a2a3a" stroke="#444" stroke-width="0.5"/>
                  <rect x="10" y="4" width="4" height="12" rx="1" fill="var(--accent)"/>
                  <rect x="15" y="4" width="4" height="12" rx="1" fill="var(--accent)"/>
                {:else if item.type === 'acid_step_sequencer'}
                  <rect x="0" y="0" width="20" height="20" rx="1" fill="#0e0e10"/>
                  <rect x="0" y="1" width="4" height="4" rx="0.5" fill="#c42a2a"/>
                  <rect x="5" y="1" width="4" height="4" rx="0.5" fill="#2a2a30"/>
                  <rect x="10" y="1" width="4" height="4" rx="0.5" fill="#f0dc3c"/>
                  <rect x="15" y="1" width="4" height="4" rx="0.5" fill="#2a2a30"/>
                  <rect x="0" y="6" width="4" height="13" rx="0.5" fill="#1c1c20"/>
                  <rect x="5" y="6" width="4" height="13" rx="0.5" fill="#1c1c20"/>
                  <rect x="10" y="6" width="4" height="13" rx="0.5" fill="#1c1c20"/>
                  <rect x="15" y="6" width="4" height="13" rx="0.5" fill="#1c1c20"/>
                  <rect x="1" y="10" width="2" height="2" rx="0.5" fill="#bababc"/>
                  <rect x="6" y="14" width="2" height="2" rx="0.5" fill="#bababc"/>
                  <rect x="11" y="8" width="2" height="2" rx="0.5" fill="#782818"/>
                  <rect x="16" y="12" width="2" height="2" rx="0.5" fill="#bababc"/>
                {:else if item.type === 'label_text'}
                  <text x="2" y="14" fill="#ccc" font-size="12" font-family="system-ui, sans-serif" font-weight="bold">Aa</text>
                {:else if item.type === 'led_indicator'}
                  <circle cx="10" cy="10" r="7" fill="#ef5350"/>
                  <circle cx="7.5" cy="7.5" r="2.5" fill="#fff" fill-opacity="0.25"/>
                {:else if item.type === 'value_readout'}
                  <rect x="0" y="3" width="20" height="14" rx="2" fill="#111" stroke="#333" stroke-width="0.5"/>
                  <text x="10" y="13" text-anchor="middle" fill="var(--accent)" font-size="7" font-family="monospace">440Hz</text>
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
            {#if item.type === 'rotary_knob'}
              <button class="palette-lib-arrow"
                      class:open={knobLibExpanded}
                      onmousedown={(e) => e.stopPropagation()}
                      onclick={(e) => { e.stopPropagation(); knobLibExpanded = !knobLibExpanded; }}
                      title="Knob photo library">▾</button>
            {/if}
          </div>
          {#if item.type === 'rotary_knob' && knobLibExpanded}
            <div class="palette-knobs-grid palette-knobs-grid-inline">
              {#each BUILTIN_KNOBS as knob}
                <div class="palette-knob-item"
                     title="{knob.name} — drag to canvas or click to place"
                     onmousedown={(e) => onKnobMouseDown(e, knob)}
                     role="button" tabindex="0">
                  <img src={knob.src} alt={knob.name} draggable="false" class="palette-knob-thumb" />
                  <span class="palette-knob-label">{knob.name}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}

  <!-- ---- Builtin Textures section ---- -->
  <div class="palette-category">
    <div class="palette-heading" class:collapsed={texturesCollapsed}
         onclick={() => texturesCollapsed = !texturesCollapsed}
         role="button" tabindex="0"
         onkeydown={(e) => { if (e.key === 'Enter') texturesCollapsed = !texturesCollapsed; }}>
      Textures
    </div>
    {#if !texturesCollapsed}
      <div class="palette-textures-hint">Click to apply to selected panel, or drag to canvas</div>
      <div class="palette-knobs-grid">
        {#each BUILTIN_TEXTURES as tex}
          <div class="palette-knob-item"
               title="{tex.name} — click to apply to selected panel, or drag to canvas"
               onmousedown={(e) => onTextureMouseDown(e, tex)}
               role="button" tabindex="0">
            <img src={tex.src} alt={tex.name} draggable="false" class="palette-knob-thumb palette-texture-thumb" />
            <span class="palette-knob-label">{tex.name}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ---- User Assets section ---- -->
  <div class="palette-category">
    <div class="palette-heading" class:collapsed={assetsCollapsed}
         onclick={() => assetsCollapsed = !assetsCollapsed}
         role="button" tabindex="0"
         onkeydown={(e) => { if (e.key === 'Enter') assetsCollapsed = !assetsCollapsed; }}>
      Assets
    </div>
    {#if !assetsCollapsed}
      <button class="palette-add-assets-btn" onclick={addAssets} title="Add image files (PNG, SVG, JPEG, WebP)">
        + Add Assets
      </button>
      {#if appState.userAssets.length === 0}
        <div class="palette-assets-hint">Drag PNG, SVG, JPEG or WebP files onto the canvas, or click "+ Add Assets" to import.</div>
      {/if}
      {#each appState.userAssets as asset}
        <div class="palette-item palette-asset-item"
             onmousedown={(e) => onAssetMouseDown(e, asset)}
             role="button" tabindex="0">
          <div class="palette-icon palette-asset-thumb">
            <img src={asset.dataUrl} alt={asset.name} draggable="false" />
          </div>
          <span class="palette-label palette-asset-name" title={asset.name}>{asset.name}</span>
          <button class="palette-asset-remove" title="Remove asset"
                  onclick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                  onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeAsset(asset.id); } }}>
            ×
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
