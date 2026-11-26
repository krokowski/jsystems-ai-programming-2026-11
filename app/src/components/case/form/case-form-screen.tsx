"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type DefaultValues, type Resolver } from "react-hook-form";
import {
  EMPTY_DRAFT,
  type CaseFormScreenProps,
  type FormDraft,
  type PhotoDraft,
} from "@/components/case/flow/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pl } from "@/lib/i18n-pl";
import {
  createCaseFormSchema,
  PRODUCT_NAME_MAX,
  COMPLAINT_REASON_MIN,
  type CaseForm,
  type CaseFormInput,
} from "@/lib/schemas";
import { CaseTypeCards } from "./case-type-cards";
import { CategorySelect } from "./category-select";
import { FieldError } from "./field-error";
import { PhotoDropzone } from "./photo-dropzone";
import { PurchaseDatePicker } from "./purchase-date-picker";
import { ReasonField } from "./reason-field";

type FieldName = "caseType" | "category" | "productName" | "purchaseDate" | "reason" | "photo";

const FOCUS_ORDER: { field: FieldName; id: string }[] = [
  { field: "caseType", id: "case-type-return" },
  { field: "category", id: "category" },
  { field: "productName", id: "product-name" },
  { field: "purchaseDate", id: "purchase-date" },
  { field: "reason", id: "reason" },
  { field: "photo", id: "photo-button" },
];

function toDefaults(d: FormDraft): DefaultValues<CaseFormInput> {
  return {
    caseType: d.caseType === "" ? undefined : d.caseType,
    category: d.category === "" ? undefined : d.category,
    productName: d.productName,
    purchaseDate: d.purchaseDate,
    reason: d.reason,
  };
}

export function CaseFormScreen(props: CaseFormScreenProps): React.JSX.Element {
  const { today, serverErrors, formError, submitting, onSubmit } = props;
  const schema = useMemo(() => createCaseFormSchema({ today }), [today]);
  const resolver = useMemo<Resolver<CaseFormInput, unknown, CaseForm>>(() => {
    const base = zodResolver(schema);
    return async (values, context, options) => {
      const result = await base(values, context, options);
      // zod skips object-level refinements while other fields are invalid; AC-11 wants every error at once.
      const reasonShort =
        values.caseType === "complaint" && (values.reason ?? "").trim().length < COMPLAINT_REASON_MIN;
      if (reasonShort && Object.keys(result.errors ?? {}).length > 0 && !result.errors?.reason) {
        return {
          values: {},
          errors: { ...result.errors, reason: { type: "custom", message: pl.form.errors.reasonTooShort } },
        };
      }
      return result;
    };
  }, [schema]);
  const form = useForm<CaseFormInput, unknown, CaseForm>({
    resolver,
    defaultValues: toDefaults(props.initialDraft ?? EMPTY_DRAFT),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });
  const { control, register, handleSubmit, setError, getValues, formState } = form;
  const [photo, setPhoto] = useState<PhotoDraft | null>(props.initialPhoto);
  const [localPhotoError, setLocalPhotoError] = useState<string | undefined>(undefined);
  const [dismissedServer, setDismissedServer] = useState<typeof serverErrors | null>(null);
  const photoError = localPhotoError ?? (dismissedServer === serverErrors ? undefined : serverErrors.photo);
  function setPhotoError(message: string | undefined): void {
    setLocalPhotoError(message);
    setDismissedServer(serverErrors);
  }
  const submittedRef = useRef(false);

  useEffect(() => {
    for (const key of ["caseType", "category", "productName", "purchaseDate", "reason"] as const) {
      const message = serverErrors[key];
      if (message) setError(key, { type: "server", message });
    }
  }, [serverErrors, setError]);

  useEffect(() => {
    if (!submitting) submittedRef.current = false;
  }, [submitting, serverErrors, formError]);

  const caseType = useWatch({ control, name: "caseType" }) ?? "";
  const reason = useWatch({ control, name: "reason" }) ?? "";
  const errors = formState.errors;

  function currentDraft(): FormDraft {
    const v = getValues();
    return {
      caseType: v.caseType ?? "",
      category: v.category ?? "",
      productName: v.productName ?? "",
      purchaseDate: v.purchaseDate ?? "",
      reason: v.reason ?? "",
    };
  }

  function focusFirst(invalid: ReadonlySet<FieldName>): void {
    const first = FOCUS_ORDER.find((f) => invalid.has(f.field));
    if (first) document.getElementById(first.id)?.focus();
  }

  function onInvalid(): void {
    const invalid = new Set<FieldName>();
    for (const f of FOCUS_ORDER) if (f.field !== "photo" && form.getFieldState(f.field).error) invalid.add(f.field);
    if (!photo) {
      setPhotoError(pl.form.errors.photoRequired);
      invalid.add("photo");
    } else if (photoError) {
      invalid.add("photo");
    }
    focusFirst(invalid);
  }

  function onValid(values: CaseForm): void {
    if (submittedRef.current) return;
    if (!photo) {
      setPhotoError(pl.form.errors.photoRequired);
      focusFirst(new Set<FieldName>(["photo"]));
      return;
    }
    submittedRef.current = true;
    onSubmit(values, photo, currentDraft());
  }

  return (
    <div className="mx-auto w-full max-w-180 px-4 py-6">
      <p className="mb-4 text-base text-muted-foreground">{pl.common.intro}</p>
      <form
        noValidate
        onSubmit={(e) => {
          void handleSubmit(onValid, onInvalid)(e);
        }}
        className="flex flex-col gap-6 border border-border bg-card p-4 sm:p-6"
      >
        <Controller
          control={control}
          name="caseType"
          render={({ field }) => (
            <CaseTypeCards value={field.value ?? ""} onChange={field.onChange} error={errors.caseType?.message} />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategorySelect value={field.value ?? ""} onChange={field.onChange} error={errors.category?.message} />
          )}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-name">{pl.form.productNameLabel}</Label>
          <Input
            id="product-name"
            maxLength={PRODUCT_NAME_MAX}
            placeholder={pl.form.productNamePlaceholder}
            className="h-11"
            aria-invalid={errors.productName ? true : undefined}
            aria-describedby={errors.productName ? "product-name-error" : undefined}
            {...register("productName")}
          />
          <FieldError id="product-name-error" message={errors.productName?.message} />
        </div>
        <Controller
          control={control}
          name="purchaseDate"
          render={({ field }) => (
            <PurchaseDatePicker
              value={field.value ?? ""}
              onChange={field.onChange}
              today={today}
              error={errors.purchaseDate?.message}
            />
          )}
        />
        <ReasonField
          registration={register("reason")}
          caseType={caseType}
          length={reason.length}
          error={errors.reason?.message}
        />
        <PhotoDropzone
          value={photo}
          onChange={setPhoto}
          error={photoError}
          onError={setPhotoError}
          caseType={caseType}
        />
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="h-11" disabled={submitting}>
          {pl.form.submit}
        </Button>
      </form>
    </div>
  );
}
