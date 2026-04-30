export type ChargerType = "rapid" | "normal";
export type FacilityType = "target" | "hotel" | "mall" | "supermarket" | "office";

export type ChargerSpot = {
  id: string;
  type: ChargerType;
  name: string;
  lat: number;
  lng: number;
  ports: number;
};

export type Facility = {
  id: string;
  type: FacilityType;
  name: string;
  lat: number;
  lng: number;
  hasCharger: boolean;
  chargerType?: ChargerType;
};

export type RegionPreset = {
  id: string;
  label: string;
  center: { lat: number; lng: number };
  target: Facility;
  chargers: ChargerSpot[];
  competitors: Facility[];
};

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "shibuya",
    label: "東京・渋谷エリア",
    center: { lat: 35.6595, lng: 139.7005 },
    target: {
      id: "target-shibuya",
      type: "target",
      name: "対象施設（商業ビル想定）",
      lat: 35.6595,
      lng: 139.7005,
      hasCharger: false,
    },
    chargers: [
      { id: "c1", type: "rapid", name: "ENEOS渋谷SS", lat: 35.6612, lng: 139.7042, ports: 2 },
      { id: "c2", type: "rapid", name: "首都高速SA急速充電", lat: 35.6562, lng: 139.6968, ports: 4 },
      { id: "c3", type: "normal", name: "渋谷ヒカリエ駐車場", lat: 35.6591, lng: 139.7036, ports: 6 },
      { id: "c4", type: "normal", name: "代々木公園駐車場", lat: 35.6716, lng: 139.6951, ports: 4 },
      { id: "c5", type: "rapid", name: "セブンイレブン代々木", lat: 35.6678, lng: 139.7019, ports: 1 },
      { id: "c6", type: "normal", name: "Bunkamura地下駐車場", lat: 35.6602, lng: 139.6975, ports: 2 },
    ],
    competitors: [
      { id: "f1", type: "hotel", name: "セルリアンタワー東急ホテル", lat: 35.6573, lng: 139.6991, hasCharger: false },
      { id: "f2", type: "mall", name: "渋谷スクランブルスクエア", lat: 35.6585, lng: 139.7022, hasCharger: true, chargerType: "normal" },
      { id: "f3", type: "supermarket", name: "東急ストア渋谷店", lat: 35.6618, lng: 139.7008, hasCharger: false },
      { id: "f4", type: "office", name: "渋谷マークシティ", lat: 35.6582, lng: 139.6997, hasCharger: false },
    ],
  },
  {
    id: "yokohama",
    label: "横浜・みなとみらいエリア",
    center: { lat: 35.4566, lng: 139.6317 },
    target: {
      id: "target-mm",
      type: "target",
      name: "対象施設（複合商業施設想定）",
      lat: 35.4566,
      lng: 139.6317,
      hasCharger: false,
    },
    chargers: [
      { id: "y1", type: "rapid", name: "首都高みなとみらい急速充電", lat: 35.4612, lng: 139.6358, ports: 2 },
      { id: "y2", type: "normal", name: "クイーンズスクエア駐車場", lat: 35.4583, lng: 139.6336, ports: 8 },
      { id: "y3", type: "normal", name: "ランドマークプラザ駐車場", lat: 35.4548, lng: 139.6307, ports: 6 },
      { id: "y4", type: "rapid", name: "ENEOSみなとみらいSS", lat: 35.4521, lng: 139.6286, ports: 2 },
    ],
    competitors: [
      { id: "yf1", type: "hotel", name: "横浜ロイヤルパークホテル", lat: 35.4555, lng: 139.6322, hasCharger: true, chargerType: "normal" },
      { id: "yf2", type: "mall", name: "MARK IS みなとみらい", lat: 35.4595, lng: 139.6332, hasCharger: true, chargerType: "normal" },
      { id: "yf3", type: "office", name: "横浜美術館", lat: 35.4576, lng: 139.6303, hasCharger: false },
    ],
  },
];

export type CustomLocation = {
  lat: number;
  lng: number;
  name: string;
};

export type DisplayedRegion = {
  source: "preset" | "custom";
  label: string;
  center: { lat: number; lng: number };
  target: Facility;
  chargers: ChargerSpot[];
  competitors: Facility[];
};

export function buildCustomRegion(
  loc: CustomLocation,
  chargers: ChargerSpot[],
): DisplayedRegion {
  return {
    source: "custom",
    label: loc.name,
    center: { lat: loc.lat, lng: loc.lng },
    target: {
      id: "target-custom",
      type: "target",
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      hasCharger: false,
    },
    chargers,
    competitors: [],
  };
}

export function presetToRegion(p: RegionPreset): DisplayedRegion {
  return {
    source: "preset",
    label: p.label,
    center: p.center,
    target: p.target,
    chargers: p.chargers,
    competitors: p.competitors,
  };
}
