"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { pl } from "@/lib/i18n-pl";

export function ExpiredNotice({ onNewCase }: { onNewCase: () => void }): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col items-start gap-4 px-4 py-6">
      <Alert role="alert" className="rounded-2xl border-0 bg-card px-5 py-4 shadow-card">
        <AlertDescription>{pl.chat.expired}</AlertDescription>
      </Alert>
      <Button type="button" className="h-12 rounded-full px-6 text-base" onClick={onNewCase}>
        {pl.chat.expiredAction}
      </Button>
    </div>
  );
}
