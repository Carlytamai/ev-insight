import { Suspense } from "react";
import { FactsDashboard } from "@/components/facts-dashboard";
import { PageHero } from "@/components/page-hero";

export default function FactsPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:py-14">
      <PageHero
        eyebrow="ファクトデータ・ダッシュボード"
        title="誰も反論できない、公的ファクトだけを。"
        description="補助金の予算消化率・締切、都道府県別 EV/PHEV 販売推移、一次情報ソースのニュース。曖昧な推計は載せず、決裁者が「今動く理由」を作るためのファクトに絞っています。"
      />
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}
      >
        <FactsDashboard />
      </Suspense>
    </main>
  );
}
