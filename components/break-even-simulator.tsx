"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CHARGER_SPECS,
  type ChargerKind,
  type SimulatorInput,
  formatNumber,
  formatYen,
  simulate,
} from "@/lib/simulator";
import { DEFAULT_INPUT, inputToParams, paramsToInput } from "@/lib/url-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      router.replace(`?${next}`, { scroll: false });
    }
  }, [input, hydrated, router, searchParams]);

  const result = useMemo(() => simulate(input), [input]);

  const setLineCount = (kind: ChargerKind, count: number) => {
    setInput((prev) => ({
      ...prev,
      lines: prev.lines.map((l) =>
        l.kind === kind ? { ...l, count: Math.max(0, count) } : l,
      ),
    }));
  };

  const copyShareUrl = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}?${inputToParams(input).toString()}`;
    await navigator.clipboard.writeText(url);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* INPUTS */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border/70 px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            シミュレーション条件
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            商談前にここで前提条件を設定してください。URLに自動同期されます。
          </p>
        </header>
        <div className="space-y-7 px-6 py-5">
          <Group title="導入する充電器">
            {input.lines.map((line) => {
              const spec = CHARGER_SPECS[line.kind];
              const dot = line.kind === "rapid" ? "#E11D48" : "#2563EB";
              return (
                <Field
                  key={line.kind}
                  label={
                    <span className="flex items-center gap-2">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: dot }}
                      />
                      {spec.label}
                    </span>
                  }
                  hint={`単価 ${formatYen(spec.unitCost)}`}
                >
                  <NumInput
                    value={line.count}
                    min={0}
                    onChange={(v) => setLineCount(line.kind, v)}
                  />
                </Field>
              );
            })}
          </Group>

          <Group title="補助金">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
              <div>
                <Label htmlFor="subsidy" className="text-sm font-medium">
                  CEV補助金を適用する
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  正味初期費用 = 総額 × (1 − 補助率) で計算
                </p>
              </div>
              <Switch
                id="subsidy"
                checked={input.subsidyEnabled}
                onCheckedChange={(checked) =>
                  setInput((prev) => ({ ...prev, subsidyEnabled: checked }))
                }
              />
            </div>
            <Field label="補助率（0〜1）" hint="例: 0.5 = 50%補助">
              <NumInput
                value={input.subsidyRate}
                step="0.05"
                min={0}
                max={1}
                disabled={!input.subsidyEnabled}
                onChange={(v) => setInput((p) => ({ ...p, subsidyRate: v }))}
              />
            </Field>
          </Group>

          <Group title="月額ランニングコスト">
            <Field label="電気代基本料金アップ分" hint="月額">
              <NumInput
                value={input.monthlyBasicFeeIncrease}
                min={0}
                onChange={(v) =>
                  setInput((p) => ({ ...p, monthlyBasicFeeIncrease: v }))
                }
                suffix="円"
              />
            </Field>
            <Field label="保守費用" hint="月額">
              <NumInput
                value={input.monthlyMaintenanceFee}
                min={0}
                onChange={(v) =>
                  setInput((p) => ({ ...p, monthlyMaintenanceFee: v }))
                }
                suffix="円"
              />
            </Field>
          </Group>

          <Group title="単価">
            <Field label="1回あたりの充電料金">
              <NumInput
                value={input.pricePerCharge}
                min={0}
                onChange={(v) => setInput((p) => ({ ...p, pricePerCharge: v }))}
                suffix="円"
              />
            </Field>
            <Field label="施設利用1人あたり客単価">
              <NumInput
                value={input.facilityArpu}
                min={0}
                onChange={(v) => setInput((p) => ({ ...p, facilityArpu: v }))}
                suffix="円"
              />
            </Field>
            <Field label="月の営業日数">
              <NumInput
                value={input.daysPerMonth}
                min={1}
                max={31}
                onChange={(v) => setInput((p) => ({ ...p, daysPerMonth: v }))}
                suffix="日"
              />
            </Field>
          </Group>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={copyShareUrl}
              className="rounded-full px-5"
            >
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
      </section>

      {/* OUTPUTS */}
      <section className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            初期費用
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            充電器 {result.totalChargers} 基を導入する場合
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="総額（補助金適用前）" value={formatYen(result.initialCostGross)} />
            <Row
              label="補助金"
              value={`− ${formatYen(result.subsidyAmount)}`}
              muted={!input.subsidyEnabled}
            />
            <div className="my-2 border-t border-border/70" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                正味の初期費用
              </span>
              <span className="num text-2xl font-semibold tracking-tight">
                {formatYen(result.initialCostNet)}
              </span>
            </div>
          </dl>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[oklch(0.97_0.05_50)] to-[oklch(0.95_0.04_60)] p-7 dark:from-[oklch(0.28_0.06_38)] dark:to-[oklch(0.22_0.04_38)]">
          <div className="absolute right-6 top-6 rounded-full border border-primary/40 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Break-even
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">
            赤字にならないライン
          </p>
          <p className="mt-1 max-w-md text-xs text-foreground/70">
            月額ランニングコスト{" "}
            <span className="num font-semibold text-foreground">
              {formatYen(result.monthlyFixedCost)}
            </span>{" "}
            をペイするのに必要な、1日あたりの最低稼働数
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-muted-foreground">
                最低必要充電回数
              </p>
              <p className="num mt-1 text-5xl font-semibold leading-none tracking-tight">
                {formatNumber(result.minChargesPerDay)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  回 / 日
                </span>
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                = 1基あたり{" "}
                <span className="num font-medium text-foreground">
                  {result.totalChargers > 0
                    ? formatNumber(
                        result.minChargesPerDay / result.totalChargers,
                      )
                    : "—"}
                </span>{" "}
                回 / 日
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                施設集客でカバーする場合
              </p>
              <p className="num mt-1 text-3xl font-semibold leading-none tracking-tight">
                {formatNumber(result.minVisitorsPerDay)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  人 / 日
                </span>
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                施設利用客が増えれば、充電収入ゼロでもペイ
              </p>
            </div>
          </div>

          <p className="mt-6 rounded-lg bg-background/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            ※ 「月額固定費 ÷ 単価 ÷ 営業日数」で算出した極限まで保守的な損益分岐点。
            初期投資の回収期間は別途検討してください。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="月額固定費" value={formatYen(result.monthlyFixedCost)} unit="円" />
          <Mini label="1充電あたり収入" value={formatYen(result.netRevenuePerCharge)} unit="円" />
          <Mini label="営業日数" value={String(input.daysPerMonth)} unit="日" />
        </div>
      </section>
    </div>
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

function Mini({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-lg font-semibold">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit.startsWith("円") || value.startsWith("¥") ? "" : unit}
        </span>
      </p>
    </div>
  );
}
