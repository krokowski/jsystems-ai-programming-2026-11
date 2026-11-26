import "server-only";

import { pl } from "@/lib/i18n-pl";
import { createCaseFormSchema, fieldErrorsFromZod, type CaseSummary, type FieldErrors } from "@/lib/schemas";
import { todayInAppZone } from "@/lib/time";

import { payloadTooLarge, validationFailed } from "../errors";
import { ImageIntakeError, MAX_PHOTO_BYTES, processPhoto, type ProcessedImage } from "../images/image-intake";
import { logStage } from "../logging";
import { computeDateRule } from "../rules/date-rules";
import { getCaseRepository } from "./repository";
import { toSummary } from "./service";

const MAX_REQUEST_BYTES = 11 * 1024 * 1024;

function textField(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

async function readPhoto(
  form: FormData,
): Promise<{ image: ProcessedImage | null; error: string | null }> {
  const files = form.getAll("photo").filter((v) => typeof v !== "string");
  const [file] = files;
  if (files.length !== 1 || file === undefined || file.size === 0) {
    return { image: null, error: pl.form.errors.photoRequired };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { image: null, error: pl.form.errors.photoTooLarge };
  }
  try {
    return { image: await processPhoto(new Uint8Array(await file.arrayBuffer())), error: null };
  } catch (err) {
    if (err instanceof ImageIntakeError) {
      return {
        image: null,
        error: err.code === "FILE_TOO_LARGE" ? pl.form.errors.photoTooLarge : pl.form.errors.photoFormat,
      };
    }
    throw err;
  }
}

export async function createCase(
  request: Request,
  now: Date = new Date(),
): Promise<{ caseId: string; summary: CaseSummary }> {
  const started = performance.now();

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw payloadTooLarge();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw validationFailed({});
  }

  const today = todayInAppZone(now);
  const parsed = createCaseFormSchema({ today }).safeParse({
    caseType: textField(formData, "caseType"),
    category: textField(formData, "category"),
    productName: textField(formData, "productName"),
    purchaseDate: textField(formData, "purchaseDate"),
    reason: textField(formData, "reason"),
  });
  const photo = await readPhoto(formData);

  const fields: FieldErrors = parsed.success ? {} : fieldErrorsFromZod(parsed.error);
  if (photo.error !== null) fields.photo = photo.error;
  if (!parsed.success || photo.image === null) {
    throw validationFailed({ ...fields });
  }

  const form = parsed.data;
  const image = photo.image;
  const created = getCaseRepository().create({
    id: crypto.randomUUID(),
    status: "created",
    form,
    image: {
      jpeg: image.jpeg,
      width: image.width,
      height: image.height,
      originalMime: image.originalMime,
      originalBytes: image.originalBytes,
    },
    thumbnailDataUrl: image.thumbnailDataUrl,
    dateRule: computeDateRule({
      caseType: form.caseType,
      purchaseDate: form.purchaseDate,
      referenceDate: today,
    }),
    screening: null,
    findings: null,
    decision: null,
    decisionHistory: [],
    messages: [],
    chatBusy: false,
    chatBusySince: null,
  });

  logStage({
    caseId: created.id,
    stage: "create",
    durationMs: Math.round(performance.now() - started),
    status: "ok",
  });
  return { caseId: created.id, summary: toSummary(created) };
}
