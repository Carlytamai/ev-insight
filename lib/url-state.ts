import type { SimulatorInput } from "./simulator";

export const DEFAULT_INPUT: SimulatorInput = {
  lines: [
    { kind: "normal", count: 2 },
    { kind: "rapid", count: 0 },
  ],
  subsidyEnabled: true,
  subsidyRate: 0.5,
  monthlyBasicFeeIncrease: 30_000,
  monthlyMaintenanceFee: 20_000,
  pricePerCharge: 500,
  facilityArpu: 3_000,
  daysPerMonth: 30,
};

const NUM_KEYS: Array<
  Exclude<keyof SimulatorInput, "lines" | "subsidyEnabled">
> = [
  "subsidyRate",
  "monthlyBasicFeeIncrease",
  "monthlyMaintenanceFee",
  "pricePerCharge",
  "facilityArpu",
  "daysPerMonth",
];

export function inputToParams(input: SimulatorInput): URLSearchParams {
  const p = new URLSearchParams();
  p.set("normal", String(input.lines.find((l) => l.kind === "normal")?.count ?? 0));
  p.set("rapid", String(input.lines.find((l) => l.kind === "rapid")?.count ?? 0));
  p.set("subsidy", input.subsidyEnabled ? "1" : "0");
  for (const k of NUM_KEYS) p.set(k, String(input[k]));
  return p;
}

export function paramsToInput(params: URLSearchParams): SimulatorInput {
  const readNum = (key: string, fallback: number) => {
    const v = params.get(key);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalCount = readNum(
    "normal",
    DEFAULT_INPUT.lines.find((l) => l.kind === "normal")?.count ?? 0,
  );
  const rapidCount = readNum(
    "rapid",
    DEFAULT_INPUT.lines.find((l) => l.kind === "rapid")?.count ?? 0,
  );

  const subsidyParam = params.get("subsidy");
  const subsidyEnabled =
    subsidyParam == null ? DEFAULT_INPUT.subsidyEnabled : subsidyParam === "1";

  return {
    lines: [
      { kind: "normal", count: normalCount },
      { kind: "rapid", count: rapidCount },
    ],
    subsidyEnabled,
    subsidyRate: readNum("subsidyRate", DEFAULT_INPUT.subsidyRate),
    monthlyBasicFeeIncrease: readNum(
      "monthlyBasicFeeIncrease",
      DEFAULT_INPUT.monthlyBasicFeeIncrease,
    ),
    monthlyMaintenanceFee: readNum(
      "monthlyMaintenanceFee",
      DEFAULT_INPUT.monthlyMaintenanceFee,
    ),
    pricePerCharge: readNum("pricePerCharge", DEFAULT_INPUT.pricePerCharge),
    facilityArpu: readNum("facilityArpu", DEFAULT_INPUT.facilityArpu),
    daysPerMonth: readNum("daysPerMonth", DEFAULT_INPUT.daysPerMonth),
  };
}
