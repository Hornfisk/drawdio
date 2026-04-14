/**
 * Opens a file picker dialog and calls callback with the selected file as a base64 data URL.
 */
export function loadImageFile(
  accept: string,
  callback: (dataUrl: string, fileName: string) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.onerror = () => console.error('Failed to read file:', file.name);
    reader.readAsDataURL(file);
  };
  input.click();
}
