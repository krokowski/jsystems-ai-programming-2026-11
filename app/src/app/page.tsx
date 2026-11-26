import { CaseFlow } from "@/components/case/flow/case-flow";

export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 xl:px-20">
      <CaseFlow />
    </main>
  );
}
