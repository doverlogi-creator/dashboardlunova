/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ChangeEvent, FormEvent } from "react";
import { ProcurementItem, CostSettings } from "../types";
import { formatRupiah, formatDateIndo } from "../utils";
import StatCard from "./StatCard";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  FileText, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Coins,
  Wallet,
  X,
  Save,
  Check,
  AlertOctagon,
  Edit2
} from "lucide-react";

interface BankMutation {
  id: string;
  tanggal: string;
  keterangan: string;
  tipe: "masuk" | "keluar";
  nominal: number;
  linkedProcId?: string;
}

interface ProcurementManagementProps {
  procurements: ProcurementItem[];
  totalKasShare: number;
  kasTambahan: number;
  onUpdateKasTambahan: (val: number) => void;
  onAddProcurement: (item: Omit<ProcurementItem, "id"> & { id?: string }) => void;
  onDeleteProcurement: (id: string) => void;
  settings: CostSettings;
  onUpdateSettings: (newSettings: CostSettings) => void;
  lang?: "en" | "id";
}

export default function ProcurementManagement({ 
  procurements, 
  totalKasShare,
  kasTambahan,
  onUpdateKasTambahan,
  onAddProcurement, 
  onDeleteProcurement,
  settings,
  onUpdateSettings,
  lang = "en"
}: ProcurementManagementProps) {
  
  // Local Form state
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [namaBarang, setNamaBarang] = useState<string>("");
  const [harga, setHarga] = useState<string>("");
  const [jumlah, setJumlah] = useState<string>("1");
  const [keterangan, setKeterangan] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Bank mutations state and tab selection
  const [activeRightTab, setActiveRightTab] = useState<"procurement" | "rekening">("procurement");
  const [mutations, setMutations] = useState<BankMutation[]>(() => {
    const saved = localStorage.getItem("event_bank_mutations");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      { id: "m-init-1", tanggal: "2026-06-12", keterangan: "Setoran Tunai Saldo Awal", tipe: "masuk", nominal: 14500000 },
      { id: "m-init-2", tanggal: "2026-06-14", keterangan: "Pembelian Inventaris Tripod", tipe: "keluar", nominal: 850000 }
    ];
  });

  const saveMutations = (newMutations: BankMutation[]) => {
    setMutations(newMutations);
    localStorage.setItem("event_bank_mutations", JSON.stringify(newMutations));
  };

  // Mutation Input states
  const [mutTanggal, setMutTanggal] = useState<string>(new Date().toISOString().substring(0, 10));
  const [mutKeterangan, setMutKeterangan] = useState<string>("");
  const [mutTipe, setMutTipe] = useState<"masuk" | "keluar">("masuk");
  const [mutNominal, setMutNominal] = useState<string>("");

  const handleAddMutation = (e: FormEvent) => {
    e.preventDefault();
    if (!mutKeterangan.trim() || !mutNominal) return;
    const amount = parseFloat(mutNominal.replace(/\D/g, "")) || 0;
    if (amount <= 0) return;

    const sharedId = "shared-mut-proc-" + Date.now();

    const newMutation: BankMutation = {
      id: "mut-" + Date.now(),
      tanggal: mutTanggal,
      keterangan: mutKeterangan.trim(),
      tipe: mutTipe,
      nominal: amount,
      linkedProcId: mutTipe === "keluar" ? sharedId : undefined
    };

    const updated = [newMutation, ...mutations];
    saveMutations(updated);

    const calculatedBalance = updated.reduce((sum, item) => {
      return item.tipe === "masuk" ? sum + item.nominal : sum - item.nominal;
    }, 0);

    onUpdateSettings({
      ...settings,
      saldoRekeningRiil: Math.max(0, calculatedBalance)
    });

    // Automatically sync to Procurement (Riwayat Belanja) if cash out (keluar)
    if (mutTipe === "keluar") {
      onAddProcurement({
        id: sharedId,
        tanggal: mutTanggal,
        namaBarang: mutKeterangan.trim(),
        harga: amount,
        jumlah: 1,
        keterangan: lang === "en" ? "Auto-synced from Bank Mutation" : "Otomatis dari Rekening Riil"
      });
    }

    setMutKeterangan("");
    setMutNominal("");
  };

  const handleDeleteMutation = (id: string) => {
    const targetMutation = mutations.find((m) => m.id === id);
    const updated = mutations.filter((m) => m.id !== id);
    saveMutations(updated);

    const calculatedBalance = updated.reduce((sum, item) => {
      return item.tipe === "masuk" ? sum + item.nominal : sum - item.nominal;
    }, 0);

    onUpdateSettings({
      ...settings,
      saldoRekeningRiil: Math.max(0, calculatedBalance)
    });

    // Automatically delete synced Procurement if linked
    if (targetMutation && targetMutation.linkedProcId) {
      onDeleteProcurement(targetMutation.linkedProcId);
    }
  };

  const handleDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
      // 1. Delete procurement
      onDeleteProcurement(id);

      // 2. Also delete linked bank mutation
      const updatedMuts = mutations.filter((m) => m.linkedProcId !== id);
      saveMutations(updatedMuts);

      // 3. Update settings' bank balance automatically
      const calculatedBalance = updatedMuts.reduce((sum, item) => {
        return item.tipe === "masuk" ? sum + item.nominal : sum - item.nominal;
      }, 0);

      onUpdateSettings({
        ...settings,
        saldoRekeningRiil: Math.max(0, calculatedBalance)
      });

      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  };

  // Compute metrics
  const totalSpending = procurements.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
  const totalItemsCount = procurements.reduce((sum, item) => sum + item.jumlah, 0);
  const latestItem = procurements.length > 0 
    ? [...procurements].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0]
    : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) {
      setFormError(lang === "en" ? "Item name is required" : "Nama barang wajib diisi");
      return;
    }
    if (!harga || Number(harga) <= 0) {
      setFormError(lang === "en" ? "Valid unit price is required" : "Harga unit wajib diisi & harus valid");
      return;
    }
    if (!jumlah || Number(jumlah) <= 0) {
      setFormError(lang === "en" ? "Valid quantity is required" : "Jumlah wajib diisi & harus valid");
      return;
    }
    if (!tanggal) {
      setFormError(lang === "en" ? "Procurement date is required" : "Tanggal wajib diisi");
      return;
    }

    const sharedId = "shared-mut-proc-" + Date.now();

    onAddProcurement({
      id: sharedId,
      tanggal,
      namaBarang: namaBarang.trim(),
      harga: Number(harga),
      jumlah: Number(jumlah),
      keterangan: keterangan.trim() || "-"
    });

    // Automatically add to bank mutations
    const newMutation: BankMutation = {
      id: "mut-" + Date.now(),
      tanggal,
      keterangan: `${namaBarang.trim()} (${jumlah}x)`,
      tipe: "keluar",
      nominal: Number(harga) * Number(jumlah),
      linkedProcId: sharedId
    };

    const updatedMuts = [newMutation, ...mutations];
    saveMutations(updatedMuts);

    const calculatedBalance = updatedMuts.reduce((sum, item) => {
      return item.tipe === "masuk" ? sum + item.nominal : sum - item.nominal;
    }, 0);

    onUpdateSettings({
      ...settings,
      saldoRekeningRiil: Math.max(0, calculatedBalance)
    });

    // Reset Form
    setNamaBarang("");
    setHarga("");
    setJumlah("1");
    setKeterangan("");
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
            {lang === "en" ? "Equipment & Assets" : "Inventaris & Aset"}
          </span>
          <span className="text-zinc-400 text-xs font-mono">• {lang === "en" ? "Procurement Ledger" : "Buku Log Pengadaan"}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-150 mt-1 flex items-center gap-2">
          <span>{lang === "en" ? "Procurement & Equipment Investments" : "Pengelolaan Pengadaan & Belanja Modal"}</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
          {lang === "en" 
            ? "Manage all hardware, lighting equipment purchases, or maintenance expenses here. All records sum up to adjust settings and enterprise ledger deductions automatically." 
            : "Kelola daftar pembelian aset lighting, perlengkapan, atau perbaikan hardware di sini. Jumlah total riwayat otomatis diakumulasikan ke parameter potongan laba logistik global."}
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fadeIn">
        {/* Metric 1: Total Kas Usaha */}
        <StatCard
          id="proc-total-kas"
          title={lang === "en" ? "Enterprise Kas Pool (Total)" : "Total Kas Usaha (Perusahaan)"}
          value={totalKasShare + kasTambahan}
          icon={<ShoppingBag className="w-5 h-5" />}
          colorClass="text-cyan-400"
          description={
            lang === "en" 
              ? `Accrued: ${formatRupiah(totalKasShare)} + Added: ${formatRupiah(kasTambahan)}` 
              : `Masuk Kas: ${formatRupiah(totalKasShare)} + Tambahan: ${formatRupiah(kasTambahan)}`
          }
          badgeText={lang === "en" ? `Spent: ${formatRupiah(totalSpending)}` : `Belanja: ${formatRupiah(totalSpending)}`}
          badgeColorClass="bg-red-500/10 text-red-400 border-red-500/20"
        />

        {/* Metric 2: Sisa Kas Usaha */}
        <StatCard
          id="proc-items-count"
          title={lang === "en" ? "Remaining Enterprise Kas" : "Sisa Kas Usaha"}
          value={totalKasShare + kasTambahan - totalSpending}
          icon={<Briefcase className="w-5 h-5" />}
          colorClass="text-blue-400"
          description={
            lang === "en" 
              ? `Total: ${formatRupiah(totalKasShare + kasTambahan)} - Spent: ${formatRupiah(totalSpending)}` 
              : `Total: ${formatRupiah(totalKasShare + kasTambahan)} - Belanja: ${formatRupiah(totalSpending)}`
          }
          badgeText={lang === "en" ? "Remaining" : "Sisa"}
          badgeColorClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
        />

        {/* Metric 3: Latest Procurement */}
        <StatCard
          id="proc-latest-item"
          title={lang === "en" ? "Latest Procurement" : "Pembelian Terakhir"}
          value={latestItem ? latestItem.namaBarang : "-"}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="text-purple-400"
          description={
            latestItem 
              ? `${formatDateIndo(latestItem.tanggal, lang)} (${formatRupiah(latestItem.harga * latestItem.jumlah)})` 
              : (lang === "en" ? "No record found" : "Belum ada riwayat")
          }
          badgeText={lang === "en" ? "Latest" : "Terbaru"}
          badgeColorClass="bg-purple-500/10 text-purple-400 border-purple-500/20"
        />

        {/* Metric 4: Saldo Rekening Riil */}
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
                      className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingSaldo(false)}
                      className="p-1 px-1.5 bg-zinc-850 hover:bg-zinc-850 text-zinc-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
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

        {/* Metric 5: Selisih Buku vs Riil */}
        {(() => {
          const actualSaldo = settings.saldoRekeningRiil || 0;
          const sisaKasUsaha = totalKasShare + kasTambahan - totalSpending;
          const diff = actualSaldo - sisaKasUsaha;
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
            colorClass = "text-rose-400 font-extrabold";
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

      {/* --- MANUAL KAS USADA INJECTION / ADDITION --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-xl border border-cyan-500/10 mt-0.5">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {lang === "en" ? "Manual Enterprise Kas Additions" : "Penambahan Kas Usaha (Manual)"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {lang === "en"
                  ? "Manually add standalone funds, capital investments, or external revenue sources directly to the Enterprise Savings Pool."
                  : "Suntikkan modal awal pribadi, dana swadaya, atau pendapatan non-acara secara manual untuk menambah total simpanan Kas Usaha."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-cyan-500">
                Rp
              </span>
              <input
                type="text"
                id="manual-kas-input"
                value={kasTambahan !== 0 ? kasTambahan.toLocaleString("id-ID") : ""}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, "");
                  const val = rawValue ? parseInt(rawValue, 10) : 0;
                  onUpdateKasTambahan(val);
                }}
                placeholder="0"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border border-zinc-850 focus:border-cyan-500 rounded-xl text-sm font-semibold text-zinc-100 placeholder-zinc-650 transition-all outline-none text-right font-mono"
              />
            </div>
            
            {/* Preset quick buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => {
                  onUpdateKasTambahan(kasTambahan + 1000000);
                }}
                className="flex-1 sm:flex-initial px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[11px] font-bold text-zinc-350 rounded-xl transition-all cursor-pointer font-mono border border-zinc-750"
              >
                +1M
              </button>
              <button
                onClick={() => {
                  onUpdateKasTambahan(kasTambahan + 5000000);
                }}
                className="flex-1 sm:flex-initial px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[11px] font-bold text-zinc-350 rounded-xl transition-all cursor-pointer font-mono border border-zinc-750"
              >
                +5M
              </button>
              {kasTambahan > 0 && (
                <button
                  onClick={() => {
                    onUpdateKasTambahan(0);
                  }}
                  className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 active:scale-95 text-[11px] font-bold text-rose-400 rounded-xl transition-all cursor-pointer font-sans border border-rose-500/15"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subtotal summary breakdown for transparency */}
        {kasTambahan > 0 && (
          <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1">
              <span>{lang === "en" ? "Allocations Share: " : "Bagi Hasil Event: "}</span>
              <span className="text-zinc-300 font-semibold">{formatRupiah(totalKasShare)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>+ {lang === "en" ? "Manual Addition: " : "Tambahan Manual: "}</span>
              <span className="text-cyan-400 font-bold">{formatRupiah(kasTambahan)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>- {lang === "en" ? "Procurements Spending: " : "Biaya Pengadaan Aset: "}</span>
              <span className="text-rose-400 font-semibold">{formatRupiah(totalSpending)}</span>
            </div>
            <div className="text-xs ml-auto border-l border-zinc-800 pl-4">
              <span className="text-zinc-400 font-sans">{lang === "en" ? "Net Kas Pool: " : "Kas Usaha Netto: "}</span>
              <span className="text-emerald-400 font-extrabold">{formatRupiah(totalKasShare - totalSpending + kasTambahan)}</span>
            </div>
          </div>
        )}
      </div>

      {/* RENDER VIEW GRID SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ADD FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Plus className="w-5 h-5 text-cyan-500" />
            <h3 className="text-sm font-bold text-zinc-200">
              {lang === "en" ? "Purchase Asset Form" : "Formulir Tambah Belanja"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Nama Barang */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                {lang === "en" ? "Asset / Item Name" : "Nama Asset / Inventaris"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-zinc-500">
                  <Briefcase className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={lang === "en" ? "e.g., Lampu Par LED 54" : "Contoh: Moving Head Beam"}
                  value={namaBarang}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNamaBarang(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Dual Grid: Harga + Jumlah */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                  {lang === "en" ? "Unit Price (IDR)" : "Harga Satuan (Rp)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-[10px] font-bold text-zinc-500">Rp</span>
                  <input
                    type="number"
                    placeholder="250000"
                    value={harga}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHarga(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-8 pr-3 py-2.5 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                  {lang === "en" ? "Quantity" : "Jumlah Unit"}
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={jumlah}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setJumlah(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-200 px-3 py-2.5 rounded-xl outline-none font-mono"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                {lang === "en" ? "Purchase Date" : "Tanggal Pembelian"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-zinc-500">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTanggal(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-9 pr-3 py-2.5 rounded-xl outline-none font-mono"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-400 uppercase tracking-wider block">
                {lang === "en" ? "Short Notes" : "Catatan / Keterangan"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-zinc-500">
                  <FileText className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={lang === "en" ? "e.g., Bought from Tokopedia" : "Contoh: Pembelian di Glodok"}
                  value={keterangan}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setKeterangan(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-md shadow-cyan-500/10 cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{lang === "en" ? "Add Asset Expense" : "Simpan Pengadaan"}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: DETAIL TABLE & MUTATIONS LEDGER */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveRightTab("procurement")}
                className={`text-sm font-bold pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                  activeRightTab === "procurement"
                    ? "border-cyan-500 text-cyan-400 font-extrabold"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === "en" ? "Procurement & Equipment" : "Riwayat Belanja Modal & Inventaris"}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveRightTab("rekening")}
                className={`text-sm font-bold pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                  activeRightTab === "rekening"
                    ? "border-emerald-500 text-emerald-400 font-extrabold"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>{lang === "en" ? "Actual Bank Ledger" : "Catatan Rekening Riil"}</span>
              </button>
            </div>

            {activeRightTab === "procurement" ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-900/40 font-mono uppercase">
                {procurements.length} {lang === "en" ? "Transactions" : "Item Terdaftar"}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 font-mono uppercase">
                {mutations.length} {lang === "en" ? "Records" : "Transaksi"}
              </span>
            )}
          </div>

          {/* TAB 1: CAPITAL EXPENDITURE PROCUREMENT HISTORY */}
          {activeRightTab === "procurement" && (
            <div className="overflow-x-auto">
              {procurements.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <ShoppingBag className="w-12 h-12 stroke-[1] mx-auto text-zinc-700 mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wider">{lang === "en" ? "No Assets Recorded" : "Belum Ada Pengadaan Tercatat"}</p>
                  <p className="text-[11px] text-zinc-600 mt-1">{lang === "en" ? "Fill out the form on the left to add equipment investments." : "Isi form di kiri untuk menambahkan daftar pengadaan alat."}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-widest text-[9px] select-none">
                      <th className="py-2.5 px-3 font-semibold">{lang === "en" ? "Date" : "Tanggal"}</th>
                      <th className="py-2.5 px-3 font-semibold">{lang === "en" ? "Asset Item" : "Nama Barang"}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{lang === "en" ? "Unit Price" : "Harga Satuan"}</th>
                      <th className="py-2.5 px-3 text-center">{lang === "en" ? "Qty" : "Jml"}</th>
                      <th className="py-2.5 px-3 text-right">{lang === "en" ? "Total Price" : "Subtotal"}</th>
                      <th className="py-2.5 px-3 font-semibold">{lang === "en" ? "Notes" : "Keterangan"}</th>
                      <th className="py-2.5 px-3 text-center">{lang === "en" ? "Actions" : "Aksi"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {procurements.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-850/40 group transition-all">
                        <td className="py-3 px-3 font-mono text-zinc-300">
                          {formatDateIndo(item.tanggal, lang)}
                        </td>
                        <td className="py-3 px-3 font-bold text-zinc-100 max-w-[150px] truncate">
                          {item.namaBarang}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-300">
                          {formatRupiah(item.harga)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-850 border border-zinc-800 font-semibold text-zinc-300">
                            {item.jumlah}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                          {formatRupiah(item.harga * item.jumlah)}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 italic max-w-[140px] truncate" title={item.keterangan}>
                          {item.keterangan}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className={`p-1 px-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 border ${
                              deleteConfirmId === item.id
                                ? "bg-rose-600/20 text-rose-400 border-rose-500/40 animate-pulse"
                                : "hover:bg-red-500/10 hover:text-red-400 text-zinc-500 border-transparent hover:border-red-500/20"
                            }`}
                            title={
                              deleteConfirmId === item.id
                                ? (lang === "en" ? "Click again to confirm" : "Klik lagi untuk mengonfirmasi")
                                : (lang === "en" ? "Delete Item" : "Hapus Item")
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] sm:hidden lg:inline font-bold">
                              {deleteConfirmId === item.id
                                ? (lang === "en" ? "Yakin?" : "Yakin?")
                                : (lang === "en" ? "Delete" : "Hapus")}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: BANK LEDGER MUTATIONS */}
          {activeRightTab === "rekening" && (
            <div className="space-y-6">
              {/* LEDGER INPUT FORM */}
              <div className="bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl space-y-3">
                <h4 className="text-xs font-extrabold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-450" />
                  <span>{lang === "en" ? "Add Transaction Entry" : "Input Transaksi Baru Rekening"}</span>
                </h4>
                
                <form onSubmit={handleAddMutation} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{lang === "en" ? "Date" : "Tanggal"}</label>
                    <input
                      type="date"
                      value={mutTanggal}
                      onChange={(e) => setMutTanggal(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 focus:border-emerald-500 outline-none font-mono text-xs"
                      required
                    />
                  </div>
                  
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{lang === "en" ? "Description" : "Keterangan"}</label>
                    <input
                      type="text"
                      value={mutKeterangan}
                      onChange={(e) => setMutKeterangan(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Bank Deposit, Admin Fee" : "Contoh: Setoran Awal, Bunga Tabungan, Biaya Admin"}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 placeholder-zinc-650 focus:border-emerald-500 outline-none text-xs"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{lang === "en" ? "Type" : "Aliran"}</label>
                    <select
                      value={mutTipe}
                      onChange={(e) => setMutTipe(e.target.value as "masuk" | "keluar")}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 focus:border-emerald-500 outline-none text-xs cursor-pointer font-bold"
                    >
                      <option value="masuk" className="text-emerald-400 font-bold">
                        {lang === "en" ? "Debit (+)":"Uang Masuk (+)"}
                      </option>
                      <option value="keluar" className="text-rose-400 font-bold">
                        {lang === "en" ? "Credit (-)":"Uang Keluar (-)"}
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{lang === "en" ? "Nominal (Rp)" : "Nominal (Rp)"}</label>
                    <input
                      type="text"
                      value={mutNominal}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const val = raw ? parseInt(raw, 10) : 0;
                        setMutNominal(val === 0 ? "" : val.toLocaleString("id-ID"));
                      }}
                      placeholder="0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 focus:border-emerald-500 outline-none text-right font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === "en" ? "Record" : "Catat"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* MUTATIONS HISTORY TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] leading-relaxed">
                  <thead>
                    <tr className="border-b border-zinc-800/60 pb-3 text-zinc-500 font-bold uppercase tracking-wider font-mono">
                      <th className="py-3 px-3">{lang === "en" ? "DATE" : "TANGGAL"}</th>
                      <th className="py-3 px-3">{lang === "en" ? "DESCRIPTION" : "KETERANGAN"}</th>
                      <th className="py-3 px-3 text-center">{lang === "en" ? "MUTATION TYPE" : "ALIRAN"}</th>
                      <th className="py-3 px-3 text-right">{lang === "en" ? "NOMINAL" : "NOMINAL"}</th>
                      <th className="py-3 px-3 text-center">{lang === "en" ? "ACTION" : "AKSI"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-300 font-sans">
                    {mutations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-550 font-mono italic">
                          {lang === "en" 
                            ? "No mutations cataloged yet." 
                            : "Belum ada transaksi mutasi yang tercatat."
                          }
                        </td>
                      </tr>
                    ) : (
                      mutations
                        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                        .map((mut) => {
                          const isDeposit = mut.tipe === "masuk";
                          return (
                            <tr key={mut.id} className="hover:bg-zinc-950/20 transition-colors">
                              <td className="py-3 px-3 font-mono text-zinc-400">
                                {formatDateIndo(mut.tanggal, lang)}
                              </td>
                              <td className="py-3 px-3 font-semibold text-zinc-200">
                                {mut.keterangan}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase border ${
                                  isDeposit 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                    : "bg-rose-500/10 text-rose-450 border-rose-500/20"
                                }`}>
                                  {isDeposit ? (lang === "en" ? "Deposit" : "Masuk") : (lang === "en" ? "Withdrawal" : "Keluar")}
                                </span>
                              </td>
                              <td className={`py-3 px-3 text-right font-bold font-mono ${
                                isDeposit ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {isDeposit ? "+":"-"}{formatRupiah(mut.nominal)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMutation(mut.id)}
                                  className="p-1 px-1.5 border border-zinc-800 hover:border-red-900/40 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 rounded-lg text-xs transition-all flex items-center justify-center mx-auto cursor-pointer"
                                  title={lang === "en" ? "Delete mutation" : "Hapus catatan mutasi"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          )}
        </div>
      </div>
    </div>
  );
}
