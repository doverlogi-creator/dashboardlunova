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
 * Saling kode ini ke Spreadsheet Anda (Ekstensi > Apps Script)
 * Publish sebagai Web App (Aplikasi Web) dengan akses: "Siapa saja" (Anyone)
 */

function doGet(e) {
  // Ambil sheet aktif dengan nama "Raw_Data", "raw_data", "raw data", "Raw Data", "Pengisian data", atau sheet pertama
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Raw_Data") || ss.getSheetByName("raw_data") || ss.getSheetByName("raw data") || ss.getSheetByName("Raw Data") || ss.getSheetByName("Pengisian data") || ss.getSheets()[0];
  
  if (!sheet) {
    return createJsonResponse({ error: "Sheet 'Raw_Data', 'raw data', atau 'Pengisian data' tidak ditemukan!" });
  }
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  // Baca daftar paket dari kolom H & I di sheet (jika ada) untuk fallback otomatis
  var packagePriceMap = {
    "paket 1": 1500000,
    "paket 1 c": 1500000,
    "paket 2": 2750000,
    "paket 2 c": 2750000,
    "paket 3": 3500000,
    "paket 3 c": 3500000
  };
  
  for (var r = 1; r < Math.min(10, values.length); r++) {
    if (values[r] && values[r][7] !== undefined && values[r][8] !== undefined) {
      var pName = String(values[r][7]).trim().toLowerCase();
      var pPrice = parseRupiahValue(values[r][8]);
      if (pName && pPrice > 0) {
        packagePriceMap[pName] = pPrice;
      }
    }
  }
  
  // Ambil data event dari tabel utama (Kolom A s/d F)
  var data = [];
  // Baris ke-0 adalah Header (Tanggal | Jenis Paket | Vendor/WO | Lokasi | No. Handphone / WA | Pemasukan/Event)
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // Abaikan baris kosong jika kolom Tanggal dan Jenis Paket kosong
    if (!row[0] && !row[1]) continue;
    
    // Format tanggal ke format aman string YYYY-MM-DD atau gunakan nilai mentah
    var tanggalStr = "";
    if (row[0] instanceof Date) {
      var d = row[0];
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      tanggalStr = yyyy + "-" + mm + "-" + dd;
    } else {
      tanggalStr = String(row[0]);
    }
    
    var jenisPaket = String(row[1] || "");
    
    // Ambil nilai pemasukan dan bersihkan jika berupa string
    var pemasukanRaw = row[5];
    var pemasukanVal = 0;
    if (typeof pemasukanRaw === 'number') {
      pemasukanVal = pemasukanRaw;
    } else if (pemasukanRaw) {
      // Hilangkan "Rp", titik, koma untuk parsing angka
      var cleanStr = String(pemasukanRaw).replace(/[^0-9,-]/g, '');
      // jika ada koma desimal, potong ke kiri
      if (cleanStr.indexOf(',') !== -1) {
        cleanStr = cleanStr.split(',')[0];
      }
      pemasukanVal = parseInt(cleanStr, 10) || 0;
    }
    
    // Fallback otomatis jika pemasukan bernilai 0 namun jenis paket terdaftar
    if (pemasukanVal === 0 && jenisPaket) {
      var pkgKey = jenisPaket.trim().toLowerCase();
      if (packagePriceMap[pkgKey] !== undefined) {
        pemasukanVal = packagePriceMap[pkgKey];
      }
    }
    
    data.push({
      id: "evt-" + i,
      tanggal: tanggalStr,
      jenisPaket: jenisPaket,
      vendor: String(row[2] || ""),
      lokasi: String(row[3] || ""),
      noHp: String(row[4] || ""),
      pemasukan: pemasukanVal
    });
  }
  
  // Ambil parameter pengeluaran dari Kolom H & I
  var pengadaanVal = parseRupiahValue(sheet.getRange("I7").getValue());
  if (!pengadaanVal) {
    pengadaanVal = 7208099;
  }
  
  var settings = {
    operasionalAcara: parseRupiahValue(sheet.getRange("I2").getValue()),
    cashback: parseRupiahValue(sheet.getRange("I3").getValue()),
    karyawanAcara: parseRupiahValue(sheet.getRange("I5").getValue()),
    bensinAcara: parseRupiahValue(sheet.getRange("I6").getValue()),
    pengadaanKeseluruhanKeluar: pengadaanVal,
    partner1Name: "Lunova Lighting",
    partner1Share: 40,
    partner2Name: "Surya",
    partner2Share: 40
  };
  
  return createJsonResponse({
    data: data,
    settings: settings,
    lastUpdated: new Date().toISOString()
  });
}

