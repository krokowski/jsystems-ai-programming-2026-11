import { readFileSync } from "node:fs";
import path from "node:path";

import { resetConfigForTests } from "@/server/config";
import { resetCaseRepositoryForTests } from "@/server/cases/repository";
import { resetServiceStateForTests } from "@/server/cases/service";

const IMAGES_DIR = path.resolve(__dirname, "../../../assets/example-images");

export function setupTestEnv(): void {
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.LLM_MODEL = "test/model";
  resetConfigForTests();
  resetCaseRepositoryForTests();
  resetServiceStateForTests();
}

export function readExamplePhoto(name: string): Buffer {
  return readFileSync(path.join(IMAGES_DIR, name));
}

export interface CreateFields {
  caseType?: string;
  category?: string;
  productName?: string;
  purchaseDate?: string;
  reason?: string;
}

export const VALID_FIELDS = {
  caseType: "return",
  category: "smartphone",
  productName: "  Galaxy S24  ",
  purchaseDate: "2026-11-20",
  reason: "",
} as const satisfies CreateFields;

export interface PhotoInput {
  bytes: Uint8Array;
  name: string;
  type: string;
}

export function buildCreateRequest(
  fields: CreateFields,
  photo: PhotoInput | null,
  headers?: Record<string, string>,
): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  if (photo) {
    form.append("photo", new File([new Uint8Array(photo.bytes)], photo.name, { type: photo.type }));
  }
  return new Request("http://localhost/api/cases", { method: "POST", body: form, headers });
}

export function examplePhoto(name: string, type: string): PhotoInput {
  return { bytes: readExamplePhoto(name), name, type };
}
