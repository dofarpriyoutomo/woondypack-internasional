import { SpkJob, PaymentHistoryItem, ProductionStageDetail } from '../types';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export const SHEETS_NAMES = {
  SALES: 'DB_SPK_Sales',
  FINANCE: 'DB_Finance',
  PPIC: 'DB_PPIC',
  PRODUKSI: 'DB_Produksi',
};

// 1. List user spreadsheets from Google Drive
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengambil daftar spreadsheet (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

// 2. Create a new formatted ERP Google Spreadsheet
export async function createErpSpreadsheet(accessToken: string, title = 'DB ERP Woondypack Internasional'): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: SHEETS_NAMES.SALES,
          gridProperties: { rowCount: 1000, columnCount: 25, frozenRowCount: 1 },
          tabColor: { red: 0.1, green: 0.6, blue: 0.3 },
        },
      },
      {
        properties: {
          title: SHEETS_NAMES.FINANCE,
          gridProperties: { rowCount: 1000, columnCount: 20, frozenRowCount: 1 },
          tabColor: { red: 0.9, green: 0.6, blue: 0.1 },
        },
      },
      {
        properties: {
          title: SHEETS_NAMES.PPIC,
          gridProperties: { rowCount: 1000, columnCount: 20, frozenRowCount: 1 },
          tabColor: { red: 0.1, green: 0.5, blue: 0.8 },
        },
      },
      {
        properties: {
          title: SHEETS_NAMES.PRODUKSI,
          gridProperties: { rowCount: 1000, columnCount: 25, frozenRowCount: 1 },
          tabColor: { red: 0.7, green: 0.2, blue: 0.8 },
        },
      },
    ],
  };

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membuat spreadsheet baru (${response.status})`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate headers for each sheet
  await initializeSheetHeaders(accessToken, spreadsheetId);

  return { spreadsheetId, spreadsheetUrl };
}

// 3. Initialize headers
export async function initializeSheetHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const salesHeaders = [
    'No SPK', 'Tanggal Order', 'Nama Customer', 'Telepon Customer', 'Nama Produk', 'Sales Rep',
    'Qty Order (Pcs)', 'Harga Satuan (Rp)', 'Total Nilai (Rp)', 'Ukuran Produk', 'Jenis Bahan',
    'Tipe Cetakan', 'Keterangan Warna', 'Laminasi', 'Sisi Laminasi', 'Catatan Sales',
    'Status Global', 'Is Canceled', 'Alasan Cancel', 'Tanggal Cancel', 'Created At', 'Updated At'
  ];

  const financeHeaders = [
    'No SPK', 'Nama Customer', 'Total Tagihan (Rp)', 'Jenis Pembayaran', 'Status Finance', 'Tanggal DP',
    'Total Terbayar (Rp)', 'Sisa Tagihan (Rp)', 'Deadline SPK (10 Hari)', 'Status Lunas',
    'Histori Pembayaran (JSON)'
  ];

  const ppicHeaders = [
    'No SPK', 'Nama Customer', 'Status PPIC', 'Tanggal Masuk PPIC', 'Deadline Material (4 Hari)', 
    'Tanggal Selesai PPIC', 'Plano Bahan', 'Ukuran Bahan Cetak', 'Isi Cetakan', 'Potong Out',
    'Kebutuhan Lembar Cetak', 'Kebutuhan Plano Murni', 'Insheet (%)', 'Total Plano Kebutuhan',
    'Status Kertas', 'Tanggal Order Kertas', 'Status Plat Cetak', 'Tanggal Order Plat',
    'Status Pisau Pond', 'Tanggal Order Pisau', 'Catatan PPIC'
  ];

  const produksiHeaders = [
    'No SPK', 'Nama Customer', 'Qty Target', 'Status Produksi', 'Tanggal Masuk Produksi',
    'Deadline Produksi', 'Tanggal Selesai Produksi', 'Siap Kirim',
    'Cetak Operator', 'Cetak Mesin', 'Cetak Miss', 'Cetak Selesai',
    'Laminasi Operator', 'Laminasi Mesin', 'Laminasi Miss', 'Laminasi Selesai',
    'Pond Operator', 'Pond Mesin', 'Pond Miss', 'Pond Selesai',
    'Finishing Operator', 'Finishing Mesin', 'Finishing Miss', 'Finishing Selesai', 'Finishing Reject'
  ];

  const valuesData = [
    { range: `${SHEETS_NAMES.SALES}!A1:V1`, values: [salesHeaders] },
    { range: `${SHEETS_NAMES.FINANCE}!A1:K1`, values: [financeHeaders] },
    { range: `${SHEETS_NAMES.PPIC}!A1:U1`, values: [ppicHeaders] },
    { range: `${SHEETS_NAMES.PRODUKSI}!A1:Y1`, values: [produksiHeaders] },
  ];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valuesData,
    }),
  });
}

// 4. Export / Push all jobs data into Google Sheets
export async function pushJobsToGoogleSheets(accessToken: string, spreadsheetId: string, jobs: SpkJob[]): Promise<void> {
  // Ensure headers exist
  await initializeSheetHeaders(accessToken, spreadsheetId);

  const salesRows: any[][] = [];
  const financeRows: any[][] = [];
  const ppicRows: any[][] = [];
  const produksiRows: any[][] = [];

  jobs.forEach((job) => {
    // Sales Row
    salesRows.push([
      job.no_spk || '',
      job.tanggal_order || '',
      job.nama_customer || '',
      job.telepon_customer || '',
      job.nama_produk || '',
      job.nama_sales || '',
      job.jumlah_order || 0,
      job.harga_satuan || 0,
      job.total_nominal || 0,
      job.ukuran_produk || '',
      job.jenis_bahan || '',
      job.desain_cetakan || '',
      job.keterangan_warna || '',
      job.tipe_laminasi || '',
      job.sisi_laminasi || '',
      job.catatan_sales || '',
      job.status_global || 'draft',
      job.is_canceled ? 'YES' : 'NO',
      job.alasan_cancel || '',
      job.tanggal_cancel || '',
      job.created_at || '',
      job.updated_at || '',
    ]);

    // Finance Row
    financeRows.push([
      job.no_spk || '',
      job.nama_customer || '',
      job.total_nominal || 0,
      job.jenis_pembayaran || 'DP',
      job.status_finance || 'belum_proses',
      job.tanggal_dp || '',
      job.total_terbayar || 0,
      job.sisa_pembayaran !== undefined ? job.sisa_pembayaran : Math.max(0, job.total_nominal - (job.total_terbayar || 0)),
      job.tanggal_deadline_spk || '',
      job.is_lunas ? 'LUNAS' : 'BELUM',
      JSON.stringify(job.history_pembayaran || []),
    ]);

    // PPIC Row
    ppicRows.push([
      job.no_spk || '',
      job.nama_customer || '',
      job.status_ppic || 'antrean',
      job.tanggal_masuk_ppic || '',
      job.tanggal_deadline_ppic || '',
      job.tanggal_selesai_ppic || '',
      job.plano_bahan || '79 x 109',
      job.ukuran_bahan_cetak || '',
      job.isi_cetakan || 1,
      job.potong_out || 1,
      job.kebutuhan_lembar_cetak || 0,
      job.kebutuhan_plano_murni || 0,
      job.insheet_persen || 3,
      job.total_plano_kebutuhan || 0,
      job.status_material_kertas || 'Menunggu',
      job.tanggal_order_kertas || '',
      job.status_plat_cetak || 'Menunggu',
      job.tanggal_order_plat || '',
      job.status_pisau_pond || 'Menunggu',
      job.tanggal_order_pisau || '',
      job.catatan_ppic || '',
    ]);

    // Produksi Row
    const tc = job.tahap_cetak;
    const tl = job.tahap_laminasi;
    const tp = job.tahap_pond;
    const tf = job.tahap_finishing;

    produksiRows.push([
      job.no_spk || '',
      job.nama_customer || '',
      job.jumlah_order || 0,
      job.status_produksi || 'antrean',
      job.tanggal_masuk_produksi || '',
      job.tanggal_deadline_produksi || '',
      job.tanggal_selesai_produksi || '',
      job.is_siap_kirim ? 'SIAP' : 'PROSES',
      tc?.operator || '',
      tc?.mesin || '',
      tc?.jumlah_miss || 0,
      tc?.selesai ? 'SELESAI' : 'PROSES',
      tl?.operator || '',
      tl?.mesin || '',
      tl?.jumlah_miss || 0,
      tl?.selesai ? 'SELESAI' : 'PROSES',
      tp?.operator || '',
      tp?.mesin || '',
      tp?.jumlah_miss || 0,
      tp?.selesai ? 'SELESAI' : 'PROSES',
      tf?.operator || '',
      tf?.mesin || '',
      tf?.jumlah_miss || 0,
      tf?.selesai ? 'SELESAI' : 'PROSES',
      tf?.keterangan_reject || '',
    ]);
  });

  // Clear existing content from A2 down then update
  const clearRanges = [
    `${SHEETS_NAMES.SALES}!A2:V1000`,
    `${SHEETS_NAMES.FINANCE}!A2:K1000`,
    `${SHEETS_NAMES.PPIC}!A2:U1000`,
    `${SHEETS_NAMES.PRODUKSI}!A2:Y1000`,
  ];

  for (const range of clearRanges) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      console.warn('Failed to clear range before writing', range, e);
    }
  }

  // Push new rows
  const valuesData = [
    { range: `${SHEETS_NAMES.SALES}!A2:V${Math.max(2, salesRows.length + 1)}`, values: salesRows.length ? salesRows : [['']] },
    { range: `${SHEETS_NAMES.FINANCE}!A2:K${Math.max(2, financeRows.length + 1)}`, values: financeRows.length ? financeRows : [['']] },
    { range: `${SHEETS_NAMES.PPIC}!A2:U${Math.max(2, ppicRows.length + 1)}`, values: ppicRows.length ? ppicRows : [['']] },
    { range: `${SHEETS_NAMES.PRODUKSI}!A2:Y${Math.max(2, produksiRows.length + 1)}`, values: produksiRows.length ? produksiRows : [['']] },
  ];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valuesData,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengirim data ke Google Sheets (${res.status})`);
  }
}

