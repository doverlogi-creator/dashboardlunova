/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  Cloud,
  CloudLightning,
  Coins,
  Cpu,
  Database,
  Download,
  FileText,
  Info,
  Layers,
  LifeBuoy,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  Zap
} from "lucide-react";

import { EventData, CostSettings, AppsScriptConfig } from "./types";
import { MOCK_EVENTS, DEFAULT_SETTINGS, getDashboardTotals, formatRupiah } from "./utils";
import StatCard from "./components/StatCard";
import Charts from "./components/Charts";
import EventTable from "./components/EventTable";
import AddEventModal from "./components/AddEventModal";
import AppsScriptSetupModal from "./components/AppsScriptSetupModal";
import InvoiceGenerator from "./components/InvoiceGenerator";

export default function App() {
  // --- STATES ---
  const [activeView, setActiveView] = useState<"dashboard" | "invoice">("dashboard");
  const [events, setEvents] = useState<EventData[]>([]);
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);
  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>({
    webAppUrl: "",
    isDemoMode: true,
    lastSyncedAt: null,
  });

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSetupGasOpen, setIsSetupGasOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // 1. Load Events
    const storedEvents = localStorage.getItem("lighting_events_2026");
    if (storedEvents) {
      try {
        const parsed = JSON.parse(storedEvents);
        const processed = parsed.map((evt: any) => {
          let p = Number(evt.pemasukan) || 0;
          if (p === 0 && evt.jenisPaket) {
            const presetPrices: Record<string, number> = {
              "paket 1": 1500000,
              "paket 1 c": 1500000,
              "paket 2": 2750000,
              "paket 2 c": 2750000,
              "paket 3": 3500000,
              "paket 3 c": 3500000,
            };
            const key = evt.jenisPaket.trim().toLowerCase();
            if (presetPrices[key] !== undefined) {
              p = presetPrices[key];
            }
          }
          return { ...evt, pemasukan: p };
        });
        setEvents(processed);
      } catch (e) {
        setEvents(MOCK_EVENTS);
      }
    } else {
      setEvents(MOCK_EVENTS);
      localStorage.setItem("lighting_events_2026", JSON.stringify(MOCK_EVENTS));
    }

    // 2. Load Settings
    const storedSettings = localStorage.getItem("lighting_settings_2026");
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        let updated = false;
        if (parsed.partner1Name === "Neovan") {
          parsed.partner1Name = "Lunova Lighting";
          updated = true;
        }
        // Auto migrate old settings values representing procurement cost to the new default (7.208.099)
        if (parsed.pengadaanKeseluruhanKeluar === 340000 || parsed.pengadaanKeseluruhanKeluar === 340051 || parsed.pengadaanKeseluruhanKeluar === 6738099) {
          parsed.pengadaanKeseluruhanKeluar = 7208099;
          updated = true;
        }
        if (updated) {
          localStorage.setItem("lighting_settings_2026", JSON.stringify(parsed));
        }
        setSettings(parsed);
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("lighting_settings_2026", JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. Load Apps Script Config
    const storedGasConfig = localStorage.getItem("lighting_gas_config_2026");
    if (storedGasConfig) {
      try {
        setAppsScriptConfig(JSON.parse(storedGasConfig));
      } catch (e) {
        // use default
      }
    }
  }, []);

  // --- SYNC WITH LOCAL STORAGE ---
  const saveEventsLocally = (newEvents: EventData[]) => {
    const processed = newEvents.map((evt) => {
      let p = Number(evt.pemasukan) || 0;
      if (p === 0 && evt.jenisPaket) {
        const presetPrices: Record<string, number> = {
          "paket 1": 1500000,
          "paket 1 c": 1500000,
          "paket 2": 2750000,
          "paket 2 c": 2750000,
          "paket 3": 3500000,
          "paket 3 c": 3500000,
        };
        const key = evt.jenisPaket.trim().toLowerCase();
        if (presetPrices[key] !== undefined) {
          p = presetPrices[key];
        }
      }
      return { ...evt, pemasukan: p };
    });
    setEvents(processed);
    localStorage.setItem("lighting_events_2026", JSON.stringify(processed));
  };

  const saveSettingsLocally = (newSettings: CostSettings) => {
    setSettings(newSettings);
    localStorage.setItem("lighting_settings_2026", JSON.stringify(newSettings));
  };

  const saveGasConfigLocally = (newConfig: AppsScriptConfig) => {
    setAppsScriptConfig(newConfig);
    localStorage.setItem("lighting_gas_config_2026", JSON.stringify(newConfig));
  };

  // --- GOOGLE APPS SCRIPT SYNC ---
  const handleSyncData = async (targetUrl = appsScriptConfig.webAppUrl) => {
    if (!targetUrl) {
      setSyncError("Google Apps Script URL belum dikonfigurasi.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`Server Sheet mengembalikan status response ${res.status}`);
      }

      const rawJson = await res.json();
      if (rawJson && Array.isArray(rawJson.data)) {
        // Save events retrieved from sheet
        saveEventsLocally(rawJson.data);

        // Save settings retrieved from sheet if present, or maintain current
        if (rawJson.settings) {
          const syncedPengadaan = Number(rawJson.settings.pengadaanKeseluruhanKeluar) || settings.pengadaanKeseluruhanKeluar;
          const mergedSettings: CostSettings = {
            operasionalAcara: Number(rawJson.settings.operasionalAcara) || settings.operasionalAcara,
            cashback: Number(rawJson.settings.cashback) || settings.cashback,
            karyawanAcara: Number(rawJson.settings.karyawanAcara) || settings.karyawanAcara,
            bensinAcara: Number(rawJson.settings.bensinAcara) || settings.bensinAcara,
            pengadaanKeseluruhanKeluar: syncedPengadaan,
            partner1Name: rawJson.settings.partner1Name || settings.partner1Name,
            partner1Share: Number(rawJson.settings.partner1Share) || settings.partner1Share,
            partner2Name: rawJson.settings.partner2Name || settings.partner2Name,
            partner2Share: Number(rawJson.settings.partner2Share) || settings.partner2Share,
          };
          saveSettingsLocally(mergedSettings);
        }

        saveGasConfigLocally({
          webAppUrl: targetUrl,
          isDemoMode: false,
          lastSyncedAt: new Date().toISOString(),
        });
      } else {
        throw new Error("Format data JSON Apps Script tidak valid.");
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "Gagal menghubungi Google Apps Script. Cek jaringan atau perizinan webapp Anda.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- TEST CONNECTION (MAPPED FOR THE DIALOG) ---
  const handleTestConnection = async (testUrl: string) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // 8 sec timeout
      
      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        return { success: false, message: `Server mengembalikan status HTTP ${res.status}` };
      }

      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        return { success: true, message: "Koneksi berhasil!", dataCount: json.data.length };
      } else {
        return { success: false, message: "Response sukses tapi format data tidak cocok (harus mengembalikan JSON data: [])" };
      }
    } catch (e: any) {
      return { success: false, message: e.message || "Kesalahan jaringan. Pastikan URL benar." };
    }
  };

  // --- HANDLE ADD TRANSAKSI ---
  const handleAddEvent = async (newEvent: Omit<EventData, "id">): Promise<boolean> => {
    // Generate unique ID
    const newId = `evt-${Date.now()}`;
    const eventWithId: EventData = { id: newId, ...newEvent };

    if (!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      // POST to Google Sheets
      try {
        setIsSyncing(true);
        const res = await fetch(appsScriptConfig.webAppUrl, {
          method: "POST",
          mode: "no-cors", // Crucial bypass for Apps Script Redirect CORS preflight blocking
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newEvent),
        });

        // "no-cors" avoids reading body, but appending succeeds. Let's update state immediately:
        const updated = [eventWithId, ...events];
        saveEventsLocally(updated);
        
        // Trigger background sync to get fully formatted numbers
        setTimeout(() => handleSyncData(), 1200);
        return true;
      } catch (err) {
        console.error("Gagal Posting data ke GAS:", err);
        alert("Gagal mengirim data ke Google Sheet. Kami menyimpannya secara lokal di web.");
        
        // Fallback local save
        const updated = [eventWithId, ...events];
        saveEventsLocally(updated);
        return true;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Demo Mode: Save locally
      const updated = [eventWithId, ...events];
      saveEventsLocally(updated);
      return true;
    }
  };

  // --- DELETE TRANSAKSI ---
  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    saveEventsLocally(updated);
  };

  // Save Apps Script settings from Dialog
  const handleSaveGasUrl = (url: string) => {
    if (url) {
      saveGasConfigLocally({
        webAppUrl: url,
        isDemoMode: false,
        lastSyncedAt: null,
      });
      // Fire initial sync
      setTimeout(() => handleSyncData(url), 500);
    } else {
      saveGasConfigLocally({
        webAppUrl: "",
        isDemoMode: true,
        lastSyncedAt: null,
      });
      // Reset back to mock events
      saveEventsLocally(MOCK_EVENTS);
    }
  };

  const handleToggleDemoMode = () => {
    if (appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      saveGasConfigLocally({
        ...appsScriptConfig,
        isDemoMode: false,
      });
      handleSyncData();
    } else {
      saveGasConfigLocally({
        ...appsScriptConfig,
        isDemoMode: true,
      });
    }
  };

  // --- METRICS CALCULATION ---
  const totals = getDashboardTotals(events, settings);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/20 selection:text-blue-200 pb-20 font-sans">
      {/* Decorative Neon Lighting glow accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-purple-950/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[300px] bg-blue-950/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Single-View Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 relative z-10">
        
        {/* Connection Bar Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-blue-500">
              <Database className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">
                Sumber Database
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${appsScriptConfig.isDemoMode ? "bg-purple-550 animate-pulse" : "bg-blue-500"}`} />
                <span className="text-xs font-semibold text-zinc-200">
                  {appsScriptConfig.isDemoMode ? "Mode Simulasi (Demo Offline)" : "Mode Live (Google Sheets Terhubung)"}
                </span>
                {appsScriptConfig.lastSyncedAt && (
                  <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                    • Terakhir Sinkron: {new Date(appsScriptConfig.lastSyncedAt).toLocaleTimeString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {appsScriptConfig.webAppUrl && (
              <button
                onClick={handleToggleDemoMode}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  appsScriptConfig.isDemoMode
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/25 hover:bg-blue-550/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                }`}
              >
                {appsScriptConfig.isDemoMode ? "Aktifkan Live Sheet" : "Masuk Mode Simulasi"}
              </button>
            )}

            {!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl && (
              <button
                onClick={() => handleSyncData()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 text-blue-400 border border-zinc-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Menyelaras..." : "Gores Sinkron"}</span>
              </button>
            )}

            <button
              onClick={() => setIsSetupGasOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <CloudLightning className="w-3.5 h-3.5 text-white" />
              <span>{appsScriptConfig.webAppUrl ? "Ubah Koneksi Sheet" : "Hubungkan Google Sheet"}</span>
            </button>
          </div>
        </div>

        {/* PAGE NAVIGATION TABS */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveView("dashboard")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === "dashboard"
                ? "bg-blue-600 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>📊 Dashboard & Analisis Event</span>
          </button>
          
          <button
            onClick={() => {
              setActiveView("invoice");
              // Smooth scroll to top when switching
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === "invoice"
                ? "bg-emerald-600 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>🧾 Halaman Transaksi & Buat Invoice (A5)</span>
          </button>
        </div>

        {/* Sync / Connection error alert */}
        {syncError && (
          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span><strong>Kesalahan Sinkronisasi:</strong> {syncError}</span>
            </div>
            <button
              onClick={() => setSyncError(null)}
              className="font-bold text-neutral-500 hover:text-neutral-300 px-2 py-1 text-sm outline-none"
            >
              ×
            </button>
          </div>
        )}

        {activeView === "dashboard" ? (
          <>
            {/* App Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    Partner Usaha
                  </span>
                  <span className="text-zinc-400 text-xs font-mono">• 2026 Season</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
                  <span>Dashboard Usaha Lighting</span>
                  <Sparkles className="w-6 h-6 text-blue-500 fill-blue-500/20 shrink-0 animate-pulse" />
                </h1>
                <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
                  Arus keuangan, biaya pemasangan, dan log bagi hasil dekorasi pencahayaan panggung wedding event antara <strong className="text-blue-400">Lunova Lighting</strong> dkk.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    showSettingsPanel
                      ? "bg-zinc-800 text-white border-zinc-700"
                      : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>{showSettingsPanel ? "Sembunyikan Pengaturan" : "Ubah Parameter Biaya"}</span>
                </button>

                <button
                  onClick={() => setIsAddEventOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tambah Transaksi</span>
                </button>
              </div>
            </div>

            {/* Quick Settings Drawer/Card (Collapsible inline) */}
            {showSettingsPanel && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                {/* Standard Costs */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                    Biaya Tetap Per Event
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Operasional / Acara (I2)
                      </label>
                      <input
                        type="number"
                        value={settings.operasionalAcara}
                        onChange={(e) => saveSettingsLocally({ ...settings, operasionalAcara: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Cashback Vendor (I3)
                      </label>
                      <input
                        type="number"
                        value={settings.cashback}
                        onChange={(e) => saveSettingsLocally({ ...settings, cashback: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Field workers and gas */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                    Tenaga Kerja & Bensin
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Karyawan / Acara (I5)
                      </label>
                      <input
                        type="number"
                        value={settings.karyawanAcara}
                        onChange={(e) => saveSettingsLocally({ ...settings, karyawanAcara: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Bensin / Acara (I6)
                      </label>
                      <input
                        type="number"
                        value={settings.bensinAcara}
                        onChange={(e) => saveSettingsLocally({ ...settings, bensinAcara: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Sharing Partners */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                    Mitra Bagi Hasil & Pengadaan
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Partner 1</label>
                      <input
                        type="text"
                        value={settings.partner1Name}
                        onChange={(e) => saveSettingsLocally({ ...settings, partner1Name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Porsi Bagi Hasil %</label>
                      <input
                        type="number"
                        value={settings.partner1Share}
                        onChange={(e) => saveSettingsLocally({ ...settings, partner1Share: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Partner 2</label>
                      <input
                        type="text"
                        value={settings.partner2Name}
                        onChange={(e) => saveSettingsLocally({ ...settings, partner2Name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Porsi Bagi Hasil %</label>
                      <input
                        type="number"
                        value={settings.partner2Share}
                        onChange={(e) => saveSettingsLocally({ ...settings, partner2Share: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Pengadaan Asset Global (Summary L9)</label>
                    <input
                      type="number"
                      value={settings.pengadaanKeseluruhanKeluar}
                      onChange={(e) => saveSettingsLocally({ ...settings, pengadaanKeseluruhanKeluar: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- KPI STAT CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
              <StatCard
                id="kpi-pemasukan"
                title="Omset Persewaan Kotor"
                value={totals.totalRevenue}
                icon={<Wallet className="w-5 h-5" />}
                colorClass="text-blue-500"
                description="Total pemasukan dari semua event"
                badgeText={`${totals.eventCount} Acara`}
                badgeColorClass="bg-blue-500/10 text-blue-500 border-blue-500/20"
              />

              <StatCard
                id="kpi-operational"
                title="Pendapatan Bersih / Bulan"
                value={totals.averageMonthlyNetProfit}
                icon={<TrendingUp className="w-5 h-5" />}
                colorClass="text-emerald-400"
                description="Rata-rata profit bersih bulanan"
                badgeText={`${totals.uniqueMonthsCount} Bulan`}
                badgeColorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              />

              <StatCard
                id="kpi-profit"
                title="Total Keuntungan Bersih"
                value={totals.totalNetProfit}
                icon={<Coins className="w-5 h-5" />}
                colorClass="text-purple-400"
                description="Laba bersih dibagikan"
                badgeText="Sisa Laba"
                badgeColorClass="bg-purple-500/10 text-purple-400 border-purple-500/20"
              />

              <StatCard
                id="kpi-kas"
                title="Pengadaan Saat Ini"
                value={totals.overheadCost}
                icon={<Layers className="w-5 h-5" />}
                colorClass="text-cyan-400"
                description="Total investasi pengadaan keseluruhan"
                badgeText="Summary L9"
                badgeColorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              />
            </div>

            {/* --- GRAPHS SECTION (Bento Box Section 1) --- */}
            <Charts events={events} settings={settings} />

            {/* --- TRANSACTIONS LOG TABLE SECTION --- */}
            <EventTable events={events} settings={settings} onDeleteEvent={handleDeleteEvent} />

            {/* --- SYSTEM NOTION / FOOTER BAR --- */}
            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-zinc-300 flex items-center gap-1">
                  <Info className="w-4 h-4 text-blue-400" />
                  Formula Keuangan Usaha Lighting 2026:
                </span>
                <p className="text-zinc-400 leading-relaxed pl-5">
                  Net Profit = Hasil Sewa - [Ops ({formatRupiah(settings.operasionalAcara)}) + Cashback ({formatRupiah(settings.cashback)} <span className="text-emerald-400 font-semibold">*khusus paket berakhiran 'C'*</span>)].<br />
                  Selanjutnya pembagian laba bersih: Partner 1 ({settings.partner1Name}) mendapat {settings.partner1Share}%, Partner 2 ({settings.partner2Name}) mendapat {settings.partner2Share}%, Sisanya 20% masuk ke Kas Perusahaan yang diset ke akumulasi minus biaya procurement global ({formatRupiah(settings.pengadaanKeseluruhanKeluar)}).
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
                <Cpu className="w-4 h-4" />
                <span>Usaha Lighting Core v1.0</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
            <InvoiceGenerator
              events={events}
              settings={settings}
              onBack={() => setActiveView("dashboard")}
            />
          </div>
        )}

      </div>

      {/* --- ADD EVENT MODAL --- */}
      {isAddEventOpen && (
        <AddEventModal
          onClose={() => setIsAddEventOpen(false)}
          onAddEvent={handleAddEvent}
          events={events}
        />
      )}

      {/* --- GOOGLE APPS SCRIPT SETUP MODAL --- */}
      {isSetupGasOpen && (
        <AppsScriptSetupModal
          webAppUrl={appsScriptConfig.webAppUrl}
          onSaveUrl={handleSaveGasUrl}
          onClose={() => setIsSetupGasOpen(false)}
          onTestConnection={handleTestConnection}
        />
      )}
    </div>
  );
}
