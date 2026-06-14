import React, { useState } from "react";
import { EventData, CostSettings } from "../types";
import { parseDate, formatDateIndo, formatRupiah } from "../utils";
import { translations } from "../translations";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  Phone, 
  Tag, 
  Users, 
  DollarSign
} from "lucide-react";

interface CalendarProps {
  events: EventData[];
  settings: CostSettings;
  lang?: "en" | "id";
}

export default function Calendar({ events, settings, lang = "en" }: CalendarProps) {
  const currentRealDate = new Date();
  
  // Start view on June 2026 (or default to current year 2026 which matches mock events)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June is 5 (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthsEN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const months = lang === "en" ? monthsEN : monthsIndo;

  const weekdaysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdaysIndo = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const weekdays = lang === "en" ? weekdaysEN : weekdaysIndo;

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  // Helper to get number of days in current state month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper to get starting day of the week (0 = Sunday, 1 = Monday ...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Group events by YYYY-MM-DD
  const eventsByDate = events.reduce<Record<string, EventData[]>>((acc, evt) => {
    if (!evt.tanggal) return acc;
    try {
      const parsed = parseDate(evt.tanggal);
      const dateKey = `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(evt);
    } catch (e) {
      // Ignored
    }
    return acc;
  }, {});

  // Get events for the selected day in current month/year
  const getEventsForDay = (day: number) => {
    const key = `${currentYear}-${currentMonth}-${day}`;
    return eventsByDate[key] || [];
  };

  // Count total events in this month
  const monthEventsCount = events.filter((evt) => {
    if (!evt.tanggal) return false;
    const parsed = parseDate(evt.tanggal);
    return parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth;
  }).length;

  // Render dummy days for alignment
  const blankDays = Array(startDayIndex).fill(null);
  const actualDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Quick jump back to 2026/current real month
  const jumpToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(5); // June
    setSelectedDay(null);
  };

  const t = translations[lang];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6" id="dashboard-calendar">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/15">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-sans">{t.calendarTitle}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {t.calendarSub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Controls */}
          <button 
            type="button"
            onClick={jumpToToday}
            className="px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-[11px] font-bold rounded-lg transition-all cursor-pointer font-sans"
          >
            {t.resetToToday}
          </button>
          <div className="flex items-center bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-1 select-none">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-200 px-3 font-sans w-28 text-center min-w-[110px]">
              {months[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid - takes 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 font-mono px-1">
            <span>{lang === "en" ? "Schedule Grid" : "Grid Pengingat"}</span>
            <span className="text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-full uppercase font-bold">
              {monthEventsCount} {lang === "en" ? "Events This Month" : "Event Bulan ini"}
            </span>
          </div>

          <div className="bg-zinc-950/30 border border-zinc-800/80 rounded-xl p-3">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {weekdays.map((day, idx) => (
                <div key={idx} className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-1 font-sans">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {blankDays.map((_, idx) => (
                <div key={`blank-${idx}`} className="aspect-square bg-transparent rounded-lg" />
              ))}

              {actualDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDay === day;
                const isRealToday = currentRealDate.getDate() === day && 
                  currentRealDate.getMonth() === currentMonth && 
                  currentRealDate.getFullYear() === currentYear;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDay(day === selectedDay ? null : day);
                      } else {
                        setSelectedDay(day);
                      }
                    }}
                    type="button"
                    className={`aspect-square relative flex flex-col items-center justify-center rounded-xl text-xs font-semibold font-mono transition-all transition-duration-200 select-none cursor-pointer ${
                      isSelected 
                        ? "bg-amber-600 text-white font-bold ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950" 
                        : hasEvents
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-bold"
                          : isRealToday
                            ? "border border-zinc-500 text-white hover:bg-zinc-800/40"
                            : "text-zinc-400 bg-zinc-900/30 hover:bg-zinc-800/30 border border-transparent hover:border-zinc-800/40"
                    }`}
                  >
                    <span>{day}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-500 font-sans px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/25 block" />
              <span>{lang === "en" ? "Has rental event" : "Ada Event persewaan"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-650 block" />
              <span>{lang === "en" ? "Selected date" : "Tanggal dipilih"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-zinc-500 block" />
              <span>{lang === "en" ? "Today" : "Hari ini"}</span>
            </div>
          </div>
        </div>

        {/* Selected Day Info Board - takes 5 cols */}
        <div className="lg:col-span-5 bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-[295px] justify-between">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-sans mb-3 pb-2 border-b border-zinc-900/80">
              {selectedDay 
                ? `${lang === "en" ? "Schedule" : "Jadwal"} ${selectedDay} ${months[currentMonth]} ${currentYear}`
                : t.selectedDayDetails
              }
            </div>

            {selectedDay ? (
              (() => {
                const dayEvents = getEventsForDay(selectedDay);
                if (dayEvents.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                      <div className="p-3 bg-zinc-900/50 rounded-full border border-zinc-800">
                        <CalendarIcon className="w-5 h-5 text-zinc-600" />
                      </div>
                      <span className="text-xs font-bold text-zinc-400 font-sans">{t.noEventsToday}</span>
                      <p className="text-[10px] text-zinc-500 leading-relaxed font-sans max-w-[200px]">
                        {t.selectCalendarDay}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                    {dayEvents.map((evt, idx) => (
                      <div key={evt.id || idx} className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-3.5 space-y-3 shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/10 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                            {evt.jenisPaket || "Custom"}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {formatRupiah(evt.pemasukan)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Users className="w-3.5 h-3.5 text-zinc-400 mt-0.5" />
                            <div>
                              <span className="text-zinc-500 block text-[9px] font-bold uppercase tracking-wider">Mitra / WO</span>
                              <span className="text-zinc-100 font-bold font-sans">{evt.vendor || "Happylee"}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5" />
                            <div>
                              <span className="text-zinc-500 block text-[9px] font-bold uppercase tracking-wider">{t.location}</span>
                              <span className="text-zinc-200 leading-relaxed font-sans block text-[11px]">{evt.lokasi || "-"}</span>
                            </div>
                          </div>

                          {evt.noHp && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-zinc-400" />
                              <div className="flex-1 flex justify-between items-center">
                                <span className="text-zinc-200 font-mono text-[11px] font-medium">{evt.noHp}</span>
                                <a 
                                  href={`https://wa.me/${evt.noHp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-400 font-sans hover:underline font-bold"
                                >
                                  {lang === "en" ? "WhatsApp Call" : "Hubungi WA"}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <div className="p-3 bg-zinc-900/50 rounded-full border border-zinc-800 animate-pulse">
                  <CalendarIcon className="w-5 h-5 text-amber-500/80" />
                </div>
                <span className="text-xs font-bold text-zinc-400 font-sans">{lang === "en" ? "Please select a date" : "Silakan pilih tanggal"}</span>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans max-w-[200px]">
                  {t.selectCalendarDay}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-900/80 pt-3 mt-3 text-center">
            <span className="text-[9px] text-zinc-500 font-semibold font-mono block">
              Lighting Setup Dashboard • 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
