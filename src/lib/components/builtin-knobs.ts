export interface BuiltinKnob {
  id: string;
  name: string;
  src: string;
}

export const BUILTIN_KNOBS: BuiltinKnob[] = [
  { id: 'builtin_knob_black_1',  name: 'Black Brushed',   src: '/knobs/knob_black_1.png' },
  { id: 'builtin_knob_black_2',  name: 'Black Flat',      src: '/knobs/knob_black_2.png' },
  { id: 'builtin_knob_black_3',  name: 'Black LED Blue',  src: '/knobs/knob_black_3.png' },
  { id: 'builtin_knob_black_4',  name: 'Black LED Amber', src: '/knobs/knob_black_4.png' },
  { id: 'builtin_knob_blue_1',   name: 'Blue',            src: '/knobs/knob_blue_1.png' },
  { id: 'builtin_knob_metal_1',  name: 'Metal Blue',      src: '/knobs/knob_metal_1.png' },
  { id: 'builtin_knob_metal_2',  name: 'Metal Green',     src: '/knobs/knob_metal_2.png' },
  { id: 'builtin_knob_metal_3',  name: 'Dark Brushed',    src: '/knobs/knob_metal_3.png' },
  { id: 'builtin_knob_metal_4',  name: 'Dark Knurled',    src: '/knobs/knob_metal_4.png' },
  { id: 'builtin_knob_red_1',    name: 'Red',             src: '/knobs/knob_red_1.png' },
  { id: 'builtin_knob_silver_1', name: 'Silver',          src: '/knobs/knob_silver_1.png' },
];
