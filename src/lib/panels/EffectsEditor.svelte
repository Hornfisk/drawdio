<script lang="ts">
  import type { ComponentData, EffectKey } from '../components/types.js';
  import { appState } from '../state/app.svelte.js';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import ColorField from '../ui/ColorField.svelte';

  let { data }: { data: ComponentData } = $props();

  const EFFECT_NAMES: Record<EffectKey, string> = {
    drop_shadow: 'Drop Shadow',
    inner_shadow: 'Inner Shadow',
    blur_glow: 'Blur / Glow',
    bevel: 'Bevel',
    gloss: 'Gloss',
    gradient_fill: 'Gradient',
    texture_fill: 'Texture',
  };

  const TEXTURE_PRESETS = ['noise', 'carbon', 'brushed_metal', 'wood_grain', 'diamond_plate'];

  function toggleEffect(key: EffectKey, val: boolean) {
    data.effects[key].enabled = val;
    appState.isDirty = true;
  }

  function setIntensity(key: EffectKey, val: number) {
    data.effects[key].intensity = val;
    appState.isDirty = true;
  }
</script>

<CollapsibleSection title="Effects" collapsed={true}>
  {#each (Object.keys(EFFECT_NAMES) as EffectKey[]) as key}
    {@const effect = data.effects[key]}
    {#if effect}
      <div class="props-row">
        <input type="checkbox"
               checked={effect.enabled}
               onchange={(e) => toggleEffect(key, (e.target as HTMLInputElement).checked)} />
        <span class="props-label" style="flex:1;">{EFFECT_NAMES[key]}</span>
        <input class="props-input props-input-sm" type="range"
               min="0" max="100"
               value={effect.intensity}
               oninput={(e) => setIntensity(key, Number((e.target as HTMLInputElement).value))}
               style="flex:1; min-width:50px;" />
      </div>

      {#if key === 'gradient_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">From</span>
          <ColorField compact={true}
                      color={data.effects.gradient_fill.startColor}
                      onchange={(hex) => { data.effects.gradient_fill.startColor = hex; appState.isDirty = true; }} />
        </div>
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">To</span>
          <ColorField compact={true}
                      color={data.effects.gradient_fill.endColor}
                      onchange={(hex) => { data.effects.gradient_fill.endColor = hex; appState.isDirty = true; }} />
        </div>
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Angle</span>
          <input class="props-input props-input-sm" type="number"
                 value={data.effects.gradient_fill.angle}
                 oninput={(e) => { data.effects.gradient_fill.angle = Number((e.target as HTMLInputElement).value); appState.isDirty = true; }} />
        </div>
      {/if}

      {#if key === 'texture_fill' && effect.enabled}
        <div class="props-row" style="margin-left: 20px;">
          <span class="props-label">Preset</span>
          <select class="toolbar-select" style="flex:1;"
                  value={data.effects.texture_fill.preset}
                  onchange={(e) => { data.effects.texture_fill.preset = (e.target as HTMLSelectElement).value; appState.isDirty = true; }}>
            {#each TEXTURE_PRESETS as p}
              <option value={p}>{p.replace(/_/g, ' ')}</option>
            {/each}
          </select>
        </div>
      {/if}
    {/if}
  {/each}
</CollapsibleSection>
