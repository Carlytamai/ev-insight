"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  REGION_PRESETS,
  buildCustomRegion,
  presetToRegion,
  type ChargerSpot,
  type CustomLocation,
  type DisplayedRegion,
  type Facility,
} from "@/lib/map-data";
import { cn } from "@/lib/utils";

type Selection =
  | { kind: "charger"; data: ChargerSpot }
  | { kind: "facility"; data: Facility }
  | { kind: "target"; data: Facility }
  | null;

export function CompetitorMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "ev-insight-map";

  const mode = searchParams.get("mode") === "custom" ? "custom" : "preset";
  const presetId = searchParams.get("region") ?? REGION_PRESETS[0].id;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const name = searchParams.get("name") ?? "";

  const customLocation: CustomLocation | null =
    mode === "custom" && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, name: name || "対象施設" }
      : null;

  const preset =
    REGION_PRESETS.find((r) => r.id === presetId) ?? REGION_PRESETS[0];

  const [customChargers, setCustomChargers] = useState<ChargerSpot[]>([]);
  const [customCompetitors, setCustomCompetitors] = useState<Facility[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [filter, setFilter] = useState<{
    rapid: boolean;
    normal: boolean;
    competitors: boolean;
  }>({ rapid: true, normal: true, competitors: true });

  const region: DisplayedRegion = customLocation
    ? buildCustomRegion(customLocation, customChargers, customCompetitors)
    : presetToRegion(preset);

  // 住所検索モード切替・対象座標変更時、前回エリアの結果を即座にクリア
  // （新しいfetchが返るまで古いカウントを表示し続ける問題の解消）
  useEffect(() => {
    if (!customLocation) return;
    setCustomChargers([]);
    setCustomCompetitors([]);
    setSearchError(null);
  }, [customLocation?.lat, customLocation?.lng]);

  useEffect(() => {
    setSelection(null);
  }, [region.label]);

  const counts = useMemo(() => {
    const rapid = region.chargers.filter((c) => c.type === "rapid").length;
    const normal = region.chargers.filter((c) => c.type === "normal").length;
    return { rapid, normal };
  }, [region]);

  const setPreset = (id: string) => {
    const next = new URLSearchParams();
    next.set("region", id);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const setCustom = useCallback(
    (loc: CustomLocation) => {
      const next = new URLSearchParams();
      next.set("mode", "custom");
      next.set("lat", loc.lat.toFixed(6));
      next.set("lng", loc.lng.toFixed(6));
      next.set("name", loc.name);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router],
  );

  if (!apiKey) {
    return <MissingApiKey />;
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]} version="weekly">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <SearchBar
            onSelect={(loc) => {
              setSearchError(null);
              setCustom(loc);
            }}
          />

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Map
              mapId={mapId}
              defaultCenter={region.center}
              defaultZoom={15}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: "100%", height: 560 }}
            >
              <MapRecenter center={region.center} />
              <AdvancedMarker
                position={{
                  lat: region.target.lat,
                  lng: region.target.lng,
                }}
                onClick={() =>
                  setSelection({ kind: "target", data: region.target })
                }
              >
                <TargetPin />
              </AdvancedMarker>

              {filter.rapid &&
                region.chargers
                  .filter((c) => c.type === "rapid")
                  .map((c) => (
                    <AdvancedMarker
                      key={c.id}
                      position={{ lat: c.lat, lng: c.lng }}
                      onClick={() =>
                        setSelection({ kind: "charger", data: c })
                      }
                    >
                      <Pin
                        background="#E11D48"
                        borderColor="#9F1239"
                        glyphColor="#FFE4E6"
                      />
                    </AdvancedMarker>
                  ))}

              {filter.normal &&
                region.chargers
                  .filter((c) => c.type === "normal")
                  .map((c) => (
                    <AdvancedMarker
                      key={c.id}
                      position={{ lat: c.lat, lng: c.lng }}
                      onClick={() =>
                        setSelection({ kind: "charger", data: c })
                      }
                    >
                      <Pin
                        background="#2563EB"
                        borderColor="#1E3A8A"
                        glyphColor="#DBEAFE"
                      />
                    </AdvancedMarker>
                  ))}

              {filter.competitors &&
                region.competitors.map((f) => (
                  <AdvancedMarker
                    key={f.id}
                    position={{ lat: f.lat, lng: f.lng }}
                    onClick={() => setSelection({ kind: "facility", data: f })}
                  >
                    <CompetitorPin hasCharger={f.hasCharger} />
                  </AdvancedMarker>
                ))}

              {selection && (
                <InfoWindow
                  position={{
                    lat: selection.data.lat,
                    lng: selection.data.lng,
                  }}
                  onCloseClick={() => setSelection(null)}
                >
                  <SelectionDetail selection={selection} />
                </InfoWindow>
              )}

              {customLocation && (
                <NearbyDataLoader
                  center={customLocation}
                  onLoadStart={() => {
                    setLoadingCustom(true);
                    setSearchError(null);
                  }}
                  onLoaded={({ chargers, competitors }) => {
                    setCustomChargers(chargers);
                    setCustomCompetitors(competitors);
                    setLoadingCustom(false);
                    if (chargers.length === 0 && competitors.length === 0) {
                      setSearchError(
                        "このエリアでは充電スポット・競合施設が見つかりませんでした。",
                      );
                    }
                  }}
                  onError={(msg) => {
                    setLoadingCustom(false);
                    setSearchError(msg);
                  }}
                />
              )}
            </Map>
          </div>

          {customLocation && (
            <p className="text-xs text-muted-foreground">
              現在の表示:{" "}
              <span className="font-medium text-foreground">
                {customLocation.name}
              </span>
              {loadingCustom && " — 周辺の充電器を取得中…"}
              {searchError && (
                <span className="ml-2 text-rose-600">{searchError}</span>
              )}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              モード
            </p>
            <div className="flex rounded-full bg-muted/60 p-1">
              <button
                onClick={() => setPreset(REGION_PRESETS[0].id)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  region.source === "preset"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                プリセット
              </button>
              <button
                disabled={!customLocation}
                onClick={() => customLocation && setCustom(customLocation)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  region.source === "custom"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                  !customLocation && "cursor-not-allowed opacity-40",
                )}
              >
                住所検索
              </button>
            </div>
          </div>

          {region.source === "preset" ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                プリセットエリア
              </p>
              <div className="flex flex-col gap-1.5">
                {REGION_PRESETS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setPreset(r.id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-left text-sm transition",
                      r.id === preset.id && region.source === "preset"
                        ? "bg-foreground text-background"
                        : "hover:bg-muted",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                上部の検索バーで、任意の住所・施設名を入力できます。
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                対象施設
              </p>
              <p className="text-sm font-semibold leading-snug">
                {customLocation?.name}
              </p>
              <p className="num mt-2 text-[11px] text-muted-foreground">
                {customLocation?.lat.toFixed(4)}, {customLocation?.lng.toFixed(4)}
              </p>
              <button
                onClick={() => setPreset(REGION_PRESETS[0].id)}
                className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                プリセットに戻す
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              エリア内の充電器
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat dot="#E11D48" label="急速充電" value={counts.rapid} unit="箇所" />
              <Stat dot="#2563EB" label="普通充電" value={counts.normal} unit="箇所" />
            </div>
            <p className="mt-4 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              滞在型の貴施設には{" "}
              <span className="font-semibold text-foreground">
                普通充電（青）
              </span>{" "}
              の絶対数が決め手。
              通過型の急速充電と用途は重複しません。
            </p>
            {region.source === "custom" && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                ※ Google Places の出力 kW 情報で判定（22kW以上=急速）。未公開の場合は普通扱い。
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              表示フィルター
            </p>
            <div className="space-y-2 text-sm">
              <Toggle
                label="急速充電（赤）"
                checked={filter.rapid}
                onChange={(v) => setFilter((f) => ({ ...f, rapid: v }))}
                dot="#E11D48"
              />
              <Toggle
                label="普通充電（青）"
                checked={filter.normal}
                onChange={(v) => setFilter((f) => ({ ...f, normal: v }))}
                dot="#2563EB"
              />
              <Toggle
                label="競合施設"
                checked={filter.competitors}
                onChange={(v) =>
                  setFilter((f) => ({ ...f, competitors: v }))
                }
                dot="#71717A"
              />
            </div>
          </div>
        </aside>
      </div>
    </APIProvider>
  );
}

function SearchBar({
  onSelect,
}: {
  onSelect: (loc: CustomLocation) => void;
}) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
      componentRestrictions: { country: "jp" },
    });
    setAutocomplete(ac);
    return () => {
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [places]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      onSelect({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name || place.formatted_address || "対象施設",
      });
    });
    return () => listener.remove();
  }, [autocomplete, onSelect]);

  return (
    <div className="relative">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        placeholder="対象施設の住所・施設名を入力（例: 渋谷ヒカリエ、横浜駅）"
        className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-foreground/40"
      />
    </div>
  );
}

function MapRecenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!map) return;
    const key = `${center.lat.toFixed(5)}_${center.lng.toFixed(5)}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    map.panTo(center);
    map.setZoom(15);
  }, [map, center.lat, center.lng]);

  return null;
}

type EvChargeOptions = {
  connectorCount?: number;
  connectorAggregations?: Array<{
    count?: number;
    maxChargeRateKw?: number;
  }>;
};

function readEvCharge(p: unknown): EvChargeOptions | undefined {
  return (p as { evChargeOptions?: EvChargeOptions }).evChargeOptions;
}

function readLatLng(loc: unknown): { lat: number; lng: number } | null {
  if (!loc) return null;
  const obj = loc as { lat?: unknown; lng?: unknown };
  const lat =
    typeof obj.lat === "function"
      ? (obj.lat as () => number)()
      : (obj.lat as number);
  const lng =
    typeof obj.lng === "function"
      ? (obj.lng as () => number)()
      : (obj.lng as number);
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

const PRIMARY_TYPE_TO_FACILITY: Record<
  string,
  Facility["type"]
> = {
  shopping_mall: "mall",
  supermarket: "supermarket",
  lodging: "hotel",
  hotel: "hotel",
};

function NearbyDataLoader({
  center,
  onLoadStart,
  onLoaded,
  onError,
}: {
  center: CustomLocation;
  onLoadStart: () => void;
  onLoaded: (data: {
    chargers: ChargerSpot[];
    competitors: Facility[];
  }) => void;
  onError: (msg: string) => void;
}) {
  const places = useMapsLibrary("places");
  // コールバックは ref に格納して effect の依存から外す
  // （親再レンダリングで in-flight fetch がキャンセルされる問題の解消）
  const cbRef = useRef({ onLoadStart, onLoaded, onError });
  cbRef.current = { onLoadStart, onLoaded, onError };

  useEffect(() => {
    if (!places) return;
    let cancelled = false;
    cbRef.current.onLoadStart();

    (async () => {
      try {
        const PlaceCtor = (
          places as unknown as {
            Place: typeof google.maps.places.Place;
          }
        ).Place;
        if (!PlaceCtor || typeof PlaceCtor.searchNearby !== "function") {
          cbRef.current.onError(
            "Places API (New) が有効になっていません。GCPで有効化してください。",
          );
          return;
        }

        // 充電器: 4象限オフセット検索（半径900m × 4回）で最大80件
        const OFFSET = 0.004;
        const RADIUS = 900;
        const quadrants = [
          { lat: center.lat + OFFSET, lng: center.lng + OFFSET },
          { lat: center.lat + OFFSET, lng: center.lng - OFFSET },
          { lat: center.lat - OFFSET, lng: center.lng + OFFSET },
          { lat: center.lat - OFFSET, lng: center.lng - OFFSET },
        ];
        const chargerFields = [
          "displayName",
          "location",
          "evChargeOptions",
          "id",
        ];
        const competitorFields = [
          "displayName",
          "location",
          "primaryType",
          "evChargeOptions",
          "id",
        ];

        const [chargerResults, competitorResult] = await Promise.all([
          Promise.all(
            quadrants.map((q) =>
              PlaceCtor.searchNearby({
                fields: chargerFields,
                locationRestriction: { center: q, radius: RADIUS },
                includedPrimaryTypes: ["electric_vehicle_charging_station"],
                maxResultCount: 20,
              }).catch(() => ({ places: [] as google.maps.places.Place[] })),
            ),
          ),
          PlaceCtor.searchNearby({
            fields: competitorFields,
            locationRestriction: {
              center: { lat: center.lat, lng: center.lng },
              radius: 1500,
            },
            includedPrimaryTypes: [
              "shopping_mall",
              "supermarket",
              "lodging",
            ],
            maxResultCount: 20,
          }).catch(() => ({ places: [] as google.maps.places.Place[] })),
        ]);

        if (cancelled) return;

        // 充電器マージ
        const chargers: Record<string, ChargerSpot> = {};
        for (const r of chargerResults) {
          for (const p of r.places ?? []) {
            const id = p.id;
            if (!id || chargers[id]) continue;
            const ll = readLatLng(p.location);
            if (!ll) continue;

            const ev = readEvCharge(p);
            const aggregations = ev?.connectorAggregations ?? [];
            const maxKw = aggregations.reduce(
              (acc, a) =>
                typeof a.maxChargeRateKw === "number"
                  ? Math.max(acc, a.maxChargeRateKw)
                  : acc,
              0,
            );
            const ports =
              ev?.connectorCount ??
              aggregations.reduce((acc, a) => acc + (a.count ?? 0), 0) ??
              0;

            chargers[id] = {
              id,
              type: maxKw >= 22 ? "rapid" : "normal",
              name:
                (p as unknown as { displayName?: string }).displayName ??
                "充電スポット",
              lat: ll.lat,
              lng: ll.lng,
              ports: ports || 1,
              maxKw: maxKw > 0 ? maxKw : undefined,
            };
          }
        }

        // 競合施設マージ
        const competitors: Facility[] = [];
        const seenComp: Record<string, true> = {};
        for (const p of competitorResult.places ?? []) {
          const id = p.id;
          if (!id || seenComp[id]) continue;
          seenComp[id] = true;
          const ll = readLatLng(p.location);
          if (!ll) continue;

          const primaryType =
            (p as unknown as { primaryType?: string }).primaryType ?? "";
          const facilityType =
            PRIMARY_TYPE_TO_FACILITY[primaryType] ?? "office";

          const ev = readEvCharge(p);
          const hasCharger = !!ev && (ev.connectorCount ?? 0) > 0;
          const compMaxKw = (ev?.connectorAggregations ?? []).reduce(
            (acc, a) =>
              typeof a.maxChargeRateKw === "number"
                ? Math.max(acc, a.maxChargeRateKw)
                : acc,
            0,
          );

          competitors.push({
            id,
            type: facilityType,
            name:
              (p as unknown as { displayName?: string }).displayName ??
              "施設",
            lat: ll.lat,
            lng: ll.lng,
            hasCharger,
            chargerType: hasCharger
              ? compMaxKw >= 22
                ? "rapid"
                : "normal"
              : undefined,
          });
        }

        cbRef.current.onLoaded({
          chargers: Object.values(chargers),
          competitors,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        cbRef.current.onError(`検索に失敗しました: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [places, center.lat, center.lng]);

  return null;
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TargetPin() {
  return (
    <div className="relative">
      <div className="size-10 rounded-full border-[3px] border-background bg-primary shadow-[0_4px_14px_rgba(217,119,87,0.35)]">
        <div className="grid size-full place-items-center">
          <span className="text-[10px] font-bold text-primary-foreground">
            ★
          </span>
        </div>
      </div>
    </div>
  );
}

