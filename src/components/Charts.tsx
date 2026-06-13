/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { formatRupiah, parseDate } from "../utils";
import { EventData, CostSettings } from "../types";
import { getEventFinances } from "../utils";
import { Award, Zap, TrendingUp, Users } from "lucide-react";

interface ChartsProps {
  events: EventData[];
  settings: CostSettings;
}

export default function Charts({ events, settings }: ChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [activeDonutSegment, setActiveDonutSegment] = useState<string | null>(null);

  // Group financial data by month (Jan - Dec 2026)
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const monthlyData = monthNames.map((name, index) => {
    // Filter events for this month in Year 2026
    const monthEvents = events.filter((evt) => {
      if (!evt.tanggal) return false;
      const dat = parseDate(evt.tanggal);
      return !isNaN(dat.getTime()) && dat.getMonth() === index && dat.getFullYear() === 2026;
    });

    let revenue = 0;
    let cost = 0;
    let netProfit = 0;

    monthEvents.forEach((evt) => {
      const fin = getEventFinances(evt, settings);
      revenue += fin.revenue;
      cost += fin.runningCost;
      netProfit += fin.netProfit;
    });

    return {
      monthName: name,
      revenue,
      cost,
      netProfit,
      eventsCount: monthEvents.length,
    };
  });

  // Find max value across all months for visual scaling of bars
  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.revenue, d.cost, d.netProfit)), 1000000);

  // Calculate profit sharing aggregates
  let totalNetProfit = 0;
  events.forEach((evt) => {
    totalNetProfit += getEventFinances(evt, settings).netProfit;
  });

  const p1ShareAmt = totalNetProfit * (settings.partner1Share / 100);
  const p2ShareAmt = totalNetProfit * (settings.partner2Share / 100);
  const kasShareAmt = Math.max(0, totalNetProfit - (p1ShareAmt + p2ShareAmt));

  // Vendor statistics
  const vendorMap: Record<string, { revenue: number; count: number }> = {};
  events.forEach((evt) => {
    const v = evt.vendor || "Happylee";
    if (!vendorMap[v]) {
      vendorMap[v] = { revenue: 0, count: 0 };
    }
    vendorMap[v].revenue += evt.pemasukan;
    vendorMap[v].count += 1;
  });

  const vendorList = Object.entries(vendorMap).map(([name, stat]) => ({
    name,
    revenue: stat.revenue,
    count: stat.count,
  })).sort((a, b) => b.revenue - a.revenue);

  const maxVendorRevenue = Math.max(...vendorList.map((v) => v.revenue), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Monthly Revenue & Profit Chart (Bar Graph) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-zinc-100">Tren Finansial Per Bulan (2026)</h3>
            </div>
            {/* Guide markers */}
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                <span className="text-zinc-400">Pemasukan</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                <span className="text-zinc-400">Net Profit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-zinc-700 inline-block" />
                <span className="text-zinc-400">Operational</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-6">
            Visualisasi bulanan untuk menganalisis arus kas kotor, biaya operasional bawaan per event, dan pembagian porsi keuntungan bersih.
          </p>
        </div>

        {/* Bar Visualizer */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="relative pt-6 min-h-[350px] flex items-end justify-between gap-1 sm:gap-2 border-b border-zinc-800 pb-2 min-w-[500px] md:min-w-0">
            {monthlyData.map((d, idx) => {
              const revPercent = (d.revenue / maxVal) * 100;
              const profitPercent = (d.netProfit / maxVal) * 100;
              const costPercent = (d.cost / maxVal) * 100;

              const isHovered = hoveredBar === idx;

              return (
                <div
                  key={d.monthName}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Visual stacked/adjacent bars */}
                  <div className="w-full flex items-end justify-center gap-[2px] sm:gap-[3px] h-[160px] relative">
                    {/* Revenue Bar (Blue) */}
                    <div
                      style={{ height: `${revPercent}%` }}
                      className={`w-[4px] sm:w-[8px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? "bg-blue-400" : "bg-blue-500/60 group-hover:bg-blue-500"
                      }`}
                    />
                    {/* Profit Bar (Purple) */}
                    <div
                      style={{ height: `${profitPercent}%` }}
                      className={`w-[4px] sm:w-[8px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? "bg-purple-400" : "bg-purple-500/60 group-hover:bg-purple-500"
                      }`}
                    />
                    {/* Operational Cost Bar (Zinc) */}
                    <div
                      style={{ height: `${costPercent}%` }}
                      className={`w-[4px] sm:w-[8px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? "bg-zinc-400" : "bg-zinc-700/60 group-hover:bg-zinc-600"
                      }`}
                    />
                  </div>

                  {/* X Axis Label */}
                  <span className="text-[10px] font-mono font-medium text-zinc-500 mt-2 block group-hover:text-zinc-200">
                    {d.monthName}
                  </span>

                  {/* Micro Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-[170px] left-1/2 -translate-x-1/2 z-20 bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl shadow-xl w-[200px] pointer-events-none text-left">
                      <div className="text-[11px] font-bold text-zinc-200 mb-1.5 border-b border-zinc-800 pb-1">
                        Bulan {d.monthName} 2026
                      </div>
                      <div className="space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-450">Jumlah Event:</span>
                          <span className="text-zinc-100 font-bold">{d.eventsCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-400">Pemasukan:</span>
                          <span className="text-blue-400 font-semibold">{formatRupiah(d.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-400">Net Profit:</span>
                          <span className="text-purple-400 font-semibold">{formatRupiah(d.netProfit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Biaya Ops:</span>
                          <span className="text-zinc-300 font-semibold">{formatRupiah(d.cost)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Profit Sharing Distribution (Pie Representation) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-bold text-zinc-100">Bagi Hasil Keuntungan Bersih</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-6">
            Pembagian laba bersih kumulatif berdasarkan skema {settings.partner1Share}% & {settings.partner2Share}% serta kontribusi Kas perusahaan.
          </p>
        </div>

        {/* Custom Visual Sharing Rings */}
        <div className="flex flex-col items-center justify-center space-y-5 my-2">
          {totalNetProfit > 0 ? (
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Outer SVG circle */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#1c1c1e"
                  strokeWidth="12"
                />
                {/* Partner 1 circle segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#a855f7" // Purple
                  strokeWidth={activeDonutSegment === "p1" ? "14" : "12"}
                  strokeDasharray={`${settings.partner1Share * 2.51} 251`}
                  onMouseEnter={() => setActiveDonutSegment("p1")}
                  onMouseLeave={() => setActiveDonutSegment(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
                {/* Partner 2 circle segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#3b82f6" // Royal Blue
                  strokeWidth={activeDonutSegment === "p2" ? "14" : "12"}
                  strokeDasharray={`${settings.partner2Share * 2.51} 251`}
                  strokeDashoffset={`-${settings.partner1Share * 2.51}`}
                  onMouseEnter={() => setActiveDonutSegment("p2")}
                  onMouseLeave={() => setActiveDonutSegment(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
                {/* Kas/Company segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#06b6d4" // Cyan
                  strokeWidth={activeDonutSegment === "kas" ? "14" : "12"}
                  strokeDasharray={`${(100 - (settings.partner1Share + settings.partner2Share)) * 2.51} 251`}
                  strokeDashoffset={`-${(settings.partner1Share + settings.partner2Share) * 2.51}`}
                  onMouseEnter={() => setActiveDonutSegment("kas")}
                  onMouseLeave={() => setActiveDonutSegment(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
              </svg>

              {/* Central Information Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">Net Profit</span>
                <span className="text-base font-bold text-zinc-100 font-mono mt-0.5 leading-none">
                  {formatRupiah(totalNetProfit)}
                </span>
                <span className="text-[10px] text-blue-500 font-semibold mt-1">
                  100% Bersih
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 w-40 flex items-center justify-center border border-dashed border-zinc-800 rounded-full text-center p-4">
              <span className="text-xs text-zinc-500">Belum ada keuntungan bersih bulan ini</span>
            </div>
          )}

          {/* Details Legend and Values */}
          <div className="w-full space-y-2 mt-4">
            {/* Lunova Lighting */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "p1" ? "bg-purple-950/20" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-500 block" />
                <span className="text-xs font-semibold text-zinc-200">{settings.partner1Name}</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-950/50 px-1.5 py-0.2 rounded">
                  {settings.partner1Share}%
                </span>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(p1ShareAmt)}
              </span>
            </div>

            {/* Surya */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "p2" ? "bg-blue-950/20" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500 block" />
                <span className="text-xs font-semibold text-zinc-200">{settings.partner2Name}</span>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-950/50 px-1.5 py-0.2 rounded">
                  {settings.partner2Share}%
                </span>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(p2ShareAmt)}
              </span>
            </div>

            {/* Kas Usaha (Remaining) */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "kas" ? "bg-cyan-950/20" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-cyan-500 block" />
                <span className="text-xs font-semibold text-zinc-200">Kas Usaha</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.2 rounded">
                  {100 - (settings.partner1Share + settings.partner2Share)}%
                </span>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(kasShareAmt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vendor Performance Breakdown (Bento Board Column) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-3">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-zinc-100">Kinerja Mitra WO & Vendor (2026)</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-6">
          Daftar Wedding Organizer (WO) dan vendor utama yang paling sering memesan jasa lighting beserta total omset sewa.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorList.slice(0, 6).map((vend, idx) => {
            const pct = (vend.revenue / maxVendorRevenue) * 100;
            return (
              <div
                key={vend.name}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition-all group-shared"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 group-hover:text-blue-400 transition-colors uppercase tracking-wider">
                      {vend.name}
                    </h4>
                    <span className="text-[10px] font-semibold font-mono text-zinc-500">
                      {vend.count} Transaksi Sewa
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/25 px-2 py-0.5 rounded-full">
                    Peringkat #{idx + 1}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase">Pemasukan</span>
                    <span className="text-sm font-bold text-zinc-200 group-hover:text-white font-mono">
                      {formatRupiah(vend.revenue)}
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden font-mono">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-blue-500 h-full rounded-full transition-all duration-500 group-hover:bg-blue-400"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
