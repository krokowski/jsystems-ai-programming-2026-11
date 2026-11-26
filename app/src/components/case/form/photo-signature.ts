export type ImageKind = "jpeg" | "png" | "webp";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

/** Detects the image type from the first 12 bytes (ADR-005 A11). Ignores File.type and the extension. */
export async function detectImageSignature(file: Blob): Promise<ImageKind | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length < 12) return null;
  if (startsWith(bytes, JPEG)) return "jpeg";
  if (startsWith(bytes, PNG)) return "png";
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return "webp";
  return null;
}
