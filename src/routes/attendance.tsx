import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/salon/app-shell";
import {
  useAttendance, attendanceActions, getCurrentPosition, distanceMeters,
  openAttendanceRecord, workedMinutes, type AttendanceRecord,
} from "@/lib/attendance-store";
import { useSalon, formatDate, formatTime } from "@/lib/salon-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MapPin, Crosshair, ShieldCheck, ShieldAlert, CheckCircle2, Clock,
  LogIn, LogOut, Users2, AlertTriangle, Timer, Trash2, Search,
  Download, Fingerprint, Navigation, MapPinned, Filter, Radius,
} from "lucide-react";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والانصراف — لمسة" },
      { name: "description", content: "نظام حضور وانصراف الموظفين مع تحقق دقيق من الموقع الجغرافي وسجلات مفصّلة." },
      { property: "og:title", content: "الحضور والانصراف — لمسة" },
      { property: "og:description", content: "تحقق دقيق من موقع الموظفين وسجلات الحضور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendanceRoute,
});

// -------- Leaflet loader (client-only, via CDN) --------
declare global { interface Window { L?: any } }
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error("فشل تحميل الخريطة"));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function AttendanceRoute() {
  return (
    <AppShell title="الحضور والانصراف" subtitle="تحقق دقيق من موقع الموظفين + سجلات مفصّلة">
      <AttendanceView />
    </AppShell>
  );
}

function AttendanceView() {
  const { settings, records } = useAttendance((s) => s);
  const { staff } = useSalon((s) => s);
  const [tab, setTab] = useState<"map" | "live" | "log">("map");

  const activeStaff = staff.filter((s) => s.active);
  const presentCount = activeStaff.filter((s) => openAttendanceRecord(records, s.id)).length;
  const todayISO = new Date().toDateString();
  const todayRecs = records.filter((r) => new Date(r.checkInAt).toDateString() === todayISO);
  const totalMinToday = todayRecs.reduce((a, r) => a + workedMinutes(r), 0);

  const locConfigured = settings.shopLat !== null && settings.shopLng !== null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stat strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard icon={<Users2 className="size-4" />} label="الموظفون النشطون" value={String(activeStaff.length)} tone="primary" />
        <StatCard icon={<CheckCircle2 className="size-4" />} label="حاضرون الآن" value={String(presentCount)} tone="success" />
        <StatCard icon={<Timer className="size-4" />} label="ساعات اليوم" value={`${Math.floor(totalMinToday/60)}س ${totalMinToday%60}د`} tone="accent" />
        <StatCard
          icon={locConfigured ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
          label="التحقق من الموقع"
          value={locConfigured ? (settings.enforceLocation ? "مفعّل" : "معطّل") : "غير مضبوط"}
          tone={locConfigured ? "success" : "warning"}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <TabBtn active={tab==="map"} onClick={() => setTab("map")} icon={<MapPinned className="size-4" />}>الخريطة والنطاق</TabBtn>
        <TabBtn active={tab==="live"} onClick={() => setTab("live")} icon={<Fingerprint className="size-4" />}>الحضور المباشر</TabBtn>
        <TabBtn active={tab==="log"} onClick={() => setTab("log")} icon={<Clock className="size-4" />}>سجل الحضور</TabBtn>
      </div>

      {tab === "map" && <MapSection />}
      {tab === "live" && <LiveSection />}
      {tab === "log" && <LogSection />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-2 border transition-all",
        active
          ? "bg-gradient-to-l from-primary to-accent text-primary-foreground border-transparent shadow-[var(--shadow-glow)]"
          : "bg-background/40 border-border text-muted-foreground hover:text-foreground",
      )}
    >{icon}{children}</button>
  );
}

