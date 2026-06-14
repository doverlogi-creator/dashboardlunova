/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { formatRupiah, formatDateIndo, parseDate } from "../utils";
import { EventData, CostSettings } from "../types";
import { getEventFinances } from "../utils";
import { Search, Calendar, Phone, MapPin, Tag, Briefcase, Trash2, Eye, X } from "lucide-react";

import { translations } from "../translations";

interface EventTableProps {
  events: EventData[];
  settings: CostSettings;
  onDeleteEvent?: (id: string) => void;
  lang?: "en" | "id";
}

export default function EventTable({ events, settings, onDeleteEvent, lang = "en" }: EventTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedPackage, setSelectedPackage] = useState("all");
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<EventData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get unique vendors and packages for filtering dropdowns
  const uniqueVendors = Array.from(new Set(events.map((e) => e.vendor || "Happylee")));
  const uniquePackages = Array.from(new Set(events.map((e) => e.jenisPaket || "Custom")));

  // Filter events based on research
  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.jenisPaket.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVendor = selectedVendor === "all" || evt.vendor === selectedVendor;
    const matchesPackage = selectedPackage === "all" || evt.jenisPaket === selectedPackage;

    return matchesSearch && matchesVendor && matchesPackage;
  }).sort((a, b) => parseDate(b.tanggal).getTime() - parseDate(a.tanggal).getTime()); // sort newest first

  const t = translations[lang];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Title & Filters */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100">{lang === "en" ? "Rental Transaction Database" : "Daftar Transaksi Pengisian Data"}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {lang === "en" 
                ? `Showing ${filteredEvents.length} entry items out of ${events.length} total nodes. Click row to see expense breakdown & profit sharing.`
                : `Menampilkan ${filteredEvents.length} entri aktivitas sewa dari total ${events.length} data. Klik baris untuk detail pengeluaran & profit sharing.`}
            </p>
          </div>
        </div>

        {/* Filters Header Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "en" ? "Search Vendor, Package, Venue..." : "Cari Vendor, Paket, Lokasi..."}
              className="w-full bg-zinc-950 border border-zinc-805 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          {/* Filter Vendor */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-805 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none transition-colors"
            >
              <option value="all">{lang === "en" ? "All Vendors" : "Semua Vendor/WO"}</option>
              {uniqueVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Package */}
          <div>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-805 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none transition-colors"
            >
              <option value="all">{lang === "en" ? "All Package Types" : "Semua Jenis Paket"}</option>
              {uniquePackages.map((p) => (
                <option key={p} value={p}>
                   {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/30 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">{lang === "en" ? "Date" : "Tanggal"}</th>
              <th className="py-3.5 px-4">{lang === "en" ? "Package Type" : "Jenis Paket"}</th>
              <th className="py-3.5 px-4">{lang === "en" ? "Vendor / WO" : "Vendor / WO"}</th>
              <th className="py-3.5 px-4 hidden md:table-cell">{lang === "en" ? "Location" : "Lokasi"}</th>
              <th className="py-3.5 px-4 text-right">{lang === "en" ? "Revenue" : "Pemasukan"}</th>
              <th className="py-3.5 px-4 text-right">{lang === "en" ? "Net Profit" : "Keuntungan Bersih"}</th>
              <th className="py-3.5 px-6 text-center">{lang === "en" ? "Actions" : "Aksi"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/65 text-xs text-zinc-300">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((evt) => {
                const fin = getEventFinances(evt, settings);

                return (
                  <tr key={evt.id} className="hover:bg-zinc-950/40 transition-colors group">
                    {/* Tanggal */}
                    <td
                      onClick={() => setSelectedDetailEvent(evt)}
                      className="py-4 px-6 font-mono font-medium text-zinc-455 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-[90px]">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{formatDateIndo(evt.tanggal, lang)}</span>
                      </div>
                    </td>

                    {/* Jenis Paket */}
                    <td onClick={() => setSelectedDetailEvent(evt)} className="py-4 px-4 font-semibold text-zinc-200 cursor-pointer">
                      <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md inline-block">
                        {evt.jenisPaket}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td onClick={() => setSelectedDetailEvent(evt)} className="py-4 px-4 font-bold text-blue-500 cursor-pointer">
                      {evt.vendor}
                    </td>

                    {/* Lokasi (desktop only) */}
                    <td
                      onClick={() => setSelectedDetailEvent(evt)}
                      className="py-4 px-4 max-w-xs truncate text-zinc-400 hidden md:table-cell cursor-pointer"
                    >
                      {evt.lokasi}
                    </td>

                    {/* Pemasukan */}
                    <td onClick={() => setSelectedDetailEvent(evt)} className="py-4 px-4 text-right font-mono font-semibold text-emerald-400 cursor-pointer">
                      {formatRupiah(evt.pemasukan)}
                    </td>

                    {/* Net Profit */}
                    <td onClick={() => setSelectedDetailEvent(evt)} className="py-4 px-4 text-right font-mono font-bold text-blue-500 cursor-pointer">
                      {formatRupiah(fin.netProfit)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedDetailEvent(evt)}
                          className="p-1 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors animate-pulse-subtle"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onDeleteEvent && (
                          <button
                            onClick={() => setDeleteConfirmId(evt.id)}
                            className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-zinc-500 font-medium font-mono">
                  {lang === "en" ? "No entries match your filtering parameters. Try resetting search filters." : "Tidak ada data yang cocok dengan pencarian Anda. Silakan reset filter pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Transaksi Pop-up */}
      {selectedDetailEvent && (() => {
        const fin = getEventFinances(selectedDetailEvent, settings);
        return (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Click outside to dismiss */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedDetailEvent(null)}
            />
            
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-scaleUp">
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{lang === "en" ? "Rental Transaction Details" : "Detail Transaksi Persewaan"}</h3>
                    <p className="text-[10px] text-zinc-500">{lang === "en" ? "Breakdown of operating costs and profit allocation" : "Rincian pengeluaran operasional dan distribusi alokasi laba"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailEvent(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                {/* Header Info Banner */}
                <div className="bg-zinc-950/60 p-4 border border-zinc-800 rounded-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">{lang === "en" ? "Event Date" : "Tanggal Acara"}</span>
                      <span className="text-zinc-200 font-semibold font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        {formatDateIndo(selectedDetailEvent.tanggal, lang)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">{lang === "en" ? "Package Tier" : "Jenis Paket Jasa"}</span>
                      <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-250 font-bold font-mono inline-block">
                        {selectedDetailEvent.jenisPaket}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">{lang === "en" ? "Vendor / WO" : "Nama Vendor / WO"}</span>
                      <span className="text-blue-400 font-bold font-mono block truncate">
                        {selectedDetailEvent.vendor}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">{lang === "en" ? "Gross Revenue" : "Pemasukan Kotor"}</span>
                      <span className="text-emerald-400 font-bold font-mono block">
                        {formatRupiah(selectedDetailEvent.pemasukan)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Detail Lokasi */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {lang === "en" ? "Venue & Preparation" : "Persiapan Persewaan"}
                      </h4>
                      <div className="space-y-3 mt-3 text-xs">
                        <div>
                          <span className="block font-semibold text-zinc-400 uppercase tracking-wider text-[9px] mb-0.5">{lang === "en" ? "Event Venue Address:" : "Lokasi Gedung / Acara:"}</span>
                          <span className="text-zinc-250 font-mono leading-relaxed">{selectedDetailEvent.lokasi}</span>
                        </div>
                        <div>
                          <span className="block font-semibold text-zinc-400 uppercase tracking-wider text-[9px] mb-0.5">{lang === "en" ? "WhatsApp Contact:" : "Kontak WhatsApp:"}</span>
                          {selectedDetailEvent.noHp && selectedDetailEvent.noHp !== "-" ? (
                            <a href={`https://wa.me/${selectedDetailEvent.noHp}`} target="_blank" rel="noreferrer" className="text-blue-400 font-medium font-mono hover:underline inline-flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-zinc-500" />
                              {selectedDetailEvent.noHp}
                            </a>
                          ) : (
                            <span className="text-zinc-500 font-mono italic mt-0.5 inline-block">{lang === "en" ? "No contact" : "Tidak ada kontak"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Operasional & Cashback */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-zinc-500" />
                      {lang === "en" ? "Operational Expenses" : "Rincian Biaya Operasional"}
                    </h4>
                    <div className="space-y-2 mt-3 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>{lang === "en" ? "Event Logistics:" : "Operasional Acara:"}</span>
                        <span className="text-zinc-200">{formatRupiah(settings.operasionalAcara)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 items-center">
                        <span>{lang === "en" ? "Event WO Cashback:" : "Cashback Paket:"}</span>
                        <div className="flex items-center gap-1.5">
                          {fin.eventCashback > 0 ? (
                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded leading-none">
                              {lang === "en" ? "Package C" : "Paket C"}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded leading-none">
                              {lang === "en" ? "No Cashback" : "Tanpa C"}
                            </span>
                          )}
                          <span className="text-zinc-200">{formatRupiah(fin.eventCashback)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{lang === "en" ? "Estimated Crew Salary:" : "Karyawan Acara:"}</span>
                        <span className="text-zinc-250">{formatRupiah(settings.karyawanAcara)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{lang === "en" ? "Transport Gasoline:" : "Bensin Acara:"}</span>
                        <span className="text-zinc-250">{formatRupiah(settings.bensinAcara)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-zinc-200 pt-2 border-t border-zinc-800/80">
                        <span>{lang === "en" ? "Total Expenditure:" : "Total Pengeluaran:"}</span>
                        <span className="text-red-400">-{formatRupiah(fin.runningCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribusi Laba & Bagi Hasil */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{lang === "en" ? "Clean Net Profit Margins" : "Hasil Keuntungan Bersih (Laba)"}</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5">{lang === "en" ? "Formula: Revenue - Total Expenditures" : "Rumus: Pemasukan - Total Pengeluaran"}</span>
                    </div>
                    <span className="text-base font-extrabold text-blue-400 font-mono">{formatRupiah(fin.netProfit)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Partner 1 */}
                    <div className="bg-purple-950/15 border border-purple-900/40 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-purple-400 font-bold uppercase block tracking-wider truncate" title={settings.partner1Name}>
                        {settings.partner1Name}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-zinc-500 font-bold">{settings.partner1Share}%</span>
                        <span className="text-[10px] text-zinc-600">{lang === "en" ? "Payout" : "Bagi Hasil"}</span>
                      </div>
                      <span className="text-sm font-extrabold text-purple-300 block pt-1 font-mono">{formatRupiah(fin.p1Share)}</span>
                    </div>

                    {/* Partner 2 */}
                    <div className="bg-blue-950/15 border border-blue-900/40 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-blue-400 font-bold uppercase block tracking-wider truncate" title={settings.partner2Name}>
                        {settings.partner2Name}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-zinc-500 font-bold">{settings.partner2Share}%</span>
                        <span className="text-[10px] text-zinc-600">{lang === "en" ? "Payout" : "Bagi Hasil"}</span>
                      </div>
                      <span className="text-sm font-extrabold text-blue-300 block pt-1 font-mono">{formatRupiah(fin.p2Share)}</span>
                    </div>

                    {/* Kas Perusahaan */}
                    <div className="bg-cyan-950/15 border border-cyan-900/40 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase block tracking-wider truncate">
                        {lang === "en" ? "Enterprise Kas" : "Kas Perusahaan"}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-zinc-500 font-bold">20%</span>
                        <span className="text-[10px] text-zinc-600">{lang === "en" ? "Retained" : "Terakumulasi"}</span>
                      </div>
                      <span className="text-sm font-extrabold text-cyan-300 block pt-1 font-mono">{formatRupiah(fin.kasShare)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-zinc-950/40 border-t border-zinc-800/80 flex items-center justify-end">
                <button
                  onClick={() => setSelectedDetailEvent(null)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg hover:text-white"
                >
                  {lang === "en" ? "Close Details" : "Tutup Rincian"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 animate-scaleUp space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-100 font-sans">{lang === "en" ? "Confirm Delete" : "Konfirmasi Hapus"}</h3>
            </div>
            
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {lang === "en" 
                ? "Are you sure you want to delete this event transaction? This action is permanent and cannot be undone."
                : "Apakah Anda yakin ingin menghapus transaksi sewa ini? Data yang terhapus tidak dapat dikembalikan secara otomatis."}
            </p>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {lang === "en" ? "Cancel" : "Batal"}
              </button>
              <button
                onClick={() => {
                  if (onDeleteEvent && deleteConfirmId) {
                    onDeleteEvent(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {lang === "en" ? "Delete Transaction" : "Hapus Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
