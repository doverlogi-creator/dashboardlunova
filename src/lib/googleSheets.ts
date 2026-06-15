/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventData, CostSettings } from "../types";

/**
 * Format helper for numbers (Currency & Percentage) parsed from sheet
 */
function parseCurrency(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9,-]/g, "");
  const parts = clean.split(",");
  return parseInt(parts[0], 10) || 0;
}

function parsePercentage(val: any, fallback: number): number {
  if (typeof val === "number") {
    return val <= 1 ? Math.round(val * 100) : val;
  }
  if (!val) return fallback;
  const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parses raw grid rows fetched from Google Sheets into our typed events & settings.
 */
export function parseSheetData(values: any[][], currentSettings: CostSettings): { events: EventData[]; settings: CostSettings } {
  const events: EventData[] = [];
  
  if (!values || values.length === 0) {
    return { events: [], settings: currentSettings };
  }

  // Row 0 is normally headers. Data starting at row 2 (index 1)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;
    
    // Check key data presence
    const dateStr = String(row[0] || "").trim().toLowerCase();
    const jenisPaketStr = String(row[1] || "").trim().toLowerCase();
    const vendorStr = String(row[2] || "").trim().toLowerCase();
    
    if (
      dateStr === "" || dateStr === "dd/mm/yyyy" || dateStr === "tanggal" || 
      dateStr.indexOf("total") !== -1 || dateStr.indexOf("jumlah") !== -1 ||
      jenisPaketStr.indexOf("total") !== -1 || jenisPaketStr.indexOf("jumlah") !== -1 ||
      vendorStr === "vendor/wo" || vendorStr === "vendor" ||
      vendorStr.indexOf("total") !== -1 || vendorStr.indexOf("jumlah") !== -1
    ) {
      continue;
    }
    
    const jenisPaket = String(row[1] || "").trim();
    let pemasukanVal = parseCurrency(row[5]);
    
    // Preset default price fallback if pemasukan is 0
    if (pemasukanVal === 0 && jenisPaket) {
      const packagePriceMap: Record<string, number> = {
        "paket 1": 1500000,
        "paket 1 c": 1500000,
        "paket 2": 2750000,
        "paket 2 c": 2750000,
        "paket 3": 3500000,
        "paket 3 c": 3500000
      };
      const pkgKey = jenisPaket.toLowerCase();
      if (packagePriceMap[pkgKey] !== undefined) {
        pemasukanVal = packagePriceMap[pkgKey];
      }
    }
    
    events.push({
      id: `evt-${i + 1}`, // Generate sequential i-based ID to ensure consistency
      tanggal: String(row[0] || "").trim(),
      jenisPaket: jenisPaket,
      vendor: String(row[2] || "").trim(),
      lokasi: String(row[3] || "").trim(),
      noHp: String(row[4] || "").trim(),
      pemasukan: pemasukanVal
    });
  }
  
  // Safe cell getter
  const getValSafe = (rowIndex: number, colIndex: number) => {
    if (values[rowIndex] && values[rowIndex][colIndex] !== undefined) {
      return values[rowIndex][colIndex];
    }
    return null;
  };
  
  // Map settings based on coordinates:
  // Row 2 (index 1): operasionalAcara ("Operasional / acara" in H2, value in I2/col index 8)
  // Row 3 (index 2): cashback ("Cashback" in H3, value in I3/col index 8)
  // Row 5 (index 4): karyawanAcara ("Karyawan / acara" in H5, value in I5/col index 8)
  // Row 6 (index 5): bensinAcara ("Bensin / acara" in H6, value in I6/col index 8)
  // Row 7 (index 6): pengadaanGeseluruhanKeluar ("Pengadaan Keseluruhan Keluar" in H7, value in I7/col index 8)
  // Row 9 (index 8): partner1Share in J9 (index 9), Name in K9 (index 10)
  // Row 10 (index 9): partner2Share in J10 (index 9), Name in K10 (index 10)
  const settings: CostSettings = {
    operasionalAcara: parseCurrency(getValSafe(1, 8)) || currentSettings.operasionalAcara,
    cashback: parseCurrency(getValSafe(2, 8)) || currentSettings.cashback,
    karyawanAcara: parseCurrency(getValSafe(4, 8)) || currentSettings.karyawanAcara,
    bensinAcara: parseCurrency(getValSafe(5, 8)) || currentSettings.bensinAcara,
    pengadaanKeseluruhanKeluar: parseCurrency(getValSafe(6, 8)) || currentSettings.pengadaanKeseluruhanKeluar,
    partner1Name: String(getValSafe(8, 10) || currentSettings.partner1Name).trim(),
    partner1Share: parsePercentage(getValSafe(8, 9), currentSettings.partner1Share),
    partner2Name: String(getValSafe(9, 10) || currentSettings.partner2Name).trim(),
    partner2Share: parsePercentage(getValSafe(9, 9), currentSettings.partner2Share)
  };
  
  return { events, settings };
}

