<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const rows = $derived((data.properties.rows as number) || 1);
  const cols = $derived((data.properties.columns as number) || 16);
  const gap = 2;

  // Auto-scale: fill the component bounds (non-square cells allowed).
  // 4px hard floor prevents zero/negative-width rects when the user shrinks
  // the box hard; cellSize is the placement default, not a runtime clamp.
  const cellW = $derived(Math.max(4, Math.floor((data.width - (cols - 1) * gap) / cols)));
  const cellH = $derived(rows > 1
    ? Math.max(4, Math.floor((data.height - (rows - 1) * gap) / rows))
    : cellW);

  const pattern = $derived(((data.properties.pattern as string) || '').split(','));

  // Optional per-component colour slots — empty string means "use the theme token".
  const bgColor       = $derived((data.properties.bgColor       as string) || '');
  const inactiveColor = $derived((data.properties.inactiveColor as string) || '');
  const activeColor   = $derived((data.properties.activeColor   as string) || data.color);
</script>

<g>
  <!-- Background — falls back to the dark CSS token when no override is set -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3"
        style={bgColor ? `fill: ${bgColor}` : 'fill: var(--component-bg)'}
        stroke="#2a2a3a" stroke-width="0.5"/>

  {#each Array(rows) as _, row}
    {#each Array(cols) as _, col}
      {@const key = row + '_' + col}
      {@const active = pattern.includes(key)}
      {@const cx = col * (cellW + gap)}
      {@const cy = row * (cellH + gap)}
      <rect x={cx} y={cy} width={cellW} height={cellH} rx="2"
            style="fill: {active ? activeColor : (inactiveColor || 'var(--component-inactive)')}; stroke: {active ? data.color : 'var(--component-bg-alt)'}; stroke-width: 0.5;"
            data-cell={key} />
    {/each}
  {/each}
</g>
