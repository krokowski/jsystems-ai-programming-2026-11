import type { ReactNode } from "react";
import Image from "next/image";
import { pl } from "@/lib/i18n-pl";

export type SiteHeaderProps = {
  actions?: ReactNode;
};

export function SiteHeader({ actions }: SiteHeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-4 px-4 py-3 xl:px-20">
        <div className="flex min-w-0 items-center gap-4">
          <Image src="/logo.svg" alt={pl.common.logoAlt} width={132} height={16} priority className="h-4 w-auto shrink-0" />
          <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-white/10 sm:block" />
          <div className="flex min-w-0 flex-col">
            <p className="text-[15px] font-bold leading-tight text-white md:text-lg">{pl.common.appTitle}</p>
            <p className="hidden text-sm leading-snug text-white/65 min-[480px]:block">{pl.common.appSubtitle}</p>
          </div>
        </div>
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
