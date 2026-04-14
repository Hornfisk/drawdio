export interface EffectState {
  enabled: boolean;
  intensity: number;
}

export interface GradientEffect extends EffectState {
  startColor: string;
  endColor: string;
  angle: number;
}

export interface TextureEffect extends EffectState {
  preset: string;
}

export interface EffectsData {
  drop_shadow: EffectState;
  inner_shadow: EffectState;
  blur_glow: EffectState;
  bevel: EffectState;
  gloss: EffectState;
  gradient_fill: GradientEffect;
  texture_fill: TextureEffect;
}

export interface ComponentData {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string;
  properties: Record<string, unknown>;
  effects: EffectsData;
  group: string | null;
  visible: boolean;
  zIndex: number;
}

export interface Group {
  id: string;
  children: string[];
}

export interface PropertySpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'checkbox' | 'range';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  propPath?: string;
}

export function createDefaultEffects(): EffectsData {
  return {
    drop_shadow: { enabled: false, intensity: 50 },
    inner_shadow: { enabled: false, intensity: 50 },
    blur_glow: { enabled: false, intensity: 30 },
    bevel: { enabled: false, intensity: 50 },
    gloss: { enabled: false, intensity: 50 },
    gradient_fill: { enabled: false, intensity: 50, startColor: '#ffffff', endColor: '#000000', angle: 0 },
    texture_fill: { enabled: false, intensity: 50, preset: 'noise' },
  };
}
