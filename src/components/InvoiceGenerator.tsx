import { useState, useEffect } from "react";
import {
  Printer,
  Plus,
  Trash2,
  Save,
  Search,
  ArrowLeft,
  FileText,
  Check,
  Building,
  Calendar,
  MapPin,
  Phone,
  DollarSign,
  Info,
  Sliders,
  Sparkles
} from "lucide-react";
import { EventData, CostSettings } from "../types";
import { formatRupiah, formatDateIndo } from "../utils";

interface InvoiceGeneratorProps {
  events: EventData[];
  settings: CostSettings;
  onBack: () => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  price: number;
  qty: number;
  type: "Jasa" | "Rental";
}

export default function InvoiceGenerator({ events, settings, onBack }: InvoiceGeneratorProps) {
  // --- STATE FOR SELECTED EVENT ---
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // --- ACTIONS STATE ---
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [vendorWO, setVendorWO] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [jenisPaket, setJenisPaket] = useState("");
  
  // Invoice line items (dynamic table with Qty & Type)
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [taxValue, setTaxValue] = useState<string>("-");

  // Preset settings for Bank & Company
  const [bankName, setBankName] = useState("Bank BCA");
  const [accountNo, setAccountNo] = useState("1026 8674 6573");
  const [accountOwner, setAccountOwner] = useState("Lunova_Project");
  const [companyName, setCompanyName] = useState("Lunova");
  const [companySubtitle, setCompanySubtitle] = useState("Project");
  const [companyAddress, setCompanyAddress] = useState("Jl. Purwodadi, Samarinda, Kaltim");
  const [companyPhone, setCompanyPhone] = useState("0822-1358-9994");
  const [notes, setNotes] = useState("Syarat & Ketentuan:\n1. Pembayaran DP minimal 30% sebagai booking tanggal.\n2. Pelunasan H-1 sebelum loading/acara dimulakan.\n3. Transfer hanya sah ke rekening tertera.");
  
  const [showConfig, setShowConfig] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // --- INITIAL LOAD PERSISTED BANK/COMPANY PRESETS ---
  useEffect(() => {
    const savedConfig = localStorage.getItem("billing_invoice_presets");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.bankName) setBankName(parsed.bankName);
        if (parsed.accountNo) setAccountNo(parsed.accountNo);
        if (parsed.accountOwner) setAccountOwner(parsed.accountOwner);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.companySubtitle) setCompanySubtitle(parsed.companySubtitle);
        if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress);
        if (parsed.companyPhone) setCompanyPhone(parsed.companyPhone);
        if (parsed.notes) setNotes(parsed.notes);
      } catch (e) {
        console.error(e);
      }
    }

    // Set default invoice date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setInvoiceDate(`${yyyy}-${mm}-${dd}`);

    // Set default invoice number
    const randNum = String(Math.floor(100 + Math.random() * 900));
    setInvoiceNo(`INV/${yyyy}${mm}${dd}-${randNum}`);
  }, []);

  // --- SAVE BANK/COMPANY PRESETS ---
  const handleSavePresets = () => {
    const dataToSave = {
      bankName,
      accountNo,
      accountOwner,
      companyName,
      companySubtitle,
      companyAddress,
      companyPhone,
      notes
    };
    localStorage.setItem("billing_invoice_presets", JSON.stringify(dataToSave));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // --- SELECT AN EVENT TO FILL INVOICE ---
  const handleSelectEvent = (evtId: string) => {
    setSelectedEventId(evtId);
    if (!evtId) {
      setClientName("");
      setVendorWO("");
      setClientPhone("");
      setEventDate("");
      setEventLocation("");
      setJenisPaket("");
      setItems([]);
      setDownPayment(0);
      return;
    }

    const matched = events.find((e) => e.id === evtId);
    if (matched) {
      setClientName(matched.vendor || "");
      setVendorWO(matched.vendor || "");
      setClientPhone(matched.noHp || "");
      setEventDate(matched.tanggal || "");
      setEventLocation(matched.lokasi || "");
      setJenisPaket(matched.jenisPaket || "Custom");
      
      // Seed initial item list split into Jasa (Base packet)
      setItems([
        {
          id: "item-base",
          description: `Jasa Sewa Lighting Paket: ${matched.jenisPaket}`,
          price: matched.pemasukan,
          qty: 1,
          type: "Jasa"
        }
      ]);
      
      // Auto down payment calculation (standard 30% of total if applicable)
      const calculatedDP = Math.round(matched.pemasukan * 0.3 / 100000) * 100000 || 0;
      setDownPayment(calculatedDP);

      // Create an invoice number relative to the event
      const cleanDate = matched.tanggal.replace(/[-/]/g, "");
      setInvoiceNo(`INV/${cleanDate}/${matched.id.slice(4, 9).toUpperCase()}`);
    }
  };

  // --- ADD ITEM TO INVOICE TABLE ---
  const handleAddItem = (type: "Jasa" | "Rental") => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: type === "Jasa" ? "Instalasi / Pasang Bongkar Jasa" : "Alat Sewa / Moving Head Add-on",
      price: 0,
      qty: 1,
      type
    };
    setItems([...items, newItem]);
  };

  // --- DELETE ITEM FROM INVOICE TABLE ---
  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // --- UPDATE ITEM FIELD ---
  const handleUpdateItem = (id: string, field: "description" | "price" | "qty" | "type", value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: (field === "price" || field === "qty") ? Number(value) : value
          };
        }
        return item;
      })
    );
  };

  // --- CALCULATE SUMMARY ---
  const jasaItems = items.filter(it => it.type === "Jasa");
  const rentalItems = items.filter(it => it.type === "Rental");

  const subtotalJasa = jasaItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const subtotalRental = rentalItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const subtotal = subtotalJasa + subtotalRental;
  
  // Total can subtract down payment if the user desires, 
  // or show complete total amount. Let's make total show final due.
  const finalTotal = subtotal;

  // For high precision rendering matching the spreadsheet layout:
  // Jasa list (padded to minimum 3 rows)
  const renderedJasaRows = [...jasaItems];
  while (renderedJasaRows.length < 3) {
    renderedJasaRows.push({
      id: `placeholder-jasa-${renderedJasaRows.length}`,
      description: "",
      price: 0,
      qty: 0,
      type: "Jasa"
    });
  }

  // Rental list (padded to minimum 12 rows)
  const renderedRentalRows = [...rentalItems];
  while (renderedRentalRows.length < 11) {
    renderedRentalRows.push({
      id: `placeholder-rental-${renderedRentalRows.length}`,
      description: "",
      price: 0,
      qty: 0,
      type: "Rental"
    });
  }

  // --- TRIGGER BROWSER PRINT ---
  const handlePrint = () => {
    window.print();
  };

  // Filter events based on search query
  const filteredEvents = events.filter(
    (e) =>
      e.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jenisPaket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.lokasi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                Dokumen Resmi
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Kwitansi & Invoice</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 flex items-center gap-2 mt-0.5">
              <span>Halaman Transaksi & Invoice (A5)</span>
              <FileText className="w-5.5 h-5.5 text-emerald-500 shrink-0" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              showConfig
                ? "bg-zinc-800 text-white border-zinc-700"
                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{showConfig ? "Tutup Parameter Bank" : "Konfigurasi Rekening & Kop"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF (Kertas A5)</span>
          </button>
        </div>
      </div>

      {/* PARAMETERS SETTING DRAWER */}
      {showConfig && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn text-zinc-300">
          {/* Company Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
              Identitas & Kop Surat
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Nama Brand Kop
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Sub Brand Kop
                </label>
                <input
                  type="text"
                  value={companySubtitle}
                  onChange={(e) => setCompanySubtitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Alamat Kantor / Gudang
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                No HP / Kontak Kop
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment Account Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
              Detail Akun Transfer Pembayaran (Kiri Bawah)
            </h4>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Nama Akun Pembayaran
              </label>
              <input
                type="text"
                value={accountOwner}
                onChange={(e) => setAccountOwner(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Nomor Rujukan Rekening
              </label>
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Catatan Info Tambahan Bank
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Standard BCA / Mandiri"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* S&K and Save */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                Catatan / Syarat Ketentuan (Tengah Bawah)
              </h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-sans resize-none"
              />
            </div>
            
            <button
              onClick={handleSavePresets}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 animate-scaleUp" />
                  <span>Berhasil Disimpan Ke Browser!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan Default</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TWO COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROLS & EVENT SELECTOR */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* QUICK CHOOSE EVENT */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-500" />
                <span>Pilih Data Event Penyelarasan</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Auto Fill Form</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cari WO, vendor, lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5" />
            </div>

            {/* EVENT DROPDOWN SELECTOR */}
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 select-none">
              <div
                onClick={() => handleSelectEvent("")}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedEventId === ""
                    ? "bg-zinc-800/60 border-zinc-600 text-white"
                    : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-900/40"
                }`}
              >
                <p className="font-semibold text-zinc-300">Form Kosong (Input Manual)</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Membuat kwitansi / invoice dari nol</p>
              </div>

              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedEventId === evt.id
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md"
                      : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-200 block truncate max-w-[200px]">{evt.vendor}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{evt.tanggal}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px] text-zinc-550">
                    <span className="truncate max-w-[220px]">Paket: {evt.jenisPaket}</span>
                    <span className="font-mono font-bold text-zinc-350">{formatRupiah(evt.pemasukan)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EDIT FORM MANUALLY */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 border-b border-zinc-800 pb-2">
              Edit data Sheet Invoice
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Nomor Invoice
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Tanggal Invoice / Acara
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Kepada (Client Name)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Bpk. Agus & Ibu Nina"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Jenis Paket
                </label>
                <input
                  type="text"
                  value={jenisPaket}
                  onChange={(e) => {
                    const val = e.target.value;
                    setJenisPaket(val);
                    setItems((prev) =>
                      prev.map((item) => {
                        if (item.id === "item-base") {
                          let matchedPrice = item.price;
                          const isCustom = val.toLowerCase().includes("custom") || val.toLowerCase().includes("costum");
                          if (!isCustom && val.trim() !== "") {
                            const matchedEvent = events.find(
                              (evt) => evt.jenisPaket.trim().toLowerCase() === val.trim().toLowerCase()
                            );
                            if (matchedEvent) {
                              matchedPrice = matchedEvent.pemasukan;
                            }
                          }
                          return {
                            ...item,
                            description: `Jasa Sewa Lighting Paket: ${val}`,
                            price: matchedPrice,
                          };
                        }
                        return item;
                      })
                    );
                  }}
                  placeholder="e.g. Platinum Custom"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  No Handphone / WA
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. 08221xxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Tanggal Acara Text
                </label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="e.g. 23 Juni 2026"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Lokasi Acara / Gedung
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Hotel Aston, Samarinda"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>

            {/* ITEMIZATION SECTION SPLIT */}
            <div className="border-t border-zinc-800 pt-3 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="text-amber-400 font-mono">1. KATEGORI JASA (Max 3 baris)</span>
                  <button
                    onClick={() => handleAddItem("Jasa")}
                    className="flex items-center gap-1 text-amber-500 hover:text-amber-400 cursor-pointer text-[10px] uppercase font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Jasa</span>
                  </button>
                </div>

                {jasaItems.length === 0 ? (
                  <div className="text-center py-2.5 bg-zinc-950 rounded-lg border border-zinc-900 text-zinc-500 text-[11px]">
                    Tidak ada item Jasa khusus.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {jasaItems.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-center bg-zinc-950 p-2 rounded-lg border border-zinc-900 text-xs">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-zinc-200 outline-none p-0.5"
                            placeholder={`Rincian Jasa #${index + 1}`}
                          />
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-1 text-zinc-400 font-mono">
                              <span>Rp</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleUpdateItem(item.id, "price", e.target.value)}
                                className="bg-transparent border-none text-xs text-zinc-300 font-mono outline-none p-0.5 w-[110px]"
                                placeholder="Harga Satuan"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                              <span>Qty:</span>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)}
                                className="bg-zinc-900 text-center rounded border border-zinc-800 text-xs text-zinc-300 font-mono outline-none px-1 py-0.5 w-[40px]"
                                placeholder="1"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-zinc-650 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="text-cyan-400 font-mono">2. KATEGORI RENTAL (Max 11 baris)</span>
                  <button
                    onClick={() => handleAddItem("Rental")}
                    className="flex items-center gap-1 text-cyan-500 hover:text-cyan-400 cursor-pointer text-[10px] uppercase font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Rental</span>
                  </button>
                </div>

                {rentalItems.length === 0 ? (
                  <div className="text-center py-2.5 bg-zinc-950 rounded-lg border border-zinc-900 text-zinc-500 text-[11px]">
                    Tidak ada item sewa alat khusus.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {rentalItems.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-center bg-zinc-950 p-2 rounded-lg border border-zinc-900 text-xs">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-zinc-200 outline-none p-0.5"
                            placeholder={`Alat Rental #${index + 1}`}
                          />
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-1 text-zinc-300 font-mono">
                              <span>Rp</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleUpdateItem(item.id, "price", e.target.value)}
                                className="bg-transparent border-none text-xs text-zinc-300 font-mono outline-none p-0.5 w-[110px]"
                                placeholder="Harga Satuan"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                              <span>Qty:</span>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)}
                                className="bg-zinc-900 text-center rounded border border-zinc-800 text-xs text-zinc-300 font-mono outline-none px-1 py-0.5 w-[40px]"
                                placeholder="1"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-zinc-650 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* UP-FRONT DEPOSIT CONTROL */}
            <div className="border-t border-zinc-800 pt-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Uang Muka / DP Terbayar
                </label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-250 font-mono outline-none focus:border-emerald-500"
                  placeholder="0"
                />
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW ASPECT A5 PAPER */}
        <div className="lg:col-span-7 flex flex-col items-center w-full overflow-hidden">
          <span className="text-xs text-zinc-500 mb-2 block font-mono text-center">
            Preview Simulasi Kertas A5 (Fidelitas Cetak)
          </span>

          <div className="w-full overflow-x-auto pb-4 flex justify-start sm:justify-center scrollbar-thin">
            {/* OUTLINE BOX CORRESPONDING TO A5 RATIO */}
            <div className="w-[560px] shrink-0 bg-white text-zinc-900 border border-zinc-300 select-none shadow-2xl relative select-text" style={{ contentVisibility: "auto" }}>
            
            {/* WRAPPER FOR PRINT TARGET */}
            <div id="invoice-print-area" className="p-7 font-sans bg-white leading-tight flex flex-col justify-between" style={{ minHeight: "780px", aspectRatio: "1 / 1.414" }}>
              
              {/* TOP INNER BRAND COOP */}
              <div className="space-y-4">
                
                {/* Header Logo */}
                <div className="flex justify-between items-center pb-2">
                  <div>
                    <h1 className="text-3xl font-bold tracking-normal text-zinc-900 font-sans" style={{ fontFamily: "Arial, sans-serif" }}>
                      Invoice
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div className="leading-none">
                      <h2 className="text-2xl font-bold text-zinc-950 tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>
                        {companyName}
                      </h2>
                      <p className="text-xs text-zinc-700 tracking-widest uppercase font-medium mt-0.5">
                        {companySubtitle}
                      </p>
                    </div>
                    {/* High-fidelity Lunova Project SVG Logo with dual spotlight beams & symmetric crescent wings */}
                    <div className="w-12 h-12 flex items-center justify-center bg-white shrink-0 select-none">
                      <svg viewBox="0 0 100 100" className="w-11 h-11">
                        {/* Outer thin black circle */}
                        <circle cx="50" cy="50" r="48" fill="none" stroke="black" strokeWidth="1.5" />
                        {/* Inner white gap ring */}
                        <circle cx="50" cy="50" r="45" fill="white" />
                        {/* Thick black circle ring */}
                        <circle cx="50" cy="50" r="43.2" fill="none" stroke="black" strokeWidth="2.5" />
                        {/* Central white canvas */}
                        <circle cx="50" cy="50" r="41" fill="white" />
                        
                        {/* Left Wing Crescent */}
                        <path d="M 31 15 C 22 20 14 32 14 50 C 14 72 32 86 50 86 C 41 84 27 76 23 58 C 20 44 26 28 31 15 Z" fill="black" />
                        
                        {/* Right Wing Crescent */}
                        <path d="M 69 15 C 78 20 86 32 86 50 C 86 72 68 86 50 86 C 59 84 73 76 77 58 C 80 44 74 28 69 15 Z" fill="black" />
                        
                        {/* Bottom Swooshes with white gap separator */}
                        <path d="M 28 58 C 42 75 58 75 72 58 C 58 66 42 66 28 58 Z" fill="black" />
                        <path d="M 35 68 C 45 78 55 78 65 68 C 55 73 45 73 35 68 Z" fill="black" />
                        <path d="M 40 76 C 46 82 54 82 60 76 C 54 78 46 78 40 76 Z" fill="black" />

                        {/* Translucent pale yellow spotlight beams shining down from top center */}
                        <polygon points="36,6 44,6 23,94 10,82" fill="#FEFAD4" opacity="0.45" style={{ mixBlendMode: "multiply" }} />
                        <polygon points="64,6 56,6 77,94 90,82" fill="#FEFAD4" opacity="0.45" style={{ mixBlendMode: "multiply" }} />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-950 my-1"></div>

                {/* Bill To & Event Details Form cells styled exactly like a printed spreadsheet */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px] leading-relaxed py-1">
                  
                  {/* Left Column Fields */}
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-zinc-950">Kepada :</span>
                      <div className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 flex items-center justify-between text-zinc-900 min-h-[24px]">
                        <span className="font-semibold">{clientName || " "}</span>
                        <span className="text-[8px] text-zinc-400">▼</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="font-bold text-zinc-950">Lokasi Acara :</span>
                      <div className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 flex items-center justify-between text-zinc-900 min-h-[24px]">
                        <span className="font-semibold truncate max-w-[195px]">{eventLocation || " "}</span>
                        <span className="text-[8px] text-zinc-400">▼</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Fields */}
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-zinc-950">Tanggal :</span>
                      <div className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 flex items-center justify-between text-zinc-900 min-h-[24px]">
                        <span className="font-mono font-semibold">{eventDate || formatDateIndo(invoiceDate)}</span>
                        <span className="text-[8px] text-zinc-400">▼</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="font-bold text-zinc-950">Jenis Paket :</span>
                      <div className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 flex items-center justify-between text-zinc-900 min-h-[24px]">
                        <span className="font-semibold">{jenisPaket || " "}</span>
                        <span className="text-[8px] text-zinc-400">▼</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table with alternating dotted backgrounds like the spreadsheet screenshot */}
                <div className="pt-2">
                  {/* Double bordered styled Table header */}
                  <div className="border-t-2 border-zinc-950 border-b-2 border-zinc-950 py-1.5 flex justify-between text-[11px] font-bold text-zinc-950 bg-white">
                    <div className="w-[45%] pl-4">Keterangan</div>
                    <div className="w-[20%] text-center">Harga</div>
                    <div className="w-[15%] text-center">Jumlah</div>
                    <div className="w-[20%] text-right pr-4">Total</div>
                  </div>

                  {/* 1. JASA SECTION */}
                  <div className="text-[10px]">
                    <div className="font-bold py-1 px-4 bg-white text-zinc-950 select-none">
                      Jasa
                    </div>
                    
                    {renderedJasaRows.map((row, idx) => {
                      const isPlaceholder = !row.description;
                      const hasPrice = row.price > 0 && row.qty > 0;
                      return (
                        <div
                          key={row.id}
                          className={`flex justify-between items-center py-1.5 border-b border-dotted border-zinc-350 text-zinc-900 ${
                            idx % 2 === 1 ? "bg-zinc-100/60" : "bg-white"
                          }`}
                        >
                          {/* Keterangan */}
                          <div className="w-[45%] pl-4 font-normal truncate">
                            {isPlaceholder ? " " : row.description}
                          </div>
                          {/* Harga */}
                          <div className="w-[20%] text-center font-mono text-[9.5px]">
                            {isPlaceholder || !hasPrice ? " " : formatRupiah(row.price)}
                          </div>
                          {/* Jumlah */}
                          <div className="w-[15%] text-center font-mono">
                            {isPlaceholder || !hasPrice ? " " : row.qty}
                          </div>
                          {/* Total */}
                          <div className="w-[20%] text-right pr-4 font-mono font-bold text-zinc-950 text-[9.5px]">
                            {isPlaceholder || !hasPrice ? " " : formatRupiah(row.price * row.qty)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. RENTAL SECTION */}
                  <div className="text-[10px] mt-1">
                    <div className="font-bold py-1 px-4 bg-white text-zinc-950 select-none">
                      Rental
                    </div>
                    
                    {renderedRentalRows.map((row, idx) => {
                      const isPlaceholder = !row.description;
                      const hasPrice = row.price > 0 && row.qty > 0;
                      return (
                        <div
                          key={row.id}
                          className={`flex justify-between items-center py-1 border-b border-dotted border-zinc-350 text-zinc-900 ${
                            idx % 2 === 1 ? "bg-zinc-100/60" : "bg-white"
                          }`}
                        >
                          {/* Keterangan */}
                          <div className="w-[45%] pl-4 font-normal truncate">
                            {isPlaceholder ? " " : row.description}
                          </div>
                          {/* Harga */}
                          <div className="w-[20%] text-center font-mono text-[9.5px]">
                            {isPlaceholder || !hasPrice ? " " : formatRupiah(row.price)}
                          </div>
                          {/* Jumlah */}
                          <div className="w-[15%] text-center font-mono">
                            {isPlaceholder || !hasPrice ? " " : row.qty}
                          </div>
                          {/* Total */}
                          <div className="w-[20%] text-right pr-4 font-mono font-bold text-zinc-950 text-[9.5px]">
                            {isPlaceholder || !hasPrice ? " " : formatRupiah(row.price * row.qty)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub Total table aligned bottom right precisely */}
                <div className="grid grid-cols-12 gap-4 items-start pt-2">
                  <div className="col-span-6">
                    {/* Payments Copy */}
                    <div className="text-[10px] text-zinc-900 space-y-1">
                      <p className="font-bold text-zinc-950">Pembayaran :</p>
                      <div className="grid grid-cols-[55px_1fr] text-[10px] gap-y-0.5">
                        <span className="text-zinc-650">Nama</span>
                        <span className="font-bold text-zinc-950">: {accountOwner}</span>
                        <span className="text-zinc-650">No. Rek</span>
                        <span className="font-mono font-bold text-zinc-950">: {accountNo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-6 text-[10px] space-y-1.5 pl-4">
                    <div className="flex justify-between items-center text-zinc-900 border-b border-zinc-100 pb-0.5">
                      <span className="font-medium text-zinc-850">Sub Total :</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-zinc-950">
                        <span>{formatRupiah(subtotal)}</span>
                        <span className="text-[7px] text-zinc-400">▼</span>
                      </div>
                    </div>
                    
                    {downPayment > 0 && (
                      <div className="flex justify-between items-center text-zinc-900 border-b border-zinc-100 pb-0.5">
                        <span className="font-medium text-zinc-650">DP Terbayar :</span>
                        <div className="font-mono text-zinc-600">
                          - {formatRupiah(downPayment)}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px] font-bold text-zinc-950">
                      <span className="uppercase text-zinc-950">Total :</span>
                      <div className="flex items-center gap-1 font-mono text-[12px] text-zinc-950">
                        <span>{formatRupiah(finalTotal - downPayment)}</span>
                        <span className="text-[7px] text-zinc-400">▼</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* BOTTOM SIGNATURES, TERMS & CONGRATULATION LOGS */}
              <div className="pt-2 space-y-3">
                
                {/* Terms and Conditions (Light font) */}
                <div className="text-[8px] text-zinc-500 leading-normal text-center max-w-[340px] mx-auto whitespace-pre-wrap select-none opacity-80 font-sans border-t border-zinc-100 pt-1.5">
                  {notes}
                </div>

                {/* Sign Stamp Area */}
                <div className="flex justify-between pt-2 px-2 text-[10px]">
                  {/* Left Bottom greeting block */}
                  <div className="text-zinc-900 text-left leading-tight font-black select-none" style={{ fontFamily: "Arial, sans-serif" }}>
                    <p className="text-zinc-950 uppercase tracking-tight text-[11px]">Terima Kasih Atas</p>
                    <p className="text-zinc-950 uppercase tracking-tight text-[11px]">Kepercayaan Kalian</p>
                    <p className="text-zinc-950 uppercase tracking-tight text-[11px]">Telah Memilih Kami</p>
                  </div>

                  <div className="text-center w-[130px] flex flex-col justify-end">
                    <p className="font-bold text-zinc-950 text-right pr-1" style={{ fontFamily: "Arial, sans-serif" }}>
                      Owner of Lunova
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
