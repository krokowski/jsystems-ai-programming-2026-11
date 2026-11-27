import { z } from "zod";
import { form } from "../i18n-pl/form";
import { CASE_TYPES, CATEGORIES } from "./enums";

export const MIN_PURCHASE_DATE = "1990-01-01";
export const REASON_MAX = 2000;
export const COMPLAINT_REASON_MIN = 10;
export const PRODUCT_NAME_MIN = 2;
export const PRODUCT_NAME_MAX = 100;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function createCaseFormSchema(opts: { today: string }) {
  const { errors } = form;
  return z
    .object({
      caseType: z.enum(CASE_TYPES, { error: errors.caseTypeRequired }),
      category: z.enum(CATEGORIES, { error: errors.categoryRequired }),
      productName: z
        .string({ error: errors.productNameLength })
        .trim()
        .min(PRODUCT_NAME_MIN, errors.productNameLength)
        .max(PRODUCT_NAME_MAX, errors.productNameLength),
      purchaseDate: z
        .string({ error: errors.purchaseDateRequired })
        .min(1, errors.purchaseDateRequired)
        .superRefine((value, ctx) => {
          if (value.length === 0) return;
          if (!isRealDate(value) || value < MIN_PURCHASE_DATE) {
            ctx.addIssue({ code: "custom", message: errors.purchaseDateInvalid });
          } else if (value > opts.today) {
            ctx.addIssue({ code: "custom", message: errors.purchaseDateFuture });
          }
        }),
      reason: z.string().trim().max(REASON_MAX, errors.reasonTooLong).optional().default(""),
    })
    .superRefine((value, ctx) => {
      if (value.caseType === "complaint" && value.reason.length < COMPLAINT_REASON_MIN) {
        ctx.addIssue({ code: "custom", path: ["reason"], message: errors.reasonTooShort });
      }
    });
}

export type CaseFormSchema = ReturnType<typeof createCaseFormSchema>;
export type CaseForm = z.output<CaseFormSchema>;
export type CaseFormInput = z.input<CaseFormSchema>;

export type FieldErrors = Partial<
  Record<"caseType" | "category" | "productName" | "purchaseDate" | "reason" | "photo", string>
>;

const FIELD_KEYS = ["caseType", "category", "productName", "purchaseDate", "reason", "photo"] as const;

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const head = issue.path[0];
    const key = FIELD_KEYS.find((k) => k === head);
    if (key && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}
