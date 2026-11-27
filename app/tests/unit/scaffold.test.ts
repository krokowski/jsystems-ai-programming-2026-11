import path from "node:path";
import { ESLint } from "eslint";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(__dirname, "../..");

describe("scaffold (ADR-001 §8)", () => {
  it("sharp is installed with its native build and can resize a generated buffer", async () => {
    const input = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const output = await sharp(input).resize(5, 5).jpeg().toBuffer();
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(5);
  });

  it("ESM-only packages (file-type, OpenRouter provider) import without module format errors", async () => {
    const fileType = await import("file-type");
    const provider = await import("@openrouter/ai-sdk-provider");
    expect(typeof fileType.fileTypeFromBuffer).toBe("function");
    expect(typeof provider.createOpenRouter).toBe("function");
  });

  it("the deprecated AI SDK API lint rule fails on generateObject and image parts (ADR-005 A14)", async () => {
    const eslint = new ESLint({ cwd: appRoot, ignore: false });
    const [result] = await eslint.lintFiles(["tests/fixtures/lint/deprecated-api.fixture.ts"]);
    const messages = (result?.messages ?? []).map((m) => `${m.ruleId}: ${m.message}`);
    expect(messages.some((m) => m.includes("generateText with Output.object"))).toBe(true);
    expect(messages.some((m) => m.includes("`file` parts"))).toBe(true);
    expect(messages.some((m) => m.startsWith("no-restricted-imports"))).toBe(true);
  }, 60_000);
});
