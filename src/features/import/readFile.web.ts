/** Reads a picked document as text: the File object when the picker gives one, else its blob URL. */
export async function readTextFile(asset: { uri: string; file?: File | Blob }): Promise<string> {
  if (asset.file) return asset.file.text();
  const res = await fetch(asset.uri);
  return res.text();
}
