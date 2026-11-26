import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  AI_IMAGE_MAX_SIDE,
  ImageIntakeError,
  MAX_PHOTO_BYTES,
  processPhoto,
} from "./image-intake";

const EXAMPLES = resolve(process.cwd(), "..", "assets", "example-images");
const sample = (name: string): Uint8Array => new Uint8Array(readFileSync(resolve(EXAMPLES, name)));

const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);

function withHeader(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set(JPEG_HEADER, 0);
  return buf;
}

async function intakeErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  return promise.then(
    () => undefined,
    (err: unknown) => (err instanceof ImageIntakeError ? err.code : undefined),
  );
}

async function expectIntakeError(promise: Promise<unknown>, code: string): Promise<void> {
  expect(await intakeErrorCode(promise)).toBe(code);
}

function thumbnailBytes(dataUrl: string): Buffer {
  const prefix = "data:image/jpeg;base64,";
  expect(dataUrl.startsWith(prefix)).toBe(true);
  return Buffer.from(dataUrl.slice(prefix.length), "base64");
}

describe("processPhoto limits", () => {
  it("exposes the limits from the spec", () => {
    expect(MAX_PHOTO_BYTES).toBe(10_485_760);
    expect(AI_IMAGE_MAX_SIDE).toBe(1600);
  });

  it("rejects a file one byte above 10 MB with FILE_TOO_LARGE", async () => {
    await expectIntakeError(processPhoto(withHeader(10_485_761)), "FILE_TOO_LARGE");
  });

  it("does not reject a file of exactly 10 MB as too large", async () => {
    // The header alone cannot decode, so the failure must be the format check, not the size check.
    expect(await intakeErrorCode(processPhoto(withHeader(10_485_760)))).toBe("FORMAT_NOT_ALLOWED");
  });
});

describe("processPhoto format detection", () => {
  it("rejects plain text with FORMAT_NOT_ALLOWED", async () => {
    await expectIntakeError(processPhoto(new TextEncoder().encode("hello")), "FORMAT_NOT_ALLOWED");
  });

  it("rejects a truncated JPEG with FORMAT_NOT_ALLOWED", async () => {
    const truncated = sample("phone-1.jpg").slice(0, 2000);
    await expectIntakeError(processPhoto(truncated), "FORMAT_NOT_ALLOWED");
  });
});

describe("processPhoto on real photos", () => {
  it("accepts laptop-1.png (JPEG bytes with a .png name), resizes to longer side 1600 and strips metadata", async () => {
    const result = await processPhoto(sample("laptop-1.png"));

    expect(result.originalMime).toBe("image/jpeg");
    expect(result.originalBytes).toBe(sample("laptop-1.png").byteLength);
    expect(result.width).toBeLessThanOrEqual(1600);
    expect(result.height).toBeLessThanOrEqual(1600);
    expect(Math.max(result.width, result.height)).toBe(1600);
    // Source is portrait (3024x3135): height is the longer side.
    expect(result.height).toBe(1600);

    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(result.width);
    expect(meta.height).toBe(result.height);
    expect(meta.exif).toBeUndefined();

    const thumb = await sharp(thumbnailBytes(result.thumbnailDataUrl)).metadata();
    expect(thumb.format).toBe("jpeg");
    expect(Math.max(thumb.width ?? 0, thumb.height ?? 0)).toBeLessThanOrEqual(320);
    expect(Math.max(thumb.width ?? 0, thumb.height ?? 0)).toBe(320);
  });

  it("strips EXIF from phone-1.jpg", async () => {
    const source = await sharp(sample("phone-1.jpg")).metadata();
    expect(source.exif).toBeDefined();

    const result = await processPhoto(sample("phone-1.jpg"));
    expect(result.originalMime).toBe("image/jpeg");
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
  });

  it("does not enlarge phone-2.jpeg (387x516)", async () => {
    const result = await processPhoto(sample("phone-2.jpeg"));
    expect(result.originalMime).toBe("image/jpeg");
    expect(result.width).toBe(387);
    expect(result.height).toBe(516);
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.width).toBe(387);
    expect(meta.height).toBe(516);
  });

  it("accepts laptop-2.webp and outputs JPEG", async () => {
    const result = await processPhoto(sample("laptop-2.webp"));
    expect(result.originalMime).toBe("image/webp");
    expect(result.originalBytes).toBe(sample("laptop-2.webp").byteLength);
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(result.thumbnailDataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
  });
});
