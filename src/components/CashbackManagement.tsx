/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ChangeEvent, FormEvent } from "react";
import { EventData, CostSettings, ProcurementItem } from "../types";
import { formatRupiah, formatDateIndo, getEventFinances, getDashboardTotals } from "../utils";
import StatCard from "./StatCard";
import { 
  Coins, 
  CheckCircle2, 
  Hourglass, 
  ArrowRight, 
  Edit3, 
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  Sliders,
  Layers,
  Edit2,
  Save,
  Check,
  AlertOctagon,
  X,
  Wallet,
  Trash2,
  Plus
} from "lucide-react";

interface CashbackManagementProps {
  events: EventData[];
  settings: CostSettings;
  onUpdateEvent: (updated: EventData) => void;
  onUpdateSettings: (settings: CostSettings) => void;
  lang?: "en" | "id";
  procurements: ProcurementItem[];
}

export default function CashbackManagement({
  events,
  settings,
  onUpdateEvent,
  onUpdateSettings,
  lang = "en",
  procurements
}: CashbackManagementProps) {
  
  // Local active editing event in the left-hand form
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [customCashback, setCustomCashback] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // States for actual bank balance input
  const [isEditingSaldo, setIsEditingSaldo] = useState<boolean>(false);
  const [tempSaldo, setTempSaldo] = useState<string>("");

  const handleSaveSaldo = () => {
    const rawVal = tempSaldo.replace(/\D/g, "");
    const val = rawVal ? parseInt(rawVal, 10) : 0;
    onUpdateSettings({
      ...settings,
      saldoRekeningRiil: Math.max(0, val)
    });
    setIsEditingSaldo(false);
  };

  // Filter events that have package names starting with 'paket' or already have a custom cashback override
  const qualifyingEvents = events.filter((evt) => {
    const pkg = (evt.jenisPaket || "").trim().toLowerCase();
    const isPresetPackage = pkg.startsWith("paket");
    const hasCustomOverride = evt.cashback !== undefined;
    return isPresetPackage || hasCustomOverride;
  });

  // Calculate stats
  const totals = getDashboardTotals(events, settings);
  const totalSpending = procurements.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
  const sisaKasSetelahPengadaan = totals.totalKasShare + (settings.kasTambahan || 0) - totalSpending;

  let totalAccumulatedCashback = 0;
  let totalPaidCashback = 0;
  let totalPendingCashback = 0;

  qualifyingEvents.forEach((evt) => {
    const fin = getEventFinances(evt, settings);
    totalAccumulatedCashback += fin.eventCashback;
    if (evt.cashbackDibayar) {
      totalPaidCashback += fin.eventCashback;
    } else {
      totalPendingCashback += fin.eventCashback;
    }
  });

  const actualSaldo = settings.saldoRekeningRiil || 0;
  const diff = actualSaldo - sisaKasSetelahPengadaan;
  const sisaCashbackBaru = totalAccumulatedCashback + diff - totalPaidCashback;

  const handleSelectEventChange = (id: string) => {
    setSelectedEventId(id);
    if (!id) {
      setCustomCashback("");
      setIsPaid(false);
      return;
    }
    const evt = events.find((e) => e.id === id);
    if (evt) {
      // If a custom callback is specifically set, use it, else default to settings
      const defaultVal = evt.cashback !== undefined ? evt.cashback : settings.cashback;
      setCustomCashback(defaultVal.toString());
      setIsPaid(!!evt.cashbackDibayar);
    }
    setFormSuccess(null);
    setFormError(null);
  };

  const handleEventUpdateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      setFormError(lang === "en" ? "Please select an event first" : "Silakan pilih event terlebih dahulu");
      return;
    }

    const evt = events.find((e) => e.id === selectedEventId);
    if (evt) {
      const updatedValue = customCashback !== "" ? Number(customCashback) : undefined;
      const updated: EventData = {
        ...evt,
        cashback: updatedValue,
        cashbackDibayar: isPaid
      };
      onUpdateEvent(updated);
      setFormSuccess(lang === "en" ? "Cashback parameter updated" : "Parameter cashback berhasil diperbarui");
      setFormError(null);

      // Flash success and clear selection safely
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    }
  };

  const toggleEventPaidStatus = (evt: EventData) => {
    const updated: EventData = {
      ...evt,
      cashbackDibayar: !evt.cashbackDibayar
    };
    onUpdateEvent(updated);
    // If the currently edited event is this one, sync form state
    if (selectedEventId === evt.id) {
      setIsPaid(!evt.cashbackDibayar);
    }
  };

  // Quick Preset Handlers for default cashback inside settings
  const handleUpdateDefaultCashback = (val: number) => {
    onUpdateSettings({
      ...settings,
      cashback: Math.max(0, val)
    });
  };

  return (
    <div className="space-y-6">
      
      {/* PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
            {lang === "en" ? "LUNATIVE CASHBACK" : "SISTEM CASHBACK VENDOR/WO"}
          </span>
          <span className="text-zinc-400 text-xs font-mono">• {lang === "en" ? "Incentive Tracking" : "Pemantauan Komisi Logistik"}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
          <span>{lang === "en" ? "Partner Discount & Cashback Management" : "Pengelolaan Cashback & Insentif WO"}</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
          {lang === "en" 
            ? "Manage cashback payout logs, customize specific client referrals, regulate general incentive parameters, and monitor pending balances." 
            : "Kelola riwayat pembayaran cashback, sesuaikan komisi khusus referensi vendor, atur nominal default, dan monitor saldo yang belum dicairkan."}
        </p>
      </div>      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
        {/* Metric 1: Total Cashback */}
        <StatCard
          id="cb-total-accumulated"
          title={lang === "en" ? "Total Accrued Cashback" : "Total Cashback Akumulatif"}
          value={totalAccumulatedCashback}
          icon={<Coins className="w-5 h-5" />}
          colorClass="text-amber-400"
          description={
            lang === "en" 
              ? `Accumulated from ${qualifyingEvents.length} package events` 
              : `Akumulasi otomatis dari ${qualifyingEvents.length} acara berjalan`
          }
          badgeText={lang === "en" ? "Aggregated" : "Terakumulasi"}
          badgeColorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
        />

        {/* Metric 2: Pending Balances */}
        <StatCard
          id="cb-total-pending"
          title={lang === "en" ? "Remaining Pending Balance" : "Sisa Cashback (Belum Bayar)"}
          value={sisaCashbackBaru}
          icon={<Hourglass className="w-5 h-5" />}
          colorClass="text-rose-450 font-semibold"
          description={
            lang === "en" 
              ? "Awaiting cash or bank disbursement" 
              : "Menunggu pembayaran transfer bank / tunai"
          }
          badgeText={lang === "en" ? "Pending" : "Tertunda"}
          badgeColorClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
        />

        {/* Metric 3: Saldo Rekening Riil */}
        <div
          id="cb-total-rekening-riil"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all shadow-md hover:shadow-lg relative overflow-hidden group"
        >
          <div className="absolute -right-2 -bottom-2 opacity-5 text-zinc-100 group-hover:scale-110 group-hover:text-emerald-400 transition-transform duration-500">
            <Wallet className="w-5 h-5" />
          </div>
          
          <div className="flex items-start justify-between">
            <div className="space-y-1 w-full mr-2">
              <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                {lang === "en" ? "Actual Bank Balance" : "Saldo Rekening Riil"}
              </span>
              
              {isEditingSaldo ? (
                <div className="flex items-center gap-2 mt-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm font-bold text-emerald-400 font-mono">Rp</span>
                  <input
                    type="text"
                    value={tempSaldo}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const val = raw ? parseInt(raw, 10) : 0;
                      setTempSaldo(val.toLocaleString("id-ID"));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSaldo();
                      if (e.key === "Escape") setIsEditingSaldo(false);
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm font-bold text-zinc-100 outline-none focus:border-emerald-500 w-full font-mono text-right"
                    placeholder="0"
                    autoFocus
                  />
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={handleSaveSaldo}
                      className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center font-sans"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingSaldo(false)}
                      className="p-1 px-1.5 bg-zinc-850 hover:bg-zinc-855 text-zinc-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center font-sans"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/edit mt-1">
                  <h3 className="text-2xl font-bold tracking-tight font-mono text-emerald-400">
                    {formatRupiah(settings.saldoRekeningRiil || 0)}
                  </h3>
                  <button
                    onClick={() => {
                      setTempSaldo((settings.saldoRekeningRiil || 0).toString());
                      setIsEditingSaldo(true);
                    }}
                    className="p-1 bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-lg transition-all opacity-0 group-hover/edit:opacity-100 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title={lang === "en" ? "Input actual balance" : "Masukkan saldo riil rekening Anda"}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {!isEditingSaldo && (
              <div 
                className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-zinc-700 transition-all cursor-pointer shrink-0"
                onClick={() => {
                  setTempSaldo((settings.saldoRekeningRiil || 0).toString());
                  setIsEditingSaldo(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-400 truncate max-w-[70%]">
              {lang === "en" ? "Actual bank account statement" : "Saldo fisik mutasi di rekening"}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
              Ikhtisar
            </span>
          </div>
        </div>

        {/* Metric 4: Selisih Buku vs Riil */}
        {(() => {
          const actualSaldo = settings.saldoRekeningRiil || 0;
          const diff = actualSaldo - sisaKasSetelahPengadaan;
          let colorClass = "text-zinc-400";
          let badgeText = lang === "en" ? "Balanced" : "Sesuai";
          let badgeColorClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
          let descText = lang === "en" ? "No book discrepancy detected" : "Sesuai dengan sisa kas usaha";
          let iconElement = <Check className="w-5 h-5" />;

          if (diff > 0) {
            colorClass = "text-emerald-400";
            badgeText = lang === "en" ? "Surplus" : "Selisih Lebih";
            badgeColorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            descText = lang === "en" ? `Over-budget cash: +${formatRupiah(diff)}` : `Kelebihan dana di bank: +${formatRupiah(diff)}`;
            iconElement = <TrendingDown className="w-5 h-5 text-emerald-450 rotate-180" />;
          } else if (diff < 0) {
            colorClass = "text-rose-450 font-extrabold";
            badgeText = lang === "en" ? "Deficit" : "Selisih Kurang";
            badgeColorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            descText = lang === "en" ? `Deficit mismatch: -${formatRupiah(Math.abs(diff))}` : `Dana bank kurang: -${formatRupiah(Math.abs(diff))}`;
            iconElement = <AlertOctagon className="w-5 h-5 text-rose-450" />;
          }

          return (
            <div
              id="cb-total-selisih"
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all shadow-md hover:shadow-lg relative overflow-hidden group"
            >
              <div className={`absolute -right-2 -bottom-2 opacity-5 text-zinc-100 group-hover:scale-110 group-hover:${colorClass} transition-transform duration-500`}>
                {iconElement}
              </div>
              
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                    {lang === "en" ? "Accounting Variance" : "Selisih Buku vs Riil"}
                  </span>
                  <h3 className={`text-2xl font-bold tracking-tight font-mono ${colorClass}`}>
                    {diff === 0 ? "Rp 0" : (diff > 0 ? `+${formatRupiah(diff)}` : `-${formatRupiah(Math.abs(diff))}`)}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:${colorClass} group-hover:border-zinc-700 transition-all`}>
                  {iconElement}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/80">
                <span className="text-xs text-zinc-400 truncate max-w-[70%]" title={descText}>
                  {descText}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColorClass}`}>
                  {badgeText}
                </span>
              </div>
            </div>
          );
        })()}
      </div>



      {/* RENDER VIEW GRID SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: EDIT FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Edit3 className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-200">
              {lang === "en" ? "Cashback Override Form" : "Formulir Sesuaikan Cashback"}
            </h3>
          </div>

          <form onSubmit={handleEventUpdateSubmit} className="space-y-4 text-xs">
            {formSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}
            
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Select Target Event */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                {lang === "en" ? "Select Event Booking" : "Pilih Booking Acara"}
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEventChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 px-3 py-2.5 rounded-xl outline-none cursor-pointer text-xs"
              >
                <option value="">
                  {lang === "en" ? "-- Choose Event --" : "-- Pilih Booking Acara --"}
                </option>
                {events.map((evt) => {
                  const label = `${formatDateIndo(evt.tanggal, lang)} | ${evt.vendor} (${evt.jenisPaket})`;
                  return (
                    <option key={evt.id} value={evt.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedEventId && (
              <>
                {/* Override Nominal */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                    {lang === "en" ? "Custom Event Cashback (Rp)" : "Nominal Cashback Khusus (Rp)"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[10px] font-bold text-zinc-500">Rp</span>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={customCashback}
                      onChange={(e) => setCustomCashback(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 pl-8 pr-3 py-2.5 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {lang === "en" 
                      ? `Default falls back to ${formatRupiah(settings.cashback)} if left standard.`
                      : `Standard bernilai ${formatRupiah(settings.cashback)} jika kosong.`
                    }
                  </p>
                </div>

                {/* Cashback Paid status */}
                <div className="space-y-1 bg-zinc-950/40 p-3.5 border border-zinc-850 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-300 block">
                        {lang === "en" ? "Incentive Status" : "Status Insentif"}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {isPaid 
                          ? (lang === "en" ? "Already paid & cleared" : "Sudah selesai dibayarkan")
                          : (lang === "en" ? "Awaiting manual payout" : "Belum dicairkan")
                        }
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isPaid}
                        onChange={(e) => setIsPaid(e.target.checked)}
                        className="sr-only peer animate-none" 
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-450 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-zinc-100"></div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-amber-600/10 flex items-center justify-center gap-1.5 uppercase"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Update Parameters" : "Perbarui Parameter"}</span>
                </button>
              </>
            )}
          </form>
        </div>        {/* RIGHT COLUMN: CASHBACK REGISTRY */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-zinc-200">
                {lang === "en" ? "Cashback Claim Events" : "Daftar Klaim Cashback"}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              {qualifyingEvents.length} ITEM
            </span>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
                <thead>
                  <tr className="border-b border-zinc-800/60 pb-3 text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 font-mono">{lang === "en" ? "DATE" : "TANGGAL"}</th>
                    <th className="py-3 px-3">{lang === "en" ? "PARTNER / WO" : "MITRA / VENDOR"}</th>
                    <th className="py-3 px-3 font-mono">{lang === "en" ? "PACKAGE" : "PAKET"}</th>
                    <th className="py-3 px-3 text-right">{lang === "en" ? "CASHBACK" : "CASHBACK"}</th>
                    <th className="py-3 px-3 text-center">{lang === "en" ? "STATUS" : "STATUS"}</th>
                    <th className="py-3 px-3 text-center">{lang === "en" ? "ACTION" : "AKSI"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-300">
                  {qualifyingEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-550 font-mono italic">
                        {lang === "en" 
                          ? "No events found with qualifying packages (such as Paket 1, 2, 3) or custom cashback." 
                          : "Tidak ditemukan event Paket 1, 2, 3, atau event dengan cashback khusus."
                        }
                      </td>
                    </tr>
                  ) : (
                    [...qualifyingEvents]
                      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                      .map((evt) => {
                        const finances = getEventFinances(evt, settings);
                        const isPreset = (evt.jenisPaket || "").toLowerCase().trim().startsWith("paket");
                        return (
                          <tr 
                            key={evt.id} 
                            className={`hover:bg-zinc-950/40 transition-colors ${
                              selectedEventId === evt.id ? "bg-zinc-950/60" : ""
                            }`}
                          >
                            <td className="py-3.5 px-3 font-mono text-zinc-400 shrink-0">
                              {formatDateIndo(evt.tanggal, lang)}
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-zinc-150">
                              {evt.vendor}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-zinc-400">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                isPreset 
                                  ? "bg-purple-950/40 text-purple-400 border border-purple-900/45" 
                                  : "bg-zinc-950 text-zinc-400 border border-zinc-850"
                              }`}>
                                {evt.jenisPaket}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-zinc-100 font-mono">
                              {formatRupiah(evt.cashbackDibayar ? 0 : finances.eventCashback)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleEventPaidStatus(evt)}
                                title={lang === "en" ? "Click to toggle payment status" : "Klik untuk ubah status pembayaran"}
                                className={`mx-auto px-2 py-1 rounded-lg text-[9px] font-extrabold tracking-wider uppercase border cursor-pointer outline-none transition-all active:scale-95 flex items-center gap-1 w-fit ${
                                  evt.cashbackDibayar 
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold" 
                                    : "bg-rose-500/10 hover:bg-rose-500/15 text-rose-450 border-rose-550/25 font-bold"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  evt.cashbackDibayar ? "bg-emerald-400":"bg-rose-450 animate-pulse"
                                }`} />
                                <span>
                                  {evt.cashbackDibayar 
                                    ? (lang === "en" ? "Lunas" : "Lunas") 
                                    : (lang === "en" ? "Pending" : "Belum")
                                  }
                                </span>
                              </button>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectEventChange(evt.id)}
                                className="p-1 px-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-400 hover:text-amber-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer font-semibold"
                                title={lang === "en" ? "Edit event cashback" : "Edit cashback acara"}
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{lang === "en" ? "Edit" : "Edit"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
