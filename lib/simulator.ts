export type ChargerKind = "normal" | "rapid";

export type ChargerLine = {
  kind: ChargerKind;
  count: number;
  unitCost: number;
};

export type Scenario = {
  lines: ChargerLine[];
  subsidyEnabled: boolean;
  subsidyRate: number;
  monthlyBasicFeeIncrease: number;
  monthlyMaintenanceFee: number;
  pricePerCharge: number;
  facilityArpu: number;
  daysPerMonth: number;
};

export type SimulatorInput = {
  ours: Scenario;
  rival: Scenario;
  compareMode: boolean;
};

export const CHARGER_LABEL: Record<ChargerKind, string> = {
  normal: "普通充電（〜6kW）",
  rapid: "急速充電（50kW級）",
};

export type ScenarioResult = {
  initialCostGross: number;
  subsidyAmount: number;
  initialCostNet: number;
  monthlyFixedCost: number;
  netRevenuePerCharge: number;
  minChargesPerDay: number;
  minChargesPerPortPerDay: number;
  minVisitorsPerDay: number;
  totalChargers: number;
};

export function simulateScenario(s: Scenario): ScenarioResult {
  const totalChargers = s.lines.reduce((acc, l) => acc + l.count, 0);

  const initialCostGross = s.lines.reduce(
    (acc, l) => acc + l.unitCost * l.count,
    0,
  );

  const subsidyAmount = s.subsidyEnabled
    ? Math.floor(initialCostGross * s.subsidyRate)
    : 0;

  const initialCostNet = initialCostGross - subsidyAmount;

  const monthlyFixedCost =
    s.monthlyBasicFeeIncrease + s.monthlyMaintenanceFee;

  const netRevenuePerCharge = s.pricePerCharge;

  const minChargesPerMonth =
    netRevenuePerCharge > 0 ? monthlyFixedCost / netRevenuePerCharge : 0;
  const minChargesPerDay = minChargesPerMonth / s.daysPerMonth;

  const minChargesPerPortPerDay =
    totalChargers > 0 ? minChargesPerDay / totalChargers : 0;

  const minVisitorsPerDay =
    s.facilityArpu > 0
      ? monthlyFixedCost / s.facilityArpu / s.daysPerMonth
      : 0;

  return {
    initialCostGross,
    subsidyAmount,
    initialCostNet,
    monthlyFixedCost,
    netRevenuePerCharge,
    minChargesPerDay,
    minChargesPerPortPerDay,
    minVisitorsPerDay,
    totalChargers,
  };
}

export function formatYen(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function formatNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ja-JP", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatSignedYen(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}¥${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
}

export function formatSignedNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toLocaleString("ja-JP", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}
