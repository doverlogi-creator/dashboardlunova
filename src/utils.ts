/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventData, CostSettings } from "./types";

/**
 * Format a number to IDR (Indonesian Rupiah)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert Date standard string to Indonesian style date
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return "-";
  
  try {
    const d = parseDate(dateStr);
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Parses date string from formats: DD/MM/YYYY, YYYY-MM-DD, or ISO strings
 */
export function parseDate(dateStr: string | Date): Date {
  if (!dateStr) return new Date();
  
  // Handled cell date values or Timestamp from Apps Script
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr).trim();
  
  // If ISO standard or YYYY-MM-DD
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(str);
  }
  
  // If DD/MM/YYYY
  const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // 0-based
    const year = parseInt(parts[3], 10);
    return new Date(year, month, day);
  }
  
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  
  return new Date();
}

/**
 * Get financial breakdown (Operating Cost, Partner Shares, Kas) for a list of events or a single event
 */
export function getEventFinances(event: EventData, settings: CostSettings) {
  const customOperational = settings.operasionalAcara;
  
  // Package cashback only applies if the package name ends with 'C' (case-insensitive)
  const packageType = (event.jenisPaket || "").trim();
  const hasCAtEnd = packageType.endsWith("C") || packageType.endsWith("c");
  const cashback = hasCAtEnd ? settings.cashback : 0;
  
  const runningCost = customOperational + cashback;
  const revenue = event.pemasukan;
  
  // Net profit is Revenue minus running cost
  const netProfit = Math.max(0, revenue - runningCost);
  
  // Split shares based on percentage settings
  const p1Share = netProfit * (settings.partner1Share / 100);
  const p2Share = netProfit * (settings.partner2Share / 100);
  const kasShare = netProfit - (p1Share + p2Share);
  
  return {
    revenue,
    runningCost,
    netProfit,
    p1Share,
    p2Share,
    kasShare,
    eventCashback: cashback
  };
}

/**
 * Get aggregated dashboard totals
 */
export function getDashboardTotals(events: EventData[], settings: CostSettings) {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalNetProfit = 0;
  let totalP1Share = 0;
  let totalP2Share = 0;
  let totalKasShare = 0;
  
  events.forEach((evt) => {
    const fin = getEventFinances(evt, settings);
    totalRevenue += fin.revenue;
    totalCost += fin.runningCost;
    totalNetProfit += fin.netProfit;
    totalP1Share += fin.p1Share;
    totalP2Share += fin.p2Share;
    totalKasShare += fin.kasShare;
  });
  
  // Group by distinct months to calculate monthly averages
  const uniqueMonths = Array.from(new Set(events.map((evt) => {
    if (!evt.tanggal) return "";
    const trim = evt.tanggal.trim();
    if (trim.includes("-")) {
      return trim.substring(0, 7); // e.g., "2026-05"
    }
    if (trim.includes("/")) {
      const parts = trim.split("/");
      if (parts.length === 3) {
        // e.g., "23/05/2026"
        return `${parts[2]}-${parts[1]}`;
      }
    }
    return "";
  }))).filter((m) => m !== "");
  
  const monthCount = uniqueMonths.length || 1;
  
  const averageMonthlyNetProfit = totalNetProfit / monthCount;
  
  // General procurement is subtracted from the Kas/Enterprise pool or listed as an overhead cost
  const overheadCost = settings.pengadaanKeseluruhanKeluar;
  const finalKas = totalKasShare - overheadCost;
  
  return {
    totalRevenue,
    totalCost,
    totalNetProfit,
    averageMonthlyNetProfit,
    uniqueMonthsCount: uniqueMonths.length,
    totalP1Share,
    totalP2Share,
    totalKasShare,
    overheadCost,
    finalKas,
    eventCount: events.length
  };
}

/**
 * Generate highly detailed mock events representing their lighting business based on screenshot
 */
export const MOCK_EVENTS: EventData[] = [
  {
    id: "evt-1",
    tanggal: "2026-05-23", // 23/05/2026
    jenisPaket: "Custom",
    vendor: "Happylee",
    lokasi: "Gg. 11 Mekarsari, Lempake, Kec. Sungai Pinang",
    noHp: "082213589994",
    pemasukan: 750000,
  },
  {
    id: "evt-2",
    tanggal: "2026-05-31", // 31/05/2026
    jenisPaket: "Custom",
    vendor: "Happylee",
    lokasi: "Jl. Purwodadi 30, Lempake, Kec. Samarinda Utara",
    noHp: "082213589994",
    pemasukan: 1000000,
  },
  {
    id: "evt-3",
    tanggal: "2026-06-06", // 06/06/2026
    jenisPaket: "Custom",
    vendor: "Happylee",
    lokasi: "Mugirejo, Kec. Sungai Pinang, Kota Samarinda",
    noHp: "082213589994",
    pemasukan: 1000000,
  },
  // Extra realistic events to populate the 2026 graphs with nice values
  {
    id: "evt-4",
    tanggal: "2026-01-15",
    jenisPaket: "Paket Silver",
    vendor: "Chic Decor",
    lokasi: "Sempaja Selatan, Kec. Samarinda Utara",
    noHp: "081255443321",
    pemasukan: 1500000,
  },
  {
    id: "evt-5",
    tanggal: "2026-02-12",
    jenisPaket: "Paket Gold",
    vendor: "Surya Wedding",
    lokasi: "Graha Mandiri Room, Samarinda Ilir",
    noHp: "081234567890",
    pemasukan: 2500000,
  },
  {
    id: "evt-6",
    tanggal: "2026-02-28",
    jenisPaket: "Custom Lighting Stage",
    vendor: "Happylee",
    lokasi: "Kec. Sungai Kunjang, Kota Samarinda",
    noHp: "082213589994",
    pemasukan: 1200000,
  },
  {
    id: "evt-7",
    tanggal: "2026-03-08",
    jenisPaket: "Standard Wedding",
    vendor: "Larasati WO",
    lokasi: "Loa Janan Ilir, Samarinda",
    noHp: "081399887766",
    pemasukan: 1800000,
  },
  {
    id: "evt-8",
    tanggal: "2026-04-05",
    jenisPaket: "Paket Platinum",
    vendor: "Chic Decor",
    lokasi: "Hotel Aston Ballroom, Samarinda",
    noHp: "081255443321",
    pemasukan: 4500000,
  },
  {
    id: "evt-9",
    tanggal: "2026-04-19",
    jenisPaket: "Standard Wedding",
    vendor: "Alia WO",
    lokasi: "Jl. Pemuda, Samarinda",
    noHp: "082255771100",
    pemasukan: 1800000,
  },
  {
    id: "evt-10",
    tanggal: "2026-05-10",
    jenisPaket: "Mini Stage Decor",
    vendor: "Happylee",
    lokasi: "Jl. Siradj Salman, Samarinda",
    noHp: "082213589994",
    pemasukan: 900000,
  },
  {
    id: "evt-11",
    tanggal: "2026-06-18",
    jenisPaket: "Paket Gold",
    vendor: "Pelangi WO",
    lokasi: "Auditorium Unmul, Samarinda",
    noHp: "081199884433",
    pemasukan: 2800000,
  }
];

export const DEFAULT_SETTINGS: CostSettings = {
  operasionalAcara: 300000,
  cashback: 100000,
  karyawanAcara: 250000,
  bensinAcara: 25000,
  pengadaanKeseluruhanKeluar: 7208099, // default disesuaikan dengan Column I7 (Baris 7)
  
  partner1Name: "Lunova Lighting",
  partner1Share: 40,
  partner2Name: "Surya",
  partner2Share: 40
};
