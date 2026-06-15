/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Activity,
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
  Zap,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  ExternalLink
} from "lucide-react";

import { EventData, CostSettings, AppsScriptConfig } from "./types";
import { MOCK_EVENTS, DEFAULT_SETTINGS, getDashboardTotals, formatRupiah, parseDate } from "./utils";
import { translations } from "./translations";
import StatCard from "./components/StatCard";
import Charts, { VendorPerformance } from "./components/Charts";
import EventTable from "./components/EventTable";
import MonthlySharing from "./components/MonthlySharing";
import Calendar from "./components/Calendar";
import AddEventModal from "./components/AddEventModal";
import AppsScriptSetupModal from "./components/AppsScriptSetupModal";
import InvoiceGenerator from "./components/InvoiceGenerator";

// Google OAuth and Direct Sheets Integration
import { initAuth, googleSignIn, logoutUser } from "./lib/googleAuth";
import { createSpreadsheet, saveSpreadsheetData, fetchSpreadsheetData } from "./lib/googleSheets";

export default function App() {
  // --- STATES ---
  const [activeView, setActiveView] = useState<"dashboard" | "mitra-kinerja" | "pembagian-bulan" | "invoice" | "settings">("dashboard");
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYearStr = String(new Date().getFullYear());
    const defaultYears = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035"];
    return defaultYears.includes(currentYearStr) ? currentYearStr : "2026";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);
  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>({
    webAppUrl: "",
    isDemoMode: true,
    lastSyncedAt: null,
  });

  // --- GOOGLE OAUTH DIRECT API STATES ---
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [directSpreadsheetId, setDirectSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("lighting_direct_spreadsheet_id_2026") || "";
  });
  const [directSpreadsheetUrl, setDirectSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem("lighting_direct_spreadsheet_url_2026") || "";
  });
  const [syncType, setSyncType] = useState<"demo" | "apps_script" | "direct">(() => {
    const saved = localStorage.getItem("lighting_sync_type_2026");
    if (saved === "direct" || saved === "apps_script") return saved as "direct" | "apps_script";
    return "demo";
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
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

  // --- GOOGLE OAUTH DIRECT API SYNC ENGINE ---
  const handleSyncDirect = async (token = googleAccessToken, ssId = directSpreadsheetId) => {
    if (!token || !ssId) {
      setSyncError(lang === "en" ? "Google Token or Spreadsheet ID is missing." : "Token Google atau Spreadsheet ID belum terhubung.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const parsedData = await fetchSpreadsheetData(token, ssId, settings);
      
      // Update local storage and memory
      saveEventsLocally(parsedData.events);
      saveSettingsLocally(parsedData.settings);
      
      setAppsScriptConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error("Direct sync error:", err);
      let msg = err.message || "Failed to load spreadsheet data.";
      if (msg.includes("403") || msg.includes("Permission denied")) {
        msg = lang === "en" 
          ? "Permission denied. Please ensure you are logged in with the Google Account that owns this spreadsheet."
          : "Akses ditolak. Pastikan Anda log in dengan Akun Google yang memiliki spreadsheet ini.";
      } else if (msg.includes("401")) {
        msg = lang === "en"
          ? "Session expired. Please log in with Google again."
          : "Hulu sesi berakhir. Silakan masuk kembali dengan Google.";
      }
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
        if (syncType === "direct" && directSpreadsheetId) {
          await handleSyncDirect(result.accessToken, directSpreadsheetId);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "Failed to Sign-In with Google.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setGoogleUser(null);
      setGoogleAccessToken(null);
      setSyncType("demo");
      localStorage.setItem("lighting_sync_type_2026", "demo");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateAndConnectDirectSheet = async () => {
    let token = googleAccessToken;
    let user = googleUser;

    if (!token) {
      try {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
          user = result.user;
          setGoogleUser(user);
          setGoogleAccessToken(token);
        } else {
          return;
        }
      } catch (err: any) {
        alert(`Gagal Login Google: ${err.message}`);
        return;
      }
    }

    if (!token) return;

    setIsSyncing(true);
    setSyncError(null);
    try {
      const title = `Dashboard Usaha Lighting - ${user?.displayName || user?.email || "Mitra"} - 2026`;
      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(token, title);

      setDirectSpreadsheetId(spreadsheetId);
      setDirectSpreadsheetUrl(spreadsheetUrl);
      localStorage.setItem("lighting_direct_spreadsheet_id_2026", spreadsheetId);
      localStorage.setItem("lighting_direct_spreadsheet_url_2026", spreadsheetUrl);

      // Seed current transactional info & setups
      await saveSpreadsheetData(token, spreadsheetId, events, settings);

      setSyncType("direct");
      localStorage.setItem("lighting_sync_type_2026", "direct");

      setAppsScriptConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));

      alert(lang === "en" 
        ? "Google Sheet auto-created and linked successfully!" 
        : "Google Sheet otomatis berhasil dibuat dan dihubungkan!"
      );
    } catch (err: any) {
      console.error("Direct sheet creation / upload failure:", err);
      setSyncError(err.message || "Failed to create or upload template sheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
        if (syncType === "direct" && directSpreadsheetId) {
          handleSyncDirect(token, directSpreadsheetId);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
        if (syncType === "direct") {
          setSyncType("demo");
          localStorage.setItem("lighting_sync_type_2026", "demo");
        }
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncType, directSpreadsheetId]);

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
              operasionalAcara: localEvt.operasionalAcara,
              cashback: localEvt.cashback,
              karyawanAcara: localEvt.karyawanAcara,
              bensinAcara: localEvt.bensinAcara,
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
    const updated = [eventWithId, ...events];

    // Local state is the fast optimistic update
    saveEventsLocally(updated);

    if (syncType === "direct" && googleAccessToken && directSpreadsheetId) {
      try {
        setIsSyncing(true);
        await saveSpreadsheetData(googleAccessToken, directSpreadsheetId, updated, settings);
        setTimeout(() => handleSyncDirect(googleAccessToken, directSpreadsheetId), 500);
        return true;
      } catch (err: any) {
        console.error("Gagal Posting data ke Google Sheet:", err);
        setSyncError(`Transaksi tersimpan lokal, namun gagal disinkronkan ke Google Sheet: ${err.message}`);
        return true;
      } finally {
        setIsSyncing(false);
      }
    } else if (syncType === "apps_script" && !appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
      // POST to Google Sheets via Apps Script Web App
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

        // Trigger background sync to get fully formatted numbers
        setTimeout(() => handleSyncData(), 1200);
        return true;
      } catch (err) {
        console.error("Gagal Posting data ke GAS:", err);
        alert("Gagal mengirim data ke Google Sheet. Kami menyimpannya secara lokal di web.");
        return true;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Demo Mode: Save locally (already processed above)
      return true;
    }
  };

  // --- DELETE TRANSAKSI ---
  const handleDeleteEvent = async (id: string) => {
    // Terapkan perubahan lokal langsung terlebih dahulu agar UI responsif seketika
    const updated = events.filter((e) => e.id !== id);
    saveEventsLocally(updated);

    if (syncType === "direct" && googleAccessToken && directSpreadsheetId) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await saveSpreadsheetData(googleAccessToken, directSpreadsheetId, updated, settings);
        setTimeout(() => handleSyncDirect(googleAccessToken, directSpreadsheetId), 500);
      } catch (err: any) {
        console.error("Gagal menghapus secara langsung dari Google Sheet:", err);
        setSyncError(`Gagal memperbarui Google Sheet setelah baris terhapus: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
    } else if (syncType === "apps_script" && !appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
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

    if (syncType === "direct" && googleAccessToken && directSpreadsheetId) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await saveSpreadsheetData(googleAccessToken, directSpreadsheetId, events, settingsToSync);
        setTimeout(() => handleSyncDirect(googleAccessToken, directSpreadsheetId), 500);
      } catch (err: any) {
        console.error("Gagal update parameter biaya ke Google Sheet secara langsung:", err);
        setSyncError(`Gagal memperbarui parameter biaya di Google Sheets: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
    } else if (syncType === "apps_script" && !appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl) {
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
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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

          <button
            onClick={() => {
              setActiveView("mitra-kinerja");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-150 cursor-pointer ${
              activeView === "mitra-kinerja"
                ? "bg-purple-600 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <span>{t.navManageEvents}</span>
          </button>

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
                ? "bg-zinc-850 text-blue-400 border border-zinc-700/50"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
            }`}
          >
            <span>{t.navSettings}</span>
          </button>
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
                value={totals.averageMonthlyNetProfit}
                icon={<TrendingUp className="w-5 h-5" />}
                colorClass="text-emerald-400"
                description={t.kpiAvgMonthlyNetDesc}
                badgeText={`${totals.uniqueMonthsCount} ${t.kpiMonthsCount}`}
                badgeColorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              />

              <StatCard
                id="kpi-profit"
                title={t.kpiTotalNetProfit}
                value={totals.totalCashback}
                icon={<Coins className="w-5 h-5" />}
                colorClass="text-purple-400"
                description={t.kpiTotalNetProfitDesc}
                badgeText={t.kpiRemainingProfit}
                badgeColorClass="bg-purple-500/10 text-purple-400 border-purple-500/20"
              />

              <StatCard
                id="kpi-kas"
                title={t.kpiOverhead}
                value={totals.finalKas}
                icon={<Layers className="w-5 h-5" />}
                colorClass="text-cyan-400"
                description={t.kpiOverheadDesc}
                badgeText="Kas"
                badgeColorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-900/35 text-blue-400 shrink-0">
                    <Database className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Integrasi Cloud Google Sheets</h3>
                    <p className="text-xs text-zinc-450 mt-1">Metode pencatatan data transaksi dan sinkronisasi parameter biaya secara real-time</p>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex p-0.5 bg-zinc-950 rounded-xl border border-zinc-800 self-start md:self-auto">
                  <button
                    onClick={() => {
                      setSyncType("direct");
                      localStorage.setItem("lighting_sync_type_2026", "direct");
                      if (googleAccessToken && directSpreadsheetId) {
                        handleSyncDirect(googleAccessToken, directSpreadsheetId);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      syncType === "direct"
                        ? "bg-blue-600 text-white shadow-md font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Otomatis (Direct API)
                  </button>
                  <button
                    onClick={() => {
                      setSyncType("apps_script");
                      localStorage.setItem("lighting_sync_type_2026", "apps_script");
                      if (appsScriptConfig.webAppUrl) {
                        const updated = { ...appsScriptConfig, isDemoMode: false };
                        setAppsScriptConfig(updated);
                        localStorage.setItem("lighting_gas_config_2026", JSON.stringify(updated));
                        handleSyncData(appsScriptConfig.webAppUrl);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      syncType === "apps_script"
                        ? "bg-blue-600 text-white shadow-md font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Manual (Apps Script)
                  </button>
                  <button
                    onClick={() => {
                      setSyncType("demo");
                      localStorage.setItem("lighting_sync_type_2026", "demo");
                      const updated = { ...appsScriptConfig, isDemoMode: true };
                      setAppsScriptConfig(updated);
                      localStorage.setItem("lighting_gas_config_2026", JSON.stringify(updated));
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      syncType === "demo"
                        ? "bg-blue-600 text-white shadow-md font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Simulasi Offline
                  </button>
                </div>
              </div>

              {/* Direct API Mode UI */}
              {syncType === "direct" && (
                <div className="space-y-4">
                  {!googleUser ? (
                    <div className="flex flex-col items-center text-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                      <Cloud className="w-10 h-10 text-zinc-500 stroke-[1.5]" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-200">Hubungkan Akun Google Anda</p>
                        <p className="text-xs text-zinc-450 max-w-sm">
                          Sambungkan Google Drive & Sheets untuk membuat spreadsheet otomatis tanpa perantara server atau script rumit.
                        </p>
                      </div>
                      <button
                        onClick={handleGoogleLogin}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-900/10 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span>Sign In dengan Google</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Account Status */}
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                          {googleUser.photoURL ? (
                            <img
                              src={googleUser.photoURL}
                              alt="Profile"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full border border-blue-500/30"
                            />
                          ) : (
                            <span className="p-2.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900">
                              <User className="w-5 h-5" />
                            </span>
                          )}
                          <div>
                            <p className="text-xs font-medium text-zinc-450">Akun Terhubung:</p>
                            <p className="text-sm font-bold text-zinc-200">{googleUser.displayName || "Google User"}</p>
                            <p className="text-xs text-zinc-500 font-mono">{googleUser.email}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleGoogleLogout}
                            className="text-xs font-semibold text-red-400 hover:text-red-350 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Disconnect Akun
                          </button>
                        </div>
                      </div>

                      {/* Right: Spreadsheet Status */}
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col justify-between">
                        {directSpreadsheetId ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-medium text-zinc-450">Google Spreadsheet Terhubung:</p>
                              <p className="text-sm font-bold text-zinc-200 truncate mt-0.5">Dashboard Usaha Lighting 2026</p>
                              <span className="inline-block mt-1 font-mono text-[10px] bg-blue-950/50 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded">
                                ID: {directSpreadsheetId.substring(0, 12)}...
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <a
                                href={directSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${directSpreadsheetId}/edit`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950 text-blue-450 hover:text-white border border-blue-900/40 hover:bg-blue-900/30 rounded-lg text-xs font-semibold transition-all"
                              >
                                <span>Buka Excel Sheet</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleSyncDirect()}
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-zinc-250 border border-zinc-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                <span>{isSyncing ? "Sinkron..." : "Sinkron Sekarang"}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 my-auto py-2 flex flex-col items-center text-center">
                            <p className="text-xs text-zinc-450 max-w-xs">
                              Anda berhasil login! Klik di bawah untuk secara otomatis membuat spreadsheet siap pakai di Google Drive Anda.
                            </p>
                            <button
                              onClick={handleCreateAndConnectDirectSheet}
                              disabled={isSyncing}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>{isSyncing ? "Membuat..." : "Buat Spreadsheet Baru"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Apps Script Mode UI */}
              {syncType === "apps_script" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-200">Kustomisasi URL Apps Script Web App</p>
                      <p className="text-[11px] text-zinc-450">Sinkronkan database memakai Google Apps Script Web App eksternal.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!appsScriptConfig.isDemoMode && appsScriptConfig.webAppUrl && (
                        <button
                          onClick={async () => {
                            setIsSyncing(true);
                            await handleUpdateSettingsOnSheet(settings);
                          }}
                          disabled={isSyncing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-blue-400 border border-zinc-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          <span>{isSyncing ? "Menyelaras..." : "Sinkron"}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsSetupGasOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <CloudLightning className="w-3.5 h-3.5 text-white" />
                        <span>{appsScriptConfig.webAppUrl ? "Ubah Web App URL" : "Hubungkan Web App"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 text-zinc-450 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg">
                      <span>Status Aplikasi:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/40 text-blue-400 border border-blue-900/30 font-mono">
                        LIVE APPS SCRIPT WEB APP
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg">
                      <span>Web App URL:</span>
                      <span className="font-mono text-zinc-500 select-all truncate max-w-xs sm:max-w-md block" title={appsScriptConfig.webAppUrl}>
                        {appsScriptConfig.webAppUrl || "Belum Terhubung"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Offline/Demo Mode UI */}
              {syncType === "demo" && (
                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl text-center space-y-2">
                  <WifiOff className="w-8 h-8 text-zinc-550 mx-auto stroke-[1.5]" />
                  <p className="text-sm font-semibold text-zinc-200">Mode Simulasi Offline Aktif</p>
                  <p className="text-xs text-zinc-450 max-w-md mx-auto">
                    Data transaksi dan biaya disimpan secara lokal di web browser saat ini (localStorage). Data Anda sepenuhnya aman secara lokal namun tidak disinkronkan ke cloud.
                  </p>
                </div>
              )}

              {/* Common Status Overlay */}
              {appsScriptConfig.lastSyncedAt && syncType !== "demo" && (
                <div className="text-xs text-zinc-500 text-right">
                  Waktu Sinkron Terakhir: <span className="font-mono text-zinc-400">{new Date(appsScriptConfig.lastSyncedAt).toLocaleString("id-ID")}</span>
                </div>
              )}
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

              {/* Reset Option Footer */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-zinc-800/60 pt-4 mt-2">
                <div className="text-xs text-zinc-400 font-sans">
                  <span className="text-zinc-400">
                    Mengubah biaya untuk baris ini saja. Set parameters kustom Anda di atas.
                  </span>
                </div>
                {editingCostEvent && (
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 hover:text-white text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-all cursor-pointer font-sans shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Hapus Kustomisasi (Ikut Default Sistem)
                    </span>
                  </button>
                )}
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

      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setIsResetConfirmOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 animate-scaleUp space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-100 font-sans">
                Hapus Kustomisasi
              </h3>
            </div>
            
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Apakah Anda yakin ingin menghapus semua parameter kustomisasi biaya untuk event ini dan mengembalikan ke parameter default sistem?
            </p>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (editingCostEvent) {
                    const updatedEvents = events.map((ev) => {
                      if (ev.id === editingCostEvent.id) {
                        const updatedEv = { ...ev };
                        delete updatedEv.operasionalAcara;
                        delete updatedEv.cashback;
                        delete updatedEv.karyawanAcara;
                        delete updatedEv.bensinAcara;
                        return updatedEv;
                      }
                      return ev;
                    });
                    saveEventsLocally(updatedEvents);
                    setEditingCostEvent(null);
                    setIsCostModalOpen(false);
                  }
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Setel Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
