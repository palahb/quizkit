import { File } from 'expo-file-system';

/** Reads a picked document as text. */
export async function readTextFile(asset: { uri: string; file?: File | Blob }): Promise<string> {
  return new File(asset.uri).text();
}
