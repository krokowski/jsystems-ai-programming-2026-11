"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { pl } from "@/lib/i18n-pl";

export type SiteHeaderProps = {
  actions?: ReactNode;
};

const GAP_PX = 16;

export function SiteHeader({ actions }: SiteHeaderProps): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const sync = (): void => {
      root.style.setProperty("--header-h", `${header.getBoundingClientRect().height}px`);
    };
    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(header);

    // Browsers do not scroll an already-visible focus target out from under a sticky
    // header (scroll-padding is ignored then), so reveal it, with its fieldset legend.
    const onFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || header.contains(target)) return;
      const fieldset = target.closest("fieldset");
      const anchor = fieldset?.querySelector(":scope > legend") ?? fieldset ?? target;
      // The browser's own focus scroll runs after this event, so look afterwards.
      requestAnimationFrame(() => {
        const limit = header.getBoundingClientRect().bottom + GAP_PX;
        const top = anchor.getBoundingClientRect().top;
        if (top < limit) window.scrollBy({ top: top - limit });
      });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => {
      observer?.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      root.style.removeProperty("--header-h");
    };
  }, []);

  return (
    <header
      ref={ref}
      className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-4 px-4 py-3 xl:px-20">
        <div className="flex min-w-0 items-center gap-4">
          <Image src="/logo-dark.svg" alt={pl.common.logoAlt} width={132} height={16} priority className="h-4 w-auto shrink-0" />
          <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-border sm:block" />
          <div className="flex min-w-0 flex-col">
            <p className="text-[15px] font-bold leading-tight text-foreground md:text-lg">{pl.common.appTitle}</p>
            <p className="hidden text-sm leading-snug text-muted-foreground min-[480px]:block">{pl.common.appSubtitle}</p>
          </div>
        </div>
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div aria-hidden="true" className="h-[3px] w-full bg-[linear-gradient(90deg,#00AEE8,#3E3DC4,#252476)]" />
    </header>
  );
}
