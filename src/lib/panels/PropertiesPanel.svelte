<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';
  import { getEntry } from '../components/registry.js';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import EffectsEditor from './EffectsEditor.svelte';
  import ColorField from '../ui/ColorField.svelte';
  import { swatchState } from '../ui/swatches.svelte.js';

  const selected = $derived(
    getSelectedComponents().length === 1 ? getSelectedComponents()[0] : null
  );
  const entry = $derived(selected ? getEntry(selected.type) : null);

  // --- Reference image loader (used by drop hint button) ---
  function loadRefImageFromPanel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          if (appState.components.length > 0) {
            if (!confirm(`Resize canvas to ${img.naturalWidth}×${img.naturalHeight}px?`)) {
              appState.refImageDataUrl = dataUrl;
              appState.refImageVisible = true;
              appState.isDirty = true;
              return;
            }
          }
          appState.canvasWidth = img.naturalWidth;
          appState.canvasHeight = img.naturalHeight;
          appState.refImageDataUrl = dataUrl;
          appState.refImageVisible = true;
          appState.isDirty = true;
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // --- Panel texture loader ---
  function loadPanelTexture() {
    if (!selected) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        selected!.properties.textureDataUrl = reader.result as string;
        selected!.properties.textureOpacity = selected!.properties.textureOpacity ?? 0.8;
        selected!.properties.textureOffsetX = 0;
        selected!.properties.textureOffsetY = 0;
        selected!.properties.textureScale = 1;
        selected!.properties.textureBlend = selected!.properties.textureBlend ?? 'multiply';
        appState.isDirty = true;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function setProp(path: string, value: unknown) {
    if (!selected) return;
    const parts = path.split('.');
    let obj: Record<string, unknown> = selected as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = value;
    appState.isDirty = true;
  }

  function getProp(path: string): unknown {
    if (!selected) return undefined;
    const parts = path.split('.');
    let obj: unknown = selected;
    for (const part of parts) {
      obj = (obj as Record<string, unknown>)[part];
    }
    return obj;
  }
</script>

{#if selected && entry}
  <CollapsibleSection title={entry.displayName}>
    <!-- Label -->
    <div class="props-row">
      <span class="props-label">Label</span>
      <input class="props-input" value={selected.label}
             oninput={(e) => { selected.label = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
    </div>
  </CollapsibleSection>

  <CollapsibleSection title="Position">
    <div class="props-row">
      <span class="props-label">X</span>
      <input class="props-input props-input-sm" type="number" value={selected.x}
             oninput={(e) => { selected.x = Number((e.target as HTMLInputElement).value); appState.isDirty = true; }} />
      <span class="props-label">Y</span>
      <input class="props-input props-input-sm" type="number" value={selected.y}
             oninput={(e) => { selected.y = Number((e.target as HTMLInputElement).value); appState.isDirty = true; }} />
    </div>
    <div class="props-row">
      <span class="props-label">W</span>
      <input class="props-input props-input-sm" type="number" value={selected.width} min="10"
             oninput={(e) => { selected.width = Math.max(10, Number((e.target as HTMLInputElement).value)); appState.isDirty = true; }} />
      <span class="props-label">H</span>
      <input class="props-input props-input-sm" type="number" value={selected.height} min="10"
             oninput={(e) => { selected.height = Math.max(10, Number((e.target as HTMLInputElement).value)); appState.isDirty = true; }} />
    </div>
    <div class="props-row">
      <span class="props-label">Rot°</span>
      <input class="props-input props-input-sm" type="number" value={selected.rotation || 0}
             min="0" max="360" step="1"
             oninput={(e) => { selected.rotation = ((Number((e.target as HTMLInputElement).value) % 360) + 360) % 360; appState.isDirty = true; }} />
    </div>
    <div class="props-row">
      <span class="props-label">Lock</span>
      <input type="checkbox" checked={!!selected.locked}
             onchange={(e) => { selected.locked = (e.target as HTMLInputElement).checked; appState.isDirty = true; }} />
    </div>
  </CollapsibleSection>

  <CollapsibleSection title="Appearance">
    <div class="color-swatches">
      {#each swatchState.list as swatch}
        <div
          class="color-swatch"
          class:active={selected.color === swatch}
          style="background: {swatch};"
          title={swatch}
          onclick={() => { selected.color = swatch; appState.isDirty = true; }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') { selected.color = swatch; appState.isDirty = true; } }}
        ></div>
      {/each}
    </div>
    <div class="props-row">
      <span class="props-label">Color</span>
      <ColorField color={selected.color}
                  onchange={(hex) => { selected.color = hex; appState.isDirty = true; }} />
    </div>
  </CollapsibleSection>

  {#if entry.editableProperties.length > 0}
    <CollapsibleSection title="Parameters">
      {#each entry.editableProperties as prop}
        <div class="props-row">
          <span class="props-label">{prop.label}</span>
          {#if prop.type === 'checkbox'}
            <input type="checkbox" checked={getProp(prop.propPath || prop.key) as boolean}
                   onchange={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLInputElement).checked)} />
          {:else if prop.type === 'number'}
            <input class="props-input props-input-sm" type="number"
                   value={getProp(prop.propPath || prop.key) as number}
                   min={prop.min} max={prop.max} step={prop.step}
                   oninput={(e) => {
                     let v = Number((e.target as HTMLInputElement).value);
                     if (prop.min !== undefined && v < prop.min) v = prop.min;
                     if (prop.max !== undefined && v > prop.max) v = prop.max;
                     setProp(prop.propPath || prop.key, v);
                   }} />
          {:else if prop.type === 'select' && prop.options}
            <select class="props-input"
                    value={getProp(prop.propPath || prop.key) as string}
                    style="font-family: {getProp(prop.propPath || prop.key) as string};"
                    onchange={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLSelectElement).value)}>
              {#each prop.options as opt}
                <option value={opt.value} style="font-family: {opt.value};">{opt.label}</option>
              {/each}
            </select>
          {:else}
            <input class="props-input" type="text"
                   value={getProp(prop.propPath || prop.key) as string}
                   oninput={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLInputElement).value)} />
          {/if}
        </div>
      {/each}
    </CollapsibleSection>
  {/if}
  <EffectsEditor data={selected} />

  <!-- Panel texture fill — only for panel_group -->
  {#if selected.type === 'panel_group'}
    <CollapsibleSection title="Image Fill" collapsed={!selected.properties.textureDataUrl}>
      {#if selected.properties.textureDataUrl}
        <img class="ref-thumb" src={selected.properties.textureDataUrl as string} alt="Texture" />
        <div class="props-row">
          <span class="props-label">Opacity</span>
          <input type="range" min="0" max="1" step="0.05"
                 value={(selected.properties.textureOpacity as number) ?? 0.8}
                 oninput={(e) => { selected.properties.textureOpacity = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-value">{Math.round(((selected.properties.textureOpacity as number) ?? 0.8) * 100)}%</span>
        </div>
        <div class="props-row">
          <span class="props-label">Offset X</span>
          <input class="props-input props-input-sm" type="number"
                 value={(selected.properties.textureOffsetX as number) ?? 0}
                 oninput={(e) => { selected.properties.textureOffsetX = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-label">Y</span>
          <input class="props-input props-input-sm" type="number"
                 value={(selected.properties.textureOffsetY as number) ?? 0}
                 oninput={(e) => { selected.properties.textureOffsetY = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row">
          <span class="props-label">Scale</span>
          <input class="props-input props-input-sm" type="number"
                 min="0.1" max="10" step="0.1"
                 value={(selected.properties.textureScale as number) ?? 1}
                 oninput={(e) => { selected.properties.textureScale = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row">
          <span class="props-label">Blend</span>
          <select class="toolbar-select" style="flex:1;"
                  value={(selected.properties.textureBlend as string) || 'multiply'}
                  onchange={(e) => { selected.properties.textureBlend = (e.target as HTMLSelectElement).value; appState.isDirty = true; }}>
            <option value="multiply">Multiply</option>
            <option value="normal">Normal</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
          </select>
        </div>
        <div class="props-row">
          <button class="props-btn" onclick={loadPanelTexture}>Replace…</button>
          <button class="props-btn-danger"
                  onclick={() => { delete selected.properties.textureDataUrl; appState.isDirty = true; }}>
            Remove
          </button>
        </div>
      {:else}
        <div class="props-row">
          <button class="props-btn" style="flex:1;" onclick={loadPanelTexture}>Load Texture…</button>
        </div>
      {/if}
    </CollapsibleSection>
  {/if}

{:else if getSelectedComponents().length > 1}
  <div style="padding: 8px; color: var(--text-muted); font-size: 11px;">
    {getSelectedComponents().length} components selected
  </div>
{:else}
  <!-- Canvas properties (nothing selected) -->
  <CollapsibleSection title="Canvas">
    <div class="props-row">
      <span class="props-label">BG</span>
      <ColorField color={appState.bgColor}
                  onchange={(hex) => { appState.bgColor = hex; appState.isDirty = true; }} />
    </div>
  </CollapsibleSection>

  {#if appState.refImageDataUrl}
    <CollapsibleSection title="Reference Image">
      <img class="ref-thumb" src={appState.refImageDataUrl} alt="Reference" />
      <div class="props-row">
        <span class="props-label">Opacity</span>
        <input type="range" min="0.05" max="1" step="0.05"
               value={appState.refImageOpacity}
               oninput={(e) => { appState.refImageOpacity = +(e.target as HTMLInputElement).value; }} />
        <span class="props-value">{Math.round(appState.refImageOpacity * 100)}%</span>
      </div>
      <div class="props-row">
        <span class="props-label">Offset X</span>
        <input type="number" step="1"
               value={appState.refImageOffsetX}
               oninput={(e) => { appState.refImageOffsetX = +(e.target as HTMLInputElement).value || 0; appState.isDirty = true; }} />
      </div>
      <div class="props-row">
        <span class="props-label">Offset Y</span>
        <input type="number" step="1"
               value={appState.refImageOffsetY}
               oninput={(e) => { appState.refImageOffsetY = +(e.target as HTMLInputElement).value || 0; appState.isDirty = true; }} />
      </div>
      <div class="props-row">
        <button class="props-btn"
                onclick={() => { appState.refImageVisible = !appState.refImageVisible; }}>
          {appState.refImageVisible ? 'Hide' : 'Show'}
        </button>
        <button class="props-btn-danger"
                onclick={() => { appState.refImageDataUrl = null; appState.isDirty = true; }}>
          Remove
        </button>
      </div>
    </CollapsibleSection>
  {:else}
    <div class="ref-image-drop-hint">
      Drop an image onto the canvas<br/>or
      <button onclick={loadRefImageFromPanel}>Load Reference Image…</button>
    </div>
  {/if}
{/if}
