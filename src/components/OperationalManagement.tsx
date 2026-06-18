/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { EventData, CostSettings } from "../types";
import { formatRupiah, formatDateIndo } from "../utils";
import StatCard from "./StatCard";
import { 
  Briefcase, 
  Settings, 
  Sliders, 
  Trash2, 
  Calendar, 
  Coins, 
  X, 
  Save, 
  Check, 
  Edit2,
  Truck,
  Users,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  Hourglass
} from "lucide-react";

interface OperationalManagementProps {
  events: EventData[];
  settings: CostSettings;
  onUpdateEvent: (updated: EventData) => void;
  onUpdateSettings: (settings: CostSettings) => void;
  lang?: "en" | "id";
}

export default function OperationalManagement({
  events,
  settings,
  onUpdateEvent,
  onUpdateSettings,
  lang = "en"
}: OperationalManagementProps) {
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "default" | "custom">("all");
  
  // Editing state for specific event
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Editing individual event values
  const [tempOpsCost, setTempOpsCost] = useState<string>("");
  const [tempBensinCost, setTempBensinCost] = useState<string>("");
  const [tempKaryawanCost, setTempKaryawanCost] = useState<string>("");

  // Editing global settings values
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [globalOps, setGlobalOps] = useState(settings.operasionalAcara.toString());
  const [globalBensin, setGlobalBensin] = useState(settings.bensinAcara.toString());
  const [globalKaryawan, setGlobalKaryawan] = useState(settings.karyawanAcara.toString());

  // Calculations for current events
  let totalOps = 0;
  let totalBensin = 0;
  let totalKaryawan = 0;
  let customOverridesCount = 0;
  let totalBebanLunas = 0;

  events.forEach((evt) => {
    const ops = evt.operasionalAcara !== undefined ? evt.operasionalAcara : settings.operasionalAcara;
    const bensin = evt.bensinAcara !== undefined ? evt.bensinAcara : settings.bensinAcara;
    const karyawan = evt.karyawanAcara !== undefined ? evt.karyawanAcara : settings.karyawanAcara;

    totalOps += ops;
    totalBensin += bensin;
    totalKaryawan += karyawan;

    if (evt.operasionalDibayar) {
      totalBebanLunas += (bensin + karyawan);
    }

    if (evt.bensinAcara !== undefined || evt.karyawanAcara !== undefined) {
      customOverridesCount++;
    }
  });

  const grandTotalOperational = totalOps;
  const sisaOperasional = totalOps - totalBebanLunas;

  // Handler to adjust custom operational values for specific event
  const handleStartEditEvent = (evt: EventData) => {
    setEditingEventId(evt.id);
    setTempOpsCost((evt.operasionalAcara !== undefined ? evt.operasionalAcara : settings.operasionalAcara).toString());
    setTempBensinCost((evt.bensinAcara !== undefined ? evt.bensinAcara : settings.bensinAcara).toString());
    setTempKaryawanCost((evt.karyawanAcara !== undefined ? evt.karyawanAcara : settings.karyawanAcara).toString());
  };

  const handleSaveEventCosts = (evt: EventData) => {
    const parsedOps = parseInt(tempOpsCost.replace(/\D/g, ""), 10) || 0;
    const parsedBensin = parseInt(tempBensinCost.replace(/\D/g, ""), 10) || 0;
    const parsedKaryawan = parseInt(tempKaryawanCost.replace(/\D/g, ""), 10) || 0;

    const isOpsDefault = parsedOps === settings.operasionalAcara;
    const isBensinDefault = parsedBensin === settings.bensinAcara;
    const isKaryawanDefault = parsedKaryawan === settings.karyawanAcara;

    const updated: EventData = {
      ...evt,
      operasionalAcara: isOpsDefault ? undefined : parsedOps,
      bensinAcara: isBensinDefault ? undefined : parsedBensin,
      karyawanAcara: isKaryawanDefault ? undefined : parsedKaryawan
    };

    onUpdateEvent(updated);
    setEditingEventId(null);
  };

  const handleResetEventToDefault = (evt: EventData) => {
    const updated: EventData = {
      ...evt,
      operasionalAcara: undefined,
      bensinAcara: undefined,
      karyawanAcara: undefined
    };
    onUpdateEvent(updated);
    setEditingEventId(null);
  };

  const handleSaveGlobalDefaults = () => {
    const parsedOps = parseInt(globalOps.replace(/\D/g, ""), 10) || 0;
    const parsedBensin = parseInt(globalBensin.replace(/\D/g, ""), 10) || 0;
    const parsedKaryawan = parseInt(globalKaryawan.replace(/\D/g, ""), 10) || 0;

    onUpdateSettings({
      ...settings,
      operasionalAcara: parsedOps,
      bensinAcara: parsedBensin,
      karyawanAcara: parsedKaryawan
    });
    setIsEditingGlobal(false);
  };

  // Filter events based on search box & selection
  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          evt.jenisPaket.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isCustom = evt.operasionalAcara !== undefined || 
                     evt.bensinAcara !== undefined || 
                     evt.karyawanAcara !== undefined;
    
    if (filterType === "default") return matchesSearch && !isCustom;
    if (filterType === "custom") return matchesSearch && isCustom;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
              {lang === "en" ? "Operational Costs" : "Biaya Operasional"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1 flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-455" />
            <span>{lang === "en" ? "Operational Expenses Management" : "Manajemen Biaya Operasional"}</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
            {lang === "en" 
              ? "Monitor and adjust crew salary, fuel allowance, and miscellaneous operating costs on each wedding rental." 
              : "Monitor dan sesuaikan upah crew/karyawan, uang bensin, serta pengeluaran operasional per acara secara rinci."}
          </p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
        <StatCard
          id="ops-grand-total"
          title={lang === "en" ? "Total Operational Spend" : "Total Biaya Operasional"}
          value={formatRupiah(grandTotalOperational)}
          description={lang === "en" ? "All active operating streams" : "Seluruh aliran dana lapangan"}
          icon={<Briefcase className="w-5 h-5 text-cyan-400" />}
          badgeText={lang === "en" ? "Aggregate" : "Agregat"}
          badgeColorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
        />

        <StatCard
          id="ops-crew-total"
          title={lang === "en" ? "Crews Payroll" : "Total Gaji Karyawan"}
          value={formatRupiah(totalKaryawan)}
          description={lang === "en" ? "Aggregate labor payments" : "Akumulasi upah kru lapangan"}
          icon={<Users className="w-5 h-5 text-purple-400" />}
          badgeText={lang === "en" ? "Crews" : "Karyawan"}
          badgeColorClass="bg-purple-500/10 text-purple-400 border-purple-500/20"
        />

        <StatCard
          id="ops-bensin-total"
          title={lang === "en" ? "Logistics Allowance" : "Uang Jalan & Bensin"}
          value={formatRupiah(totalBensin)}
          description={lang === "en" ? "Gasoline & transit assets" : "Uang bensin operasional armada"}
          icon={<Truck className="w-5 h-5 text-amber-400" />}
          badgeText={lang === "en" ? "Transit" : "Armada"}
          badgeColorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
        />

        <StatCard
          id="ops-avg-per-event"
          title={lang === "en" ? "Remaining Ops Balance" : "Sisa Operasional (Belum Bayar)"}
          value={formatRupiah(sisaOperasional)}
          description={lang === "en" ? "Unpaid event operating amounts" : "Biaya operasional acara belum lunas"}
          icon={<Hourglass className="w-5 h-5 text-rose-450 animate-pulse" />}
          badgeText={lang === "en" ? "Pending" : "Belum Bayar"}
          badgeColorClass="bg-rose-500/10 text-rose-450 border-rose-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: GLOBAL DEFAULT PARAMETERS & EXPLANATIONS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  {lang === "en" ? "Global Operations Defaults" : "Default Operasional Global"}
                </h3>
              </div>
              {!isEditingGlobal && (
                <button
                  onClick={() => {
                    setGlobalOps(settings.operasionalAcara.toString());
                    setGlobalBensin(settings.bensinAcara.toString());
                    setGlobalKaryawan(settings.karyawanAcara.toString());
                    setIsEditingGlobal(true);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 hover:text-cyan-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Adjust" : "Sesuaikan"}</span>
                </button>
              )}
            </div>

            {isEditingGlobal ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                    {lang === "en" ? "Default Operating Cost (Ops)" : "Biaya Operasional Dasar"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-cyan-400">Rp</span>
                    <input
                      type="text"
                      value={parseInt(globalOps.replace(/\D/g, "") || "0").toLocaleString("id-ID")}
                      onChange={(e) => setGlobalOps(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-sm font-bold text-zinc-100 outline-none font-mono text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                    {lang === "en" ? "Default Gasoline Allowance" : "Uang Bensin Dasar"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-cyan-400">Rp</span>
                    <input
                      type="text"
                      value={parseInt(globalBensin.replace(/\D/g, "") || "0").toLocaleString("id-ID")}
                      onChange={(e) => setGlobalBensin(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-sm font-bold text-zinc-100 outline-none font-mono text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                    {lang === "en" ? "Default Crew Wage" : "Upah Karyawan Dasar"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-cyan-400">Rp</span>
                    <input
                      type="text"
                      value={parseInt(globalKaryawan.replace(/\D/g, "") || "0").toLocaleString("id-ID")}
                      onChange={(e) => setGlobalKaryawan(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-sm font-bold text-zinc-100 outline-none font-mono text-right"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveGlobalDefaults}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Save Defaults" : "Simpan Default"}</span>
                  </button>
                  <button
                    onClick={() => setIsEditingGlobal(false)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {lang === "en" ? "Cancel" : "Batal"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-850">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{lang === "en" ? "Ops Budget" : "Ops Dasar"}</span>
                    <span className="text-xs text-zinc-400 block">{lang === "en" ? "Miscellaneous expenses" : "Biaya tak terduga"}</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-400">{formatRupiah(settings.operasionalAcara)}</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-850">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{lang === "en" ? "Trans Allowance" : "Bensin Dasar"}</span>
                    <span className="text-xs text-zinc-400 block">{lang === "en" ? "Fuel Allocation per transaction" : "Alokasi bensin per armada"}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{formatRupiah(settings.bensinAcara)}</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-850">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{lang === "en" ? "Labor Cost" : "Gaji Karyawan"}</span>
                    <span className="text-xs text-zinc-400 block">{lang === "en" ? "Flat wage per event" : "Upah flat tim per acara"}</span>
                  </div>
                  <span className="text-sm font-bold text-purple-400">{formatRupiah(settings.karyawanAcara)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: EVENTS TABLE WITH DIRECT OPERATIONAL MODIFICATION */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-fadeIn">
            
            {/* TABLE SEARCH & FILTERS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 pb-5 border-b border-zinc-800/80">
              <div className="relative w-full sm:w-72">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={lang === "en" ? "Search event or package..." : "Cari acara, WO, atau paket..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border border-zinc-850 focus:border-cyan-500 rounded-xl text-xs font-semibold text-zinc-200 placeholder-zinc-650 transition-all outline-none"
                />
              </div>
            </div>

            {/* EVENT LIST TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                    <th className="py-3 px-3 w-[30%]">{lang === "en" ? "Event / Partner" : "Acara / Vendor"}</th>
                    <th className="py-3 px-3 text-right">{lang === "en" ? "Gasoline" : "Uang Bensin"}</th>
                    <th className="py-3 px-3 text-right">{lang === "en" ? "Crews Pay" : "Gaji Kru"}</th>
                    <th className="py-3 px-3 text-right">{lang === "en" ? "Total Burden" : "Total Beban"}</th>
                    <th className="py-3 px-3 text-center w-[18%]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-zinc-500 font-mono italic">
                        {lang === "en" ? "No matches operational records found." : "Tidak ada catatan biaya operasional yang cocok."}
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt) => {
                      const isEditing = editingEventId === evt.id;
                      
                      const opsVal = evt.operasionalAcara !== undefined ? evt.operasionalAcara : settings.operasionalAcara;
                      const bensinVal = evt.bensinAcara !== undefined ? evt.bensinAcara : settings.bensinAcara;
                      const karyawanVal = evt.karyawanAcara !== undefined ? evt.karyawanAcara : settings.karyawanAcara;
                      const hasOverride = evt.operasionalAcara !== undefined || evt.bensinAcara !== undefined || evt.karyawanAcara !== undefined;

                      return (
                        <tr 
                          key={evt.id} 
                          className="hover:bg-zinc-950/40 transition-colors text-xs font-mono font-medium group"
                        >
                          <td className="py-4 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <div className="font-bold text-zinc-200 block truncate max-w-[170px]" title={evt.vendor}>
                                {evt.vendor}
                              </div>
                              
                              {/* Edit & Reset hover tags */}
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditEvent(evt)}
                                  className="text-zinc-550 hover:text-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer p-0.5"
                                  title={lang === "en" ? "Customize costs" : "Sesuaikan biaya"}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {hasOverride && !isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleResetEventToDefault(evt)}
                                  className="text-rose-500/60 hover:text-rose-450 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer p-0.5"
                                  title={lang === "en" ? "Reset Custom Budget" : "Kembalikan ke Default"}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 block font-mono mt-0.5">
                              {formatDateIndo(evt.tanggal, lang)} | {evt.jenisPaket}
                            </span>
                          </td>
                          
                          {/* Gasoline cost */}
                          <td className="py-4 px-3 text-right font-mono">
                            {isEditing ? (
                              <input
                                type="text"
                                value={parseInt(tempBensinCost.replace(/\D/g, "") || "0").toLocaleString("id-ID")}
                                onChange={(e) => setTempBensinCost(e.target.value.replace(/\D/g, ""))}
                                className="w-20 px-1.5 py-1 bg-zinc-950 border border-zinc-800 text-amber-500 font-bold rounded text-right text-[11px] outline-none"
                              />
                            ) : (
                              <span className={evt.bensinAcara !== undefined ? "text-amber-500 font-bold" : "text-zinc-400"}>
                                {formatRupiah(bensinVal)}
                              </span>
                            )}
                          </td>

                          {/* Karyawan cost */}
                          <td className="py-4 px-3 text-right font-mono">
                            {isEditing ? (
                              <input
                                type="text"
                                value={parseInt(tempKaryawanCost.replace(/\D/g, "") || "0").toLocaleString("id-ID")}
                                onChange={(e) => setTempKaryawanCost(e.target.value.replace(/\D/g, ""))}
                                className="w-20 px-1.5 py-1 bg-zinc-950 border border-zinc-800 text-purple-400 font-bold rounded text-right text-[11px] outline-none"
                              />
                            ) : (
                              <span className={evt.karyawanAcara !== undefined ? "text-purple-400 font-bold" : "text-zinc-400"}>
                                {formatRupiah(karyawanVal)}
                              </span>
                            )}
                          </td>

                          {/* Grand total running cost for the event */}
                          <td className="py-4 px-3 text-right font-mono font-bold text-zinc-100">
                            {formatRupiah(bensinVal + karyawanVal)}
                            {hasOverride && (
                              <span className="block text-[8px] text-cyan-400 tracking-wider font-extrabold uppercase mt-0.5">
                                OVERRIDDEN
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEventCosts(evt)}
                                  className="p-1 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-sans font-bold text-[10px] transition-all cursor-pointer flex items-center gap-0.5"
                                  title={lang === "en" ? "Save" : "Simpan"}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{lang === "en" ? "Save" : "Simpan"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEventId(null)}
                                  className="p-1 px-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded-lg font-sans font-bold text-[10px] transition-all cursor-pointer"
                                  title={lang === "en" ? "Cancel" : "Batal"}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateEvent({
                                    ...evt,
                                    operasionalDibayar: !evt.operasionalDibayar
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase border cursor-pointer outline-none transition-all active:scale-95 flex items-center gap-1.5 w-fit mx-auto ${
                                  evt.operasionalDibayar
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/10 hover:bg-rose-500/15 text-rose-450 border-rose-550/25"
                                }`}
                                title={lang === "en" ? "Click to toggle status" : "Klik untuk ubah status operasional"}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  evt.operasionalDibayar ? "bg-emerald-450" : "bg-rose-450 animate-pulse"
                                }`} />
                                <span>{evt.operasionalDibayar ? "Lunas" : "Belum"}</span>
                              </button>
                            )}
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
