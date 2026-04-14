export const eyedropperState = $state<{
  active: boolean;
  onPick: ((hex: string) => void) | null;
}>({
  active: false,
  onPick: null,
});

export function startPick(onPick: (hex: string) => void) {
  eyedropperState.onPick = onPick;
  eyedropperState.active = true;
}

export function cancelPick() {
  eyedropperState.active = false;
  eyedropperState.onPick = null;
}

export function completePick(hex: string) {
  const cb = eyedropperState.onPick;
  eyedropperState.active = false;
  eyedropperState.onPick = null;
  cb?.(hex);
}
