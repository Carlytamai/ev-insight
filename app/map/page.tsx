import { Suspense } from "react";
import { CompetitorMap } from "@/components/competitor-map";
import { PageHero } from "@/components/page-hero";

export default function MapPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:py-14">
      <PageHero
        eyebrow="Phase 3｜競合・共存マップ"
        title="「滞在型」と「通過型」を、地図で分けて見せる。"
        description="近隣のコンビニに急速充電があっても、滞在型施設には普通充電が必要。用途の棲み分けを視覚的に証明し、決裁者の「需要があるのか？」という疑問を一掃します。"
      />
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}
      >
        <CompetitorMap />
      </Suspense>
    </main>
  );
}
