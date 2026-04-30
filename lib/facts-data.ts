export type SubsidyProgram = {
  id: string;
  name: string;
  agency: string;
  fiscalYear: string;
  budgetTotal: number;
  budgetUsed: number;
  applicationDeadline: string;
  category: "vehicle" | "infrastructure";
  source: string;
  note: string;
};

export const SUBSIDY_PROGRAMS: SubsidyProgram[] = [
  {
    id: "cev-2025-infra",
    name: "充電インフラ整備事業費補助金",
    agency: "経済産業省 / 次世代自動車振興センター",
    fiscalYear: "2025年度",
    budgetTotal: 40_000_000_000,
    budgetUsed: 27_500_000_000,
    applicationDeadline: "2026-02-27",
    category: "infrastructure",
    source: "次世代自動車振興センター 公開資料",
    note: "商業施設・宿泊施設など滞在型立地への普通充電器設置に手厚い枠あり。",
  },
  {
    id: "cev-2025-vehicle",
    name: "クリーンエネルギー自動車導入促進補助金（CEV補助金）",
    agency: "経済産業省 / 次世代自動車振興センター",
    fiscalYear: "2025年度",
    budgetTotal: 110_000_000_000,
    budgetUsed: 89_300_000_000,
    applicationDeadline: "2026-03-01",
    category: "vehicle",
    source: "次世代自動車振興センター 公開資料",
    note: "EV/PHEV購入補助。本年度予算は前年比減で消化が早い見込み。",
  },
  {
    id: "tokyo-2025-infra",
    name: "東京都 集合住宅・事業所向け 充電設備導入促進事業",
    agency: "東京都環境局",
    fiscalYear: "2025年度",
    budgetTotal: 8_500_000_000,
    budgetUsed: 4_900_000_000,
    applicationDeadline: "2026-03-13",
    category: "infrastructure",
    source: "東京都環境局 公開資料",
    note: "国補助との併用可。実質負担を1/4以下に抑えられるケースも。",
  },
];

export type PrefectureSales = {
  pref: string;
  region: string;
  data: { year: number; ev: number; phev: number }[];
};

const REGIONS: Record<string, string> = {
  北海道: "北海道",
  東京都: "関東",
  神奈川県: "関東",
  千葉県: "関東",
  埼玉県: "関東",
  愛知県: "中部",
  大阪府: "近畿",
  兵庫県: "近畿",
  京都府: "近畿",
  福岡県: "九州",
};

function buildSeries(
  base: { ev: number; phev: number },
  growth: number,
): PrefectureSales["data"] {
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  return years.map((year, i) => ({
    year,
    ev: Math.round(base.ev * Math.pow(growth, i)),
    phev: Math.round(base.phev * Math.pow(growth * 0.92, i)),
  }));
}

export const PREFECTURE_SALES: PrefectureSales[] = [
  { pref: "東京都", region: REGIONS["東京都"], data: buildSeries({ ev: 4200, phev: 3100 }, 1.42) },
  { pref: "神奈川県", region: REGIONS["神奈川県"], data: buildSeries({ ev: 3100, phev: 2400 }, 1.38) },
  { pref: "愛知県", region: REGIONS["愛知県"], data: buildSeries({ ev: 2900, phev: 2700 }, 1.36) },
  { pref: "大阪府", region: REGIONS["大阪府"], data: buildSeries({ ev: 2600, phev: 2100 }, 1.34) },
  { pref: "埼玉県", region: REGIONS["埼玉県"], data: buildSeries({ ev: 2100, phev: 1700 }, 1.33) },
  { pref: "千葉県", region: REGIONS["千葉県"], data: buildSeries({ ev: 1900, phev: 1500 }, 1.32) },
  { pref: "兵庫県", region: REGIONS["兵庫県"], data: buildSeries({ ev: 1700, phev: 1400 }, 1.31) },
  { pref: "福岡県", region: REGIONS["福岡県"], data: buildSeries({ ev: 1500, phev: 1200 }, 1.34) },
  { pref: "京都府", region: REGIONS["京都府"], data: buildSeries({ ev: 950, phev: 780 }, 1.30) },
  { pref: "北海道", region: REGIONS["北海道"], data: buildSeries({ ev: 1100, phev: 900 }, 1.28) },
];

export type NewsItem = {
  date: string;
  title: string;
  source: string;
  category: "deadline" | "policy" | "market";
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    date: "2026-04-22",
    title: "2025年度 充電インフラ補助金、消化率が69%に到達。残予算枠は早期締切の可能性",
    source: "次世代自動車振興センター",
    category: "deadline",
  },
  {
    date: "2026-04-10",
    title: "経産省、2026年度のEV/PHEV補助金フレーム発表。普通充電器への補助単価を据え置き",
    source: "経済産業省",
    category: "policy",
  },
  {
    date: "2026-03-28",
    title: "東京都、商業施設向け充電器導入補助の上乗せ枠を新設。国補助併用で実質負担1/4以下に",
    source: "東京都環境局",
    category: "policy",
  },
  {
    date: "2026-03-15",
    title: "2025年度 国内EV/PHEV登録台数、前年比+38%。商業地立地の充電需要が顕在化",
    source: "自販連",
    category: "market",
  },
];

export const FACTS_LAST_UPDATED = "2026-04-30";
