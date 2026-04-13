<script lang="ts">
  import { appState, COLORS } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';
  import { getEntry } from '../components/registry.js';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import EffectsEditor from './EffectsEditor.svelte';

  const selected = $derived(
    getSelectedComponents().length === 1 ? getSelectedComponents()[0] : null
  );
  const entry = $derived(selected ? getEntry(selected.type) : null);

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
  </CollapsibleSection>

  <CollapsibleSection title="Appearance">
    <div class="color-swatches">
      {#each COLORS as swatch}
        <div
          class="color-swatch"
          class:active={selected.color === swatch}
          style="background: {swatch};"
          onclick={() => { selected.color = swatch; appState.isDirty = true; }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') { selected.color = swatch; appState.isDirty = true; } }}
        ></div>
      {/each}
    </div>
    <div class="props-row">
      <span class="props-label">Hex</span>
      <input class="props-input" type="text" value={selected.color}
             oninput={(e) => { selected.color = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
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
                   oninput={(e) => setProp(prop.propPath || prop.key, Number((e.target as HTMLInputElement).value))} />
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
{:else if getSelectedComponents().length > 1}
  <div style="padding: 8px; color: #888; font-size: 11px;">
    {getSelectedComponents().length} components selected
  </div>
{/if}
