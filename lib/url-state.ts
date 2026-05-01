import type { Scenario, SimulatorInput } from "./simulator";

export const DEFAULT_OURS: Scenario = {
  lines: [
    { kind: "normal", count: 2, unitCost: 350_000 },
    { kind: "rapid", count: 0, unitCost: 3_500_000 },
  ],
  subsidyEnabled: true,
  subsidyRate: 0.5,
  monthlyBasicFeeIncrease: 30_000,
  monthlyMaintenanceFee: 20_000,
  pricePerCharge: 500,
  facilityArpu: 3_000,
  daysPerMonth: 30,
};

export const DEFAULT_RIVAL: Scenario = {
  lines: [
    { kind: "normal", count: 2, unitCost: 420_000 },
    { kind: "rapid", count: 0, unitCost: 4_200_000 },
  ],
  subsidyEnabled: true,
  subsidyRate: 0.5,
  monthlyBasicFeeIncrease: 30_000,
  monthlyMaintenanceFee: 30_000,
  pricePerCharge: 500,
  facilityArpu: 3_000,
  daysPerMonth: 30,
};

export const DEFAULT_INPUT: SimulatorInput = {
  ours: DEFAULT_OURS,
  rival: DEFAULT_RIVAL,
  compareMode: false,
};

type ScenarioKey = "ours" | "rival";
const PREFIX: Record<ScenarioKey, string> = { ours: "o_", rival: "r_" };

const NUM_KEYS: Array<
  Exclude<keyof Scenario, "lines" | "subsidyEnabled">
> = [
  "subsidyRate",
  "monthlyBasicFeeIncrease",
  "monthlyMaintenanceFee",
  "pricePerCharge",
  "facilityArpu",
  "daysPerMonth",
];

const SHORT: Record<string, string> = {
  subsidyRate: "sr",
  monthlyBasicFeeIncrease: "bf",
  monthlyMaintenanceFee: "mf",
  pricePerCharge: "pc",
  facilityArpu: "ar",
  daysPerMonth: "dy",
};

function writeScenario(
  p: URLSearchParams,
  key: ScenarioKey,
  s: Scenario,
  defaults: Scenario,
) {
  const pre = PREFIX[key];
  const normal = s.lines.find((l) => l.kind === "normal");
  const rapid = s.lines.find((l) => l.kind === "rapid");
  const dNormal = defaults.lines.find((l) => l.kind === "normal")!;
  const dRapid = defaults.lines.find((l) => l.kind === "rapid")!;

  if ((normal?.count ?? 0) !== dNormal.count)
    p.set(`${pre}nC`, String(normal?.count ?? 0));
  if ((normal?.unitCost ?? 0) !== dNormal.unitCost)
    p.set(`${pre}nU`, String(normal?.unitCost ?? 0));
  if ((rapid?.count ?? 0) !== dRapid.count)
    p.set(`${pre}rC`, String(rapid?.count ?? 0));
  if ((rapid?.unitCost ?? 0) !== dRapid.unitCost)
    p.set(`${pre}rU`, String(rapid?.unitCost ?? 0));

  if (s.subsidyEnabled !== defaults.subsidyEnabled)
    p.set(`${pre}sb`, s.subsidyEnabled ? "1" : "0");

  for (const k of NUM_KEYS) {
    if (s[k] !== defaults[k]) p.set(`${pre}${SHORT[k]}`, String(s[k]));
  }
}

function readScenario(
  params: URLSearchParams,
  key: ScenarioKey,
  defaults: Scenario,
): Scenario {
  const pre = PREFIX[key];
  const readNum = (k: string, fallback: number) => {
    const v = params.get(`${pre}${k}`);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const dNormal = defaults.lines.find((l) => l.kind === "normal")!;
  const dRapid = defaults.lines.find((l) => l.kind === "rapid")!;

  const sbParam = params.get(`${pre}sb`);
  const subsidyEnabled =
    sbParam == null ? defaults.subsidyEnabled : sbParam === "1";

  return {
    lines: [
      {
        kind: "normal",
        count: readNum("nC", dNormal.count),
        unitCost: readNum("nU", dNormal.unitCost),
      },
      {
        kind: "rapid",
        count: readNum("rC", dRapid.count),
        unitCost: readNum("rU", dRapid.unitCost),
      },
    ],
    subsidyEnabled,
    subsidyRate: readNum(SHORT.subsidyRate, defaults.subsidyRate),
    monthlyBasicFeeIncrease: readNum(
      SHORT.monthlyBasicFeeIncrease,
      defaults.monthlyBasicFeeIncrease,
    ),
    monthlyMaintenanceFee: readNum(
      SHORT.monthlyMaintenanceFee,
      defaults.monthlyMaintenanceFee,
    ),
    pricePerCharge: readNum(SHORT.pricePerCharge, defaults.pricePerCharge),
    facilityArpu: readNum(SHORT.facilityArpu, defaults.facilityArpu),
    daysPerMonth: readNum(SHORT.daysPerMonth, defaults.daysPerMonth),
  };
}

export function inputToParams(input: SimulatorInput): URLSearchParams {
  const p = new URLSearchParams();
  if (input.compareMode) p.set("compare", "1");
  writeScenario(p, "ours", input.ours, DEFAULT_OURS);
  writeScenario(p, "rival", input.rival, DEFAULT_RIVAL);
  return p;
}

export function paramsToInput(params: URLSearchParams): SimulatorInput {
  return {
    ours: readScenario(params, "ours", DEFAULT_OURS),
    rival: readScenario(params, "rival", DEFAULT_RIVAL),
    compareMode: params.get("compare") === "1",
  };
}
