<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();
</script>

<g>
  <!-- Background -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" fill="#0a0a1a" stroke="#333" stroke-width="0.5" />
  <!-- Waveform scales with viewBox — always fills the bounds -->
  <svg x="2" y="2" width={data.width - 4} height={data.height - 4}
       viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden">
    <line x1="0" y1="50" x2="100" y2="50" stroke="#333" stroke-width="1.5" />
    <path d="M 0 50 C 4 50 7 12 12 12 S 20 88 25 88 S 33 12 38 12 S 46 88 50 88 S 58 12 62 12 S 70 88 75 88 S 83 12 88 12 S 96 50 100 50"
          fill="none" stroke={data.color} stroke-width="2.5" stroke-opacity="0.85"
          stroke-linecap="round" />
  </svg>
</g>
