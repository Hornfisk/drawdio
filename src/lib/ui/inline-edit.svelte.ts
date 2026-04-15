export const inlineEdit = $state<{ componentId: string | null }>({
  componentId: null,
});

export function startInlineEdit(componentId: string): void {
  inlineEdit.componentId = componentId;
}

export function stopInlineEdit(): void {
  inlineEdit.componentId = null;
}

export function isEditing(): boolean {
  return inlineEdit.componentId !== null;
}