function StatCard({ icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary"|"success"|"accent"|"warning" }) {
  const toneMap = {
    primary: "from-primary/20 to-accent/10 text-primary border-primary/25",
    success: "from-success/20 to-success/5 text-success border-success/25",
    accent:  "from-accent/20 to-primary/5 text-accent border-accent/25",
    warning: "from-warning/25 to-warning/5 text-warning border-warning/30",
  } as const;
  return (
    <div className={cn("glass-card rounded-2xl p-4 border bg-gradient-to-br", toneMap[tone])}>
      <div className="flex items-center gap-2 text-xs font-semibold opacity-90">{icon}{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

// ================= MAP SECTION =================
function MapSection() {
  const { settings, records } = useAttendance((s) => s);
  const { staff } = useSalon((s) => s);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const shopMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const staffLayerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [search, setSearch] = useState("");

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      const startLat = settings.shopLat ?? 24.7136;
      const startLng = settings.shopLng ?? 46.6753;
      const map = L.map(containerRef.current, {
        center: [startLat, startLng],
        zoom: settings.shopLat ? 16 : 5,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const shopIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#ec4899);border:3px solid #fff;box-shadow:0 4px 12px rgba(168,85,247,.55);display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px">🏪</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([startLat, startLng], { draggable: true, icon: shopIcon }).addTo(map);
      marker.bindTooltip("موقع الصالون (اسحب لتحديد)", { direction: "top", offset: [0, -14] });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        attendanceActions.setSettings({ shopLat: p.lat, shopLng: p.lng });
        circle.setLatLng(p);
        toast.success("تم تحديث موقع الصالون");
      });

      const circle = L.circle([startLat, startLng], {
        radius: settings.radiusMeters,
        color: "#a855f7",
        weight: 2,
        fillColor: "#a855f7",
        fillOpacity: 0.12,
      }).addTo(map);

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        attendanceActions.setSettings({ shopLat: e.latlng.lat, shopLng: e.latlng.lng });
      });

      const layer = L.layerGroup().addTo(map);

      mapRef.current = map;
      shopMarkerRef.current = marker;
      circleRef.current = circle;
      staffLayerRef.current = layer;
      setReady(true);
    }).catch((e) => toast.error(e.message));

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync shop marker + circle when settings change (external edits)
  useEffect(() => {
    if (!ready || !window.L) return;
    if (settings.shopLat !== null && settings.shopLng !== null) {
      const ll = [settings.shopLat, settings.shopLng] as [number, number];
      shopMarkerRef.current?.setLatLng(ll);
      circleRef.current?.setLatLng(ll);
    }
    circleRef.current?.setRadius(settings.radiusMeters);
  }, [settings.shopLat, settings.shopLng, settings.radiusMeters, ready]);

  // Plot staff check-in pins
  useEffect(() => {
    if (!ready || !window.L || !staffLayerRef.current) return;
    const L = window.L;
    staffLayerRef.current.clearLayers();
    const todayISO = new Date().toDateString();
    activeRecords(records).forEach((r) => {
      const st = staff.find((s) => s.id === r.staffId);
      if (!st) return;
      const isToday = new Date(r.checkInAt).toDateString() === todayISO;
      const isOpen = !r.checkOutAt;
      const color = isOpen ? "#22c55e" : isToday ? "#f59e0b" : "#94a3b8";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.25);display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px">${st.name.charAt(0)}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const dist = settings.shopLat !== null && settings.shopLng !== null
        ? Math.round(distanceMeters(r.checkInLat, r.checkInLng, settings.shopLat, settings.shopLng))
        : null;
      L.marker([r.checkInLat, r.checkInLng], { icon })
        .bindPopup(
          `<div dir="rtl" style="font-family:inherit">
            <b>${st.name}</b><br/>
            حضور: ${new Date(r.checkInAt).toLocaleString("ar-SA")}<br/>
            ${r.checkOutAt ? `انصراف: ${new Date(r.checkOutAt).toLocaleString("ar-SA")}<br/>` : "<b style='color:#22c55e'>ما زال حاضراً</b><br/>"}
            ${dist !== null ? `المسافة: <b>${dist}م</b><br/>` : ""}
            الوسيلة: ${r.via === "geo" ? "GPS" : "يدوي"}
          </div>`,
        ).addTo(staffLayerRef.current);
    });
  }, [ready, records, staff, settings.shopLat, settings.shopLng]);

  const captureHere = async () => {
    setCapturing(true);
    try {
      const pos = await getCurrentPosition();
      attendanceActions.setSettings({ shopLat: pos.coords.latitude, shopLng: pos.coords.longitude });
      if (mapRef.current) mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 17);
      toast.success(`تم حفظ الموقع (دقة ~${Math.round(pos.coords.accuracy)}م)`);
    } catch (e: any) { toast.error(e?.message || "تعذّر تحديد الموقع"); }
    finally { setCapturing(false); }
  };

  const searchAddress = async () => {
    if (!search.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`);
      const data = await r.json();
      if (!data?.[0]) { toast.error("لم يتم العثور على الموقع"); return; }
      const lat = Number(data[0].lat), lng = Number(data[0].lon);
      attendanceActions.setSettings({ shopLat: lat, shopLng: lng });
      if (mapRef.current) mapRef.current.setView([lat, lng], 17);
      toast.success("تم تحديد الموقع من العنوان");
    } catch { toast.error("فشل البحث"); }
  };

  const locConfigured = settings.shopLat !== null && settings.shopLng !== null;

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPinned className="size-5 text-primary" />
          <h3 className="font-bold">تحديد موقع البصمة والنطاق</h3>
        </div>
        <div className="flex items-center gap-2">
          {locConfigured ? (
            <span className="text-[11px] text-success inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2 py-1">
              <ShieldCheck className="size-3.5" /> محدد
            </span>
          ) : (
            <span className="text-[11px] text-warning inline-flex items-center gap-1 rounded-full bg-warning/15 border border-warning/30 px-2 py-1">
              <ShieldAlert className="size-3.5" /> غير محدد
            </span>
          )}
        </div>
      </div>

      {/* Search + capture bar */}
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAddress()}
            placeholder="ابحث عن عنوان أو مكان..."
            className="w-full h-11 rounded-xl bg-background/60 border border-border pr-10 pl-3 text-sm"
          />
        </div>
        <button onClick={searchAddress} className="h-11 px-4 rounded-xl bg-background/60 border border-border text-sm font-bold inline-flex items-center gap-2">
          <Search className="size-4" /> بحث
        </button>
        <button
          onClick={captureHere} disabled={capturing}
          className="h-11 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Crosshair className="size-4" />
          {capturing ? "جارٍ التحديد..." : "استخدم موقعي"}
        </button>
      </div>

      {/* Map */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[420px] rounded-xl overflow-hidden border border-border bg-muted"
          style={{ zIndex: 0 }}
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground bg-background/60 rounded-xl">
            جارٍ تحميل الخريطة...
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        اسحب الدبوس أو انقر على الخريطة لتعديل موقع الصالون. الدائرة البنفسجية تمثّل نطاق تسجيل الحضور.
      </p>

      {/* Config row */}
      <div className="grid gap-3 md:grid-cols-4">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Latitude</span>
          <input
            type="number" step="any" value={settings.shopLat ?? ""}
            onChange={(e) => attendanceActions.setSettings({ shopLat: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-full h-10 rounded-lg bg-background/60 border border-border px-3 text-xs font-semibold"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Longitude</span>
          <input
            type="number" step="any" value={settings.shopLng ?? ""}
            onChange={(e) => attendanceActions.setSettings({ shopLng: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-full h-10 rounded-lg bg-background/60 border border-border px-3 text-xs font-semibold"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1"><Radius className="size-3" /> نطاق البصمة (متر)</span>
          <input
            type="range" min={20} max={1000} step={10}
            value={settings.radiusMeters}
            onChange={(e) => attendanceActions.setSettings({ radiusMeters: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="text-xs font-bold text-primary">{settings.radiusMeters} متر</div>
        </label>
        <label className="flex items-center justify-between rounded-lg bg-background/60 border border-border px-3 h-10 md:h-auto md:py-2">
          <span className="text-xs font-semibold">إلزام التحقق</span>
          <input
            type="checkbox" checked={settings.enforceLocation}
            onChange={(e) => attendanceActions.setSettings({ enforceLocation: e.target.checked })}
            className="size-4 accent-primary"
          />
        </label>
      </div>

      {settings.enforceLocation && !locConfigured && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs p-3 flex items-center gap-2">
          <AlertTriangle className="size-4" /> فعّلت الإلزام دون تحديد موقع — لن يتمكن الموظفون من تسجيل الحضور.
        </div>
      )}
    </div>
  );
}

function activeRecords(records: AttendanceRecord[]) {
  // Show last 200 for perf
  return records.slice(0, 200);
}

// ================= LIVE SECTION =================
function LiveSection() {
  const { settings, records } = useAttendance((s) => s);
  const { staff } = useSalon((s) => s);
  const activeStaff = staff.filter((s) => s.active);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = activeStaff.filter((s) => s.name.includes(q.trim()));

  const doAction = async (staffId: string, mode: "in" | "out") => {
    setBusy(staffId + mode);
    try {
      const openRec = openAttendanceRecord(records, staffId);
      if (mode === "in" && openRec) { toast.info("لديه حضور مفتوح"); return; }
      if (mode === "out" && !openRec) { toast.info("لا يوجد حضور مفتوح"); return; }
      let lat = settings.shopLat ?? 0, lng = settings.shopLng ?? 0;
      let via: "geo" | "manual" = "manual";
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude; lng = pos.coords.longitude; via = "geo";
      } catch {}
      if (mode === "in") { attendanceActions.checkIn(staffId, lat, lng, via); toast.success("تم تسجيل الحضور"); }
      else if (openRec) { attendanceActions.checkOut(openRec.id, lat, lng); toast.success("تم تسجيل الانصراف"); }
    } finally { setBusy(null); }
  };

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold inline-flex items-center gap-2"><Fingerprint className="size-5 text-primary" /> الحضور المباشر</h3>
        <div className="relative">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث موظف..."
            className="h-9 rounded-lg bg-background/60 border border-border pr-9 pl-3 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا يوجد موظفون
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((s) => {
            const openRec = openAttendanceRecord(records, s.id);
            const todayRecs = records.filter((r) => r.staffId === s.id && new Date(r.checkInAt).toDateString() === new Date().toDateString());
            const totalMin = todayRecs.reduce((a, r) => a + workedMinutes(r), 0);
            const lastRec = todayRecs[0];
            const dist = lastRec && settings.shopLat !== null && settings.shopLng !== null
              ? Math.round(distanceMeters(lastRec.checkInLat, lastRec.checkInLng, settings.shopLat, settings.shopLng))
              : null;
            const inside = dist !== null && dist <= settings.radiusMeters;
            return (
              <div key={s.id} className="rounded-xl border border-border bg-background/40 p-3 flex items-center gap-3">
                <div className={cn(
                  "size-11 rounded-full grid place-items-center text-sm font-bold text-primary-foreground shrink-0 relative",
                  openRec ? "bg-gradient-to-br from-success to-emerald-400" : "bg-gradient-to-br from-primary to-accent",
                )}>
                  {s.name.charAt(0)}
                  {openRec && <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full bg-success ring-2 ring-background animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                    {openRec ? (
                      <span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> منذ {formatTime(openRec.checkInAt)}</span>
                    ) : todayRecs.length > 0 ? (
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {Math.floor(totalMin/60)}س {totalMin%60}د اليوم</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" /> لم يحضر بعد</span>
                    )}
                    {dist !== null && (
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 border",
                        inside ? "text-success border-success/30 bg-success/10" : "text-warning border-warning/30 bg-warning/10",
                      )}>
                        <Navigation className="size-3" /> {dist}م
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!openRec ? (
                    <button onClick={() => doAction(s.id, "in")} disabled={busy === s.id + "in"}
                      className="h-9 px-3 rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
                      <LogIn className="size-3.5" /> حضور
                    </button>
                  ) : (
                    <button onClick={() => doAction(s.id, "out")} disabled={busy === s.id + "out"}
                      className="h-9 px-3 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
                      <LogOut className="size-3.5" /> انصراف
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================= LOG SECTION =================
function LogSection() {
  const { records, settings } = useAttendance((s) => s);
  const { staff } = useSalon((s) => s);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [viaFilter, setViaFilter] = useState<"all" | "geo" | "manual">("all");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (staffFilter !== "all" && r.staffId !== staffFilter) return false;
      if (viaFilter !== "all" && (r.via ?? "geo") !== viaFilter) return false;
      const d = new Date(r.checkInAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (d > to) return false; }
      return true;
    });
  }, [records, staffFilter, viaFilter, dateFrom, dateTo]);

  const totalMin = filtered.reduce((a, r) => a + workedMinutes(r), 0);

  const exportCsv = () => {
    const rows = [
      ["الموظف","تاريخ الحضور","وقت الحضور","تاريخ الانصراف","وقت الانصراف","المدة (د)","المسافة (م)","الوسيلة","ملاحظة"],
      ...filtered.map((r) => {
        const st = staff.find((s) => s.id === r.staffId);
        const dist = settings.shopLat !== null && settings.shopLng !== null
          ? Math.round(distanceMeters(r.checkInLat, r.checkInLng, settings.shopLat, settings.shopLng)).toString()
          : "";
        return [
          st?.name ?? "",
          formatDate(r.checkInAt), formatTime(r.checkInAt),
          r.checkOutAt ? formatDate(r.checkOutAt) : "",
          r.checkOutAt ? formatTime(r.checkOutAt) : "",
          String(workedMinutes(r)),
          dist,
          r.via === "manual" ? "يدوي" : "GPS",
          (r.note ?? "").replace(/[\n,]/g, " "),
        ];
      }),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold inline-flex items-center gap-2"><Clock className="size-5 text-primary" /> سجل الحضور والانصراف</h3>
        <button onClick={exportCsv} className="h-9 px-3 rounded-lg border border-border bg-background/60 text-xs font-bold inline-flex items-center gap-1.5">
          <Download className="size-3.5" /> تصدير CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid gap-2 md:grid-cols-5">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1"><Filter className="size-3" /> الموظف</span>
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}
            className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs font-semibold">
            <option value="all">الجميع</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">من تاريخ</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">إلى تاريخ</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">الوسيلة</span>
          <select value={viaFilter} onChange={(e) => setViaFilter(e.target.value as any)}
            className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs font-semibold">
            <option value="all">الكل</option>
            <option value="geo">GPS</option>
            <option value="manual">يدوي</option>
          </select>
        </label>
        <div className="rounded-lg bg-primary/10 border border-primary/25 text-primary p-2 text-center">
          <div className="text-[10px] font-semibold opacity-80">الإجمالي</div>
          <div className="text-sm font-black">{filtered.length} سجل • {Math.floor(totalMin/60)}س {totalMin%60}د</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد سجلات
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-semibold">الموظف</th>
                <th className="text-right p-3 font-semibold">الحضور</th>
                <th className="text-right p-3 font-semibold">الانصراف</th>
                <th className="text-right p-3 font-semibold">المدة</th>
                <th className="text-right p-3 font-semibold">الموقع</th>
                <th className="text-right p-3 font-semibold">الوسيلة</th>
                <th className="text-right p-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = staff.find((s) => s.id === r.staffId);
                const dist = settings.shopLat !== null && settings.shopLng !== null
                  ? Math.round(distanceMeters(r.checkInLat, r.checkInLng, settings.shopLat, settings.shopLng))
                  : null;
                const inside = dist !== null && dist <= settings.radiusMeters;
                const mins = workedMinutes(r);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-semibold">{st?.name ?? "—"}</td>
                    <td className="p-3">
                      <div>{formatDate(r.checkInAt)}</div>
                      <div className="text-muted-foreground">{formatTime(r.checkInAt)}</div>
                    </td>
                    <td className="p-3">
                      {r.checkOutAt ? (
                        <>
                          <div>{formatDate(r.checkOutAt)}</div>
                          <div className="text-muted-foreground">{formatTime(r.checkOutAt)}</div>
                        </>
                      ) : <span className="text-success font-bold">حاضر الآن</span>}
                    </td>
                    <td className="p-3 font-semibold">{Math.floor(mins/60)}س {mins%60}د</td>
                    <td className="p-3">
                      {dist !== null ? (
                        <a href={`https://www.google.com/maps?q=${r.checkInLat},${r.checkInLng}`} target="_blank" rel="noreferrer"
                           className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-bold",
                             inside ? "text-success border-success/30 bg-success/10" : "text-warning border-warning/30 bg-warning/10")}>
                          <MapPin className="size-3" /> {dist}م
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        (r.via ?? "geo") === "geo" ? "text-primary bg-primary/10 border-primary/25" : "text-muted-foreground bg-muted/40 border-border",
                      )}>{(r.via ?? "geo") === "geo" ? "GPS" : "يدوي"}</span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => { if (confirm("حذف السجل؟")) { attendanceActions.removeRecord(r.id); toast.success("تم الحذف"); } }}
                        className="size-8 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 inline-flex items-center justify-center">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
