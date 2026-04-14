import { register } from './registry.js';

// Controls
import RotaryKnob from './controls/RotaryKnob.svelte';
import MomentaryButton from './controls/MomentaryButton.svelte';
import ToggleSwitch from './controls/ToggleSwitch.svelte';
import VerticalSlider from './controls/VerticalSlider.svelte';
import Dropdown from './controls/Dropdown.svelte';
import XYPad from './controls/XYPad.svelte';
import MidiKeyboard from './controls/MidiKeyboard.svelte';

// Display
import LevelMeter from './display/LevelMeter.svelte';
import WaveformDisplay from './display/WaveformDisplay.svelte';
import SpectrumAnalyzer from './display/SpectrumAnalyzer.svelte';
import StepSequencer from './display/StepSequencer.svelte';
import AcidStepSequencer from './display/AcidStepSequencer.svelte';
import LabelText from './display/LabelText.svelte';
import LedIndicator from './display/LedIndicator.svelte';
import ValueReadout from './display/ValueReadout.svelte';

// Layout
import PanelGroup from './layout/PanelGroup.svelte';
import Separator from './layout/Separator.svelte';
import SectionHeader from './layout/SectionHeader.svelte';
import ImagePlaceholder from './layout/ImagePlaceholder.svelte';

export function registerAllComponents(): void {
  // --- Controls ---
  register('rotary_knob', {
    component: RotaryKnob,
    category: 'Controls',
    displayName: 'Knob',
    defaultProps: {
      width: 48, height: 60, color: '#4fc3f7', label: 'Knob',
      properties: { min: 0, max: 100, default: 50, unit: '' },
    },
    editableProperties: [
      { key: 'min', label: 'Min', type: 'number', propPath: 'properties.min' },
      { key: 'max', label: 'Max', type: 'number', propPath: 'properties.max' },
      { key: 'default', label: 'Default', type: 'number', propPath: 'properties.default' },
      { key: 'unit', label: 'Unit', type: 'text', propPath: 'properties.unit' },
    ],
  });

  register('momentary_button', {
    component: MomentaryButton,
    category: 'Controls',
    displayName: 'Button',
    defaultProps: {
      width: 60, height: 28, color: '#4fc3f7', label: 'Button',
      properties: {},
    },
    editableProperties: [],
  });

  register('toggle_switch', {
    component: ToggleSwitch,
    category: 'Controls',
    displayName: 'Toggle',
    defaultProps: {
      width: 36, height: 32, color: '#4fc3f7', label: 'Toggle',
      properties: { default: true },
    },
    editableProperties: [
      { key: 'default', label: 'On', type: 'checkbox', propPath: 'properties.default' },
    ],
  });

  register('vertical_slider', {
    component: VerticalSlider,
    category: 'Controls',
    displayName: 'Fader',
    defaultProps: {
      width: 24, height: 110, color: '#4fc3f7', label: 'Fader',
      properties: { min: 0, max: 100, default: 50, unit: '' },
    },
    editableProperties: [
      { key: 'min', label: 'Min', type: 'number', propPath: 'properties.min' },
      { key: 'max', label: 'Max', type: 'number', propPath: 'properties.max' },
      { key: 'default', label: 'Default', type: 'number', propPath: 'properties.default' },
      { key: 'unit', label: 'Unit', type: 'text', propPath: 'properties.unit' },
    ],
  });

  register('dropdown', {
    component: Dropdown,
    category: 'Controls',
    displayName: 'Dropdown',
    defaultProps: {
      width: 100, height: 24, color: '#4fc3f7', label: 'Mode',
      properties: { options: 'LP 24dB,HP 12dB,BP,Notch', selected: 'LP 24dB' },
    },
    editableProperties: [
      { key: 'options', label: 'Options', type: 'text', propPath: 'properties.options' },
      { key: 'selected', label: 'Value', type: 'text', propPath: 'properties.selected' },
    ],
  });

  register('xy_pad', {
    component: XYPad,
    category: 'Controls',
    displayName: 'XY Pad',
    defaultProps: {
      width: 120, height: 120, color: '#4fc3f7', label: 'XY',
      properties: { 'x-label': 'X', 'y-label': 'Y' },
    },
    editableProperties: [
      { key: 'x-label', label: 'X axis', type: 'text', propPath: 'properties.x-label' },
      { key: 'y-label', label: 'Y axis', type: 'text', propPath: 'properties.y-label' },
    ],
  });

  register('midi_keyboard', {
    component: MidiKeyboard,
    category: 'Controls',
    displayName: 'MIDI Keyboard',
    defaultProps: {
      width: 360, height: 90, color: '#888', label: '',
      properties: { octaves: 2, pitchBend: true, modWheel: true, portsPosition: 'front' },
    },
    editableProperties: [
      { key: 'octaves', label: 'Octaves', type: 'number', propPath: 'properties.octaves' },
      { key: 'pitchBend', label: 'Pitch Bend', type: 'checkbox', propPath: 'properties.pitchBend' },
      { key: 'modWheel', label: 'Mod Wheel', type: 'checkbox', propPath: 'properties.modWheel' },
      { key: 'portsPosition', label: 'Ports', type: 'text', propPath: 'properties.portsPosition' },
    ],
  });

  // --- Display ---
  register('level_meter', {
    component: LevelMeter,
    category: 'Display',
    displayName: 'Meter',
    defaultProps: {
      width: 16, height: 80, color: '#66bb6a', label: '',
      properties: { orientation: 'vertical', segments: 12 },
    },
    editableProperties: [
      { key: 'orientation', label: 'Dir', type: 'text', propPath: 'properties.orientation' },
      { key: 'segments', label: 'Segs', type: 'number', propPath: 'properties.segments' },
    ],
  });

  register('waveform_display', {
    component: WaveformDisplay,
    category: 'Display',
    displayName: 'Waveform',
    defaultProps: {
      width: 200, height: 80, color: '#4fc3f7', label: '',
      properties: {},
    },
    editableProperties: [],
  });

  register('spectrum_analyzer', {
    component: SpectrumAnalyzer,
    category: 'Display',
    displayName: 'Spectrum',
    defaultProps: {
      width: 200, height: 80, color: '#4fc3f7', label: '',
      properties: { bars: 24 },
    },
    editableProperties: [
      { key: 'bars', label: 'Bars', type: 'number', propPath: 'properties.bars' },
    ],
  });

  register('step_sequencer', {
    component: StepSequencer,
    category: 'Display',
    displayName: 'Step Seq',
    variantGroup: 'sequencer',
    variantLabel: 'Grid',
    defaultProps: {
      width: 400, height: 48, color: '#4fc3f7', label: '',
      properties: { rows: 1, columns: 16, cellSize: 24, activeColor: '#4fc3f7', pattern: '' },
    },
    editableProperties: [
      { key: 'rows', label: 'Rows', type: 'number', propPath: 'properties.rows' },
      { key: 'columns', label: 'Cols', type: 'number', propPath: 'properties.columns' },
      { key: 'cellSize', label: 'Cell', type: 'number', propPath: 'properties.cellSize' },
      { key: 'pattern', label: 'Active', type: 'text', propPath: 'properties.pattern' },
    ],
  });

  const defaultAcidSteps = Array.from({ length: 16 }, (_, i) => {
    const notes = [48, 48, 51, 48, 53, 48, 55, 48, 51, 48, 53, 51, 48, 55, 53, 48];
    return `${notes[i]}:0:0:0`;
  }).join(',');

  register('acid_step_sequencer', {
    component: AcidStepSequencer,
    category: 'Display',
    displayName: 'Step Seq',
    variantGroup: 'sequencer',
    variantLabel: 'Acid',
    defaultProps: {
      width: 520, height: 120, color: '#c42a2a', label: '',
      properties: { columns: 16, steps: defaultAcidSteps, minNote: 36, maxNote: 60 },
    },
    editableProperties: [
      { key: 'columns', label: 'Steps', type: 'number', propPath: 'properties.columns' },
      { key: 'minNote', label: 'Min note', type: 'number', propPath: 'properties.minNote' },
      { key: 'maxNote', label: 'Max note', type: 'number', propPath: 'properties.maxNote' },
    ],
  });

  register('label_text', {
    component: LabelText,
    category: 'Display',
    displayName: 'Label',
    defaultProps: {
      width: 80, height: 20, color: '#ffffff', label: 'Label',
      properties: { fontSize: 14, bold: false, italic: false, fontFamily: 'system-ui' },
    },
    editableProperties: [
      { key: 'fontSize', label: 'Size', type: 'number', propPath: 'properties.fontSize' },
      { key: 'bold', label: 'Bold', type: 'checkbox', propPath: 'properties.bold' },
      { key: 'italic', label: 'Italic', type: 'checkbox', propPath: 'properties.italic' },
      { key: 'fontFamily', label: 'Font', type: 'text', propPath: 'properties.fontFamily' },
    ],
  });

  register('led_indicator', {
    component: LedIndicator,
    category: 'Display',
    displayName: 'LED',
    defaultProps: {
      width: 12, height: 12, color: '#ef5350', label: '',
      properties: { on: true },
    },
    editableProperties: [
      { key: 'on', label: 'On', type: 'checkbox', propPath: 'properties.on' },
    ],
  });

  register('value_readout', {
    component: ValueReadout,
    category: 'Display',
    displayName: 'Readout',
    defaultProps: {
      width: 72, height: 24, color: '#4fc3f7', label: '',
      properties: { value: '440', unit: 'Hz', fontSize: 13 },
    },
    editableProperties: [
      { key: 'value', label: 'Value', type: 'text', propPath: 'properties.value' },
      { key: 'unit', label: 'Unit', type: 'text', propPath: 'properties.unit' },
      { key: 'fontSize', label: 'Size', type: 'number', propPath: 'properties.fontSize' },
    ],
  });

  // --- Layout ---
  register('panel_group', {
    component: PanelGroup,
    category: 'Layout',
    displayName: 'Panel',
    defaultProps: {
      width: 200, height: 150, color: '#555', label: 'Section',
      properties: { bgColor: '', bgOpacity: 0.3, cornerRadius: 6, borderWidth: 1 },
    },
    editableProperties: [
      { key: 'bgColor', label: 'BG', type: 'text', propPath: 'properties.bgColor' },
      { key: 'bgOpacity', label: 'Opacity', type: 'number', propPath: 'properties.bgOpacity' },
      { key: 'cornerRadius', label: 'Radius', type: 'number', propPath: 'properties.cornerRadius' },
      { key: 'borderWidth', label: 'Border', type: 'number', propPath: 'properties.borderWidth' },
    ],
  });

  register('separator', {
    component: Separator,
    category: 'Layout',
    displayName: 'Separator',
    defaultProps: {
      width: 100, height: 4, color: '#444', label: '',
      properties: { orientation: 'horizontal', thickness: 1 },
    },
    editableProperties: [
      { key: 'orientation', label: 'Dir', type: 'text', propPath: 'properties.orientation' },
      { key: 'thickness', label: 'Width', type: 'number', propPath: 'properties.thickness' },
    ],
  });

  register('section_header', {
    component: SectionHeader,
    category: 'Layout',
    displayName: 'Header',
    defaultProps: {
      width: 150, height: 22, color: '#ccc', label: 'SECTION',
      properties: { fontSize: 12 },
    },
    editableProperties: [
      { key: 'fontSize', label: 'Size', type: 'number', propPath: 'properties.fontSize' },
    ],
  });

  register('image_placeholder', {
    component: ImagePlaceholder,
    category: 'Layout',
    displayName: 'Image',
    defaultProps: {
      width: 120, height: 80, color: '#555', label: 'Logo',
      properties: {},
    },
    editableProperties: [],
  });
}
