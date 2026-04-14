import type { ComponentData, Group } from '../components/types.js';

export interface UserAsset {
  id: string;
  name: string;
  dataUrl: string;
}

export const appState = $state({
  canvasWidth: 900,
  canvasHeight: 600,
  bgColor: '#1a1a1a',
  gridSize: 20,
  gridVisible: true,
  snapEnabled: true,
  zoom: 1,
  panX: 0,
  panY: 0,
  components: [] as ComponentData[],
  groups: [] as Group[],
  selectedIds: [] as string[],
  nextId: 1,
  clipboard: [] as ComponentData[],
  isDirty: false,
  fileName: null as string | null,
  tooltipsEnabled: true,
  placingType: null as string | null,
  accentColor: '#4fc3f7',
  theme: 'dark' as 'dark' | 'light',
  userAssets: [] as UserAsset[],
  showShortcutsHelp: false,
  refImageDataUrl: null as string | null,
  refImageOpacity: 0.5,
  refImageVisible: true,
});
