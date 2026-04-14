<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  interface StepData { semitone: number; accent: boolean; slide: boolean; rest: boolean; }

  const cols    = $derived((data.properties.columns as number) || 16);
  const minNote = $derived((data.properties.minNote as number) ?? 36);
  const maxNote = $derived((data.properties.maxNote as number) ?? 60);

  const gap        = 1;
  const cellW      = $derived((data.width - (cols - 1) * gap) / cols);
  const toggleRowH = $derived(Math.max(10, data.height * 0.22));
  const numRowH    = $derived(Math.max(8,  data.height * 0.13));
  const sliderRowH = $derived(data.height - toggleRowH - numRowH);
  const thumbH     = $derived(Math.max(4, Math.min(8, sliderRowH * 0.12)));
  const thumbW     = $derived(Math.max(4, cellW - 6));
  const trackW     = 3;

  function decodeSteps(s: string, count: number): StepData[] {
    const parts = s.split(',');
    return Array.from({ length: count }, (_, i) => {
      const p = (parts[i] || '48:0:0:0').split(':').map(Number);
      return { semitone: p[0] || 48, accent: !!p[1], slide: !!p[2], rest: !!p[3] };
    });
  }

  const steps = $derived(decodeSteps((data.properties.steps as string) || '', cols));

  function thumbY(sem: number): number {
    const range = Math.max(1, maxNote - minNote);
    const t = 1.0 - Math.max(0, Math.min(1, (sem - minNote) / range));
    return toggleRowH + t * (sliderRowH - thumbH);
  }
</script>

<g>
  <!-- Background -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="2" fill="#0e0e10" stroke="#28282e" stroke-width="0.5"/>

  {#each steps as step, i}
    {@const cx   = i * (cellW + gap)}
    {@const isQ  = i % 4 === 0}
    {@const tW   = Math.floor((cellW - 3) / 3)}
    {@const tFsz = Math.min(7, toggleRowH * 0.55)}
    {@const nFsz = Math.min(7, numRowH * 0.72)}

    <!-- Cell background -->
    <rect x={cx} y="0" width={cellW} height={data.height} rx="1"
          fill="#141416" stroke={isQ ? '#3a3a42' : '#1e1e22'} stroke-width="0.5"/>

    <!-- A toggle (accent) -->
    <rect x={cx + 1} y="1" width={tW} height={toggleRowH - 2} rx="1"
          fill={step.accent ? '#c42a2a' : '#2a2a30'}/>
    <text x={cx + 1 + tW / 2} y={1 + (toggleRowH - 2) * 0.73} text-anchor="middle"
          fill={step.accent ? '#fff' : '#555'} font-size={tFsz} font-family="monospace">A</text>

    <!-- S toggle (slide) -->
    {@const s1x = cx + 1 + tW + 1}
    <rect x={s1x} y="1" width={tW} height={toggleRowH - 2} rx="1"
          fill={step.slide ? '#f0dc3c' : '#2a2a30'}/>
    <text x={s1x + tW / 2} y={1 + (toggleRowH - 2) * 0.73} text-anchor="middle"
          fill={step.slide ? '#141416' : '#555'} font-size={tFsz} font-family="monospace">S</text>

    <!-- R toggle (rest) -->
    {@const s2x = cx + 1 + (tW + 1) * 2}
    <rect x={s2x} y="1" width={tW} height={toggleRowH - 2} rx="1"
          fill={step.rest ? '#d6d6da' : '#2a2a30'}/>
    <text x={s2x + tW / 2} y={1 + (toggleRowH - 2) * 0.73} text-anchor="middle"
          fill={step.rest ? '#141416' : '#555'} font-size={tFsz} font-family="monospace">R</text>

    <!-- Pitch slider track -->
    {@const trackX = cx + cellW / 2 - trackW / 2}
    <rect x={trackX} y={toggleRowH} width={trackW} height={sliderRowH}
          rx="1.5" fill="#1c1c20"/>

    <!-- Pitch thumb (hidden when rest) -->
    {#if !step.rest}
      {@const ty = thumbY(step.semitone)}
      <rect x={cx + cellW / 2 - thumbW / 2} y={ty} width={thumbW} height={thumbH}
            rx="1"
            fill={step.accent ? '#782818' : '#bababc'}
            stroke={step.accent ? '#c42a2a' : '#d6d6da'} stroke-width="0.5"/>
    {/if}

    <!-- Step number -->
    <text x={cx + cellW / 2} y={data.height - 1} text-anchor="middle"
          fill={isQ ? '#888' : '#444'} font-size={nFsz} font-family="monospace">{i + 1}</text>
  {/each}
</g>
