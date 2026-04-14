/**
 * Fetches a URL and returns a base64 data URL.
 * Used for builtin knobs and textures at placement time.
 */
export async function fetchAssetAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch asset "${url}": ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader failed for "${url}"`));
    reader.readAsDataURL(blob);
  });
}
