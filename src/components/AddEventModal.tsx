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
  const [vendor, setVendor] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pemasukan, setPemasukan] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isPresetPackage = ["Paket 1", "Paket 2", "Paket 3"].includes(jenisPaket);

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
                <select
                  value={jenisPaket}
                  onChange={(e) => {
                    const val = e.target.value;
                    setJenisPaket(val);
                    const presetPrices: Record<string, number> = {
                      "Paket 1": 1500000,
                      "Paket 2": 2750000,
                      "Paket 3": 3500000,
                    };
                    if (presetPrices[val] !== undefined) {
                      setPemasukan(String(presetPrices[val]));
                    }
                  }}
                  className={`w-full bg-zinc-950 border ${
                    errors.jenisPaket ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                  } rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-250 outline-none transition-colors`}
                >
                  <option value="Paket 1">Paket 1</option>
                  <option value="Paket 2">Paket 2</option>
                  <option value="Paket 3">Paket 3</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {errors.jenisPaket && <p className="text-[11px] text-red-500 font-medium">{errors.jenisPaket}</p>}
              
              {/* Green indicator explaining standard package billing alignment */}
              {!jenisPaket.toLowerCase().includes("custom") && !jenisPaket.toLowerCase().includes("costum") && jenisPaket.trim() !== "" && (
                <p className="text-[9px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Menyesuaikan baris Pengisian data kolom F
                </p>
              )}
            </div>

            {/* Vendor / WO */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Vendor / WO</label>
              <input
                type="text"
                value={vendor}
                list="suggested-vendors"
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Masukkan nama WO / Vendor"
                className={`w-full bg-zinc-950 border ${
                  errors.vendor ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
                } rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none transition-colors`}
              />
              <datalist id="suggested-vendors">
                {Array.from(
                  new Set([
                    "Happylee",
                    "Chic Decor",
                    "Surya Wedding",
                    "Larasati WO",
                    ...events.map((e) => e.vendor.trim()).filter((v) => v)
                  ])
                ).map((vendorName) => (
                  <option key={vendorName} value={vendorName} />
                ))}
              </datalist>
              {errors.vendor && <p className="text-[11px] text-red-500 font-medium">{errors.vendor}</p>}
            </div>
          </div>

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
                disabled={isPresetPackage}
                className={`w-full ${
                  isPresetPackage ? "bg-zinc-900/60 text-zinc-400 cursor-not-allowed border-zinc-805" : "bg-zinc-950 text-zinc-200 border-zinc-800 focus:border-blue-500"
                } border ${
                  errors.pemasukan ? "border-red-500" : ""
                } rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors font-mono`}
              />
            </div>
            {isPresetPackage && (
              <p className="text-[10px] text-zinc-500 font-mono italic mt-0.5">
                * Nominal dikunci khusus paket standar sesuai kriteria nominal yang berlaku
              </p>
            )}
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