function CompetitorPin({ hasCharger }: { hasCharger: boolean }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "size-7 rounded-md border-2 border-background shadow",
          hasCharger ? "bg-zinc-700" : "bg-zinc-400",
        )}
      >
        <div className="grid size-full place-items-center">
          <span className="text-[9px] font-bold text-white">
            {hasCharger ? "充" : "無"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SelectionDetail({ selection }: { selection: NonNullable<Selection> }) {
  if (selection.kind === "target") {
    return (
      <div className="min-w-[200px] space-y-1 p-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-700">
          対象施設
        </p>
        <p className="text-sm font-semibold text-zinc-900">
          {selection.data.name}
        </p>
        <p className="text-xs text-zinc-600">
          ここに普通充電を設置することで、滞在中の充電需要を独占的に獲得します。
        </p>
      </div>
    );
  }
  if (selection.kind === "charger") {
    const c = selection.data;
    const isRapid = c.type === "rapid";
    return (
      <div className="min-w-[200px] space-y-1 p-1">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            isRapid ? "text-rose-700" : "text-blue-700",
          )}
        >
          {isRapid ? "急速充電（通過型）" : "普通充電（滞在型）"}
        </p>
        <p className="text-sm font-semibold text-zinc-900">{c.name}</p>
        <p className="text-xs text-zinc-600">
          {c.maxKw ? `最大 ${c.maxKw} kW` : "出力情報なし"} / 推定 {c.ports} 口
        </p>
      </div>
    );
  }
  const f = selection.data;
  return (
    <div className="min-w-[200px] space-y-1 p-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        競合施設
      </p>
      <p className="text-sm font-semibold text-zinc-900">{f.name}</p>
      <p className="text-xs text-zinc-600">
        {f.hasCharger
          ? `導入済み（${f.chargerType === "rapid" ? "急速" : "普通"}）`
          : "未導入"}
      </p>
    </div>
  );
}

function Stat({
  dot,
  label,
  value,
  unit,
}: {
  dot: string;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-full"
          style={{ background: dot }}
        />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="num text-2xl font-semibold">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  dot,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  dot: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition",
        checked ? "bg-muted/60" : "opacity-50 hover:opacity-100",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function MissingApiKey() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="mb-2 text-sm font-semibold">
        Google Maps API キーが未設定です
      </p>
      <p className="mx-auto max-w-md text-xs text-muted-foreground">
        プロジェクトルートに <code className="rounded bg-muted px-1">.env.local</code>{" "}
        を作成し、
        <code className="rounded bg-muted px-1">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </code>{" "}
        を設定してください。詳細は SETUP_GOOGLE_MAPS.md を参照。
      </p>
    </div>
  );
}
