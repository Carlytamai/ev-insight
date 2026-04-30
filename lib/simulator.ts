export type ChargerKind = "normal" | "rapid";

export type ChargerLine = {
  kind: ChargerKind;
  count: number;
};

export type SimulatorInput = {
  lines: ChargerLine[];
  subsidyEnabled: boolean;
  subsidyRate: number;
  monthlyBasicFeeIncrease: number;
  monthlyMaintenanceFee: number;
  pricePerCharge: number;
  facilityArpu: number;
  daysPerMonth: number;
};

export type ChargerSpec = {
  label: string;
  unitCost: number;
  kwPerCharge: number;
};

export const CHARGER_SPECS: Record<ChargerKind, ChargerSpec> = {
  normal: { label: "普通充電（6kW想定）", unitCost: 600_000, kwPerCharge: 12 },
  rapid: { label: "急速充電（50kW想定）", unitCost: 4_500_000, kwPerCharge: 20 },
};

export type SimulatorResult = {
  initialCostGross: number;
  subsidyAmount: number;
  initialCostNet: number;
  monthlyFixedCost: number;
  netRevenuePerCharge: number;
  minChargesPerDay: number;
  minVisitorsPerDay: number;
  totalChargers: number;
};

export function simulate(input: SimulatorInput): SimulatorResult {
  const totalChargers = input.lines.reduce((acc, l) => acc + l.count, 0);

  const initialCostGross = input.lines.reduce(
    (acc, l) => acc + CHARGER_SPECS[l.kind].unitCost * l.count,
    0,
  );

  const subsidyAmount = input.subsidyEnabled
    ? Math.floor(initialCostGross * input.subsidyRate)
    : 0;

  const initialCostNet = initialCostGross - subsidyAmount;

  const monthlyFixedCost =
    input.monthlyBasicFeeIncrease + input.monthlyMaintenanceFee;

  const netRevenuePerCharge = input.pricePerCharge;

  const minChargesPerMonth =
    netRevenuePerCharge > 0 ? monthlyFixedCost / netRevenuePerCharge : 0;
  const minChargesPerDay = minChargesPerMonth / input.daysPerMonth;

  const minVisitorsPerDay =
    input.facilityArpu > 0
      ? monthlyFixedCost / input.facilityArpu / input.daysPerMonth
      : 0;

  return {
    initialCostGross,
    subsidyAmount,
    initialCostNet,
    monthlyFixedCost,
    netRevenuePerCharge,
    minChargesPerDay,
    minVisitorsPerDay,
    totalChargers,
  };
}

export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function formatNumber(n: number, digits = 1): string {
  return n.toLocaleString("ja-JP", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
