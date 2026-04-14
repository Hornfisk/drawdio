<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const octaves    = $derived((data.properties.octaves as number) || 2);
  const hasPB      = $derived(!!(data.properties.pitchBend));
  const hasMW      = $derived(!!(data.properties.modWheel));
  const portsPos   = $derived((data.properties.portsPosition as string) || 'front');

  // Side strips (pitch bend + mod wheel)
  const sideCount  = $derived((hasPB ? 1 : 0) + (hasMW ? 1 : 0));
  const sideW      = $derived(sideCount > 0 ? Math.max(10, data.width * 0.07) : 0);
  const keysX      = $derived(sideCount * sideW);
  const keysW      = $derived(data.width - keysX);

  // White keys: 7 per octave + 1 final C
  const wkCount    = $derived(7 * octaves + 1);
  const wkW        = $derived(keysW / wkCount);
  const wkH        = $derived(data.height * 0.85);
  const bkW        = $derived(wkW * 0.58);
  const bkH        = $derived(wkH * 0.62);

  // Step from white key index → semitone (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
  const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
  // Which white-key slots have a black key to their right (before the next white)
  // C D  F G A  — positions 0,1,3,4,5 in each octave (not after E=2 or B=6)
  const HAS_BLACK_RIGHT = [true, true, false, true, true, true, false];

  // Bottom labels: show 'C' for every 7th white key
  const labelY = $derived(data.height - 1);
  const labelFsz = $derived(Math.min(7, wkW * 0.55));
</script>

<g>
  <!-- Keyboard body background -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="2" style="fill: var(--component-bg); stroke: var(--component-bg-alt); stroke-width: 0.5;"/>

  <!-- Side strips: pitch bend then mod wheel -->
  {#if hasPB}
    {@const sx = 0}
    <!-- PB strip -->
    <rect x={sx} y="0" width={sideW} height={data.height}
          rx="1" style="fill: var(--key-black); stroke: var(--key-black); stroke-width: 0.5;"/>
    <!-- PB label -->
    <text x={sx + sideW / 2} y={data.height * 0.22} text-anchor="middle"
          style="fill: var(--component-label);" font-size={Math.min(6, sideW * 0.45)} font-family="monospace">PB</text>
    <!-- PB track -->
    <rect x={sx + sideW * 0.35} y={data.height * 0.28} width={sideW * 0.3} height={data.height * 0.6}
          rx="1" style="fill: var(--component-bg); stroke: var(--component-bg-alt); stroke-width: 0.5;"/>
    <!-- PB thumb (center = neutral) -->
    <rect x={sx + sideW * 0.2} y={data.height * 0.28 + data.height * 0.6 * 0.5 - 3}
          width={sideW * 0.6} height={Math.max(4, data.height * 0.08)} rx="1"
          style="fill: var(--component-bg-alt); stroke: var(--component-label); stroke-width: 0.5;"/>
  {/if}

  {#if hasMW}
    {@const sx = hasPB ? sideW : 0}
    <!-- MW strip -->
    <rect x={sx} y="0" width={sideW} height={data.height}
          rx="1" style="fill: var(--key-black); stroke: var(--key-black); stroke-width: 0.5;"/>
    <!-- MW label -->
    <text x={sx + sideW / 2} y={data.height * 0.22} text-anchor="middle"
          style="fill: var(--component-label);" font-size={Math.min(6, sideW * 0.45)} font-family="monospace">MW</text>
    <!-- MW track -->
    <rect x={sx + sideW * 0.35} y={data.height * 0.28} width={sideW * 0.3} height={data.height * 0.6}
          rx="1" style="fill: var(--component-bg); stroke: var(--component-bg-alt); stroke-width: 0.5;"/>
    <!-- MW thumb (bottom = 0) -->
    <rect x={sx + sideW * 0.2} y={data.height * 0.28 + data.height * 0.6 * 0.8 - 3}
          width={sideW * 0.6} height={Math.max(4, data.height * 0.08)} rx="1"
          style="fill: var(--component-bg-alt); stroke: var(--component-label); stroke-width: 0.5;"/>
  {/if}

  <!-- White keys -->
  {#each Array(wkCount) as _, wi}
    {@const wx = keysX + wi * wkW}
    {@const isC = wi % 7 === 0}
    <rect x={wx + 0.5} y="0" width={wkW - 1} height={wkH}
          rx="1" style="fill: var(--key-white);" stroke="#555" stroke-width="0.5"/>
    {#if isC}
      <text x={wx + wkW / 2} y={labelY} text-anchor="middle"
            style="fill: var(--component-label);" font-size={labelFsz} font-family="monospace">C</text>
    {/if}
  {/each}

  <!-- Black keys (drawn on top) -->
  {#each Array(octaves) as _, oct}
    {#each HAS_BLACK_RIGHT as hasBlack, slot}
      {#if hasBlack}
        {@const wi = oct * 7 + slot}
        {@const bx = keysX + wi * wkW + wkW - bkW / 2}
        <rect x={bx} y="0" width={bkW} height={bkH}
              rx="1" style="fill: var(--key-black);" stroke="#000" stroke-width="0.5"/>
        <!-- Subtle highlight on black key -->
        <rect x={bx + bkW * 0.2} y={bkH * 0.05} width={bkW * 0.25} height={bkH * 0.55}
              rx="0.5" fill="#fff" fill-opacity="0.06"/>
      {/if}
    {/each}
  {/each}

  <!-- Port indicator -->
  <text x={keysX + 3} y={portsPos === 'front' ? data.height - 4 : 4} style="fill: var(--component-label);"
        font-size={Math.min(8, data.height * 0.1)} font-family="monospace"
        dominant-baseline={portsPos === 'front' ? 'auto' : 'hanging'}>⊕</text>
</g>
