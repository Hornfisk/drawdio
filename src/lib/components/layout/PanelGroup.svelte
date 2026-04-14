<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const cr         = $derived((data.properties.cornerRadius as number) || 6);
  const bw         = $derived((data.properties.borderWidth as number) || 1);
  const bgFill     = $derived((data.properties.bgColor as string) || data.color);
  const bgOpacity  = $derived((data.properties.bgOpacity as number) || 0.5);
  const textWidth  = $derived(data.label ? data.label.length * 7 + 12 : 0);

  const texUrl     = $derived(data.properties.textureDataUrl as string | undefined);
  const texOpacity = $derived((data.properties.textureOpacity as number) ?? 0.8);
  const texOffsetX = $derived((data.properties.textureOffsetX as number) ?? 0);
  const texOffsetY = $derived((data.properties.textureOffsetY as number) ?? 0);
  const texScale   = $derived((data.properties.textureScale as number) ?? 1);
  const texBlend   = $derived((data.properties.textureBlend as string) || 'multiply');
  const clipId     = $derived(`panel-clip-${data.id}`);
</script>

<defs>
  {#if texUrl}
    <clipPath id={clipId}>
      <rect x="0" y="0" width={data.width} height={data.height} rx={cr} />
    </clipPath>
  {/if}
</defs>

<g>
  <!-- 1. Background fill -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={cr} fill={bgFill} fill-opacity={bgOpacity} stroke="none" />

  <!-- 2. Texture, clipped to panel shape -->
  {#if texUrl}
    <image href={texUrl}
           x={texOffsetX} y={texOffsetY}
           width={data.width * texScale} height={data.height * texScale}
           clip-path="url(#{clipId})"
           opacity={texOpacity}
           style="mix-blend-mode: {texBlend};"
           preserveAspectRatio="xMidYMid slice" />
  {/if}

  <!-- 3. Border on top of texture -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={cr} fill="none" stroke={data.color} stroke-width={bw} />

  <!-- 4. Label -->
  {#if data.label}
    <rect x="10" y="-6" width={textWidth} height="12" fill={bgFill} fill-opacity="0.9" />
    <text x="16" y="4" fill={data.color} font-size="10" fill-opacity="0.7"
          font-family="system-ui, sans-serif">{data.label}</text>
  {/if}
</g>
