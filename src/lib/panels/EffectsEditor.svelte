<script lang="ts">
  import type { ComponentData } from '../components/types.js';
  import { appState } from '../state/app.svelte.js';
  import CollapsibleSection from './CollapsibleSection.svelte';

  let { data }: { data: ComponentData } = $props();

  const EFFECT_NAMES: Record<string, string> = {
    drop_shadow: 'Drop Shadow',
    inner_shadow: 'Inner Shadow',
    blur_glow: 'Blur / Glow',
    bevel: 'Bevel',
    gloss: 'Gloss',
    gradient_fill: 'Gradient',
    texture_fill: 'Texture',
  };

  const TEXTURE_PRESETS = ['noise', 'carbon', 'brushed_metal', 'wood_grain', 'diamond_plate'];

  type EffectKey = keyof typeof EFFECT_NAMES;

  function toggleEffect(key: EffectKey, val: boolean) {
    (data.effects as Record<string, { enabled: boolean }>)[key].enabled = val;
    appState.isDirty = true;
  }

  function setIntensity(key: EffectKey, val: number) {
    (data.effects as Record<string, { intensity: number }>)[key].intensity = val;
    appState.isDirty = true;
  }
</script>

<CollapsibleSection title="Effects" collapsed={true}>
  {#each Object.entries(EFFECT_NAMES) as [key, name]}
    {@const effect = (data.effects as Record<string, Record<string, unknown>>)[key]}
    {#if effect}
      <div class="props-row">
        <input type="checkbox"
               checked={effect.enabled as boolean}
               onchange={(e) => toggleEffect(key as EffectKey, (e.target as HTMLInputElement).checked)} />
        <span class="props-label" style="flex:1;">{name}</span>
        <input class="props-input props-input-sm" type="range"
               min="0" max="100"
               value={effect.intensity as number}
               oninput={(e) => setIntensity(key as EffectKey, Number((e.target as HTMLInputElement).value))}
               style="flex:1; min-width:50px;" />
      </div>

      {#if key === 'gradient_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">From</span>
          <input class="props-input props-input-sm" type="color"
                 value={effect.startColor as string}
                 oninput={(e) => { (data.effects.gradient_fill as Record<string, unknown>).startColor = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-label">To</span>
          <input class="props-input props-input-sm" type="color"
                 value={effect.endColor as string}
                 oninput={(e) => { (data.effects.gradient_fill as Record<string, unknown>).endColor = (e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Angle</span>
          <input class="props-input props-input-sm" type="number"
                 value={effect.angle as number}
                 oninput={(e) => { (data.effects.gradient_fill as Record<string, unknown>).angle = Number((e.target as HTMLInputElement).value); appState.isDirty = true; }} />
        </div>
      {/if}

      {#if key === 'texture_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Preset</span>
          <select class="toolbar-select" style="flex:1;"
                  value={effect.preset as string}
                  onchange={(e) => { (data.effects.texture_fill as Record<string, unknown>).preset = (e.target as HTMLSelectElement).value; appState.isDirty = true; }}>
            {#each TEXTURE_PRESETS as p}
              <option value={p}>{p.replace(/_/g, ' ')}</option>
            {/each}
          </select>
        </div>
      {/if}
    {/if}
  {/each}
</CollapsibleSection>
