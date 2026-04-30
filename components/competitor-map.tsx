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
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [filter, setFilter] = useState<{
    rapid: boolean;
    normal: boolean;
    competitors: boolean;
  }>({ rapid: true, normal: true, competitors: true });

  const region: DisplayedRegion = customLocation
    ? buildCustomRegion(customLocation, customChargers)
    : presetToRegion(preset);

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
    <APIProvider apiKey={apiKey} libraries={["places"]}>
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

              {region.source === "preset" &&
                filter.competitors &&
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
                <NearbyChargerLoader
                  center={customLocation}
                  onLoadStart={() => {
                    setLoadingCustom(true);
                    setSearchError(null);
                  }}
                  onLoaded={(chargers) => {
                    setCustomChargers(chargers);
                    setLoadingCustom(false);
                    if (chargers.length === 0) {
                      setSearchError(
                        "このエリアでは充電スポットが見つかりませんでした。",
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
                ※ 種別判定は名称からの推定。実装後の現地確認を推奨。
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
              {region.source === "preset" && (
                <Toggle
                  label="競合施設"
                  checked={filter.competitors}
                  onChange={(v) =>
                    setFilter((f) => ({ ...f, competitors: v }))
                  }
                  dot="#71717A"
                />
              )}
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

function NearbyChargerLoader({
  center,
  onLoadStart,
  onLoaded,
  onError,
}: {
  center: CustomLocation;
  onLoadStart: () => void;
  onLoaded: (chargers: ChargerSpot[]) => void;
  onError: (msg: string) => void;
}) {
  const map = useMap();
  const places = useMapsLibrary("places");
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!map || !places) return;
    const key = `${center.lat.toFixed(5)}_${center.lng.toFixed(5)}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    onLoadStart();
    const service = new places.PlacesService(map);
    service.nearbySearch(
      {
        location: { lat: center.lat, lng: center.lng },
        radius: 1500,
        type: "electric_vehicle_charging_station",
      },
      (results, status) => {
        if (
          status === places.PlacesServiceStatus.ZERO_RESULTS ||
          !results ||
          results.length === 0
        ) {
          onLoaded([]);
          return;
        }
        if (status !== places.PlacesServiceStatus.OK) {
          onError(`検索に失敗しました（${status}）`);
          return;
        }
        const chargers: ChargerSpot[] = results
          .slice(0, 30)
          .map((r, i): ChargerSpot | null => {
            const loc = r.geometry?.location;
            if (!loc) return null;
            const name = r.name ?? "充電スポット";
            const isRapid =
              /急速|rapid|fast|高速|chademo|quick|chaoji|超急速/i.test(name);
            return {
              id: r.place_id ?? `r${i}`,
              type: isRapid ? "rapid" : "normal",
              name,
              lat: loc.lat(),
              lng: loc.lng(),
              ports: 1,
            };
          })
          .filter((c): c is ChargerSpot => c !== null);
        onLoaded(chargers);
      },
    );
  }, [map, places, center.lat, center.lng, onLoadStart, onLoaded, onError]);

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
          推定充電口数: {c.ports} 口
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
