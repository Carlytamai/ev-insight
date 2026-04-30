"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FACTS_LAST_UPDATED,
  NEWS_ITEMS,
  PREFECTURE_SALES,
  SUBSIDY_PROGRAMS,
  type NewsItem,
  type SubsidyProgram,
} from "@/lib/facts-data";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<NewsItem["category"], string> = {
  deadline: "締切",
  policy: "政策",
  market: "市場",
};

const CATEGORY_TONE: Record<NewsItem["category"], string> = {
  deadline: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  policy: "bg-primary/10 text-primary",
  market: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function FactsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefParam = searchParams.get("pref") ?? PREFECTURE_SALES[0].pref;
  const selected =
    PREFECTURE_SALES.find((p) => p.pref === prefParam) ?? PREFECTURE_SALES[0];

  const setPref = (pref: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("pref", pref);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const totals = useMemo(() => {
    const latest = selected.data[selected.data.length - 1];
    const earliest = selected.data[0];
    const totalLatest = latest.ev + latest.phev;
    const totalEarliest = earliest.ev + earliest.phev;
    const cagr =
      Math.pow(totalLatest / totalEarliest, 1 / (selected.data.length - 1)) - 1;
    return { latest, totalLatest, cagr };
  }, [selected]);

  return (
    <div className="space-y-10">
      <SubsidySection programs={SUBSIDY_PROGRAMS} />
      <SalesSection
        prefList={PREFECTURE_SALES}
        selected={selected}
        onSelect={setPref}
        totals={totals}
      />
      <NewsSection items={NEWS_ITEMS} />
      <p className="text-right text-[11px] text-muted-foreground">
        最終更新: <span className="num">{FACTS_LAST_UPDATED}</span>
      </p>
    </div>
  );
}

function SubsidySection({ programs }: { programs: SubsidyProgram[] }) {
  return (
    <section>
      <SectionHeader
        eyebrow="01｜公的補助金"
        title="補助金は、いま使える状態か。"
        description="予算消化率と申請締切を可視化。「来期で良い」と先延ばしする決裁者に、今動く理由を提示します。"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {programs.map((p) => {
          const ratio = p.budgetUsed / p.budgetTotal;
          const remaining = p.budgetTotal - p.budgetUsed;
          const tone =
            ratio >= 0.85
              ? "danger"
              : ratio >= 0.6
                ? "warning"
                : "ok";
          return (
            <article
              key={p.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {p.fiscalYear}
                </span>
                <ToneBadge tone={tone} />
              </div>
              <h3 className="text-sm font-semibold leading-snug">{p.name}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {p.agency}
              </p>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    予算消化率
                  </span>
                  <span className="num text-base font-semibold">
                    {(ratio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      tone === "danger" && "bg-rose-500",
                      tone === "warning" && "bg-amber-500",
                      tone === "ok" && "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    残額 <span className="num font-medium text-foreground">{formatYen(remaining)}</span>
                  </span>
                  <span>
                    総枠 <span className="num">{formatYen(p.budgetTotal)}</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background/40 p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    申請締切
                  </p>
                  <p className="num mt-0.5 text-sm font-semibold">
                    {p.applicationDeadline}
                  </p>
                </div>
                <p className="num text-right text-[11px] text-muted-foreground">
                  あと <span className="font-semibold text-foreground">{daysUntil(p.applicationDeadline)}</span> 日
                </p>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                {p.note}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                出典: {p.source}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SalesSection({
  prefList,
  selected,
  onSelect,
  totals,
}: {
  prefList: typeof PREFECTURE_SALES;
  selected: typeof PREFECTURE_SALES[number];
  onSelect: (pref: string) => void;
  totals: {
    latest: { year: number; ev: number; phev: number };
    totalLatest: number;
    cagr: number;
  };
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="02｜都道府県別 EV/PHEV 販売推移"
        title="EVは、もう確実に増えている。"
        description="自販連の販売台数データを基にした、都道府県別の確実な伸び。曖昧な人流推計ではなく、登録ベースのファクトです。"
      />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            都道府県
          </p>
          <div className="flex flex-col gap-1">
            {prefList.map((p) => {
              const active = p.pref === selected.pref;
              return (
                <button
                  key={p.pref}
                  onClick={() => onSelect(p.pref)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-foreground text-background"
                      : "hover:bg-muted",
                  )}
                >
                  <span>{p.pref}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      active ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {p.region}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 grid grid-cols-3 gap-3">
            <KPI
              label={`${totals.latest.year}年 合計登録台数`}
              value={totals.totalLatest.toLocaleString("ja-JP")}
              unit="台"
            />
            <KPI
              label="うち EV"
              value={totals.latest.ev.toLocaleString("ja-JP")}
              unit="台"
            />
            <KPI
              label="2020→直近 年平均成長率"
              value={`+${(totals.cagr * 100).toFixed(1)}`}
              unit="%"
              accent
            />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart
                data={selected.data}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v, name) => [
                    `${Number(v).toLocaleString("ja-JP")} 台`,
                    name === "ev" ? "EV" : "PHEV",
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => (value === "ev" ? "EV" : "PHEV")}
                />
                <Line
                  type="monotone"
                  dataKey="ev"
                  stroke="oklch(0.66 0.13 38)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="phev"
                  stroke="oklch(0.62 0.12 165)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            出典: 自販連 燃料別販売台数（モックCSV、本番では月次更新を想定）
          </p>
        </div>
      </div>
    </section>
  );
}

function NewsSection({ items }: { items: NewsItem[] }) {
  return (
    <section>
      <SectionHeader
        eyebrow="03｜ファクトニュース"
        title="今すぐやる理由を、公的ソースから。"
        description="経産省・自治体・自販連の一次情報のみを表示。曖昧な業界推計や提灯記事は載せません。"
      />
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((n) => (
          <li
            key={n.date + n.title}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5"
          >
            <div className="flex shrink-0 items-center gap-2 sm:w-44">
              <span className="num text-[12px] font-medium text-muted-foreground">
                {n.date}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  CATEGORY_TONE[n.category],
                )}
              >
                {CATEGORY_LABEL[n.category]}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-snug text-foreground">{n.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                出典: {n.source}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5 max-w-3xl space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

function KPI({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background/40",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-2xl font-semibold leading-none tracking-tight">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

function ToneBadge({ tone }: { tone: "ok" | "warning" | "danger" }) {
  const map = {
    ok: { label: "余裕あり", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    warning: { label: "残少", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    danger: { label: "枯渇間近", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  } as const;
  const { label, cls } = map[tone];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function formatYen(n: number): string {
  if (n >= 1_000_000_000) return `¥${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(0)}M`;
  return `¥${n.toLocaleString("ja-JP")}`;
}

function daysUntil(date: string): number {
  const target = new Date(date).getTime();
  const now = new Date("2026-04-30").getTime();
  return Math.max(0, Math.round((target - now) / 86_400_000));
}
