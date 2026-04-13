<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const midY = $derived(data.height / 2);
  const amp = $derived(data.height * 0.35);

  const wavePath = $derived.by(() => {
    const parts: string[] = [];
    for (let px = 0; px <= data.width; px += 2) {
      const py = midY + Math.sin(px * 0.04) * amp * Math.sin(px * 0.01 + 1);
      parts.push((px === 0 ? 'M ' : 'L ') + px + ' ' + py);
    }
    return parts.join(' ');
  });
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" fill="#0a0a1a" stroke="#333" stroke-width="0.5" />
  <path d={wavePath} fill="none" stroke={data.color} stroke-width="1.5" stroke-opacity="0.8" />
  <line x1="0" y1={midY} x2={data.width} y2={midY} stroke="#333" stroke-width="0.5" />
</g>
