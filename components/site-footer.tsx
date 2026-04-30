export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          EV-Insight — 出典: 経産省CEV補助金、自販連、各社IR等の公開資料に基づく堅実なファクトのみを表示
        </p>
        <p className="num">最終更新: 2026-04-30</p>
      </div>
    </footer>
  );
}
