<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const labelH = $derived(data.label ? 14 : 0);
  const knobSize = $derived(Math.min(data.width, data.height - labelH));
  const cx = $derived(data.width / 2);
  const cy = $derived(knobSize / 2);
  const r = $derived(knobSize / 2 - 2);
  const arcR = $derived(r - 4);
  const pLen = $derived(r - 6);

  // Value arc (270 degrees, from 135deg to 45deg)
  const arcPath = $derived.by(() => {
    if (arcR <= 2) return '';
    const startAngle = 135 * Math.PI / 180;
    const endAngle = 45 * Math.PI / 180;
    const startX = cx + arcR * Math.cos(startAngle);
    const startY = cy + arcR * Math.sin(startAngle);
    const endX = cx + arcR * Math.cos(endAngle);
    const endY = cy + arcR * Math.sin(endAngle);
    return `M ${startX} ${startY} A ${arcR} ${arcR} 0 1 1 ${endX} ${endY}`;
  });

  // Pointer line (pointing up)
  const pAngle = -90 * Math.PI / 180;
  const pointerX2 = $derived(cx + pLen * Math.cos(pAngle));
  const pointerY2 = $derived(cy + pLen * Math.sin(pAngle));
</script>

<g>
  <!-- Body -->
  <circle cx={cx} cy={cy} r={r} style="fill: var(--component-bg-alt);" stroke={data.color} stroke-width="1.5" />

  <!-- Value arc -->
  {#if arcR > 2}
    <path d={arcPath} fill="none" stroke={data.color} stroke-width="2.5"
          stroke-linecap="round" stroke-opacity="0.35" />
  {/if}

  <!-- Pointer -->
  {#if pLen > 2}
    <line x1={cx} y1={cy} x2={pointerX2} y2={pointerY2}
          stroke="#fff" stroke-width="2" stroke-linecap="round" />
  {/if}

  <!-- Label -->
  {#if data.label}
    <text x={cx} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
  {/if}

  <!-- Hit area -->
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