// 5. Import / Read all jobs from Google Sheets
export async function pullJobsFromGoogleSheets(accessToken: string, spreadsheetId: string): Promise<SpkJob[]> {
  const ranges = [
    `${SHEETS_NAMES.SALES}!A2:V`,
    `${SHEETS_NAMES.FINANCE}!A2:K`,
    `${SHEETS_NAMES.PPIC}!A2:U`,
    `${SHEETS_NAMES.PRODUKSI}!A2:Y`,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membaca data dari Google Sheets (${response.status})`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];

  const salesRows = valueRanges[0]?.values || [];
  const financeRows = valueRanges[1]?.values || [];
  const ppicRows = valueRanges[2]?.values || [];
  const produksiRows = valueRanges[3]?.values || [];

  // Map by no_spk
  const financeMap = new Map<string, any>();
  financeRows.forEach((row: any[]) => {
    if (row[0]) financeMap.set(String(row[0]).trim(), row);
  });

  const ppicMap = new Map<string, any>();
  ppicRows.forEach((row: any[]) => {
    if (row[0]) ppicMap.set(String(row[0]).trim(), row);
  });

  const prodMap = new Map<string, any>();
  produksiRows.forEach((row: any[]) => {
    if (row[0]) prodMap.set(String(row[0]).trim(), row);
  });

  const parsedJobs: SpkJob[] = [];

  salesRows.forEach((row: any[], index: number) => {
    const noSpk = String(row[0] || '').trim();
    if (!noSpk) return;

    const fRow = financeMap.get(noSpk) || [];
    const pRow = ppicMap.get(noSpk) || [];
    const prRow = prodMap.get(noSpk) || [];

    // Parse payments history
    let historyPembayaran: PaymentHistoryItem[] = [];
    if (fRow[10]) {
      try {
        historyPembayaran = JSON.parse(fRow[10]);
      } catch (e) {
        historyPembayaran = [];
      }
    }

    const jumlahOrder = Number(row[6]) || 0;
    const hargaSatuan = Number(row[7]) || 0;
    const totalNominal = Number(row[8]) || (jumlahOrder * hargaSatuan);

    const tc: ProductionStageDetail = {
      operator: prRow[8] || '',
      mesin: prRow[9] || 'Heidelberg SM 74',
      tanggal_mulai: '',
      tanggal_selesai: '',
      jumlah_miss: Number(prRow[10]) || 0,
      selesai: prRow[11] === 'SELESAI',
    };

    const tl: ProductionStageDetail = {
      operator: prRow[12] || '',
      mesin: prRow[13] || 'Mesin Laminasi Thermal 1080',
      tanggal_mulai: '',
      tanggal_selesai: '',
      jumlah_miss: Number(prRow[14]) || 0,
      selesai: prRow[15] === 'SELESAI',
    };

    const tp: ProductionStageDetail = {
      operator: prRow[16] || '',
      mesin: prRow[17] || 'Mesin Pond Manual 1040',
      tanggal_mulai: '',
      tanggal_selesai: '',
      jumlah_miss: Number(prRow[18]) || 0,
      selesai: prRow[19] === 'SELESAI',
    };

    const tf: ProductionStageDetail & { keterangan_reject?: string } = {
      operator: prRow[20] || '',
      mesin: prRow[21] || 'Line Finishing & Lem Manual',
      tanggal_mulai: '',
      tanggal_selesai: '',
      jumlah_miss: Number(prRow[22]) || 0,
      selesai: prRow[23] === 'SELESAI',
      keterangan_reject: prRow[24] || '',
    };

    const job: SpkJob = {
      id: `job-${noSpk.replace(/\s+/g, '-').toLowerCase()}-${index}`,
      no_spk: noSpk,
      tanggal_order: String(row[1] || new Date().toISOString().split('T')[0]),
      nama_customer: String(row[2] || ''),
      telepon_customer: String(row[3] || ''),
      nama_produk: String(row[4] || ''),
      nama_sales: String(row[5] || ''),
      jumlah_order: jumlahOrder,
      harga_satuan: hargaSatuan,
      total_nominal: totalNominal,
      ukuran_produk: String(row[9] || '20 x 10 x 5 cm'),
      jenis_bahan: (row[10] as any) || 'Ivory 300',
      desain_cetakan: (row[11] as any) || 'Full Colour CMYK',
      keterangan_warna: String(row[12] || ''),
      tipe_laminasi: (row[13] as any) || 'Tanpa Laminasi',
      sisi_laminasi: (row[14] as any) || '1 Sisi Bagian Luar',
      catatan_sales: String(row[15] || ''),
      status_global: (row[16] as any) || 'draft',
      is_canceled: String(row[17]).toUpperCase() === 'YES',
      alasan_cancel: String(row[18] || ''),
      tanggal_cancel: String(row[19] || ''),
      created_at: String(row[20] || new Date().toISOString()),
      updated_at: String(row[21] || new Date().toISOString()),

      // Finance fields
      jenis_pembayaran: (fRow[3] as any) || 'DP',
      status_finance: (fRow[4] as any) || 'belum_proses',
      tanggal_dp: fRow[5] || undefined,
      total_terbayar: Number(fRow[6]) || 0,
      sisa_pembayaran: Number(fRow[7]) || totalNominal,
      tanggal_deadline_spk: fRow[8] || undefined,
      is_lunas: fRow[9] === 'LUNAS',
      history_pembayaran: historyPembayaran,

      // PPIC fields
      status_ppic: (pRow[2] as any) || 'antrean',
      tanggal_masuk_ppic: pRow[3] || undefined,
      tanggal_deadline_ppic: pRow[4] || undefined,
      tanggal_selesai_ppic: pRow[5] || undefined,
      plano_bahan: (pRow[6] as any) || '79 x 109',
      ukuran_bahan_cetak: pRow[7] || '',
      isi_cetakan: Number(pRow[8]) || 1,
      potong_out: Number(pRow[9]) || 1,
      kebutuhan_lembar_cetak: Number(pRow[10]) || 0,
      kebutuhan_plano_murni: Number(pRow[11]) || 0,
      insheet_persen: Number(pRow[12]) || 3,
      total_plano_kebutuhan: Number(pRow[13]) || 0,
      status_material_kertas: (pRow[14] as any) || 'Menunggu',
      tanggal_order_kertas: pRow[15] || undefined,
      status_plat_cetak: (pRow[16] as any) || 'Menunggu',
      tanggal_order_plat: pRow[17] || undefined,
      status_pisau_pond: (pRow[18] as any) || 'Menunggu',
      tanggal_order_pisau: pRow[19] || undefined,
      catatan_ppic: pRow[20] || '',

      // Produksi fields
      status_produksi: (prRow[3] as any) || 'antrean',
      tanggal_masuk_produksi: prRow[4] || undefined,
      tanggal_deadline_produksi: prRow[5] || undefined,
      tanggal_selesai_produksi: prRow[6] || undefined,
      is_siap_kirim: prRow[7] === 'SIAP',
      tahap_cetak: tc,
      tahap_laminasi: tl,
      tahap_pond: tp,
      tahap_finishing: tf,
    };

    parsedJobs.push(job);
  });

  return parsedJobs;
}
