/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Briefcase,
  CloudLightning,
  Coins,
  Cpu,
  Database,
  Info,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Circle,
  Hourglass
} from "lucide-react";

import { EventData, CostSettings, AppsScriptConfig, ProcurementItem } from "./types";
import { MOCK_EVENTS, DEFAULT_SETTINGS, getDashboardTotals, getEventFinances, formatRupiah, parseDate } from "./utils";
import { translations } from "./translations";
import StatCard from "./components/StatCard";
import Charts, { VendorPerformance } from "./components/Charts";
import EventTable from "./components/EventTable";
import MonthlySharing from "./components/MonthlySharing";
import Calendar from "./components/Calendar";
import AddEventModal from "./components/AddEventModal";
import AppsScriptSetupModal from "./components/AppsScriptSetupModal";
import InvoiceGenerator from "./components/InvoiceGenerator";
import ProcurementManagement from "./components/ProcurementManagement";
import CashbackManagement from "./components/CashbackManagement";
import OperationalManagement from "./components/OperationalManagement";

const DEFAULT_PROCUREMENTS: ProcurementItem[] = [
  {
    id: "proc-1",
    tanggal: "2026-05-01",
    namaBarang: "Bohlam Lampu Par LED Spare",
    harga: 170000,
    jumlah: 2,
    keterangan: "Spare utama cadangan"
  }
];

