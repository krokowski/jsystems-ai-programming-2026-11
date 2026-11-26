import "server-only";

import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const MAX_PHOTO_BYTES = 10_485_760;
export const AI_IMAGE_MAX_SIDE = 1568;
export const THUMB_MAX_SIDE = 320;
const MAX_INPUT_PIXELS = 40_000_000;

export type ImageIntakeErrorCode = "FILE_TOO_LARGE" | "FORMAT_NOT_ALLOWED";

export class ImageIntakeError extends Error {
  readonly code: ImageIntakeErrorCode;

  constructor(code: ImageIntakeErrorCode) {
    super(code);
    this.name = "ImageIntakeError";
    this.code = code;
  }
}

export interface ProcessedImage {
  jpeg: Buffer;
  width: number;
  height: number;
  originalMime: "image/jpeg" | "image/png" | "image/webp";
  originalBytes: number;
  thumbnailDataUrl: string;
}

function isAllowedMime(mime: string): mime is ProcessedImage["originalMime"] {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

// Validates and normalises an uploaded photo. Magic bytes decide the format, never the file name (ADR-003 3.2, 6.2).
export async function processPhoto(bytes: Uint8Array): Promise<ProcessedImage> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new ImageIntakeError("FILE_TOO_LARGE");
  }

  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !isAllowedMime(detected.mime)) {
    throw new ImageIntakeError("FORMAT_NOT_ALLOWED");
  }

  try {
    const source = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).autoOrient();

    // Metadata is stripped by default: never call keepMetadata or withMetadata.
    const ai = await source
      .clone()
      .resize({
        width: AI_IMAGE_MAX_SIDE,
        height: AI_IMAGE_MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    // The thumbnail is made from the already reduced AI image, so the full-size
    // original is decoded only once (TAC-06 latency).
    const thumb = await sharp(ai.data)
      .resize({
        width: THUMB_MAX_SIDE,
        height: THUMB_MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    return {
      jpeg: ai.data,
      width: ai.info.width,
      height: ai.info.height,
      originalMime: detected.mime,
      originalBytes: bytes.byteLength,
      thumbnailDataUrl: `data:image/jpeg;base64,${thumb.toString("base64")}`,
    };
  } catch {
    // Decode failures (corrupt, truncated, too many pixels) are format errors for the customer.
    throw new ImageIntakeError("FORMAT_NOT_ALLOWED");
  }
}