/**
 * Create a brand new Google Spreadsheet with a default "Pengisian data" sheet.
 */
export async function createSpreadsheet(accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: "Pengisian data",
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create Google Spreadsheet.");
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Format events and settings into a rectangular grid array and save (PUT) to range "Pengisian data!A1:K1000".
 */
export async function saveSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  events: EventData[],
  settings: CostSettings
): Promise<void> {
  const rows: any[][] = [];
  
  // Row 1: Headers
  rows.push([
    "Tanggal",
    "Jenis Paket",
    "Vendor/WO",
    "Lokasi",
    "No. Handphone / WA",
    "Pemasukan",
    "", // Blank Col G
    "Parameter Biaya",
    "Nilai (IDR)",
    "Share (%)",
    "Nama Partner"
  ]);

  const maxRows = Math.max(events.length + 1, 12);
  
  for (let i = 1; i < maxRows; i++) {
    const row: any[] = Array(11).fill("");
    
    // Fill Event cells
    if (i - 1 < events.length) {
      const ev = events[i - 1];
      row[0] = ev.tanggal;
      row[1] = ev.jenisPaket;
      row[2] = ev.vendor;
      row[3] = ev.lokasi;
      row[4] = ev.noHp;
      row[5] = ev.pemasukan;
    }

    // Fill settings rows in columns H & I (Indices 7 & 8)
    if (i === 1) { // Row 2
      row[7] = "Operasional / acara";
      row[8] = settings.operasionalAcara;
    } else if (i === 2) { // Row 3
      row[7] = "Cashback";
      row[8] = settings.cashback;
    } else if (i === 4) { // Row 5
      row[7] = "Karyawan / acara";
      row[8] = settings.karyawanAcara;
    } else if (i === 5) { // Row 6
      row[7] = "Bensin / acara";
      row[8] = settings.bensinAcara;
    } else if (i === 6) { // Row 7
      row[7] = "Pengadaan Keseluruhan Keluar";
      row[8] = settings.pengadaanKeseluruhanKeluar;
    }

    // Fill settings rows in columns J & K (Indices 9 & 10)
    if (i === 8) { // Row 9
      row[9] = settings.partner1Share / 100; // Persentase formatted as fraction for excel compat
      row[10] = settings.partner1Name;
    } else if (i === 9) { // Row 10
      row[9] = settings.partner2Share / 100;
      row[10] = settings.partner2Name;
    }

    rows.push(row);
  }

  // Update Range with PUT
  const range = "Pengisian data!A1:K" + rows.length;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: range,
      majorDimension: "ROWS",
      values: rows,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to sync data to your spreadsheet.");
  }
}

/**
 * Fetch raw sheet data and parse it.
 */
export async function fetchSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  currentSettings: CostSettings
): Promise<{ events: EventData[]; settings: CostSettings }> {
  const range = "Pengisian data!A1:K1000";
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch spreadsheet values.");
  }

  const data = await res.json();
  return parseSheetData(data.values || [], currentSettings);
}