export default function App() {
  // --- STATES ---
  const [activeView, setActiveView] = useState<"dashboard" | "mitra-kinerja" | "pembagian-bulan" | "invoice" | "procurement" | "cashback" | "operational" | "settings">("dashboard");
  const [isGroupDataOpen, setIsGroupDataOpen] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYearStr = String(new Date().getFullYear());
    const defaultYears = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035"];
    return defaultYears.includes(currentYearStr) ? currentYearStr : "2026";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);
  const [procurements, setProcurements] = useState<ProcurementItem[]>([]);
  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>({
    webAppUrl: "",
    isDemoMode: true,
    lastSyncedAt: null,
  });

  const [theme, setTheme] = useState<"light" | "dark" | "">("");
  const [lang, setLang] = useState<"en" | "id">(() => {
    const saved = localStorage.getItem("lighting_lang_2026");
    return (saved === "en" || saved === "id") ? saved : "en"; // default to English
  });

  // --- LANGUAGE STORAGE SYNCHRONIZATION ---
  useEffect(() => {
    localStorage.setItem("lighting_lang_2026", lang);
  }, [lang]);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [editingCostEvent, setEditingCostEvent] = useState<EventData | null>(null);
  const [isSetupGasOpen, setIsSetupGasOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // --- THEME INITIAL COUPLING ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("lighting_theme_2026") || "light";
    setTheme(savedTheme as "light" | "dark");
  }, []);

  useEffect(() => {
    if (!theme) return;
    localStorage.setItem("lighting_theme_2026", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    }
  }, [theme]);

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

    // 2. Load Settings - Try to read from localStorage if present, otherwise use DEFAULT_SETTINGS
    const storedSettings = localStorage.getItem("lighting_settings_2026");
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }

    // 3. Load Apps Script Config
    const storedGasConfig = localStorage.getItem("lighting_gas_config_2026");
    if (storedGasConfig) {
      try {
        const parsedGasConfig = JSON.parse(storedGasConfig);
        setAppsScriptConfig(parsedGasConfig);
        if (!parsedGasConfig.isDemoMode && parsedGasConfig.webAppUrl) {
          // Immediately sync with Google Sheets on mount to ensure fresh data
          setTimeout(() => handleSyncData(parsedGasConfig.webAppUrl), 500);
        }
      } catch (e) {
        // use default
      }
    }

    // 4. Load Procurements
    const storedProcurements = localStorage.getItem("lighting_procurements_2026");
    if (storedProcurements) {
      try {
        setProcurements(JSON.parse(storedProcurements));
      } catch (e) {
        setProcurements(DEFAULT_PROCUREMENTS);
      }
    } else {
      setProcurements(DEFAULT_PROCUREMENTS);
      localStorage.setItem("lighting_procurements_2026", JSON.stringify(DEFAULT_PROCUREMENTS));
    }
  }, []);

  // --- SYNC WITH LOCAL STORAGE ---
  const saveEventsLocally = (newEvents: EventData[]) => {
    const processed = newEvents
      .filter((evt) => {
        if (!evt.tanggal) return false;
        const t = String(evt.tanggal).trim().toLowerCase();
        const v = String(evt.vendor || "").trim().toLowerCase();
        const jp = String(evt.jenisPaket || "").trim().toLowerCase();
        // Skip default/placeholder/empty template rows or summary/total rows
        if (
          t === "dd/mm/yyyy" || 
          t === "tanggal" || 
          t === "" || 
          v === "vendor/wo" || 
          v === "vendor" ||
          t.includes("total") ||
          t.includes("jumlah") ||
          v.includes("total") ||
          v.includes("jumlah") ||
          jp.includes("total") ||
          jp.includes("jumlah")
        ) {
          return false;
        }
        return true;
      })
      .map((evt) => {
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

  const saveProcurementsLocally = (newProcurements: ProcurementItem[], currentSettings = settings) => {
    setProcurements(newProcurements);
    localStorage.setItem("lighting_procurements_2026", JSON.stringify(newProcurements));

    // Calculate sum of procurement prices * amounts
    const sum = newProcurements.reduce((acc, curr) => acc + (curr.harga * curr.jumlah), 0);
    // Update the settings object
    const updatedSettings: CostSettings = {
      ...currentSettings,
      pengadaanKeseluruhanKeluar: sum
    };
    saveSettingsLocally(updatedSettings);

    // If connected to sheet, sync settings too! If not offline demo
    if (!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      handleUpdateSettingsOnSheet(updatedSettings);
    }
  };

  const handleAddProcurement = (item: Omit<ProcurementItem, "id"> & { id?: string }) => {
    const newProc: ProcurementItem = {
      ...item,
      id: item.id || "proc-" + Date.now()
    } as any;
    const updated = [...procurements, newProc];
    saveProcurementsLocally(updated);
  };

  const handleDeleteProcurement = (id: string) => {
    const updated = procurements.filter((p) => p.id !== id);
    saveProcurementsLocally(updated);
  };

  const handleUpdateEvent = (updatedEv: EventData) => {
    const updatedEvents = events.map((ev) => {
      if (ev.id === updatedEv.id) {
        return updatedEv;
      }
      return ev;
    });
    saveEventsLocally(updatedEvents);
  };

  const updateSpecificEventCost = (field: keyof EventData, value: number) => {
    if (!editingCostEvent) return;
    const updatedEv = { ...editingCostEvent, [field]: value };
    setEditingCostEvent(updatedEv);
    
    const updatedEvents = events.map((ev) => {
      if (ev.id === editingCostEvent.id) {
        return updatedEv;
      }
      return ev;
    });
    saveEventsLocally(updatedEvents);
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
      const id = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout to allow slow/cold sheets to respond

      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`Server Sheet mengembalikan status response ${res.status}`);
      }

      const rawJson = await res.json();
      if (rawJson && Array.isArray(rawJson.data)) {
        // Save events retrieved from sheet, merging existing overrides from current memory state
        const mergedData = rawJson.data.map((syncEvt: any) => {
          const localEvt = events.find((le) => le.id === syncEvt.id);
          if (localEvt) {
            return {
              ...syncEvt,
              operasionalAcara: syncEvt.operasionalAcara !== undefined ? syncEvt.operasionalAcara : localEvt.operasionalAcara,
              cashback: syncEvt.cashback !== undefined ? syncEvt.cashback : localEvt.cashback,
              cashbackDibayar: syncEvt.cashbackDibayar !== undefined ? syncEvt.cashbackDibayar : localEvt.cashbackDibayar,
              operasionalDibayar: syncEvt.operasionalDibayar !== undefined ? syncEvt.operasionalDibayar : localEvt.operasionalDibayar,
              karyawanAcara: syncEvt.karyawanAcara !== undefined ? syncEvt.karyawanAcara : localEvt.karyawanAcara,
              bensinAcara: syncEvt.bensinAcara !== undefined ? syncEvt.bensinAcara : localEvt.bensinAcara,
            };
          }
          return syncEvt;
        });
        saveEventsLocally(mergedData);

        // Save settings retrieved from sheet if present and make Google Sheets the absolute sole source of truth with fallback to current state if empty
        if (rawJson.settings) {
          const mergedSettings: CostSettings = {
            operasionalAcara: Number(rawJson.settings.operasionalAcara) || settings.operasionalAcara || DEFAULT_SETTINGS.operasionalAcara,
            cashback: Number(rawJson.settings.cashback) || settings.cashback || DEFAULT_SETTINGS.cashback,
            karyawanAcara: Number(rawJson.settings.karyawanAcara) || settings.karyawanAcara || DEFAULT_SETTINGS.karyawanAcara,
            bensinAcara: Number(rawJson.settings.bensinAcara) || settings.bensinAcara || DEFAULT_SETTINGS.bensinAcara,
            pengadaanKeseluruhanKeluar: Number(rawJson.settings.pengadaanKeseluruhanKeluar) || settings.pengadaanKeseluruhanKeluar || DEFAULT_SETTINGS.pengadaanKeseluruhanKeluar,
            partner1Name: rawJson.settings.partner1Name || settings.partner1Name || DEFAULT_SETTINGS.partner1Name,
            partner1Share: Number(rawJson.settings.partner1Share) || settings.partner1Share || DEFAULT_SETTINGS.partner1Share,
            partner2Name: rawJson.settings.partner2Name || settings.partner2Name || DEFAULT_SETTINGS.partner2Name,
            partner2Share: Number(rawJson.settings.partner2Share) || settings.partner2Share || DEFAULT_SETTINGS.partner2Share,
            kasTambahan: rawJson.settings.kasTambahan !== undefined ? Number(rawJson.settings.kasTambahan) : (settings.kasTambahan || 0),
            saldoRekeningRiil: rawJson.settings.saldoRekeningRiil !== undefined ? Number(rawJson.settings.saldoRekeningRiil) : (settings.saldoRekeningRiil || 0),
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
      if (err.name === "AbortError" || err.message?.includes("abort")) {
        console.warn("Koneksi ke Google Sheets dibatalkan (timeout/user abort). Menggunakan cache lokal.");
      } else {
        let friendlyError = err.message || "Gagal menghubungi Google Apps Script. Cek jaringan atau perizinan webapp Anda.";
        if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("failed to fetch") || err.message.toLowerCase().includes("networkerror") || err.message.toLowerCase().includes("cross-origin"))) {
          friendlyError = "Terjadi kesalahan 'Failed to Fetch' / CORS. Masalah ini biasanya diakibatkan karena URL Web App Apps Script salah, belum dideploy ulang setelah melakukan perubahan kode, atau akses perizinan 'Who has access' pada menu Deploy belum diatur ke 'Anyone' (Siapa saja).";
        }
        setSyncError(friendlyError);
      }
      // Cache Cadangan: If sync fails, load backup settings from localStorage
      const storedSettings = localStorage.getItem("lighting_settings_2026");
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setSettings(parsed);
        } catch (e) {
          // ignore
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // --- TEST CONNECTION (MAPPED FOR THE DIALOG) ---
  const handleTestConnection = async (testUrl: string) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); // 15 sec timeout for test connection
      
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
      if (e.name === "AbortError" || e.message?.includes("abort")) {
        return { success: false, message: "Koneksi timeout. Google Sheets/Apps Script lambat merespons (silakan coba hubungkan kembali)." };
      }
      let friendlyError = e.message || "Kesalahan jaringan. Pastikan URL benar.";
      if (e.message && (e.message.includes("Failed to fetch") || e.message.includes("failed to fetch") || e.message.toLowerCase().includes("networkerror") || e.message.toLowerCase().includes("cross-origin"))) {
        friendlyError = "Terjadi kesalahan 'Failed to Fetch' / CORS. Masalah ini biasanya diakibatkan karena URL Web App Apps Script salah, belum dideploy ulang setelah melakukan perubahan kode, atau akses perizinan 'Who has access' pada menu Deploy belum diatur ke 'Anyone' (Siapa saja).";
      }
      return { success: false, message: friendlyError };
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
  const handleDeleteEvent = async (id: string) => {
    // Terapkan perubahan lokal langsung terlebih dahulu agar UI responsif seketika
    const updated = events.filter((e) => e.id !== id);
    saveEventsLocally(updated);

    if (!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await fetch(appsScriptConfig.webAppUrl, {
          method: "POST",
          mode: "no-cors", // Hindari pemblokiran preflight CORS oleh Apps Script Redirect
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "deleteEvent",
            id: id,
          }),
        });

        // Tarik data terbaru setelah penghapusan berhasil agar tabel tersinkronisasi murni
        setTimeout(() => handleSyncData(), 1200);
      } catch (err: any) {
        console.error("Gagal menghapus baris dari Google Sheet:", err);
        setSyncError("Gagal menghapus data dari Google Sheet. Data dihapus lokal saja.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // --- SYNC SETTINGS TO GOOGLE SHEETS ---
  const handleUpdateSettingsOnSheet = async (updatedSettings?: CostSettings) => {
    let settingsToSync = updatedSettings;
    if (!settingsToSync) {
      const stored = localStorage.getItem("lighting_settings_2026");
      if (stored) {
        try {
          settingsToSync = JSON.parse(stored);
        } catch (e) {
          settingsToSync = settings;
        }
      } else {
        settingsToSync = settings;
      }
    }

    if (!settingsToSync) return;

    if (!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await fetch(appsScriptConfig.webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateSettings",
            settings: settingsToSync,
          }),
        });
        
        // Trigger background sync to refresh state
        setTimeout(() => handleSyncData(), 1200);
      } catch (err: any) {
        console.error("Gagal update parameter biaya ke Google Sheet:", err);
        setSyncError("Gagal memperbarui parameter biaya di Google Sheets.");
      } finally {
        setIsSyncing(false);
      }
    }
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

  // --- FILTERED EVENTS & METRICS CALCULATION ---
  const filteredEvents = events.filter((evt) => {
    if (!evt.tanggal) return false;
    const d = parseDate(evt.tanggal);
    if (isNaN(d.getTime())) return false;
    if (selectedYear === "all") return true;
    return d.getFullYear() === Number(selectedYear);
  });
  const totals = getDashboardTotals(filteredEvents, settings);
  const totalSpending = procurements.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);

  // Calculate cashback stats for the dashboard card
  const qualifyingEvents = filteredEvents.filter((evt) => {
    const pkg = (evt.jenisPaket || "").trim().toLowerCase();
    const isPresetPackage = pkg.startsWith("paket");
    const hasCustomOverride = evt.cashback !== undefined;
    return isPresetPackage || hasCustomOverride;
  });

  const sisaKasSetelahPengadaan = totals.totalKasShare + (settings.kasTambahan || 0) - totalSpending;
  let totalAccumulatedCashback = 0;
  let totalPaidCashback = 0;

  qualifyingEvents.forEach((evt) => {
    const fin = getEventFinances(evt, settings);
    totalAccumulatedCashback += fin.eventCashback;
    if (evt.cashbackDibayar) {
      totalPaidCashback += fin.eventCashback;
    }
  });

  const actualSaldo = settings.saldoRekeningRiil || 0;
  const diffSaldo = actualSaldo - sisaKasSetelahPengadaan;
  const sisaCashbackBaruForDashboard = totalAccumulatedCashback + diffSaldo - totalPaidCashback;

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/20 selection:text-blue-200 flex flex-col relative w-full overflow-x-clip">
      {/* Decorative Neon Lighting glow accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-purple-950/10 rounded-full blur-[150px] pointer-events-none decorative-glow" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[300px] bg-blue-950/10 rounded-full blur-[150px] pointer-events-none decorative-glow" />

      {/* GLOBAL HEADER BAR (DESKTOP & MOBILE) */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-[45] sticky top-0 w-full shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg outline-none transition-all cursor-pointer flex items-center justify-center border border-zinc-800/80 bg-zinc-950/40"
            title="Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-blue-500 animate-pulse" /> : <Menu className="w-5 h-5 text-blue-500" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-white/10 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-50">
              Lunova <span className="text-blue-500 font-bold">Lighting</span>
            </span>
          </div>
        </div>

        {/* Right side controls (Theme Toggle + Language switch + Database Status Alert) */}
        <div className="flex items-center gap-3">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === "en" ? "id" : "en"))}
            className="px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase text-zinc-300 hover:text-white bg-zinc-950/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 outline-none font-mono"
            title={lang === "en" ? "Switch to Indonesian" : "Ubah ke Bahasa Inggris"}
          >
            <span>🌐</span>
            <span className="text-blue-500">{lang === "en" ? "EN" : "ID"}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/40 transition-all cursor-pointer flex items-center justify-center outline-none"
            title={theme === "light" ? "Aktifkan Mode Gelap (Dark Mode)" : "Aktifkan Mode Terang (Light Mode)"}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-blue-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Database Status Alert */}
          <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className={`w-2 h-2 rounded-full ${appsScriptConfig.isDemoMode ? "bg-purple-500 animate-pulse" : "bg-blue-500"}`} />
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              {appsScriptConfig.isDemoMode ? "Mode Simulasi" : "Sheets Terhubung"}
            </span>
          </div>
        </div>
      </div>

      {/* SIDEBAR OVERLAY BACKDROP */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-40 
        transition-transform duration-300 h-screen shrink-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo / Brand header with Close Button */}
        <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Zap className="w-5 h-5 fill-white/10 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-zinc-50 block">
                Lunova <span className="text-blue-500 font-bold">Lighting</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase -mt-0.5">
                Partner Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
          {/* Dashboard (Root Navigation) */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveView("dashboard");
                setIsSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                activeView === "dashboard"
                  ? "bg-blue-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <span>{t.navDashboard}</span>
            </button>
          </div>

          {/* GROUP: DATA & OPERASIONAL */}
          {(() => {
            const isDataActive = activeView === "mitra-kinerja" || activeView === "procurement" || activeView === "cashback" || activeView === "operational";

            return (
              <div className="space-y-1">
                <button
                  onClick={() => setIsGroupDataOpen(!isGroupDataOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-150 cursor-pointer ${
                    isDataActive
                      ? "text-cyan-400 bg-cyan-600/5 border-l-2 border-cyan-500 pl-2"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 pl-2.5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Database className={`w-4 h-4 shrink-0 transition-colors ${isDataActive ? "text-cyan-400" : "text-zinc-500"}`} />
                    <span>{lang === "en" ? "DATA & OPERASIONAL" : "DATA & OPERASIONAL"}</span>
                  </div>
                  {isGroupDataOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </button>

                {isGroupDataOpen && (
                  <div className="pl-4 mt-1 space-y-0.5 border-l border-zinc-800/40 ml-5">
                    {/* Sub Item 1: Mitra Kinerja */}
                    <button
                      onClick={() => {
                        setActiveView("mitra-kinerja");
                        setIsSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        activeView === "mitra-kinerja"
                          ? "text-purple-400 bg-purple-600/10 font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        {activeView === "mitra-kinerja" ? (
                          <Circle className="w-2 h-2 fill-purple-500 text-purple-400 scale-110" />
                        ) : (
                          <Circle className="w-1.5 h-1.5 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </div>
                      <span>{t.navManageEvents}</span>
                    </button>

                    {/* Sub Item 2: Procurement */}
                    <button
                      onClick={() => {
                        setActiveView("procurement");
                        setIsSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        activeView === "procurement"
                          ? "text-cyan-400 bg-cyan-600/10 font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        {activeView === "procurement" ? (
                          <Circle className="w-2 h-2 fill-cyan-500 text-cyan-400 scale-110" />
                        ) : (
                          <Circle className="w-1.5 h-1.5 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </div>
                      <span>{lang === "en" ? "PROCUREMENT" : "PENGADAAN"}</span>
                    </button>

                    {/* Sub Item 3: Cashback */}
                    <button
                      onClick={() => {
                        setActiveView("cashback");
                        setIsSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        activeView === "cashback"
                          ? "text-amber-400 bg-amber-600/10 font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        {activeView === "cashback" ? (
                          <Circle className="w-2 h-2 fill-amber-500 text-amber-400 scale-110" />
                        ) : (
                          <Circle className="w-1.5 h-1.5 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </div>
                      <span>{t.navCashback}</span>
                    </button>

                    {/* Sub Item 4: Operational */}
                    <button
                      onClick={() => {
                        setActiveView("operational");
                        setIsSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        activeView === "operational"
                          ? "text-cyan-400 bg-cyan-600/10 font-extrabold"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        {activeView === "operational" ? (
                          <Circle className="w-2 h-2 fill-cyan-500 text-cyan-400 scale-110" />
                        ) : (
                          <Circle className="w-1.5 h-1.5 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 justify-between w-full">
                        <span>{lang === "en" ? "OPERATIONAL" : "OPERASIONAL"}</span>
                        <span className="text-[10px] bg-zinc-950/40 text-cyan-400 font-bold px-1.5 py-0.5 rounded border border-cyan-500/20 leading-none">NEW</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Root Navigation and Settings */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveView("pembagian-bulan");
                setIsSidebarOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                activeView === "pembagian-bulan"
                  ? "bg-amber-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <span>{t.navProfitSharing}</span>
            </button>

            <button
              onClick={() => {
                setActiveView("invoice");
                setIsSidebarOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                activeView === "invoice"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <span>{t.navInvoice}</span>
            </button>

            <button
              onClick={() => {
                setActiveView("settings");
                setIsSidebarOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
                activeView === "settings"
                  ? "bg-zinc-850 text-blue-400 border border-zinc-700/55"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <span>{t.navSettings}</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${appsScriptConfig.isDemoMode ? "bg-purple-550 animate-pulse" : "bg-blue-500"}`} />
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">
                Status Database
              </span>
              <span className="text-[11px] font-semibold text-zinc-300 block truncate font-mono">
                {appsScriptConfig.isDemoMode ? "Demo Mode" : "Google Sheets"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 min-w-0 relative z-10 px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
        
        {/* Sync / Connection error alert */}
        {syncError && (
          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping sink-0" />
              <span><strong>Kesalahan Sinkronisasi:</strong> {syncError}</span>
            </div>
            <button
              onClick={() => setSyncError(null)}
              className="font-bold text-neutral-500 hover:text-neutral-300 px-2 py-1 text-sm outline-none shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* VIEW CONDITIONAL RENDERING */}
        {activeView === "dashboard" && (
          <>
            {/* App Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {t.dashboardBadge}
                  </span>
                  <span className="text-zinc-400 text-xs font-mono">{t.season2026}</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
                  <span>{t.welcomePartner}</span>
                  <Sparkles className="w-6 h-6 text-blue-500 fill-blue-500/20 shrink-0 animate-pulse" />
                </h1>
                <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed font-mono">
                  {new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setActiveView("mitra-kinerja");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{t.manageBtn}</span>
                </button>
              </div>
            </div>

            {/* --- KPI STAT CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
              <StatCard
                id="kpi-pemasukan"
                title={t.kpiGrossRevenue}
                value={totals.totalRevenue}
                icon={<Wallet className="w-5 h-5" />}
                colorClass="text-blue-500"
                description={t.kpiGrossRevenueDesc}
                badgeText={`${totals.eventCount} ${t.kpiEventsCount}`}
                badgeColorClass="bg-blue-500/10 text-blue-500 border-blue-500/20"
              />

              <StatCard
                id="kpi-operational"
                title={t.kpiAvgMonthlyNet}
                value={totals.totalSisaOperasional}
                icon={<TrendingUp className="w-5 h-5" />}
                colorClass="text-emerald-400"
                description={t.kpiAvgMonthlyNetDesc}
                badgeText={lang === "en" ? "Operational" : "Operasional"}
                badgeColorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              />

              <StatCard
                id="cb-total-pending"
                title={lang === "en" ? "Remaining Pending Balance" : "Sisa Cashback (Belum Bayar)"}
                value={sisaCashbackBaruForDashboard}
                icon={<Hourglass className="w-5 h-5 text-rose-450 animate-pulse" />}
                colorClass="text-rose-450 font-semibold"
                description={
                  lang === "en" 
                    ? "Awaiting cash or bank disbursement" 
                    : "Menunggu pembayaran transfer bank / tunai"
                }
                badgeText={lang === "en" ? "Pending" : "Tertunda"}
                badgeColorClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
              />

              <StatCard
                id="proc-items-count"
                title={lang === "en" ? "Remaining Enterprise Kas" : "Sisa Kas Usaha"}
                value={totals.totalKasShare + (settings.kasTambahan || 0) - totalSpending}
                icon={<Briefcase className="w-5 h-5" />}
                colorClass="text-blue-400"
                description={
                  lang === "en" 
                    ? `Total: ${formatRupiah(totals.totalKasShare + (settings.kasTambahan || 0))} - Spent: ${formatRupiah(totalSpending)}` 
                    : `Total: ${formatRupiah(totals.totalKasShare + (settings.kasTambahan || 0))} - Belanja: ${formatRupiah(totalSpending)}`
                }
                badgeText={lang === "en" ? "Remaining" : "Sisa"}
                badgeColorClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
              />
            </div>
            {/* --- GRAPHS SECTION (Bento Box Section 1) --- */}
            <Charts events={events} settings={settings} lang={lang} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />

            {/* --- INTERACTIVE CALENDAR SCHEDULE REMINDER --- */}
            <Calendar events={filteredEvents} settings={settings} lang={lang} selectedYear={selectedYear} />
          </>
        )}

        {activeView === "mitra-kinerja" && (
          <div className="space-y-6 animate-fadeIn">
            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {lang === "en" ? "Administration & Performance" : "Administrasi & Kinerja"}
                  </span>
                  <span className="text-zinc-400 text-xs font-mono">• {lang === "en" ? "Real-time Tracking" : "Pencatatan Real-time"}</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
                  <span>{lang === "en" ? "Manage Events & Partner Performance" : "Kelola Event & Kinerja Mitra"}</span>
                </h1>
                <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
                  {lang === "en" 
                    ? "Track lighting rental transactions, analyze WO/vendor performance ranks, and manage historic logs." 
                    : "Catat transaksi penyewaan lighting, analisis ranking performa mitra WO/vendor, dan kelola histori data secara lengkap."}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsAddEventOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{t.addEventBtn}</span>
                </button>
              </div>
            </div>

            {/* Vendor/WO Performance ranking */}
            <VendorPerformance events={filteredEvents} />

            {/* Log table */}
            <EventTable
              events={filteredEvents}
              settings={settings}
              onDeleteEvent={handleDeleteEvent}
              onEditCosts={(evt) => {
                setEditingCostEvent(evt);
                setIsCostModalOpen(true);
              }}
              lang={lang}
            />
            
            {/* Formula references card */}
            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-sans">
              <div className="space-y-1">
                <span className="font-bold text-zinc-300 flex items-center gap-1">
                  <Info className="w-4 h-4 text-blue-400" />
                  {lang === "en" ? "Lighting Operations Formula:" : "Formula Keuangan Usaha Lighting:"}
                </span>
                <p className="text-zinc-400 leading-relaxed pl-5">
                  {lang === "en" ? (
                    <>
                      Net Profit = Gross Rent - [Ops ({formatRupiah(settings.operasionalAcara)}) + Cashback ({formatRupiah(settings.cashback)} <span className="text-emerald-400 font-semibold">*only package ending with 'C'*</span>)].<br />
                      Dividends: Partner 1 ({settings.partner1Name}) gets {settings.partner1Share}%, Partner 2 ({settings.partner2Name}) gets {settings.partner2Share}%, Remaining 20% goes to the company savings fund accrued minus overall equipment investments ({formatRupiah(settings.pengadaanKeseluruhanKeluar)}).
                    </>
                  ) : (
                    <>
                      Net Profit = Hasil Sewa - [Ops ({formatRupiah(settings.operasionalAcara)}) + Cashback ({formatRupiah(settings.cashback)} <span className="text-emerald-400 font-semibold">*khusus paket berakhiran 'C'*</span>)].<br />
                      Selanjutnya pembagian laba bersih: Partner 1 ({settings.partner1Name}) mendapat {settings.partner1Share}%, Partner 2 ({settings.partner2Name}) mendapat {settings.partner2Share}%, Sisanya 20% masuk ke Kas Perusahaan yang diset ke akumulasi minus biaya procurement global ({formatRupiah(settings.pengadaanKeseluruhanKeluar)}).
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
                <Cpu className="w-4 h-4" />
                <span>Usaha Lighting Core v1.0</span>
              </div>
            </div>
          </div>
        )}

        {activeView === "pembagian-bulan" && (
          <div className="space-y-6 animate-fadeIn">
            {/* View Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  {lang === "en" ? "Profit Sharing & Dividends" : "Bagi Hasil & Profit"}
                </span>
                <span className="text-zinc-400 text-xs font-mono">• {lang === "en" ? "Monthly Accrued Profit" : "Akumulasi Laba Bulanan"}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
                <span>{t.monthlySharingTitle}</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed font-sans">
                {t.monthlySharingSub}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <MonthlySharing events={filteredEvents} settings={settings} lang={lang} selectedYear={selectedYear} />
            </div>
          </div>
        )}

        {activeView === "invoice" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
            <InvoiceGenerator
              events={filteredEvents}
              settings={settings}
              onBack={() => setActiveView("dashboard")}
              lang={lang}
            />
          </div>
        )}

        {activeView === "procurement" && (
          <div className="animate-fadeIn">
            <ProcurementManagement
              procurements={procurements}
              totalKasShare={totals.totalKasShare}
              kasTambahan={settings.kasTambahan || 0}
              onUpdateKasTambahan={(val: number) => saveSettingsLocally({ ...settings, kasTambahan: val })}
              onAddProcurement={handleAddProcurement}
              onDeleteProcurement={handleDeleteProcurement}
              settings={settings}
              onUpdateSettings={saveSettingsLocally}
              lang={lang}
            />
          </div>
        )}

        {activeView === "cashback" && (
          <div className="animate-fadeIn">
            <CashbackManagement
              events={filteredEvents}
              settings={settings}
              onUpdateEvent={handleUpdateEvent}
              onUpdateSettings={saveSettingsLocally}
              lang={lang}
              procurements={procurements}
            />
          </div>
        )}

        {activeView === "operational" && (
          <div className="animate-fadeIn">
            <OperationalManagement
              events={events}
              settings={settings}
              onUpdateEvent={handleUpdateEvent}
              onUpdateSettings={saveSettingsLocally}
              lang={lang}
            />
          </div>
        )}

        {activeView === "settings" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Page Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  Sistem & Sinkronisasi
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2">
                <span>Pengaturan & Database</span>
                <Settings className="w-6 h-6 text-blue-500 stroke-[2] animate-spin-slow" />
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
                Konfigurasi tautan integrasi Google Sheets dan status sinkronisasi cloud secara realtime.
              </p>
            </div>

            {/* Google Sheets Integration Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-blue-500 shrink-0">
                    <Database className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Koneksi Google Sheets (Apps Script Web App)</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Sinkronkan data transaksi dan parameter biaya secara real-time</p>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 shrink-0">
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
                      onClick={async () => {
                        setIsSyncing(true);
                        // Post settings to sheets first, which automatically updates and triggers pulling of latest database events & settings
                        await handleUpdateSettingsOnSheet(settings);
                      }}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 active:scale-95 disabled:opacity-50 text-blue-400 border border-zinc-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
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

              <div className="text-xs space-y-2 text-zinc-400 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg">
                  <span>Status Aplikasi:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${appsScriptConfig.isDemoMode ? "bg-purple-950/40 text-purple-400 border border-purple-900/30 font-mono" : "bg-blue-950/40 text-blue-400 border border-blue-900/30 font-mono"}`}>
                    {appsScriptConfig.isDemoMode ? "DEMO OFFLINE (SIMULASI)" : "LIVE GOOGLE SHEETS"}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg">
                  <span>Web App URL:</span>
                  <span className="font-mono text-zinc-500 select-all truncate max-w-xs sm:max-w-md block" title={appsScriptConfig.webAppUrl}>
                    {appsScriptConfig.webAppUrl || "Belum Terhubung"}
                  </span>
                </div>
                {appsScriptConfig.lastSyncedAt && (
                  <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg">
                    <span>Waktu Sinkron Terakhir:</span>
                    <span className="font-mono text-zinc-300">
                      {new Date(appsScriptConfig.lastSyncedAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>
            </div>


          </div>
        )}

      </main>

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

      {/* --- COST SETTINGS MODAL (POP-UP ON DASHBOARD) --- */}
      {isCostModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    {editingCostEvent ? `Ubah Parameter Biaya: ${editingCostEvent.vendor}` : "Ubah Parameter Biaya"}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {editingCostEvent && `Mengatur parameter biaya khusus untuk acara tanggal ${editingCostEvent.tanggal}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCostModalOpen(false);
                  setEditingCostEvent(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs Form Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Standard Costs */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center justify-between">
                    <span>Biaya Tetap Per Event</span>
                    <span className="text-[10px] text-blue-400 font-mono">Row 2 & 3</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Operasional / Acara (I2)
                      </label>
                      <input
                        type="number"
                        value={editingCostEvent ? (editingCostEvent.operasionalAcara !== undefined ? editingCostEvent.operasionalAcara : settings.operasionalAcara) : 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (editingCostEvent) {
                            updateSpecificEventCost("operasionalAcara", val);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Cashback Vendor (I3)
                      </label>
                      <input
                        type="number"
                        value={editingCostEvent ? (editingCostEvent.cashback !== undefined ? editingCostEvent.cashback : settings.cashback) : 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (editingCostEvent) {
                            updateSpecificEventCost("cashback", val);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Field workers and gas */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center justify-between">
                    <span>Tenaga Kerja & Bensin</span>
                    <span className="text-[10px] text-blue-400 font-mono">Row 5 & 6</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Karyawan / Acara (I5)
                      </label>
                      <input
                        type="number"
                        value={editingCostEvent ? (editingCostEvent.karyawanAcara !== undefined ? editingCostEvent.karyawanAcara : settings.karyawanAcara) : 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (editingCostEvent) {
                            updateSpecificEventCost("karyawanAcara", val);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Bensin / Acara (I6)
                      </label>
                      <input
                        type="number"
                        value={editingCostEvent ? (editingCostEvent.bensinAcara !== undefined ? editingCostEvent.bensinAcara : settings.bensinAcara) : 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (editingCostEvent) {
                            updateSpecificEventCost("bensinAcara", val);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800/60 flex justify-end">
              <button
                onClick={() => {
                  setIsCostModalOpen(false);
                  setEditingCostEvent(null);
                }}
                className="px-5 py-2 hover:bg-zinc-800 hover:text-white active:scale-95 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
