/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Plus, X, Calendar, Wallet, FileText, MapPin, Phone, Zap } from "lucide-react";
import { EventData } from "../types";

interface AddEventModalProps {
  onClose: () => void;
  onAddEvent: (event: Omit<EventData, "id">) => Promise<boolean>;
  events: EventData[];
}

export default function AddEventModal({ onClose, onAddEvent, events }: AddEventModalProps) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [jenisPaket, setJenisPaket] = useState("Custom");
  const [vendor, setVendor] = useState("Happylee");
  const [lokasi, setLokasi] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pemasukan, setPemasukan] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!tanggal) newErrors.tanggal = "Tanggal wajib diisi";
    if (!jenisPaket.trim()) newErrors.jenisPaket = "Jenis paket wajib diisi";
    if (!vendor.trim()) newErrors.vendor = "Vendor/WO wajib diisi";
    if (!lokasi.trim()) newErrors.lokasi = "Lokasi wajib diisi";
    if (!pemasukan || Number(pemasukan) <= 0) newErrors.pemasukan = "Jumlah pemasukan harus valid & lebih dari 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const success = await onAddEvent({
        tanggal,
        jenisPaket,
        vendor,
        lokasi,
        noHp: noHp || "-",
        pemasukan: Number(pemasukan),
      });

      if (success) {
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-805 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Tambah Transaksi Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Tanggal */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Tanggal Acara</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-zinc-500">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={`w-full bg-zinc-950 border ${
                  errors.tanggal ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                } rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 outline-none transition-colors`}
              />
            </div>
            {errors.tanggal && <p className="text-[11px] text-red-500 font-medium">{errors.tanggal}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Jenis Paket */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Jenis Paket</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-zinc-500">
                  <FileText className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={jenisPaket}
                  list="suggested-packages"
                  onChange={(e) => {
                    const val = e.target.value;
                    setJenisPaket(val);
                    const isCustom = val.toLowerCase().includes("custom") || val.toLowerCase().includes("costum");
                    if (!isCustom && val.trim() !== "") {
                      const presetPrices: Record<string, number> = {
                        "paket 1": 1500000,
                        "paket 1 c": 1500000,
                        "paket 2": 2750000,
                        "paket 2 c": 2750000,
                        "paket 3": 3500000,
                        "paket 3 c": 3500000,
                      };
                      
                      const key = val.trim().toLowerCase();
                      if (presetPrices[key] !== undefined) {
                        setPemasukan(String(presetPrices[key]));
                      } else {
                        // Match exactly from similar package type in sheet raw data
                        const matched = events.find(
                          (evt) => evt.jenisPaket.trim().toLowerCase() === key
                        );
                        if (matched && matched.pemasukan > 0) {
                          setPemasukan(String(matched.pemasukan));
                        }
                      }
                    }
                  }}
                  placeholder="Paket Silver / Custom"
                  className={`w-full bg-zinc-950 border ${
                    errors.jenisPaket ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                  } rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-250 outline-none transition-colors`}
                />
                
                {/* Datalist for automatic package autocompletes from sheets */}
                <datalist id="suggested-packages">
                  {Array.from(
                    new Set([
                      "Paket 1",
                      "Paket 1 C",
                      "Paket 2",
                      "Paket 2 C",
                      "Paket 3",
                      "Paket 3 C",
                      ...events
                        .map((e) => e.jenisPaket.trim())
                        .filter((p) => p && !p.toLowerCase().includes("custom") && !p.toLowerCase().includes("costum"))
                    ])
                  ).map((pkgName) => (
                    <option key={pkgName} value={pkgName} />
                  ))}
                </datalist>
              </div>
              {errors.jenisPaket && <p className="text-[11px] text-red-500 font-medium">{errors.jenisPaket}</p>}
              
              {/* Green indicator explaining standard package billing alignment */}
              {!jenisPaket.toLowerCase().includes("custom") && !jenisPaket.toLowerCase().includes("costum") && jenisPaket.trim() !== "" && (
                <p className="text-[9px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Menyesuaikan baris Raw_Data kolom F
                </p>
              )}
            </div>

            {/* Vendor / WO */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Vendor / WO</label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none transition-colors"
              >
                <option value="Happylee">Happylee</option>
                <option value="Chic Decor">Chic Decor</option>
                <option value="Surya Wedding">Surya Wedding</option>
                <option value="Larasati WO">Larasati WO</option>
                <option value="Lainnya">Lainnya / Custom</option>
              </select>
            </div>
          </div>

          {/* Supplier Vendor Custom input if 'Lainnya' selected */}
          {vendor === "Lainnya" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Nama Custom Vendor</label>
              <input
                type="text"
                placeholder="Masukkan nama WO / Vendor"
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none transition-colors"
              />
            </div>
          )}

          {/* Lokasi */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Lokasi Acara</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-zinc-500">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Alamat / Nama Gedung"
                className={`w-full bg-zinc-950 border ${
                  errors.lokasi ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                } rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 outline-none transition-colors`}
              />
            </div>
            {errors.lokasi && <p className="text-[11px] text-red-500 font-medium">{errors.lokasi}</p>}
          </div>

          {/* No Handphone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">WhatsApp / No. Handphone (Opsional)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-zinc-500">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="Contoh: 082213589994"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Pemasukan / Event */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Pemasukan / Nominal Sewa (IDR)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-zinc-500 font-semibold text-sm">
                Rp
              </span>
              <input
                type="number"
                value={pemasukan}
                onChange={(e) => setPemasukan(e.target.value)}
                placeholder="750000"
                className={`w-full bg-zinc-950 border ${
                  errors.pemasukan ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                } rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 outline-none transition-colors font-mono`}
              />
            </div>
            {errors.pemasukan && <p className="text-[11px] text-red-500 font-medium">{errors.pemasukan}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-800/80 mt-6 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-xl text-sm font-semibold transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
