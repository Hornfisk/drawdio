<script lang="ts">
  import type { ComponentData } from '../types.js';
  import { buildCurvePath } from '../../utils/curve.js';
  let { data }: { data: ComponentData } = $props();

  const style = $derived((data.properties.style as string) || 'filled');
  const customPts = $derived((data.properties.customCurvePoints as number[]) || []);
  const customSmooth = $derived((data.properties.customCurveSmooth as boolean) ?? true);

  // Hand-crafted amplitude envelope to mimic a recorded audio clip — varies along time.
  function ampAt(i: number, samples: number): number {
    const t = i / samples;
    // attack-decay + irregular peaks
    const env = 0.35 + 0.5 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.31) * (1 - 0.5 * t));
    return Math.max(0.05, Math.min(0.85, env));
  }

  function topEnvelopePath(samples: number, scaleX = 100, scaleY = 100, midY = 50): string {
    let d = `M 0 ${midY}`;
    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * scaleX;
      const y = midY - ampAt(i, samples) * (scaleY * 0.45);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    for (let i = samples; i >= 0; i--) {
      const x = (i / samples) * scaleX;
      const y = midY + ampAt(i, samples) * (scaleY * 0.45);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d + ' Z';
  }

  function outlinePath(samples: number, scaleX = 100, scaleY = 100, midY = 50): string {
    // Smooth single-line "scope" waveform — fundamental + faint harmonics.
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const y = midY - (Math.sin(t * Math.PI * 4) * 0.55 + Math.sin(t * Math.PI * 12) * 0.15) * (scaleY * 0.35);
      const x = t * scaleX;
      d += (i === 0 ? 'M' : ' L') + ` ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  }

  const SAMPLES = 80;
  const filledD = $derived(topEnvelopePath(SAMPLES, 100, 100, 50));
  const outlineD = $derived(outlinePath(SAMPLES, 100, 100, 50));
  const stereoTopD = $derived(topEnvelopePath(SAMPLES, 100, 50, 25));
  const stereoBotD = $derived(topEnvelopePath(SAMPLES, 100, 50, 75));
  const customD = $derived(buildCurvePath(customPts, 100, 100, customSmooth));
</script>

<g>
  <!-- Background -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5" />

  <!-- Waveform scales with viewBox — always fills the bounds -->
  <svg x="2" y="2" width={data.width - 4} height={data.height - 4}
       viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden">

    {#if style === 'filled'}
      <!-- Centerline -->
      <line x1="0" y1="50" x2="100" y2="50" stroke="#333" stroke-width="0.5" />
      <path d={filledD} fill={data.color} fill-opacity="0.7" stroke={data.color} stroke-width="0.5" stroke-opacity="0.9" />

    {:else if style === 'outline'}
      <!-- Oscilloscope-style grid + thin line -->
      <line x1="0" y1="50"  x2="100" y2="50"  stroke="#2a3a30" stroke-width="0.4" />
      <line x1="0" y1="25"  x2="100" y2="25"  stroke="#1c2a22" stroke-width="0.3" stroke-dasharray="1 2" />
      <line x1="0" y1="75"  x2="100" y2="75"  stroke="#1c2a22" stroke-width="0.3" stroke-dasharray="1 2" />
      <line x1="25" y1="0"  x2="25"  y2="100" stroke="#1c2a22" stroke-width="0.3" stroke-dasharray="1 2" />
      <line x1="50" y1="0"  x2="50"  y2="100" stroke="#1c2a22" stroke-width="0.3" stroke-dasharray="1 2" />
      <line x1="75" y1="0"  x2="75"  y2="100" stroke="#1c2a22" stroke-width="0.3" stroke-dasharray="1 2" />
      <path d={outlineD} fill="none" stroke={data.color} stroke-width="1.5" stroke-opacity="0.95" stroke-linecap="round" />

    {:else if style === 'stereo'}
      <!-- Two channels, top + bottom -->
      <line x1="0" y1="50" x2="100" y2="50" stroke="#333" stroke-width="0.5" />
      <path d={stereoTopD} fill={data.color} fill-opacity="0.65" stroke={data.color} stroke-width="0.4" stroke-opacity="0.9" />
      <path d={stereoBotD} fill={data.color} fill-opacity="0.65" stroke={data.color} stroke-width="0.4" stroke-opacity="0.9" />

    {:else if style === 'custom'}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#333" stroke-width="0.5" />
      {#if customPts.length >= 4}
        <path d={customD} fill="none" stroke={data.color} stroke-width="1.5" stroke-opacity="0.95" stroke-linecap="round" />
      {:else}
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
              font-size="8" fill="#666" font-family="system-ui, sans-serif">Edit curve…</text>
      {/if}
    {/if}
  </svg>
</g>