// Handler POST jika ingin memposting data langsung dari aplikasi ke Sheet!
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawDataSheet = ss.getSheetByName("Raw_Data") || ss.getSheetByName("raw_data") || ss.getSheetByName("raw data") || ss.getSheetByName("Raw Data");
  var pengisianSheet = ss.getSheetByName("Pengisian data");
  
  var targetSheet = rawDataSheet || ss.getSheets()[0];
  
  try {
    var params = JSON.parse(e.postData.contents);
    
    // Handler khusus untuk sinkronisasi nilai parameter biaya/settings
    if (params.action === "updateSettings") {
      var sheet = ss.getSheetByName("Raw_Data") || ss.getSheetByName("raw_data") || ss.getSheetByName("raw data") || ss.getSheetByName("Raw Data") || ss.getSheetByName("Pengisian data") || ss.getSheets()[0];
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet tidak ditemukan!" });
      }
      
      var s = params.settings;
      if (s) {
        // Baris 2: Operasional / acara di H2, nilainya di I2
        sheet.getRange("H2").setValue("Operasional / acara");
        if (s.operasionalAcara !== undefined) sheet.getRange("I2").setValue(Number(s.operasionalAcara));
        
        // Baris 3: Cashback di H3, nilainya di I3
        sheet.getRange("H3").setValue("Cashback");
        if (s.cashback !== undefined) sheet.getRange("I3").setValue(Number(s.cashback));
        
        // Baris 5: Karyawan / acara di H5, nilainya di I5
        sheet.getRange("H5").setValue("Karyawan / acara");
        if (s.karyawanAcara !== undefined) sheet.getRange("I5").setValue(Number(s.karyawanAcara));
        
        // Baris 6: Bensin / acara di H6, nilainya di I6
        sheet.getRange("H6").setValue("Bensin / acara");
        if (s.bensinAcara !== undefined) sheet.getRange("I6").setValue(Number(s.bensinAcara));
        
        // Baris 7: Pengadaan Keseluruhan Keluar di H7, nilainya di I7
        sheet.getRange("H7").setValue("Pengadaan Keseluruhan Keluar");
        if (s.pengadaanKeseluruhanKeluar !== undefined) sheet.getRange("I7").setValue(Number(s.pengadaanKeseluruhanKeluar));
        
        return createJsonResponse({ success: true, message: "Pengaturan berhasil diperbarui di Google Sheets!" });
      }
      return createJsonResponse({ success: false, error: "Payload settings kosong!" });
    }
    
    // Handler khusus untuk menghapus data event dari Google Sheets
    if (params.action === "deleteEvent") {
      var eventId = params.id;
      if (eventId && eventId.indexOf("evt-") === 0) {
        var rowIdx = parseInt(eventId.replace("evt-", ""), 10);
        if (rowIdx > 0) {
          // values[i] -> row indices are i + 1. So row to delete is rowIdx + 1.
          var deleted = false;
          if (rawDataSheet && rowIdx + 1 <= rawDataSheet.getLastRow()) {
            rawDataSheet.deleteRow(rowIdx + 1);
            deleted = true;
          }
          if (pengisianSheet && rowIdx + 1 <= pengisianSheet.getLastRow()) {
            pengisianSheet.deleteRow(rowIdx + 1);
            deleted = true;
          }
          // Fallback if sheet names are different
          if (!deleted && ss.getSheets().length > 0) {
            var firstSheet = ss.getSheets()[0];
            if (rowIdx + 1 <= firstSheet.getLastRow()) {
              firstSheet.deleteRow(rowIdx + 1);
            }
          }
          return createJsonResponse({ success: true, message: "Data berhasil dihapus dari Google Sheets!" });
        }
      }
      return createJsonResponse({ success: false, error: "ID transaksi tidak valid untuk dihapus." });
    }
    
    var inputDate = params.tanggal ? new Date(params.tanggal) : new Date();
    
    var jenisPaket = params.jenisPaket || "";
    var isCustom = jenisPaket.toLowerCase().indexOf("custom") !== -1 || jenisPaket.toLowerCase().indexOf("costum") !== -1;
    
    if (rawDataSheet) {
      var rowNum = rawDataSheet.getLastRow() + 1;
      var columnFValue;
      if (!isCustom && jenisPaket.trim() !== "") {
        columnFValue = "=if(B" + rowNum + "=$H$2;$I$2;if(B" + rowNum + "=$H$3;$I$3;if(B" + rowNum + "=$H$4;$I$4;if(B" + rowNum + "=$H$5;$I$5;if(B" + rowNum + "=$H$6;$I$6;if(B" + rowNum + "=$H$7;$I$7;if(B" + rowNum + "=$H$8;$I$8;if(B" + rowNum + "=$H$9;$I$9;if('Pengisian data'!F" + rowNum + ";0)+'Pengisian data'!F" + rowNum + "))))))))";
      } else {
        columnFValue = Number(params.pemasukan) || 0;
      }
      
      rawDataSheet.appendRow([
        inputDate,
        jenisPaket,
        params.vendor || "",
        params.lokasi || "",
        params.noHp || "",
        columnFValue
      ]);
    } else {
      targetSheet.appendRow([
        inputDate,
        jenisPaket,
        params.vendor || "",
        params.lokasi || "",
        params.noHp || "",
        Number(params.pemasukan) || 0
      ]);
    }
    
    if (pengisianSheet) {
      pengisianSheet.appendRow([
        inputDate,
        jenisPaket,
        params.vendor || "",
        params.lokasi || "",
        params.noHp || "",
        Number(params.pemasukan) || 0
      ]);
    }
    
    return createJsonResponse({ success: true, message: "Data berhasil ditambahkan!" });
  } catch(err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

// Fungsi pembantu mengekstrak angka dari format Rupiah sheet
function parseRupiahValue(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var cl = String(val).replace(/[^0-9,-]/g, '');
  if (cl.indexOf(',') !== -1) cl = cl.split(',')[0];
  return parseInt(cl, 10) || 0;
}

// Set header CORS agar bisa di-fetch bebas dari aplikasi web React ini
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
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
                    Pastikan spreadsheet Anda memiliki sheet bernama <strong className="text-blue-400">"Raw_Data"</strong> (atau <strong className="text-blue-400">"raw data"</strong>) dengan layout kolom persis seperti di gambar: kolom A: Tanggal, B: Jenis Paket, C: Vendor/WO, D: Lokasi, E: No. Handphone / WA, F: Pemasukan/Event (seluruh pemasukan pada Daftar Transaksi Pengisian Data dicatat di sheet raw data pada kolom F tersebut).
                  </p>
                </li>
                <li>
                  <p className="font-medium text-zinc-200">Lokasi Setting Operasional & Pengadaan</p>
                  <p className="text-zinc-400 mt-0.5 font-sans leading-relaxed">
                    Buat pengaturan variabel di kolom <strong className="text-zinc-200">H & I</strong> pada sheet <strong className="text-blue-400">"Raw_Data"</strong> (dan biarkan sheet <strong className="text-emerald-450">"Pengisian data"</strong> hanya berisi Table 1 tanpa terganggu):<br />
                    - Baris 2: <code className="text-blue-400">Operasional / acara</code> di H2, nilainya di I2 (e.g. <code className="text-zinc-300">300000</code>)<br />
                    - Baris 3: <code className="text-blue-400">Cashback</code> di H3, nilainya di I3 (e.g. <code className="text-zinc-300">100000</code>)<br />
                    - Baris 5: <code className="text-blue-400">Karyawan / acara</code> di H5, nilainya di I5 (e.g. <code className="text-zinc-300">250000</code>)<br />
                    - Baris 6: <code className="text-blue-400">Bensin / acara</code> di H6, nilainya di I6 (e.g. <code className="text-zinc-300">25000</code>)<br />
                    - Baris 7: <code className="text-blue-400">Pengadaan Keseluruhan Keluar</code> di H7, nilainya di I7 (e.g. <code className="text-zinc-300">7208099</code>)<br />
                    - Total Keuntungan Bersih: Nilai diatur dan dihitung secara organik real-time berdasarkan akumulasi total dari tiap rincian transaksi persewaan yang ada.<br />
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
                  Tip: Pastikan tidak merubah nama sheet "raw data" agar kode berfungsi dengan baik.
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
