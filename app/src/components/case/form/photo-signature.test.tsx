import { describe, expect, it } from "vitest";
import { detectImageSignature } from "./photo-signature";

function blob(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe("detectImageSignature", () => {
  it("detects JPEG, PNG and WebP by magic bytes", async () => {
    expect(await detectImageSignature(blob([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg");
    expect(await detectImageSignature(blob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("png");
    const riff = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
    expect(await detectImageSignature(blob(riff))).toBe("webp");
  });

  it("rejects text, RIFF without WEBP and short blobs", async () => {
    expect(await detectImageSignature(new Blob(["hello world, not an image"]))).toBeNull();
    expect(await detectImageSignature(blob([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]))).toBeNull();
    expect(await detectImageSignature(blob([0xff, 0xd8]))).toBeNull();
  });
});
