import { CircleAlert } from "lucide-react";

export function FieldError({ id, message }: { id: string; message: string | undefined }): React.JSX.Element | null {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-[#b42318]">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
