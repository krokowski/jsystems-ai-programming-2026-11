import { pl } from "@/lib/i18n-pl";

export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 xl:px-20">
      <p className="text-base text-white/65">{pl.common.intro}</p>
    </main>
  );
}
