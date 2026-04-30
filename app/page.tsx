import { Suspense } from "react";
import { BreakEvenSimulator } from "@/components/break-even-simulator";
import { PageHero } from "@/components/page-hero";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:py-14">
      <PageHero
        eyebrow="Phase 1｜防御型・損益分岐シミュレーター"
        title="「赤字にならない最低ライン」を、数字で証明する。"
        description="売上アップの夢ではなく、月額コストをペイするための1日あたり最低充電回数を提示。決裁者の『赤字になるのでは』という恐怖を払拭します。"
      />
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}
      >
        <BreakEvenSimulator />
      </Suspense>
    </main>
  );
}
