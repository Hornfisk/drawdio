<script lang="ts">
  let { type }: { type: string } = $props();
</script>

{#if type === 'rotary_knob'}
  <svg width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="10" y1="10" x2="10" y2="3" stroke="#4fc3f7" stroke-width="1.5" stroke-linecap="round"/>
  </svg>

{:else if type === 'horizontal_slider'}
  <svg width="24" height="14" viewBox="0 0 24 14">
    <rect x="0" y="5" width="24" height="4" rx="2" fill="#555"/>
    <circle cx="14" cy="7" r="5" fill="#4fc3f7"/>
  </svg>

{:else if type === 'vertical_slider'}
  <svg width="14" height="24" viewBox="0 0 14 24">
    <rect x="5" y="0" width="4" height="24" rx="2" fill="#555"/>
    <rect x="2" y="8" width="10" height="6" rx="2" fill="#4fc3f7"/>
  </svg>

{:else if type === 'momentary_button'}
  <svg width="24" height="16" viewBox="0 0 24 16">
    <rect x="0" y="0" width="24" height="16" rx="3" fill="#333" stroke="#4fc3f7" stroke-width="1"/>
  </svg>

{:else if type === 'toggle_switch'}
  <svg width="24" height="14" viewBox="0 0 24 14">
    <rect x="0" y="0" width="24" height="14" rx="7" fill="#333"/>
    <circle cx="17" cy="7" r="5" fill="#4fc3f7"/>
  </svg>

{:else if type === 'dropdown'}
  <svg width="24" height="14" viewBox="0 0 24 14">
    <rect x="0" y="0" width="24" height="14" rx="2" fill="#222" stroke="#555" stroke-width="1"/>
    <path d="M 17 5 L 20 9 L 23 5" fill="none" stroke="#888" stroke-width="1"/>
  </svg>

{:else if type === 'xy_pad'}
  <svg width="20" height="20" viewBox="0 0 20 20">
    <rect x="0" y="0" width="20" height="20" rx="1" fill="none" stroke="#555" stroke-width="1"/>
    <line x1="10" y1="0" x2="10" y2="20" stroke="#333" stroke-width="0.5"/>
    <line x1="0" y1="10" x2="20" y2="10" stroke="#333" stroke-width="0.5"/>
    <circle cx="13" cy="7" r="3" fill="#4fc3f7"/>
  </svg>

{:else if type === 'level_meter'}
  <svg width="10" height="22" viewBox="0 0 10 22">
    <rect x="0" y="14" width="10" height="3" fill="#66bb6a"/>
    <rect x="0" y="10" width="10" height="3" fill="#66bb6a"/>
    <rect x="0" y="6" width="10" height="3" fill="#ffd54f"/>
    <rect x="0" y="2" width="10" height="3" fill="#ef5350" fill-opacity="0.4"/>
  </svg>

{:else if type === 'waveform_display'}
  <svg width="24" height="16" viewBox="0 0 24 16">
    <rect x="0" y="0" width="24" height="16" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
    <path d="M 2 8 Q 6 2 10 8 Q 14 14 18 8 Q 20 5 22 8" fill="none" stroke="#4fc3f7" stroke-width="1"/>
  </svg>

{:else if type === 'spectrum_analyzer'}
  <svg width="24" height="16" viewBox="0 0 24 16">
    <rect x="0" y="0" width="24" height="16" rx="2" fill="#0a0a1a" stroke="#333" stroke-width="0.5"/>
    <rect x="3" y="8" width="2" height="6" fill="#4fc3f7"/>
    <rect x="7" y="4" width="2" height="10" fill="#4fc3f7"/>
    <rect x="11" y="6" width="2" height="8" fill="#4fc3f7"/>
    <rect x="15" y="3" width="2" height="11" fill="#4fc3f7"/>
    <rect x="19" y="9" width="2" height="5" fill="#4fc3f7"/>
  </svg>

{:else if type === 'step_sequencer'}
  <svg width="24" height="12" viewBox="0 0 24 12">
    <rect x="0" y="0" width="5" height="12" rx="1" fill="#4fc3f7"/>
    <rect x="6" y="0" width="5" height="12" rx="1" fill="#1a1a2a" stroke="#333" stroke-width="0.5"/>
    <rect x="12" y="0" width="5" height="12" rx="1" fill="#4fc3f7"/>
    <rect x="18" y="0" width="5" height="12" rx="1" fill="#4fc3f7"/>
  </svg>

{:else if type === 'label_text'}
  <svg width="20" height="14" viewBox="0 0 20 14">
    <text x="2" y="11" fill="#ccc" font-size="11" font-family="system-ui, sans-serif" font-weight="bold">Aa</text>
  </svg>

{:else if type === 'led_indicator'}
  <svg width="14" height="14" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="5" fill="#ef5350"/>
    <circle cx="5" cy="5" r="2" fill="#fff" fill-opacity="0.3"/>
  </svg>

{:else if type === 'value_readout'}
  <svg width="24" height="14" viewBox="0 0 24 14">
    <rect x="0" y="0" width="24" height="14" rx="2" fill="#111" stroke="#333" stroke-width="0.5"/>
    <text x="12" y="10" text-anchor="middle" fill="#4fc3f7" font-size="8" font-family="monospace">440</text>
  </svg>

{:else if type === 'panel_group'}
  <svg width="22" height="18" viewBox="0 0 22 18">
    <rect x="0" y="3" width="22" height="15" rx="3" fill="#1a1a2a" fill-opacity="0.5" stroke="#555" stroke-width="1"/>
    <text x="3" y="14" fill="#888" font-size="6" font-family="system-ui">Panel</text>
  </svg>

{:else if type === 'separator'}
  <svg width="24" height="6" viewBox="0 0 24 6">
    <line x1="0" y1="3" x2="24" y2="3" stroke="#555" stroke-width="1"/>
  </svg>

{:else if type === 'section_header'}
  <svg width="22" height="14" viewBox="0 0 22 14">
    <text x="0" y="9" fill="#ccc" font-size="8" font-weight="bold" font-family="system-ui">HDR</text>
    <line x1="0" y1="12" x2="22" y2="12" stroke="#555" stroke-width="0.5"/>
  </svg>

{:else if type === 'image_placeholder'}
  <svg width="20" height="16" viewBox="0 0 20 16">
    <rect x="0" y="0" width="20" height="16" fill="none" stroke="#555" stroke-width="1" stroke-dasharray="2,2"/>
    <line x1="0" y1="0" x2="20" y2="16" stroke="#555" stroke-width="0.5"/>
    <line x1="20" y1="0" x2="0" y2="16" stroke="#555" stroke-width="0.5"/>
  </svg>

{:else}
  <svg width="20" height="20" viewBox="0 0 20 20">
    <rect x="2" y="2" width="16" height="16" rx="2" fill="#333"/>
  </svg>
{/if}
