/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventData {
  id: string;
  tanggal: string; // formats like "YYYY-MM-DD" or raw "DD/MM/YYYY" from spreadsheet
  jenisPaket: string; // e.g. "Custom", "Basic", etc.
  vendor: string; // e.g. "Happylee"
  lokasi: string; // e.g. "Gg. 11 Mekarsari"
  noHp: string; // e.g. "082213589994"
  pemasukan: number; // raw number
}

export interface CostSettings {
  operasionalAcara: number; // e.g. Rp 300.000
  cashback: number; // e.g. Rp 100.000
  karyawanAcara: number; // e.g. Rp 250.000
  bensinAcara: number; // e.g. Rp 25.000
  pengadaanKeseluruhanKeluar: number; // e.g. Rp 340.000 (overall procurement cost)
  
  // Profit sharing
  partner1Name: string; // "Lunova Lighting"
  partner1Share: number; // 40 (%)
  partner2Name: string; // "Surya"
  partner2Share: number; // 40 (%)
}

export interface AppsScriptConfig {
  webAppUrl: string;
  isDemoMode: boolean;
  lastSyncedAt: string | null;
}
