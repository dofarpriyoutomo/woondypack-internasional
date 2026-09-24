export type AppTab = 'dashboard' | 'sales' | 'finance' | 'ppic' | 'produksi' | 'gas_export';

export type JobStatus = 
  | 'draft'
  | 'menunggu_dp'
  | 'dp_terbayar'
  | 'ppic_antrean'
  | 'ppic_on_proses'
  | 'ppic_selesai'
  | 'prod_antrean'
  | 'prod_on_proses'
  | 'prod_selesai'
  | 'siap_kirim'
  | 'selesai'
  | 'dibatalkan';

export type PaperType =
  | 'Ivory 210'
  | 'Ivory 250'
  | 'Ivory 300'
  | 'Ivory 350'
  | 'Ivory 400'
  | 'Duplex 250'
  | 'Duplex 310'
  | 'Duplex 350'
  | 'Duplex 400'
  | 'Art Carton 120'
  | 'Art Carton 150'
  | 'Art Carton 260'
  | 'Art Carton 310'
  | 'Kraft 120'
  | 'Kraft 150'
  | 'Kraft 200'
  | 'Kraft 275'
  | 'Kraft 290 Laminasi'
  | 'Kraft 300'
  | 'Kraft 315 Laminasi'
  | 'Custom';

export type LaminationType = 'Tanpa Laminasi' | 'Glossy' | 'Doff';
export type LaminationSide = 'Tanpa Laminasi' | '1 Sisi Bagian Luar' | '1 Sisi Bagian Dalam' | '2 Sisi';

export type PrintColorType = 'Full Colour CMYK' | '1 Warna Khusus' | '2 Warna Khusus' | 'Custom';

export type PlanoOption = '61 x 86' | '65 x 90' | '65 x 100' | '70 x 100' | '79 x 109' | '90 x 120' | 'Custom';

export type ItemReadyStatus = 'Ready' | 'Order' | 'Menunggu';

export interface PaymentHistoryItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nominal: number;
  keterangan: string; // 'DP Awal', 'Termin 1', 'Pelunasan', dll
  metode: string; // 'Transfer BCA', 'Transfer Mandiri', 'Cash', dll
  created_at: string;
}

export interface ProductionStageDetail {
  operator: string;
  mesin: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_miss: number;
  catatan?: string;
  selesai: boolean;
}

export interface SpkJob {
  // IDENTITAS & SALES ORDER
  id: string; // UUID
  no_spk: string; // SPK 001, SPK 002, dst
  tanggal_order: string; // YYYY-MM-DD
  nama_customer: string;
  telepon_customer: string;
  nama_produk: string;
  nama_sales: string;
  
  // SPESIFIKASI PRODUK
  ukuran_produk: string; // e.g. "20 x 10 x 5 cm"
  jumlah_order: number; // pcs e.g. 5000
  harga_satuan: number; // Rp e.g. 1500
  total_nominal: number; // otomatis jumlah_order * harga_satuan
  
  jenis_bahan: string; // e.g. Ivory 300 / Custom string
  tipe_laminasi: LaminationType;
  sisi_laminasi: LaminationSide;
  desain_cetakan: PrintColorType;
  keterangan_warna?: string; // misal jika 1 warna / 2 warna request customer
  catatan_sales?: string; // Add-on / catatan misal tali maroon, hotprint emas
  
  // PEMBAYARAN & FINANCE
  jenis_pembayaran: 'DP' | 'Termin' | 'Cash Lunas';
  status_finance: 'belum_proses' | 'sudah_proses';
  total_terbayar: number;
  sisa_pembayaran: number;
  tanggal_dp?: string; // YYYY-MM-DD (Kunci untuk 10 hari kerja)
  tanggal_deadline_spk?: string; // YYYY-MM-DD (10 hari kerja sejak DP)
  is_lunas: boolean;
  history_pembayaran: PaymentHistoryItem[];

  // PPIC CENTER
  status_ppic: 'antrean' | 'on_proses' | 'selesai';
  tanggal_masuk_ppic?: string;
  tanggal_deadline_ppic?: string; // 4 hari kerja sejak masuk PPIC
  tanggal_selesai_ppic?: string;
  
  // Kalkulasi Bahan PPIC
  plano_bahan: PlanoOption;
  ukuran_bahan_cetak: string; // e.g. "54 x 39"
  isi_cetakan: number; // e.g. 2
  potong_out: number; // e.g. 4
  kebutuhan_lembar_cetak: number; // e.g. 2500
  kebutuhan_plano_murni: number; // e.g. 625
  insheet_persen: number; // 3%
  total_plano_kebutuhan: number; // 625 + 3% = 644
  
  // Status Kesiapan Material
  status_material_kertas: ItemReadyStatus;
  tanggal_order_kertas?: string;
  
  status_plat_cetak: ItemReadyStatus;
  tanggal_order_plat?: string;
  
  status_pisau_pond: ItemReadyStatus;
  tanggal_order_pisau?: string;
  
  catatan_ppic?: string;

  // PRODUKSI CONTROL
  status_produksi: 'antrean' | 'on_proses' | 'selesai';
  tanggal_masuk_produksi?: string;
  tanggal_deadline_produksi?: string; // 5 hari sejak masuk produksi
  tanggal_selesai_produksi?: string; // Siap kirim
  
  // 4 Tahap Produksi
  tahap_cetak: ProductionStageDetail;
  tahap_laminasi: ProductionStageDetail;
  tahap_pond: ProductionStageDetail;
  tahap_finishing: ProductionStageDetail & {
    keterangan_reject?: string;
  };
  
  is_siap_kirim: boolean;
  
  // CANCEL & STATUS GLOBAL
  status_global: JobStatus;
  is_canceled: boolean;
  alasan_cancel?: string;
  tanggal_cancel?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface SalesPerformance {
  nama_sales: string;
  total_spk: number;
  total_omset: number;
  spk_lunas: number;
  spk_proses: number;
}

export interface DashboardStats {
  totalJobAktif: number;
  jobBelumProses: number;
  jobOnProses: number;
  jobSelesaiBulanIni: number;
  totalOmsetBulanIni: number;
  totalJobTerlambat: number;
  persenKeterlambatan: number; // % dari total SPK bulan terpilih
  rataRataMissProduksi: number; // % rata-rata miss dari jumlah order
  totalDibatalkan: number;
}
