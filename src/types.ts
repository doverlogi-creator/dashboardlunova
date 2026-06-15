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
  
  // Custom overrides per event (optional)
  operasionalAcara?: number;
  cashback?: number;
  karyawanAcara?: number;
  bensinAcara?: number;
}

export interface CostSettings {
  operasionalAcara: number; // raw number
  cashback: number; // raw number
  karyawanAcara: number; // raw number
  bensinAcara: number; // raw number
  pengadaanKeseluruhanKeluar: number; // raw number
  
  // Profit sharing
  partner1Name: string; // "Neovan"
  partner1Share: number; // 40 (%)
  partner2Name: string; // "Surya"
  partner2Share: number; // 40 (%)
}

export interface AppsScriptConfig {
  webAppUrl: string;
  isDemoMode?: boolean;
  lastSyncedAt?: string | null;
}
