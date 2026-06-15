/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { EventData, CostSettings } from "../types";
import { getEventFinances, formatRupiah, parseDate } from "../utils";
import { CalendarRange, RotateCcw } from "lucide-react";

import { translations } from "../translations";

interface MonthlySharingProps {
  events: EventData[];
  settings: CostSettings;
  lang?: "en" | "id";
  selectedYear: string;
}

export default function MonthlySharing({ events, settings, lang = "en", selectedYear }: MonthlySharingProps) {
  const englishMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const indonesianMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const months = lang === "en" ? englishMonths : indonesianMonths;

  // Track selected Month
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Store month-by-month overrides in local storage, key format: "year_monthIndex"
  const [monthlyShares, setMonthlyShares] = useState<Record<string, { p1: string; p2: string }>>(() => {
    const saved = localStorage.getItem("lighting_monthly_shares_override_v2");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignore
      }
    }
    // Fallback: try parsing legacy
    const legacySaved = localStorage.getItem("lighting_monthly_shares_override_2026");
    if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        const migrated: Record<string, { p1: string; p2: string }> = {};
        Object.keys(parsed).forEach((key) => {
          migrated[`2026_${key}`] = parsed[key];
        });
        return migrated;
      } catch (e) {
        // Ignore
      }
    }
    return {};
  });

  const handleShareChange = (year: number, monthIdx: number, partner: 'p1' | 'p2', value: string) => {
    setMonthlyShares((prev) => {
      const key = `${year}_${monthIdx}`;
      const current = {
        p1: prev[key]?.p1 ?? "40%",
        p2: prev[key]?.p2 ?? "40%",
      };
      
      if (partner === 'p1') {
        current.p1 = value;
      } else {
        current.p2 = value;
      }
      
      const updated = { ...prev, [key]: current };
      localStorage.setItem("lighting_monthly_shares_override_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetAll = () => {
    setMonthlyShares({});
    localStorage.removeItem("lighting_monthly_shares_override_v2");
    localStorage.removeItem("lighting_monthly_shares_override_2026");
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

  // Determine which years and months to compute/display
  const yearsToShow = selectedYear === "all" ? availableYears : [Number(selectedYear)];
  const monthsToShow = selectedMonth === "all"
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [Number(selectedMonth)];

  // Compute calculated values for each of the visible month/year combinations
  const monthlyCalculations: Array<{
    year: number;
    monthIdx: number;
    monthName: string;
    eventsCount: number;
    totalNetProfit: number;
    totalRevenue: number;
    p1Selection: string;
    p2Selection: string;
    p1Percent: number;
    p2Percent: number;
    kasPercent: number;
    kasDisplayPercent: number;
    p1Share: number;
    p2Share: number;
    kasShare: number;
  }> = [];

  yearsToShow.forEach((y) => {
    monthsToShow.forEach((mIdx) => {
      const name = months[mIdx];
      const monthEvents = events.filter((evt) => {
        if (!evt.tanggal) return false;
        const dat = parseDate(evt.tanggal);
        return !isNaN(dat.getTime()) && dat.getMonth() === mIdx && dat.getFullYear() === y;
      });

      const key = `${y}_${mIdx}`;
      // Custom or default share selections
      const p1Selection = monthlyShares[key]?.p1 !== undefined ? monthlyShares[key].p1 : "40%";
      const p2Selection = monthlyShares[key]?.p2 !== undefined ? monthlyShares[key].p2 : "40%";

      let totalNetProfit = 0;
      let totalRevenue = 0;

      monthEvents.forEach((evt) => {
        const fin = getEventFinances(evt, settings);
        totalRevenue += fin.revenue;
        totalNetProfit += fin.netProfit;
      });

      // Compute numeric helper of shares based on dropdown values
      let p1Share = 0;
      if (totalNetProfit > 0) {
        if (p1Selection === "40%") {
          p1Share = totalNetProfit * 0.4;
        } else if (p1Selection === "500") {
          p1Share = 500000;
        } else if (p1Selection === "1000") {
          p1Share = 1000000;
        } else {
          const parsed = parseFloat(p1Selection);
          if (!isNaN(parsed)) {
            p1Share = parsed <= 100 ? totalNetProfit * (parsed / 100) : parsed;
          }
        }
      }

      let p2Share = 0;
      if (totalNetProfit > 0) {
        if (p2Selection === "40%") {
          p2Share = totalNetProfit * 0.4;
        } else if (p2Selection === "500") {
          p2Share = 500000;
        } else if (p2Selection === "1000") {
          p2Share = 1000000;
        } else {
          const parsed = parseFloat(p2Selection);
          if (!isNaN(parsed)) {
            p2Share = parsed <= 100 ? totalNetProfit * (parsed / 100) : parsed;
          }
        }
      }

      // Kas Usaha is computed exactly: totalNetProfit - p1Share - p2Share
      const kasShare = totalNetProfit > 0 ? (totalNetProfit - p1Share - p2Share) : 0;

      // Normalization of percentages for the progress bar distribution representation
      let p1Percent = 0;
      let p2Percent = 0;
      let kasPercent = 0;
      let kasDisplayPercent = 0;
      if (totalNetProfit > 0) {
        p1Percent = Math.max(0, Math.min(100, (p1Share / totalNetProfit) * 100));
        p2Percent = Math.max(0, Math.min(100, (p2Share / totalNetProfit) * 100));
        kasPercent = Math.max(0, 100 - p1Percent - p2Percent);
        kasDisplayPercent = (kasShare / totalNetProfit) * 100;
      }

      // Only display the card if selectedYear is "all" or selectedMonth is "all" OR there are events/profit.
      // If a specific year or month is selected, always show that month even if 0 events. 
      // If "all" is selected, only show months that have events in them to keep the screen clean.
      const shouldShow = (selectedYear !== "all" || selectedMonth !== "all") || (monthEvents.length > 0);

      if (shouldShow) {
        monthlyCalculations.push({
          year: y,
          monthIdx: mIdx,
          monthName: `${name} ${y}`,
          eventsCount: monthEvents.length,
          totalNetProfit,
          totalRevenue,
          p1Selection,
          p2Selection,
          p1Percent,
          p2Percent,
          kasPercent,
          kasDisplayPercent,
          p1Share,
          p2Share,
          kasShare
        });
      }
    });
  });

  const t = translations[lang];

  return (
    <div id="monthly-profit-sharing" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full space-y-6">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-purple-400" />
            <span>{lang === "en" ? "Monthly Profit Sharing" : "Pembagian Laba Bersih Bulanan"}</span>
          </h3>
          <p className="text-xs text-zinc-400">
            {lang === "en" ? "Adjust sharing percentages for each month directly. The system calculates distributions in real-time." : "Sesuaikan persentase pembagian hasil langsung di setiap bulan. Sistem akan otomatis kalkulasi pembagian secara real-time."}
          </p>
        </div>

        {/* Global Action & Reset */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 font-sans uppercase tracking-wider">
              {lang === "en" ? "Month:" : "Bulan:"}
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-bold outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-zinc-950 text-zinc-300">{lang === "en" ? "All Months" : "Semua Bulan"}</option>
              {months.map((name, idx) => (
                <option key={idx} value={String(idx)} className="bg-zinc-950 text-zinc-300">{name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetAll}
            className="flex items-center gap-1 text-xs font-semibold bg-zinc-950/40 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-100 text-zinc-400 px-3 py-1.5 rounded-lg transition-all cursor-pointer h-[32px]"
            title={lang === "en" ? "Reset all custom overrides to default parameters" : "Reset semua persentase ke parameter global default"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Reset Default Policy" : "Reset Kebijakan Default"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Months */}
      {monthlyCalculations.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-500 font-medium">
            {lang === "en" ? "No records found for the selected period." : "Tidak ada catatan keuangan untuk periode yang dipilih."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {monthlyCalculations.map((calc) => {
            const hasProfit = calc.totalNetProfit > 0;
            return (
              <div
                key={`${calc.year}_${calc.monthIdx}`}
                className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 group ${
                  hasProfit
                    ? "bg-zinc-950/20 border-zinc-800 hover:border-zinc-750 hover:bg-zinc-950/40"
                    : "bg-zinc-950/5 border-zinc-800/40 opacity-70 hover:opacity-100"
                }`}
              >
                {/* Card Header: Month & Events badge */}
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-zinc-50 transition-colors">
                    {calc.monthName}
                  </span>
                  
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    calc.eventsCount > 0
                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                      : "bg-zinc-800/30 text-zinc-500"
                  }`}>
                    {calc.eventsCount} {lang === "en" ? "Events" : "Event"}
                  </span>
                </div>

                {/* Net Profit Display */}
                <div className="mb-3">
                  <span className="text-[10px] text-zinc-500 font-medium block uppercase tracking-wider mb-0.5">
                    {lang === "en" ? "Total Net Profit" : "Total Laba Bersih"}
                  </span>
                  <span className={`text-base font-bold font-mono tracking-tight ${
                    hasProfit ? "text-emerald-400" : "text-zinc-500"
                  }`}>
                    {formatRupiah(calc.totalNetProfit)}
                  </span>
                </div>

                {/* Segmented Distribution Bar */}
                {hasProfit && (
                  <div className="w-full flex h-1.5 rounded-full overflow-hidden mb-3 bg-zinc-900 border border-zinc-950">
                    <div
                      style={{ width: `${calc.p1Percent}%` }}
                      className="bg-purple-500 h-full rounded-l-full"
                      title={`${settings.partner1Name}: ${formatRupiah(calc.p1Share)}`}
                    />
                    <div
                      style={{ width: `${calc.p2Percent}%` }}
                      className="bg-blue-500 h-full"
                      title={`${settings.partner2Name}: ${formatRupiah(calc.p2Share)}`}
                    />
                    <div
                      style={{ width: `${calc.kasPercent}%` }}
                      className="bg-cyan-500 h-full rounded-r-full"
                      title={`${lang === "en" ? "Enterprise Kas" : "Kas Usaha"}: ${formatRupiah(calc.kasShare)}`}
                    />
                  </div>
                )}

                {/* Shares Breakdown list */}
                <div className="space-y-1.5 text-[11px] border-t border-zinc-800/40 pt-2.5">
                  {/* Partner 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded bg-purple-500 inline-block" />
                      <span className="truncate max-w-[100px]">{settings.partner1Name}</span>
                    </div>
                    <span className={`font-semibold font-mono ${hasProfit ? "text-zinc-200" : "text-zinc-500"}`}>
                      {formatRupiah(calc.p1Share)}
                    </span>
                  </div>

                  {/* Partner 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded bg-blue-500 inline-block" />
                      <span className="truncate max-w-[100px]">{settings.partner2Name}</span>
                    </div>
                    <span className={`font-semibold font-mono ${hasProfit ? "text-zinc-200" : "text-zinc-500"}`}>
                      {formatRupiah(calc.p2Share)}
                    </span>
                  </div>

                  {/* Kas Usaha */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded bg-cyan-500 inline-block" />
                      <span>{lang === "en" ? "Enterprise Kas" : "Kas Usaha"}</span>
                    </div>
                    <span className={`font-semibold font-mono ${hasProfit ? "text-zinc-300" : "text-zinc-500"}`}>
                      {formatRupiah(calc.kasShare)}
                    </span>
                  </div>
                </div>

                {/* Inputs section for custom sharing */}
                <div className="mt-4 pt-3 border-t border-zinc-800/50 space-y-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">
                    {lang === "en" ? "Settings" : "Pengaturan Keuntungan"}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col items-center">
                      <label className="text-[9px] text-zinc-400 block font-bold text-[#727780] text-center mb-1 truncate">{settings.partner1Name}</label>
                      <select
                        value={calc.p1Selection}
                        onChange={(e) => handleShareChange(calc.year, calc.monthIdx, 'p1', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs text-zinc-100 font-mono text-center focus:outline-none focus:border-zinc-500 font-bold cursor-pointer"
                      >
                        <option value="40%">40%</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
                      </select>
                    </div>

                    <div className="flex flex-col items-center">
                      <label className="text-[9px] text-zinc-400 block font-bold text-[#727780] text-center mb-1 truncate">{settings.partner2Name}</label>
                      <select
                        value={calc.p2Selection}
                        onChange={(e) => handleShareChange(calc.year, calc.monthIdx, 'p2', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs text-zinc-100 font-mono text-center focus:outline-none focus:border-zinc-500 font-bold cursor-pointer"
                      >
                        <option value="40%">40%</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
                      </select>
                    </div>
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
