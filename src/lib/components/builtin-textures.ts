export interface BuiltinTexture {
  id: string;
  name: string;
  src: string;
}

export const BUILTIN_TEXTURES: BuiltinTexture[] = [
  { id: 'builtin_texture_1', name: 'Texture 1', src: '/textures/texture.png' },
  { id: 'builtin_texture_2', name: 'Texture 2', src: '/textures/texture_2.png' },
  { id: 'builtin_texture_3', name: 'Texture 3', src: '/textures/texture_3.png' },
  { id: 'builtin_texture_4', name: 'Texture 4', src: '/textures/texture_4.png' },
];
