"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CHARGER_LABEL,
  type ChargerKind,
  type Scenario,
  type ScenarioResult,
  type SimulatorInput,
  formatNumber,
  formatSignedNumber,
  formatSignedYen,
  formatYen,
  simulateScenario,
} from "@/lib/simulator";
import {
  DEFAULT_INPUT,
  DEFAULT_OURS,
  DEFAULT_RIVAL,
  inputToParams,
  paramsToInput,
} from "@/lib/url-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScenarioKey = "ours" | "rival";

export function BreakEvenSimulator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [input, setInput] = useState<SimulatorInput>(DEFAULT_INPUT);
  const [hydrated, setHydrated] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    setInput(paramsToInput(new URLSearchParams(searchParams.toString())));
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    const next = inputToParams(input).toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `?${next}` : "?", { scroll: false });
    }
  }, [input, hydrated, router, searchParams]);

  const ours = useMemo(() => simulateScenario(input.ours), [input.ours]);
  const rival = useMemo(() => simulateScenario(input.rival), [input.rival]);

  const setScenario = (key: ScenarioKey, updater: (s: Scenario) => Scenario) => {
    setInput((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const copyShareUrl = async () => {
    if (typeof window === "undefined") return;
    const qs = inputToParams(input).toString();
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
    await navigator.clipboard.writeText(url);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1800);
  };

  const compareMode = input.compareMode;

  return (
    <div className="space-y-8">
      {/* TOP STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Switch
            id="compare"
            checked={compareMode}
            onCheckedChange={(checked) =>
              setInput((p) => ({ ...p, compareMode: checked }))
            }
          />
          <div>
            <Label htmlFor="compare" className="text-sm font-medium">
              競合比較モード
            </Label>
            <p className="text-[11px] text-muted-foreground">
              ONで自社 vs 競合の損益分岐を並べて表示
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyShareUrl} className="rounded-full px-5">
            {copyState === "copied" ? "✓ コピーしました" : "商談用URLをコピー"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setInput(DEFAULT_INPUT)}
            className="rounded-full"
          >
            リセット
          </Button>
        </div>
      </div>

      {/* DELTA HERO (compare mode only) */}
      {compareMode && (
        <DeltaHero ours={ours} rival={rival} />
      )}

      {/* OUTPUTS */}
      <div
        className={cn(
          "grid gap-6",
          compareMode ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        <ResultCard
          tone="ours"
          title={compareMode ? "自社プラン" : "シミュレーション結果"}
          result={ours}
          scenario={input.ours}
        />
        {compareMode && (
          <ResultCard
            tone="rival"
            title="競合プラン"
            result={rival}
            scenario={input.rival}
          />
        )}
      </div>

      {/* INPUTS */}
      <div
        className={cn(
          "grid gap-6",
          compareMode ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        <ScenarioPanel
          tone="ours"
          title={compareMode ? "自社の前提条件" : "シミュレーション条件"}
          scenario={input.ours}
          onChange={(updater) => setScenario("ours", updater)}
          onResetDefaults={() =>
            setScenario("ours", () => ({ ...DEFAULT_OURS }))
          }
        />
        {compareMode && (
          <ScenarioPanel
            tone="rival"
            title="競合の前提条件"
            scenario={input.rival}
            onChange={(updater) => setScenario("rival", updater)}
            onResetDefaults={() =>
              setScenario("rival", () => ({ ...DEFAULT_RIVAL }))
            }
          />
        )}
      </div>
    </div>
  );
}

function DeltaHero({
  ours,
  rival,
}: {
  ours: ScenarioResult;
  rival: ScenarioResult;
}) {
  const initialDelta = ours.initialCostNet - rival.initialCostNet;
  const monthlyDelta = ours.monthlyFixedCost - rival.monthlyFixedCost;
  const chargesDelta = ours.minChargesPerDay - rival.minChargesPerDay;

  const oursWinsInitial = initialDelta < 0;
  const oursWinsMonthly = monthlyDelta < 0;
  const oursWinsCharges = chargesDelta < 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[oklch(0.97_0.05_50)] to-[oklch(0.95_0.04_60)] p-7 dark:from-[oklch(0.28_0.06_38)] dark:to-[oklch(0.22_0.04_38)]">
        <div className="absolute right-6 top-6 rounded-full border border-primary/40 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          自社 vs 競合
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">
          自社プランの優位性
        </p>
        <p className="mt-1 max-w-xl text-xs text-foreground/70">
          自社採用時に競合採用時と比べてどれだけ「赤字にならないライン」が下がるかを表示します。
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <DeltaCell
            label="初期費用差"
            value={formatSignedYen(initialDelta)}
            wins={oursWinsInitial}
            hint={
              oursWinsInitial
                ? `自社が ${formatYen(Math.abs(initialDelta))} 安い`
                : initialDelta > 0
                  ? `自社が ${formatYen(initialDelta)} 高い`
                  : "差なし"
            }
          />
          <DeltaCell
            label="月額固定費差"
            value={formatSignedYen(monthlyDelta)}
            wins={oursWinsMonthly}
            hint={
              oursWinsMonthly
                ? `自社が月 ${formatYen(Math.abs(monthlyDelta))} 安い`
                : monthlyDelta > 0
                  ? `自社が月 ${formatYen(monthlyDelta)} 高い`
                  : "差なし"
            }
          />
          <DeltaCell
            label="分岐点（回 / 日）差"
            value={formatSignedNumber(chargesDelta)}
            wins={oursWinsCharges}
            hint={
              oursWinsCharges
                ? `自社の方が 1日 ${formatNumber(Math.abs(chargesDelta))} 回少なくてOK`
                : chargesDelta > 0
                  ? `自社の方が 1日 ${formatNumber(chargesDelta)} 回多く必要`
                  : "差なし"
            }
          />
        </div>
      </div>
  );
}

function DeltaCell({
  label,
  value,
  wins,
  hint,
}: {
  label: string;
  value: string;
  wins: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-2xl font-semibold tracking-tight",
          wins ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function ResultCard({
  tone,
  title,
  result,
  scenario,
}: {
  tone: ScenarioKey;
  title: string;
  result: ScenarioResult;
  scenario: Scenario;
}) {
  const accent =
    tone === "ours"
      ? "border-primary/30"
      : "border-border";
  return (
    <section
      className={cn(
        "space-y-5 rounded-2xl border bg-card p-6",
        accent,
      )}
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            充電器 {result.totalChargers} 基（普通{" "}
            {scenario.lines.find((l) => l.kind === "normal")?.count ?? 0} / 急速{" "}
            {scenario.lines.find((l) => l.kind === "rapid")?.count ?? 0}）
          </p>
        </div>
        {tone === "ours" && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            自社
          </span>
        )}
        {tone === "rival" && (
          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            競合
          </span>
        )}
      </header>

      <dl className="space-y-2 text-sm">
        <Row label="初期費用 総額" value={formatYen(result.initialCostGross)} />
        <Row
          label="補助金"
          value={`− ${formatYen(result.subsidyAmount)}`}
          muted={!scenario.subsidyEnabled}
        />
        <div className="my-1 border-t border-border/70" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">正味初期費用</span>
          <span className="num text-2xl font-semibold tracking-tight">
            {formatYen(result.initialCostNet)}
          </span>
        </div>
      </dl>

      <div className="rounded-xl bg-muted/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          赤字にならないライン
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] text-muted-foreground">最低必要充電回数</p>
            <p className="num mt-0.5 text-3xl font-semibold tracking-tight">
              {formatNumber(result.minChargesPerDay)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                回 / 日
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              1基あたり{" "}
              <span className="num text-foreground">
                {formatNumber(result.minChargesPerPortPerDay)}
              </span>{" "}
              回 / 日
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">
              施設集客でカバー
            </p>
            <p className="num mt-0.5 text-3xl font-semibold tracking-tight">
              {formatNumber(result.minVisitorsPerDay)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                人 / 日
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              月額固定費 {formatYen(result.monthlyFixedCost)} を集客で吸収
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Mini label="月額固定費" value={formatYen(result.monthlyFixedCost)} />
        <Mini label="1充電収入" value={formatYen(result.netRevenuePerCharge)} />
        <Mini label="営業日数" value={`${scenario.daysPerMonth} 日`} />
      </div>
    </section>
  );
}

function ScenarioPanel({
  tone,
  title,
  scenario,
  onChange,
  onResetDefaults,
}: {
  tone: ScenarioKey;
  title: string;
  scenario: Scenario;
  onChange: (updater: (s: Scenario) => Scenario) => void;
  onResetDefaults: () => void;
}) {
  const accent =
    tone === "ours" ? "border-primary/30" : "border-border";

  const setLine = (
    kind: ChargerKind,
    patch: { count?: number; unitCost?: number },
  ) =>
    onChange((s) => ({
      ...s,
      lines: s.lines.map((l) =>
        l.kind === kind
          ? {
              ...l,
              ...(patch.count != null ? { count: Math.max(0, patch.count) } : {}),
              ...(patch.unitCost != null
                ? { unitCost: Math.max(0, patch.unitCost) }
                : {}),
            }
          : l,
      ),
    }));

  return (
    <section className={cn("rounded-2xl border bg-card", accent)}>
      <header className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            URLに自動同期されます。単価は商談相手の見積もりに合わせて編集できます。
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetDefaults}
          className="rounded-full text-xs"
        >
          初期値
        </Button>
      </header>
      <div className="space-y-7 px-6 py-5">
        <Group title="導入する充電器">
          {scenario.lines.map((line) => {
            const dot = line.kind === "rapid" ? "#E11D48" : "#2563EB";
            return (
              <div
                key={line.kind}
                className="rounded-xl border border-border bg-background/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: dot }}
                  />
                  <p className="text-sm font-medium">
                    {CHARGER_LABEL[line.kind]}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="台数">
                    <NumInput
                      value={line.count}
                      min={0}
                      onChange={(v) => setLine(line.kind, { count: v })}
                      suffix="基"
                    />
                  </Field>
                  <Field label="1基単価">
                    <NumInput
                      value={line.unitCost}
                      min={0}
                      step="10000"
                      onChange={(v) => setLine(line.kind, { unitCost: v })}
                      suffix="円"
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </Group>

        <Group title="補助金">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
            <div>
              <Label
                htmlFor={`subsidy-${tone}`}
                className="text-sm font-medium"
              >
                CEV補助金を適用する
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                正味初期費用 = 総額 × (1 − 補助率)
              </p>
            </div>
            <Switch
              id={`subsidy-${tone}`}
              checked={scenario.subsidyEnabled}
              onCheckedChange={(checked) =>
                onChange((s) => ({ ...s, subsidyEnabled: checked }))
              }
            />
          </div>
          <Field label="補助率（0〜1）" hint="例: 0.5 = 50%補助">
            <NumInput
              value={scenario.subsidyRate}
              step="0.05"
              min={0}
              max={1}
              disabled={!scenario.subsidyEnabled}
              onChange={(v) => onChange((s) => ({ ...s, subsidyRate: v }))}
            />
          </Field>
        </Group>

        <Group title="月額ランニングコスト">
          <Field label="電気代基本料金アップ分">
            <NumInput
              value={scenario.monthlyBasicFeeIncrease}
              min={0}
              onChange={(v) =>
                onChange((s) => ({ ...s, monthlyBasicFeeIncrease: v }))
              }
              suffix="円"
            />
          </Field>
          <Field label="保守費用">
            <NumInput
              value={scenario.monthlyMaintenanceFee}
              min={0}
              onChange={(v) =>
                onChange((s) => ({ ...s, monthlyMaintenanceFee: v }))
              }
              suffix="円"
            />
          </Field>
        </Group>

        <Group title="単価・営業日">
          <Field label="1回あたりの充電料金">
            <NumInput
              value={scenario.pricePerCharge}
              min={0}
              onChange={(v) => onChange((s) => ({ ...s, pricePerCharge: v }))}
              suffix="円"
            />
          </Field>
          <Field label="施設利用1人あたり客単価">
            <NumInput
              value={scenario.facilityArpu}
              min={0}
              onChange={(v) => onChange((s) => ({ ...s, facilityArpu: v }))}
              suffix="円"
            />
          </Field>
          <Field label="月の営業日数">
            <NumInput
              value={scenario.daysPerMonth}
              min={1}
              max={31}
              onChange={(v) => onChange((s) => ({ ...s, daysPerMonth: v }))}
              suffix="日"
            />
          </Field>
        </Group>
      </div>
    </section>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_140px] items-center gap-3">
      <div>
        <p className="text-sm text-foreground/90">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border bg-background pr-3 transition focus-within:border-foreground/40",
        rest.disabled && "opacity-50",
      )}
    >
      <Input
        type="number"
        className="num border-0 bg-transparent text-right text-sm shadow-none focus-visible:ring-0 focus-visible:border-0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        {...rest}
      />
      {suffix && (
        <span className="pl-1 text-xs text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-sm",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
