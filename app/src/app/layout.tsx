import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { pl } from "@/lib/i18n-pl";

const geomanist = localFont({
  src: [
    { path: "./fonts/geomanist-regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/geomanist-book.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geomanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: pl.common.appTitle,
  description: pl.common.intro,
};

export default function RootLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <html lang="pl" className={geomanist.variable}>
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
