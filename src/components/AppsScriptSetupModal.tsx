/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Copy, Check, ExternalLink, HelpCircle, RefreshCw, Sparkles, X } from "lucide-react";

interface AppsScriptSetupModalProps {
  webAppUrl: string;
  onSaveUrl: (url: string) => void;
  onClose: () => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string; dataCount?: number }>;
}

export default function AppsScriptSetupModal({
  webAppUrl,
  onSaveUrl,
  onClose,
  onTestConnection,
}: AppsScriptSetupModalProps) {
  const [urlInput, setUrlInput] = useState(webAppUrl);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"guide" | "code" | "test">("guide");

  const appsScriptCode = `/**
 * Google Apps Script untuk Dashboard Usaha Lighting 2026
 * Salin kode ini ke Spreadsheet Anda (Ekstensi > Apps Script)
 * Terapkan (Deploy) sebagai Web App dengan Akses: "Siapa saja" (Anyone)
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Deteksi sheet "Pengisian data"
  var sheet = ss.getSheetByName("Pengisian data") || ss.getSheets()[0];
  
  if (!sheet) {
    return createJsonResponse({ error: "Sheet tidak ditemukan!" });
  }
  
  var values = sheet.getDataRange().getValues();
  var data = [];
  
  // Rincian Transaksi dimulai dari baris ke-1 (setelah header di baris ke-0)
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row) continue;
    
    // Abaikan baris kosong, baris penampung format template, atau baris Total/Jumlah
    var dateStr = String(row[0] || "").trim().toLowerCase();
    var jenisPaketStr = String(row[1] || "").trim().toLowerCase();
    var vendorStr = String(row[2] || "").trim().toLowerCase();
    
    if (
      dateStr === "" || dateStr === "dd/mm/yyyy" || dateStr === "tanggal" || 
      dateStr.indexOf("total") !== -1 || dateStr.indexOf("jumlah") !== -1 ||
      jenisPaketStr.indexOf("total") !== -1 || jenisPaketStr.indexOf("jumlah") !== -1 ||
      vendorStr === "vendor/wo" || vendorStr === "vendor" ||
      vendorStr.indexOf("total") !== -1 || vendorStr.indexOf("jumlah") !== -1
    ) {
      continue;
    }
    
    var tanggalStr = "";
    if (row[0] instanceof Date) {
      var d = row[0];
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      tanggalStr = yyyy + "-" + mm + "-" + dd;
    } else {
      tanggalStr = String(row[0]).trim();
    }
    
    var jenisPaket = String(row[1] || "").trim();
    var pemasukanVal = parseRupiahValue(row[5]);
    
    // Fallback harga default jika pemasukan kosong (0) dan ada jenis paket terpilih
    if (pemasukanVal === 0 && jenisPaket) {
      var packagePriceMap = {
        "paket 1": 1500000,
        "paket 1 c": 1500000,
        "paket 2": 2750000,
        "paket 2 c": 2750000,
        "paket 3": 3500000,
        "paket 3 c": 3500000
      };
      var pkgKey = jenisPaket.toLowerCase();
      if (packagePriceMap[pkgKey] !== undefined) {
        pemasukanVal = packagePriceMap[pkgKey];
      }
    }
    
    // Baca kustomisasi biaya per acara langsung dari kolom H, I, J, K pada baris bersangkutan
    var overrideOperasional = parseRupiahValue(row[7]);
    var overrideCashback = parseRupiahValue(row[8]);
    var overrideKaryawan = parseRupiahValue(row[9]);
    var overrideBensin = parseRupiahValue(row[10]);
    
    data.push({
      id: "evt-" + i,
      tanggal: tanggalStr,
      jenisPaket: jenisPaket,
      vendor: String(row[2] || "").trim(),
      lokasi: String(row[3] || "").trim(),
      noHp: String(row[4] || "").trim(),
      pemasukan: pemasukanVal,
      operasionalAcara: overrideOperasional,
      cashback: overrideCashback,
      karyawanAcara: overrideKaryawan,
      bensinAcara: overrideBensin
    });
  }
  
  // Ambil parameter default biaya global & porsi bagi hasil dari sheet
  var settings = {
    operasionalAcara: parseRupiahValue(sheet.getRange("H2").getValue()) || 300000,
    cashback: parseRupiahValue(sheet.getRange("I2").getValue()) || 100000,
    karyawanAcara: parseRupiahValue(sheet.getRange("J2").getValue()) || 250000,
    bensinAcara: parseRupiahValue(sheet.getRange("K2").getValue()) || 25000,
    pengadaanKeseluruhanKeluar: 340000,
    partner1Name: String(sheet.getRange("O2").getValue() || "Neovan").trim(),
    partner1Share: parsePercentageValue(sheet.getRange("N2").getValue(), 40),
    partner2Name: String(sheet.getRange("O3").getValue() || "Surya").trim(),
    partner2Share: parsePercentageValue(sheet.getRange("N3").getValue(), 40)
  };
  
  return createJsonResponse({
    success: true,
    data: data,
    settings: settings,
    lastUpdated: new Date().toISOString(),
    isDemoMode: false,
    lastSyncedAt: new Date().toISOString()
  });
}
 
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Gunakan satu sheet target yang sama untuk seluruh operasi ("Pengisian data")
  var sheet = ss.getSheetByName("Pengisian data") || ss.getSheets()[0];
  
  if (!sheet) {
    return createJsonResponse({ success: false, error: "Sheet tidak ditemukan!" });
  }
  
  try {
    var params = JSON.parse(e.postData.contents);
    
    // 1. UPDATE SETTINGS
    if (params.action === "updateSettings") {
      var s = params.settings;
      if (s) {
        // Tulis parameter default ke baris 2
        if (s.operasionalAcara !== undefined) sheet.getRange("H2").setValue(Number(s.operasionalAcara));
        if (s.cashback !== undefined) sheet.getRange("I2").setValue(Number(s.cashback));
        if (s.karyawanAcara !== undefined) sheet.getRange("J2").setValue(Number(s.karyawanAcara));
        if (s.bensinAcara !== undefined) sheet.getRange("K2").setValue(Number(s.bensinAcara));
        
        // Update porsi & nama mitra secara seragam di 12 bulan (M, N, O dari baris 2 s.d 25)
        if (s.partner1Name !== undefined) {
          for (var m = 0; m < 12; m++) {
            sheet.getRange("O" + (2 * m + 2)).setValue(String(s.partner1Name));
          }
        }
        if (s.partner1Share !== undefined) {
          for (var m = 0; m < 12; m++) {
            sheet.getRange("N" + (2 * m + 2)).setValue(Number(s.partner1Share) / 100);
          }
        }
        
        if (s.partner2Name !== undefined) {
          for (var m = 0; m < 12; m++) {
            sheet.getRange("O" + (2 * m + 3)).setValue(String(s.partner2Name));
          }
        }
        if (s.partner2Share !== undefined) {
          for (var m = 0; m < 12; m++) {
            sheet.getRange("N" + (2 * m + 3)).setValue(Number(s.partner2Share) / 100);
          }
        }
        
        return createJsonResponse({ success: true, message: "Pengaturan berhasil diperbarui!" });
      }
      return createJsonResponse({ success: false, error: "Data pengaturan kosong!" });
    }
    
    // 2. DELETE EVENT
    if (params.action === "deleteEvent") {
      var eventId = params.id;
      if (eventId && eventId.indexOf("evt-") === 0) {
        var rowIdx = parseInt(eventId.replace("evt-", ""), 10);
        if (rowIdx > 0 && rowIdx + 1 <= sheet.getLastRow()) {
          sheet.deleteRow(rowIdx + 1);
          return createJsonResponse({ success: true, message: "Transaksi berhasil dihapus!" });
        }
      }
      return createJsonResponse({ success: false, error: "ID transaksi tidak valid." });
    }
    
    // 3. ADD NEW TRANSACTION (APPEND TO TABLE 1 / FIRST SHEET)
    var inputDate = params.tanggal ? new Date(params.tanggal) : new Date();
    var jenisPaket = params.jenisPaket || "";
    var vendor = params.vendor || "";
    var lokasi = params.lokasi || "";
    var noHp = params.noHp || "";
    var pemasukan = Number(params.pemasukan) || 0;
    
    // Tarik setting bawaan untuk langsung diisi ke baris baru ini
    var defaultOperasional = parseRupiahValue(sheet.getRange("H2").getValue()) || 300000;
    var defaultCashback = parseRupiahValue(sheet.getRange("I2").getValue()) || 100000;
    var defaultKaryawan = parseRupiahValue(sheet.getRange("J2").getValue()) || 250000;
    var defaultBensin = parseRupiahValue(sheet.getRange("K2").getValue()) || 25000;
    
    var operasional = params.operasionalAcara !== undefined ? Number(params.operasionalAcara) : defaultOperasional;
    var cashback = params.cashback !== undefined ? Number(params.cashback) : defaultCashback;
    var karyawan = params.karyawanAcara !== undefined ? Number(params.karyawanAcara) : defaultKaryawan;
    var bensin = params.bensinAcara !== undefined ? Number(params.bensinAcara) : defaultBensin;
    
    // Appending row with spacer column G, operasional H, cashback I, karyawan J, bensin K
    sheet.appendRow([
      inputDate,
      jenisPaket,
      vendor,
      lokasi,
      noHp,
      pemasukan,
      "",          // Spacer Kolom G
      operasional, // Kolom H
      cashback,    // Kolom I
      karyawan,    // Kolom J
      bensin       // Kolom K
    ]);
    
    return createJsonResponse({ success: true, message: "Transaksi baru berhasil ditambahkan!" });
    
  } catch(err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

// Fungsi pembantu parsing mata uang Rupiah
function parseRupiahValue(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var cl = String(val).replace(/[^0-9,-]/g, '');
  if (cl.indexOf(',') !== -1) cl = cl.split(',')[0];
  return parseInt(cl, 10) || 0;
}

// Fungsi pembantu parsing persentase pembagian mitra
function parsePercentageValue(val, fallback) {
  if (typeof val === 'number') {
    return val <= 1 ? Math.round(val * 100) : val;
  }
  if (!val) return fallback;
  var parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? fallback : parsed;
}

// Membuat response JSON dengan kustomisasi perizinan CORS lengkap
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Menghindari error pemicu bawaan Google Sheet seandainya trigger myFunction lama masih terdaftar
function myFunction() {
  Logger.log("Aplikasi terhubung dengan sukses!");
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!urlInput.trim()) {
      setTestResult({ success: false, message: "URL Web App Google Apps Script tidak boleh kosong!" });
      return;
    }
    if (!urlInput.startsWith("https://script.google.com/")) {
      setTestResult({ success: false, message: "URL tidak valid. Harus dimulai dengan 'https://script.google.com/'" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(urlInput);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Koneksi Berhasil! Terhubung ke Google Sheet. Berhasil membaca ${res.dataCount} baris data transaksi.`,
        });
      } else {
        setTestResult({ success: false, message: res.message });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: "Gagal terhubung. Pastikan Web App Anda di-deploy dengan akses 'Anyone' (Siapa saja) dan URL benar.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveUrl(urlInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 sticky top-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-zinc-100">Koneksi Google Sheets via Apps Script</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40 font-sans">
          <button
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-all ${
              activeTab === "guide"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            1. Panduan Setup
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-all ${
              activeTab === "code"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            2. Kode Apps Script
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-all ${
              activeTab === "test"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            3. Hubbard & Tes Koneksi
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl text-blue-300 text-sm flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-100 mb-1">Mengapa menggunakan Google Apps Script?</h4>
                  <p className="text-zinc-300">
                    Apps Script memungkinkan aplikasi web memuat data langsung dari Google Spreadsheet Anda secara real-time dan aman tanpa perlu mengurus sistem server web atau Firebase tambahan. Anda memegang kendali data sepenuhnya!
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-zinc-200 mt-2">Langkah Setup Google Spreadsheet & Apps Script:</h3>
              <ol className="space-y-4 text-sm text-zinc-300 list-decimal pl-5">
                <li>
                  <p className="font-medium text-zinc-200">Siapkan Spreadsheet Anda</p>
                  <p className="text-zinc-400 mt-0.5">
                    Pastikan spreadsheet Anda memiliki sheet bernama <strong className="text-blue-400">"Pengisian data"</strong> dengan layout kolom persis seperti di gambar: kolom A: Tanggal, B: Jenis Paket, C: Vendor/WO, D: Lokasi, E: No. Handphone / WA, F: Pemasukan/Event.
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-200">Ubah Parameter Biaya & Bagi Hasil</p>
                  <p className="text-zinc-400 mt-0.5 font-sans leading-relaxed text-xs">
                    Spreadsheet Anda memiliki pengaturan yang terintegrasi secara otomatis:<br />
                    - <strong>Kolom A - F:</strong> Rincian Data Transaksi (A: Tanggal, B: Jenis Paket, C: Vendor/WO, D: Lokasi, E: No. Handphone / WA, F: Pemasukan/Event).<br />
                    - <strong>Kolom H - K:</strong> Parameter biaya per-acara (H: Operasional / acara, I: Cashback, J: Karyawan / acara, K: Bensin / acara). Baris pertama diisi sebagai basis bawaan saat input baru.<br />
                    - <strong>Kolom M - O (Bagi Hasil):</strong> Pengaturan nama mitra & persentase bagi hasil per-bulan (Baris 2-25 diisi untuk 12 Bulan, dengan row genap untuk Partner 1 dan ganjil untuk Partner 2).<br />
                    - Pembagian porsi bersih akan langsung terhitung secara otomatis di web berdasarkan pencantuman data per-baris spreadsheet ini.
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-200">Membuka Apps Script</p>
                  <p className="text-zinc-400 mt-0.5">
                    Di Google Spreadsheet Anda, klik menu <strong className="text-zinc-200">Ekstensi &gt; Apps Script</strong>.
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-200">Tempelkan Kode & Simpan</p>
                  <p className="text-zinc-400 mt-0.5">
                    Buka tab <strong>"2. Kode Apps Script"</strong> di atas, ketuk tombol <strong>"Salin Kode"</strong>, lalu tempelkan (replace semua kode bawaan) di editor Apps Script Anda. Klik ikon 💾 (Simpan) di atas editor.
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-205">Terapkan Sebagai Aplikasi Web (Deploy)</p>
                  <p className="text-zinc-400 mt-0.5">
                    - Klik tombol <strong className="text-zinc-100">Terapkan (Deploy) &gt; Penerapan Baru (New Deployment)</strong>.<br />
                    - Pilih Jenis Penerapan: <strong className="text-zinc-100">Aplikasi Web (Web App)</strong>.<br />
                    - Deskripsi: <code>Dashboard Lighting 2026</code>.<br />
                    - Jalankan sebagai (Execute as): <strong className="text-blue-400">Saya (Email Anda)</strong>.<br />
                    - Siapa yang memiliki akses (Who has access): <strong className="text-blue-405">Siapa saja (Anyone)</strong>.<br />
                    - Klik <strong className="text-zinc-100">Terapkan / Deploy</strong>, setujui izin keamanan Google (klik Advanced &gt; Go to ... (unsafe) jika muncul).
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-200">Salin URL Aplikasi Web</p>
                  <p className="text-zinc-400 mt-0.5">
                    Setelah berhasil dideploy, Google akan memberikan <strong className="text-blue-400 font-bold">URL Web App</strong> yang diakhiri dengan <code>/exec</code>. Salin URL tersebut dan buka tab <strong>"3. Hubbard & Tes Koneksi"</strong> di modal ini untuk mengaktifkannya!
                  </p>
                </li>
              </ol>
              <div className="flex justify-end pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Buka Kode Apps Script &gt;
                </button>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-200">Script Integrasi Google Sheets</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Modul JSON API dua arah (bisa ditarik datanya, dan mendukung tambah baris baru).
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-805 hover:bg-zinc-700 active:scale-95 text-xs text-zinc-200 font-medium rounded-lg border border-zinc-700 transition-all cursor-pointer font-sans"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-blue-450" />
                      <span className="text-blue-450">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-zinc-950 rounded-xl overflow-x-auto text-xs text-zinc-300 font-mono border border-zinc-800 max-h-[350px] leading-relaxed">
                  {appsScriptCode}
                </pre>
                <div className="absolute top-2 right-2 flex items-center justify-center pointer-events-none opacity-20">
                  <span className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">
                    javascript / gs
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-zinc-500">
                  Tip: Pastikan tidak merubah nama sheet "Pengisian data" agar kode berfungsi dengan baik.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("test")}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-md cursor-pointer font-sans"
                >
                  Langkah Terakhir &gt;
                </button>
              </div>
            </div>
          )}

          {activeTab === "test" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-200">
                  Masukkan URL Web App Google Apps Script
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.................../exec"
                    className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors font-mono"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-blue-450 border border-zinc-750 rounded-xl text-sm font-semibold transition-all cursor-pointer font-sans"
                  >
                    <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
                    {testing ? "Menghubungkan..." : "Tes Koneksi"}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border border-transparent text-sm flex items-start gap-2.5 ${
                    testResult.success
                      ? "bg-blue-950/20 border-blue-950 text-blue-300"
                      : "bg-red-950/25 border-red-950 text-red-350"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${testResult.success ? "bg-blue-400" : "bg-red-400"}`} />
                  <div>
                    <h5 className="font-semibold">{testResult.success ? "Koneksi Berhasil!" : "Gagal Terhubung"}</h5>
                    <p className="text-xs text-zinc-200 mt-1 leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-850 space-y-2">
                <h4 className="text-xs font-semibold text-zinc-450 uppercase tracking-widest">Informasi Penting</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  - Jika url diganti atau dihapus, Anda dapat kembali ke **Mode Simulasi (Demo)** sewaktu-waktu.<br />
                  - Dashboard akan secara otomatis memformat data rupiah, menghitung bagi hasil dari total event, dan melacak data transaksi Anda langsung dari baris spreadsheet Anda.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput("");
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
                >
                  Reset / Hapus URL
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Simpan & Terapkan Koneksi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
