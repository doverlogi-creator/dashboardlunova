/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { formatRupiah, parseDate } from "../utils";
import { EventData, CostSettings } from "../types";
import { getEventFinances } from "../utils";
import { Award, Zap, TrendingUp, Users } from "lucide-react";

import { translations } from "../translations";

interface ChartsProps {
  events: EventData[];
  settings: CostSettings;
  lang?: "en" | "id";
  selectedYear: string;
  setSelectedYear: (y: string) => void;
}

export default function Charts({ events, settings, lang = "en", selectedYear, setSelectedYear }: ChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [activeDonutSegment, setActiveDonutSegment] = useState<string | null>(null);
  const [selectedShareMonth, setSelectedShareMonth] = useState<string>("all");
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const updateMonthlyShare = (partner: "p1" | "p2", newValue: string) => {
    try {
      const saved = localStorage.getItem("lighting_monthly_shares_override_v2");
      const currentOverrides: Record<string, { p1: string; p2: string }> = saved ? JSON.parse(saved) : {};
      
      const yearToUpdate = selectedYear === "all" ? "2026" : selectedYear;
      
      if (selectedShareMonth === "all") {
        for (let m = 0; m < 12; m++) {
          const key = `${yearToUpdate}_${m}`;
          if (!currentOverrides[key]) {
            currentOverrides[key] = { p1: "40%", p2: "40%" };
          }
          currentOverrides[key][partner] = newValue;
        }
      } else {
        const key = `${yearToUpdate}_${selectedShareMonth}`;
        if (!currentOverrides[key]) {
          currentOverrides[key] = { p1: "40%", p2: "40%" };
        }
        currentOverrides[key][partner] = newValue;
      }
      
      localStorage.setItem("lighting_monthly_shares_override_v2", JSON.stringify(currentOverrides));
      setUpdateTrigger(prev => prev + 1);
    } catch (e) {
      // Ignored
    }
  };

  // Generate a range of years starting from 2026 up to 2035, and merge with any dynamic years from events
  const defaultYears = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  const eventYears = events.map((evt) => {
    if (!evt.tanggal) return null;
    const d = parseDate(evt.tanggal);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }).filter((y): y is number => y !== null);

  const availableYears = Array.from(
    new Set([...defaultYears, ...eventYears])
  ).sort((a, b) => a - b);

  // Group financial data by month (Jan - Dec)
  const monthNamesEN = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthNamesID = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const monthNames = lang === "en" ? monthNamesEN : monthNamesID;

  const monthlyData = monthNames.map((name, index) => {
    // Filter events for this month in the selected Year (if different from static 2026)
    const monthEvents = events.filter((evt) => {
      if (!evt.tanggal) return false;
      const dat = parseDate(evt.tanggal);
      if (isNaN(dat.getTime()) || dat.getMonth() !== index) return false;
      if (selectedYear === "all") return true;
      return dat.getFullYear() === Number(selectedYear);
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

  // Calculate profit sharing aggregates based on the sum of monthly values
  let totalNetProfit = 0;
  let p1ShareAmt = 0;
  let p2ShareAmt = 0;
  let kasShareAmt = 0;

  // Load monthly overrides for the selected year
  const monthlyShares: Record<number, { p1: string; p2: string }> = {};
  const savedV2 = localStorage.getItem("lighting_monthly_shares_override_v2");
  if (savedV2) {
    try {
      const parsed = JSON.parse(savedV2);
      for (let index = 0; index < 12; index++) {
        const key = `${selectedYear === "all" ? "2026" : selectedYear}_${index}`;
        if (parsed[key]) {
          monthlyShares[index] = parsed[key];
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  // Fallback to legacy structure for Year 2026
  if (selectedYear === "2026" && Object.keys(monthlyShares).length === 0) {
    const savedLegacy = localStorage.getItem("lighting_monthly_shares_override_2026");
    if (savedLegacy) {
      try {
        const parsed = JSON.parse(savedLegacy);
        Object.keys(parsed).forEach((key) => {
          const k = Number(key);
          const item = parsed[k];
          if (item) {
            let p1Val = "40%";
            let p2Val = "40%";
            if (typeof item.p1 === 'number') {
              p1Val = item.p1 === 40 ? "40%" : String(item.p1);
            } else if (typeof item.p1 === 'string') {
              p1Val = item.p1;
            }
            if (typeof item.p2 === 'number') {
              p2Val = item.p2 === 40 ? "40%" : String(item.p2);
            } else if (typeof item.p2 === 'string') {
              p2Val = item.p2;
            }
            monthlyShares[k] = { p1: p1Val, p2: p2Val };
          }
        });
      } catch (e) {
        // Ignored
      }
    }
  }

  for (let index = 0; index < 12; index++) {
    if (selectedShareMonth !== "all" && Number(selectedShareMonth) !== index) {
      continue;
    }
    const monthEvents = events.filter((evt) => {
      if (!evt.tanggal) return false;
      const dat = parseDate(evt.tanggal);
      if (isNaN(dat.getTime()) || dat.getMonth() !== index) return false;
      if (selectedYear === "all") return true;
      return dat.getFullYear() === Number(selectedYear);
    });

    let monthNetProfit = 0;
    monthEvents.forEach((evt) => {
      monthNetProfit += getEventFinances(evt, settings).netProfit;
    });

    totalNetProfit += monthNetProfit;

    const p1Selection = monthlyShares[index]?.p1 !== undefined ? monthlyShares[index].p1 : "40%";
    const p2Selection = monthlyShares[index]?.p2 !== undefined ? monthlyShares[index].p2 : "40%";

    let p1Share = 0;
    if (monthNetProfit > 0) {
      if (p1Selection === "40%") {
        p1Share = monthNetProfit * 0.4;
      } else if (p1Selection === "500") {
        p1Share = 500000;
      } else if (p1Selection === "1000") {
        p1Share = 1000000;
      } else {
        const parsed = parseFloat(p1Selection);
        if (!isNaN(parsed)) {
          p1Share = parsed <= 100 ? monthNetProfit * (parsed / 100) : parsed;
        }
      }
    }

    let p2Share = 0;
    if (monthNetProfit > 0) {
      if (p2Selection === "40%") {
        p2Share = monthNetProfit * 0.4;
      } else if (p2Selection === "500") {
        p2Share = 500000;
      } else if (p2Selection === "1000") {
        p2Share = 1000000;
      } else {
        const parsed = parseFloat(p2Selection);
        if (!isNaN(parsed)) {
          p2Share = parsed <= 100 ? monthNetProfit * (parsed / 100) : parsed;
        }
      }
    }

    const kasShare = monthNetProfit > 0 ? (monthNetProfit - p1Share - p2Share) : 0;

    p1ShareAmt += p1Share;
    p2ShareAmt += p2Share;
    kasShareAmt += kasShare;
  }

  const p1Pct = totalNetProfit > 0 ? (p1ShareAmt / totalNetProfit) * 100 : 0;
  const p2Pct = totalNetProfit > 0 ? (p2ShareAmt / totalNetProfit) * 100 : 0;
  const kasPct = totalNetProfit > 0 ? (kasShareAmt / totalNetProfit) * 100 : 0;

  let currentP1Val = "40%";
  let currentP2Val = "40%";

  if (selectedShareMonth !== "all") {
    const idx = Number(selectedShareMonth);
    currentP1Val = monthlyShares[idx]?.p1 ?? "40%";
    currentP2Val = monthlyShares[idx]?.p2 ?? "40%";
  } else {
    currentP1Val = monthlyShares[0]?.p1 ?? "40%";
    currentP2Val = monthlyShares[0]?.p2 ?? "40%";
  }

  // Vendor statistics
  const vendorMap: Record<string, { revenue: number; count: number }> = {};
  events.forEach((evt) => {
    if (!evt.tanggal) return;
    const d = parseDate(evt.tanggal);
    if (isNaN(d.getTime())) return;
    if (selectedYear !== "all" && d.getFullYear() !== Number(selectedYear)) return;

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

  const t = translations[lang];

  return (
    <div className="space-y-6">
      {/* Active Filter Info for Charts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4.5 gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-zinc-150 font-sans">
            {lang === "en" ? "Interactive Charts & Performance Analytics" : "Analisis Grafik & Performa Interaktif"}
          </h4>
          <p className="text-[11px] text-zinc-400 font-sans">
            {lang === "en" ? `Filtered for: Year ${selectedYear === "all" ? "All Time" : selectedYear}` : `Difilter untuk: Tahun ${selectedYear === "all" ? "Semua Tahun" : selectedYear}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-zinc-400 font-sans font-bold uppercase tracking-wider">{lang === "en" ? "Filter Year:" : "Filter Tahun:"}</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-zinc-950 border border-zinc-805 rounded-lg px-3.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-505 font-semibold cursor-pointer min-w-[120px]"
          >
            <option value="all">{lang === "en" ? "All Years" : "Semua Tahun"}</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Monthly Revenue & Profit Chart (Bar Graph) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-zinc-100">
                  {lang === "en" ? `Monthly Financial Trend (${selectedYear === "all" ? "All Time" : selectedYear})` : `Tren Finansial Per Bulan (${selectedYear === "all" ? "Semua Tahun" : selectedYear})`}
                </h3>
              </div>
            {/* Guide markers */}
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#5ea2ff] inline-block" />
                <span className="text-zinc-400">{t.grossRevenue}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#ff758f] inline-block" />
                <span className="text-zinc-400">{t.netProfit}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#f2a154] inline-block" />
                <span className="text-zinc-400">{t.operasionalAcara}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-6">
            {t.chartRevenueSub}
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
                        isHovered ? "bg-[#82b4ff]" : "bg-[#5ea2ff]/70 group-hover:bg-[#5ea2ff]"
                      }`}
                    />
                    {/* Profit Bar (Pink/Coral) */}
                    <div
                      style={{ height: `${profitPercent}%` }}
                      className={`w-[4px] sm:w-[8px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? "bg-[#ff9ebb]" : "bg-[#ff758f]/70 group-hover:bg-[#ff758f]"
                      }`}
                    />
                    {/* Operational Cost Bar (Gold) */}
                    <div
                      style={{ height: `${costPercent}%` }}
                      className={`w-[4px] sm:w-[8px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? "bg-[#ffbf7a]" : "bg-[#f2a154]/70 group-hover:bg-[#f2a154]"
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
                        {lang === "en" ? `${d.monthName} 2026` : `Bulan ${d.monthName} 2026`}
                      </div>
                      <div className="space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-450">{lang === "en" ? "Total Events:" : "Jumlah Event:"}</span>
                          <span className="text-zinc-100 font-bold">{d.eventsCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-400">{t.grossRevenue}:</span>
                          <span className="text-blue-400 font-semibold">{formatRupiah(d.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-400">{t.netProfit}:</span>
                          <span className="text-purple-400 font-semibold">{formatRupiah(d.netProfit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">{lang === "en" ? "Ops Cost" : "Biaya Ops"}:</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-zinc-850 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-base font-bold text-zinc-100">{t.chartContributionTitle}</h3>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">{lang === "en" ? "Month:" : "Bulan:"}</span>
              <select
                value={selectedShareMonth}
                onChange={(e) => setSelectedShareMonth(e.target.value)}
                className="bg-zinc-950 border border-zinc-805 rounded-lg px-2.5 py-1 text-[11px] text-zinc-350 outline-none focus:border-purple-500 font-semibold cursor-pointer min-w-[110px]"
              >
                <option value="all">{lang === "en" ? "All Months" : "Semua Bulan"}</option>
                {monthNames.map((name, idx) => (
                  <option key={idx} value={String(idx)}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-6">
            {t.chartContributionSub}
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
                  stroke="#ff758f" // Pinkish coral
                  strokeWidth={activeDonutSegment === "p1" ? "14" : "12"}
                  strokeDasharray={`${p1Pct * 2.51} 251`}
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
                  stroke="#5ea2ff" // Light royal blue
                  strokeWidth={activeDonutSegment === "p2" ? "14" : "12"}
                  strokeDasharray={`${p2Pct * 2.51} 251`}
                  strokeDashoffset={`-${p1Pct * 2.51}`}
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
                  stroke="#f2a154" // Warm gold/orange
                  strokeWidth={activeDonutSegment === "kas" ? "14" : "12"}
                  strokeDasharray={`${kasPct * 2.51} 251`}
                  strokeDashoffset={`-${(p1Pct + p2Pct) * 2.51}`}
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
                <span className="text-[10px] text-[#5ea2ff] font-semibold mt-1">
                  100% {lang === "en" ? "Net" : "Bersih"}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 w-40 flex items-center justify-center border border-dashed border-zinc-800 rounded-full text-center p-4">
              <span className="text-xs text-zinc-500">{lang === "en" ? "No net profit yet this month" : "Belum ada keuntungan bersih bulan ini"}</span>
            </div>
          )}

          {/* Details Legend and Values */}
          <div className="w-full space-y-2 mt-4">
            {/* Lunova Lighting */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "p1" ? "bg-[#ff758f]/10" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#ff758f] block" />
                <span className="text-xs font-semibold text-zinc-200">{settings.partner1Name}</span>
                <select
                  value={currentP1Val}
                  onChange={(e) => updateMonthlyShare("p1", e.target.value)}
                  className="bg-zinc-950 border border-[#ff758f]/30 hover:border-[#ff758f]/60 text-[#ff758f] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono outline-none cursor-pointer focus:ring-1 focus:ring-[#ff758f]/50"
                >
                  <option value="40%" className="bg-zinc-950 text-zinc-350">40% ({Math.round(p1Pct)}%)</option>
                  <option value="500" className="bg-zinc-950 text-zinc-350">{lang === "en" ? "500k Flat" : "Rp500rb Flat"}</option>
                  <option value="1000" className="bg-zinc-950 text-zinc-350">{lang === "en" ? "1M Flat" : "Rp1jt Flat"}</option>
                </select>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(p1ShareAmt)}
              </span>
            </div>

            {/* Surya */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "p2" ? "bg-[#5ea2ff]/10" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#5ea2ff] block" />
                <span className="text-xs font-semibold text-[#bebfc6]">{settings.partner2Name}</span>
                <select
                  value={currentP2Val}
                  onChange={(e) => updateMonthlyShare("p2", e.target.value)}
                  className="bg-zinc-950 border border-[#5ea2ff]/30 hover:border-[#5ea2ff]/60 text-[#5ea2ff] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono outline-none cursor-pointer focus:ring-1 focus:ring-[#5ea2ff]/50"
                >
                  <option value="40%" className="bg-zinc-950 text-zinc-350">40% ({Math.round(p2Pct)}%)</option>
                  <option value="500" className="bg-zinc-950 text-zinc-350">{lang === "en" ? "500k Flat" : "Rp500rb Flat"}</option>
                  <option value="1000" className="bg-zinc-950 text-zinc-300">{lang === "en" ? "1M Flat" : "Rp1jt Flat"}</option>
                </select>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(p2ShareAmt)}
              </span>
            </div>

            {/* Kas Usaha (Remaining) */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                activeDonutSegment === "kas" ? "bg-[#f2a154]/10" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#f2a154] block" />
                <span className="text-xs font-semibold text-[#bebfc6]">{lang === "en" ? "Enterprise Kas" : "Kas Usaha"}</span>
                <span className="text-[10px] font-bold text-[#f2a154] bg-[#f2a154]/10 px-1.5 py-0.5 rounded font-mono" title={lang === "en" ? "Adjusts automatically" : "Menyesuaikan otomatis"}>
                  {Math.round(kasPct)}% {lang === "en" ? "(Auto)" : "(Sisa)"}
                </span>
              </div>
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {formatRupiah(kasShareAmt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export function VendorPerformance({ events, lang = "en" }: { events: EventData[]; lang?: "en" | "id" }) {
  // Vendor statistics
  const vendorMap: Record<string, { revenue: number; count: number }> = {};
  events.forEach((evt) => {
    const v = evt.vendor || "Happylee";
    if (!vendorMap[v]) {
      vendorMap[v] = { revenue: 0, count: 0 };
    }
    const p = typeof evt.pemasukan === "number" ? evt.pemasukan : Number(evt.pemasukan) || 0;
    vendorMap[v].revenue += p;
    vendorMap[v].count += 1;
  });

  const vendorList = Object.entries(vendorMap).map(([name, stat]) => ({
    name,
    revenue: stat.revenue,
    count: stat.count,
  })).sort((a, b) => b.revenue - a.revenue);

  const maxVendorRevenue = Math.max(...vendorList.map((v) => v.revenue), 1);
  const t = translations[lang];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-blue-500" />
        <h3 className="text-base font-bold text-zinc-100">{lang === "en" ? "Wedding Organizer & Vendor Performance" : "Kinerja Mitra WO & Vendor"}</h3>
      </div>
      <p className="text-xs text-zinc-400 mb-6">
        {lang === "en" ? "List of Wedding Organizers (WO) and key vendors with total reservation count and cumulative revenue contribution." : "Daftar Wedding Organizer (WO) dan vendor utama yang paling sering memesan jasa lighting beserta total omset sewa."}
      </p>

      {vendorList.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          {lang === "en" ? "No transaction data available yet" : "Belum ada data transaksi untuk dianalisis"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorList.slice(0, 6).map((vend, idx) => {
            const pct = (vend.revenue / maxVendorRevenue) * 100;
            return (
              <div
                key={vend.name}
                className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-950/80 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors uppercase tracking-wider truncate mb-1">
                      {vend.name}
                    </h4>
                    <span className="text-[10px] font-semibold font-mono text-zinc-500">
                      {vend.count} {lang === "en" ? "Rentals" : "Transaksi Sewa"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/25 px-2 py-0.5 rounded-full shrink-0">
                    {lang === "en" ? `Rank #${idx + 1}` : `Peringkat #${idx + 1}`}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase">{lang === "en" ? "Income" : "Pemasukan"}</span>
                    <span className="text-sm font-bold text-zinc-200 group-hover:text-white font-mono transition-colors">
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
      )}
    </div>
  );
}
