"use client";

import { cn } from "cn";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import type { PhotoDraft } from "@/components/case/flow/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { pl } from "@/lib/i18n-pl";
import type { CaseType } from "@/lib/schemas";
import { FieldError } from "./field-error";
import { detectImageSignature } from "./photo-signature";

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  value: PhotoDraft | null;
  onChange: (photo: PhotoDraft | null) => void;
  error: string | undefined;
  onError: (message: string | undefined) => void;
  caseType: CaseType | "";
}

export function PhotoDropzone({ value, onChange, error, onError, caseType }: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const created = useRef(new Set<string>());
  const [dragging, setDragging] = useState(false);
  const errorId = "photo-error";
  const helperId = "photo-helper";
  const limitsId = "photo-limits";
  const helperType: CaseType = caseType === "complaint" ? "complaint" : "return";

  function release(photo: PhotoDraft | null): void {
    if (photo && created.current.delete(photo.objectUrl)) URL.revokeObjectURL(photo.objectUrl);
  }

  async function handleFile(file: File): Promise<void> {
    if (file.size > PHOTO_MAX_BYTES) {
      onError(pl.form.errors.photoTooLarge);
      return;
    }
    if ((await detectImageSignature(file)) === null) {
      onError(pl.form.errors.photoFormat);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    created.current.add(objectUrl);
    release(value);
    onError(undefined);
    onChange({ file, objectUrl });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Label htmlFor="photo" className="text-[15px] font-bold">{pl.form.photoLabel}</Label>
      <p id={helperId} className="text-sm text-muted-foreground">
        {pl.form.photoHelper[helperType]}
      </p>
      <input
        ref={inputRef}
        id="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${helperId} ${limitsId} ${errorId}` : `${helperId} ${limitsId}`}
        onChange={onInputChange}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-dashed border-[#c9cedd] bg-[#fafbfe] p-5 transition-colors",
          dragging && "border-primary bg-secondary",
          error && "border-destructive",
        )}
      >
        {value ? (
          <div className="flex items-center gap-3 rounded-xl bg-card p-2 ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={value.objectUrl} alt={value.file.name} className="size-16 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm">{value.file.name}</span>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => {
                release(value);
                onChange(null);
                onError(undefined);
              }}
            >
              {pl.form.photoRemove}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            id="photo-button"
            type="button"
            variant="outline"
            className="h-11 rounded-full border-primary/30 bg-card px-5 text-primary hover:bg-secondary"
            aria-describedby={error ? errorId : undefined}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {pl.form.photoButton}
          </Button>
          <span id={limitsId} className="text-sm text-muted-foreground">
            {pl.form.photoLimits}
          </span>
        </div>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
