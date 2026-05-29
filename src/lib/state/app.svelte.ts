import type { ComponentData, Group } from '../components/types.js';

export interface UserAsset {
  id: string;
  name: string;
  dataUrl: string;
}

export type GridDensity = 'coarse' | 'medium' | 'fine';

/**
 * A single workspace (canvas + its components, groups, and canvas-scoped settings).
 * Projects can hold multiple workspaces — handy for theme/variant iteration.
 * The active workspace's data is mirrored into the top-level appState fields
 * (canvasWidth, components, groups, etc) for back-compat with the 200+ read
 * sites; the non-active workspaces hold full snapshots. switchWorkspace() in
 * `./workspaces.js` swaps the snapshot in/out on switch.
 */
export interface Workspace {
  id: string;
  name: string;
  /** World-space position of the workspace's top-left corner. */
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  bgColor: string;
  gridSize: number;
  gridDensity: GridDensity;
  gridVisible: boolean;
  refImageDataUrl: string | null;
  refImageOpacity: number;
  refImageVisible: boolean;
  refImageOffsetX: number;
  refImageOffsetY: number;
  components: ComponentData[];
  groups: Group[];
  nextId: number;
}

export const GRID_DENSITY_SIZE: Record<GridDensity, number> = {
  fine: 16,
  medium: 32,
  coarse: 64,
};

export function setGridDensity(d: GridDensity) {
  appState.gridDensity = d;
  appState.gridSize = GRID_DENSITY_SIZE[d];
}

export function inferGridDensity(size: number): GridDensity {
  // Round to nearest preset; old files keep their exact gridSize, only the toggle indicator follows.
  const targets: [GridDensity, number][] = [['fine', 16], ['medium', 32], ['coarse', 64]];
  let best: GridDensity = 'medium';
  let bestDist = Infinity;
  for (const [name, val] of targets) {
    const d = Math.abs(size - val);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

export const appState = $state({
  canvasWidth: 900,
  canvasHeight: 600,
  bgColor: '#0E0F12',
  gridSize: 32,
  gridDensity: 'medium' as 'coarse' | 'medium' | 'fine',
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
  /**
   * Snapshot of any groups that were fully contained within the component
   * clipboard at copy time. Paste regenerates IDs for these and remaps the
   * pasted components' `group` references so grouping is preserved.
   */
  clipboardGroups: [] as Group[],
  isDirty: false,
  fileName: null as string | null,
  tooltipsEnabled: true,
  placingType: null as string | null,
  accentColor: '#FFB800',
  theme: 'dark' as 'dark' | 'light',
  userAssets: [] as UserAsset[],
  showShortcutsHelp: false,
  refImageDataUrl: null as string | null,
  refImageOpacity: 0.5,
  refImageVisible: true,
  refImageOffsetX: 0,
  refImageOffsetY: 0,
  // Workspaces (frames). Populated on app init via ensureWorkspace().
  workspaces: [] as Workspace[],
  activeWorkspaceId: '',
  // When set, the workspace is selected as an entity (for Ctrl+C / Ctrl+V / Delete
  // to operate on the whole frame). Mutually exclusive with component selectedIds:
  // setting one clears the other.
  selectedWorkspaceId: null as string | null,
  // Workspace clipboard — snapshot stored on Ctrl+C, pasted as a new frame on Ctrl+V.
  workspaceClipboard: null as Workspace | null,
  /** When non-null, the workspace header label renders as an inline-edit input. */
  renamingWorkspaceId: null as string | null,
});
