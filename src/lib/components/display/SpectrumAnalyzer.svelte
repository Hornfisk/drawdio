<script lang="ts">
  import type { ComponentData } from '../types.js';
  import { buildCurvePath } from '../../utils/curve.js';
  let { data }: { data: ComponentData } = $props();

  const style = $derived((data.properties.style as string) || 'bars');
  const bars = $derived((data.properties.bars as number) || 24);
  const customPts = $derived((data.properties.customCurvePoints as number[]) || []);
  const customSmooth = $derived((data.properties.customCurveSmooth as boolean) ?? true);

  // Spectrum-shaped amplitude: bigger lows, tapered highs, with some peaks.
  function levelAt(i: number, total: number): number {
    const t = i / Math.max(1, total - 1);
    // 1/f-ish slope + a couple of harmonic bumps
    const slope = Math.pow(1 - t, 0.6);
    const bump1 = Math.max(0, 0.4 * Math.exp(-Math.pow((t - 0.25) * 10, 2)));
    const bump2 = Math.max(0, 0.3 * Math.exp(-Math.pow((t - 0.55) * 10, 2)));
    const v = 0.2 + slope * 0.7 + bump1 + bump2;
    return Math.max(0.05, Math.min(0.95, v));
  }

  const gap = 2;
  const barW = $derived((data.width - (bars + 1) * gap) / bars);

  // For 'filled' / 'line' styles we sample more densely along the spectrum.
  const SAMPLES = 60;

  const filledPath = $derived.by(() => {
    let d = `M 0 100`;
    for (let i = 0; i <= SAMPLES; i++) {
      const x = (i / SAMPLES) * 100;
      const y = (1 - levelAt(i, SAMPLES + 1)) * 100;
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L 100 100 Z`;
    return d;
  });

  const linePath = $derived.by(() => {
    let d = '';
    for (let i = 0; i <= SAMPLES; i++) {
      const x = (i / SAMPLES) * 100;
      const y = (1 - levelAt(i, SAMPLES + 1)) * 100;
      d += (i === 0 ? 'M' : ' L') + ` ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  });

  // Peak-hold dots — a few samples above the line, like SPAN peaks.
  const peakDots = $derived.by(() => {
    const dots: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const x = (i / SAMPLES) * 100;
      const y = (1 - levelAt(i, SAMPLES + 1)) * 100;
      // place peak dot a small bit above the line, only on local maxima of levelAt
      const prev = i > 0 ? levelAt(i - 1, SAMPLES + 1) : -Infinity;
      const next = i < SAMPLES ? levelAt(i + 1, SAMPLES + 1) : -Infinity;
      const cur = levelAt(i, SAMPLES + 1);
      if (cur >= prev && cur >= next && cur > 0.45) {
        dots.push({ x, y: Math.max(2, y - 6) });
      }
    }
    return dots;
  });

  const customD = $derived(buildCurvePath(customPts, 100, 100, customSmooth));
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5" />

  {#if style === 'bars'}
    <!-- Inline bars, no inner SVG (keeps current pixel-perfect look). -->
    {#each Array(bars) as _, i}
      {@const lvl = levelAt(i, bars)}
      {@const h = data.height * lvl}
      {@const bx = gap + i * (barW + gap)}
      <rect x={bx} y={data.height - h} width={barW} height={h}
            rx="1" fill={data.color} fill-opacity="0.7" />
    {/each}
  {:else}
    <svg x="2" y="2" width={data.width - 4} height={data.height - 4}
         viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden">
      {#if style === 'filled'}
        <path d={filledPath} fill={data.color} fill-opacity="0.55" stroke={data.color} stroke-width="0.6" stroke-opacity="0.9" />
      {:else if style === 'line'}
        <path d={linePath} fill="none" stroke={data.color} stroke-width="1.2" stroke-opacity="0.9" />
        {#each peakDots as dot}
          <rect x={dot.x - 0.6} y={dot.y - 0.6} width="1.2" height="1.2"
                fill={data.color} fill-opacity="0.95" />
        {/each}
      {:else if style === 'custom'}
        {#if customPts.length >= 4}
          <path d={customD} fill="none" stroke={data.color} stroke-width="1.5" stroke-opacity="0.95" stroke-linecap="round" />
        {:else}
          <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
                font-size="8" fill="#666" font-family="system-ui, sans-serif">Edit curve…</text>
        {/if}
      {/if}
    </svg>
  {/if}
</g>
