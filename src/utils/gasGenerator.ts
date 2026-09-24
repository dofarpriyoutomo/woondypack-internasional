/**
 * Gas Generator Utility
 * Menghasilkan kode Code.gs dan Index.html yang siap digunakan langsung
 * pada Google Apps Script sebagai aplikasi ERP Web App mandiri (standalone).
 */

export function generateFullCodeGs(): string {
  return `/**
 * ============================================================================
 * WOONDYPACK INTERNASIONAL - ERP PERCETAKAN & PACKAGING
 * File: Code.gs (Google Apps Script Backend Engine)
 * 
 * Modul Terintegrasi:
 * 1. Sales Order (SPK Auto-Increment, Spesifikasi Kertas, Warna, Add-on)
 * 2. Finance (DP 10-Hari Kunci Deadline, Termin, Pelunasan, Histori Bayar)
 * 3. PPIC Center (Kalkulator Potong Bahan & 3% Insheet, Status Plat/Pisau, 4-Hari Deadline)
 * 4. Produksi Control (Cetak, Laminasi, Pond, Finishing, Catatan Miss Reject, QC)
 * 5. Dashboard Real-Time & 2-Way Sync
 * ============================================================================
 */

// Nama-nama Sheet Database
const SHEET_SALES = 'DB_SPK_Sales';
const SHEET_FINANCE = 'DB_Finance';
const SHEET_PPIC = 'DB_PPIC';
const SHEET_PRODUKSI = 'DB_Produksi';

/**
 * 1. Entry Point Web App GET
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getAll') {
    const data = getAllSpkDataFromSheet();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Tampilkan antarmuka HTML mandiri
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Woondypack Internasional - ERP Percetakan')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

/**
 * 2. Entry Point Web App POST (Webhook API)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action || 'SYNC_ALL_DATA';
    let result = { status: 'success', message: 'Data diproses' };

    if (action === 'SYNC_ALL_DATA' && payload.jobs && Array.isArray(payload.jobs)) {
      payload.jobs.forEach(function(job) {
        saveOrUpdateSpkToSheet(job);
      });
      result = { status: 'success', message: 'Berhasil sinkron ' + payload.jobs.length + ' SPK', jobs: getAllSpkDataFromSheet() };
    } else if (action === 'save_job' && payload.data) {
      result = saveOrUpdateSpkToSheet(payload.data);
    } else {
      result = { status: 'success', data: getAllSpkDataFromSheet() };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. Inisialisasi Database & Tab Sheet
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Sales
  const salesHeaders = [
    'No SPK', 'Tanggal Order', 'Nama Customer', 'No Telepon', 'Nama Produk', 'Nama Sales',
    'Ukuran Produk', 'Jumlah Order (Pcs)', 'Harga Satuan (Rp)', 'Total Nominal (Rp)',
    'Jenis Bahan', 'Desain Cetakan', 'Keterangan Warna', 'Tipe Laminasi', 'Sisi Laminasi',
    'Catatan Sales', 'Jenis Pembayaran', 'Status Global', 'Status Finance', 'Status PPIC', 'Status Produksi', 'Canceled', 'Alasan Cancel', 'Updated At'
  ];
  ensureSheetWithHeaders(ss, SHEET_SALES, salesHeaders, '#0f172a');

  // 2. Sheet Finance
  const financeHeaders = [
    'No SPK', 'Nama Customer', 'Total Nominal (Rp)', 'Total Terbayar (Rp)', 'Sisa Pembayaran (Rp)',
    'Status Lunas', 'Tanggal DP', 'Tanggal Deadline SPK (10 Hari)', 'Riwayat Transaksi JSON', 'Updated At'
  ];
  ensureSheetWithHeaders(ss, SHEET_FINANCE, financeHeaders, '#059669');

  // 3. Sheet PPIC
  const ppicHeaders = [
    'No SPK', 'Status PPIC', 'Tanggal Masuk PPIC', 'Deadline PPIC (4 Hari)', 'Tanggal Selesai PPIC',
    'Plano Bahan', 'Ukuran Cetak', 'Isi Cetakan (Up)', 'Potong Out', 'Lembar Cetak', 'Plano Murni',
    'Insheet (%)', 'Total Plano Butuh', 'Status Kertas', 'Tgl Order Kertas', 'Status Plat', 'Tgl Order Plat',
    'Status Pisau', 'Tgl Order Pisau', 'Catatan PPIC', 'Updated At'
  ];
  ensureSheetWithHeaders(ss, SHEET_PPIC, ppicHeaders, '#d97706');

  // 4. Sheet Produksi
  const prodHeaders = [
    'No SPK', 'Status Produksi', 'Tanggal Masuk Prod', 'Deadline Prod (5 Hari)', 'Tgl Selesai Prod',
    'Operator Cetak', 'Mesin Cetak', 'Miss Cetak', 'Operator Laminasi', 'Mesin Laminasi', 'Miss Laminasi',
    'Operator Pond', 'Mesin Pond', 'Miss Pond', 'Operator Finishing', 'Reject Finishing', 'Keterangan Reject',
    'Total Reject (Pcs)', 'Reject (%)', 'Siap Kirim', 'Ketepatan Deadline 10 Hari', 'Updated At'
  ];
  ensureSheetWithHeaders(ss, SHEET_PRODUKSI, prodHeaders, '#4f46e5');

  return 'Database Berhasil Diinisialisasi!';
}

function ensureSheetWithHeaders(ss, sheetName, headers, headerColor) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground(headerColor);
    range.setFontColor('#ffffff');
    range.setFontWeight('bold');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
}

/**
 * 4. API google.script.run untuk Frontend
 */
function apiGetInitialData() {
  initializeSheets();
  return {
    status: 'success',
    jobs: getAllSpkDataFromSheet()
  };
}

function apiSaveSpk(job) {
  return saveOrUpdateSpkToSheet(job);
}

function apiUpdateFinance(job) {
  return updateFinanceInSheet(job);
}

function apiUpdatePpic(job) {
  return updatePpicInSheet(job);
}

function apiUpdateProduksi(job) {
  return updateProduksiInSheet(job);
}

function apiDeleteSpk(noSpk) {
  return deleteSpkFromSheet(noSpk);
}

function apiCancelSpk(job) {
  return cancelSpkInSheet(job);
}

/**
 * 5. Operasi Database Detail
 */
function saveOrUpdateSpkToSheet(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets();

  const sheet = ss.getSheetByName(SHEET_SALES);
  const data = sheet.getDataRange().getValues();
  const noSpk = job.no_spk;
  const nowStr = new Date().toLocaleString('id-ID');

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === noSpk) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    job.no_spk || '',
    job.tanggal_order || new Date().toISOString().split('T')[0],
    job.nama_customer || '',
    job.telepon_customer || '',
    job.nama_produk || '',
    job.nama_sales || '',
    job.ukuran_produk || '',
    Number(job.jumlah_order) || 0,
    Number(job.harga_satuan) || 0,
    Number(job.total_nominal) || (Number(job.jumlah_order) * Number(job.harga_satuan)),
    job.jenis_bahan || '',
    job.desain_cetakan || '',
    job.keterangan_warna || '',
    job.tipe_laminasi || '',
    job.sisi_laminasi || '',
    job.catatan_sales || '',
    job.jenis_pembayaran || 'DP',
    job.status_global || 'draft',
    job.status_finance || 'belum_proses',
    job.status_ppic || 'antrean',
    job.status_produksi || 'antrean',
    job.is_canceled ? 'Ya' : 'Tidak',
    job.alasan_cancel || '',
    nowStr
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  syncFinanceInitial(job);
  syncPpicInitial(job);
  syncProduksiInitial(job);

  return { status: 'success', message: 'SPK ' + noSpk + ' berhasil disimpan!', no_spk: noSpk };
}

function syncFinanceInitial(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_FINANCE);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.no_spk) {
      rowIndex = i + 1;
      break;
    }
  }

  const row = [
    job.no_spk,
    job.nama_customer || '',
    Number(job.total_nominal) || 0,
    Number(job.total_terbayar) || 0,
    Number(job.sisa_pembayaran) || (Number(job.total_nominal) || 0),
    job.is_lunas ? 'Lunas' : 'Belum Lunas',
    job.tanggal_dp || '',
    job.tanggal_deadline_spk || '',
    JSON.stringify(job.history_pembayaran || []),
    new Date().toLocaleString('id-ID')
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function syncPpicInitial(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PPIC);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.no_spk) {
      rowIndex = i + 1;
      break;
    }
  }

  const row = [
    job.no_spk,
    job.status_ppic || 'antrean',
    job.tanggal_masuk_ppic || '',
    job.tanggal_deadline_ppic || '',
    job.tanggal_selesai_ppic || '',
    job.plano_bahan || '79 x 109',
    job.ukuran_bahan_cetak || '',
    Number(job.isi_cetakan) || 1,
    Number(job.potong_out) || 1,
    Number(job.kebutuhan_lembar_cetak) || 0,
    Number(job.kebutuhan_plano_murni) || 0,
    Number(job.insheet_persen) || 3,
    Number(job.total_plano_kebutuhan) || 0,
    job.status_material_kertas || 'Menunggu',
    job.tanggal_order_kertas || '',
    job.status_plat_cetak || 'Menunggu',
    job.tanggal_order_plat || '',
    job.status_pisau_pond || 'Menunggu',
    job.tanggal_order_pisau || '',
    job.catatan_ppic || '',
    new Date().toLocaleString('id-ID')
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function syncProduksiInitial(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUKSI);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.no_spk) {
      rowIndex = i + 1;
      break;
    }
  }

  const tc = job.tahap_cetak || {};
  const tl = job.tahap_laminasi || {};
  const tp = job.tahap_pond || {};
  const tf = job.tahap_finishing || {};

  const missCetak = Number(tc.jumlah_miss) || 0;
  const missLaminasi = Number(tl.jumlah_miss) || 0;
  const missPond = Number(tp.jumlah_miss) || 0;
  const missFinishing = Number(tf.jumlah_miss) || 0;
  const totalReject = missCetak + missLaminasi + missPond + missFinishing;
  const orderPcs = Number(job.jumlah_order) || 1;
  const persenReject = ((totalReject / orderPcs) * 100).toFixed(2) + '%';

  const row = [
    job.no_spk,
    job.status_produksi || 'antrean',
    job.tanggal_masuk_produksi || '',
    job.tanggal_deadline_produksi || '',
    job.tanggal_selesai_produksi || '',
    tc.operator || '',
    tc.mesin || 'Heidelberg SM 74',
    missCetak,
    tl.operator || '',
    tl.mesin || 'Laminasi Thermal 1080',
    missLaminasi,
    tp.operator || '',
    tp.mesin || 'Pond Die Cut 1040',
    missPond,
    tf.operator || '',
    missFinishing,
    tf.keterangan_reject || '',
    totalReject,
    persenReject,
    job.is_siap_kirim ? 'SIAP' : 'PROSES',
    job.is_siap_kirim ? 'Tepat Waktu' : 'Dalam Pengerjaan',
    new Date().toLocaleString('id-ID')
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function updateFinanceInSheet(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets();
  syncFinanceInitial(job);

  const salesSheet = ss.getSheetByName(SHEET_SALES);
  const data = salesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.no_spk) {
      salesSheet.getRange(i + 1, 18).setValue(job.status_global);
      salesSheet.getRange(i + 1, 19).setValue(job.status_finance);
      salesSheet.getRange(i + 1, 24).setValue(new Date().toLocaleString('id-ID'));
      break;
    }
  }

  return { status: 'success', message: 'Status Finance ' + job.no_spk + ' berhasil diupdate' };
}

function updatePpicInSheet(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets();
  syncPpicInitial(job);

  const salesSheet = ss.getSheetByName(SHEET_SALES);
  const sData = salesSheet.getDataRange().getValues();
  for (let i = 1; i < sData.length; i++) {
    if (sData[i][0] === job.no_spk) {
      salesSheet.getRange(i + 1, 18).setValue(job.status_global);
      salesSheet.getRange(i + 1, 20).setValue(job.status_ppic);
      salesSheet.getRange(i + 1, 24).setValue(new Date().toLocaleString('id-ID'));
      break;
    }
  }

  return { status: 'success', message: 'PPIC ' + job.no_spk + ' berhasil diupdate' };
}

function updateProduksiInSheet(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets();
  syncProduksiInitial(job);

  const salesSheet = ss.getSheetByName(SHEET_SALES);
  const sData = salesSheet.getDataRange().getValues();
  for (let i = 1; i < sData.length; i++) {
    if (sData[i][0] === job.no_spk) {
      salesSheet.getRange(i + 1, 18).setValue(job.status_global);
      salesSheet.getRange(i + 1, 21).setValue(job.status_produksi);
      salesSheet.getRange(i + 1, 24).setValue(new Date().toLocaleString('id-ID'));
      break;
    }
  }

  return { status: 'success', message: 'Produksi ' + job.no_spk + ' berhasil diupdate' };
}

function getAllSpkDataFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName(SHEET_SALES);
  if (!salesSheet) return [];

  const data = salesSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // Map data Finance, PPIC, Produksi
  const fSheet = ss.getSheetByName(SHEET_FINANCE);
  const pSheet = ss.getSheetByName(SHEET_PPIC);
  const prSheet = ss.getSheetByName(SHEET_PRODUKSI);

  const fMap = {}, pMap = {}, prMap = {};

  if (fSheet) {
    const fData = fSheet.getDataRange().getValues();
    for (let i = 1; i < fData.length; i++) {
      if (fData[i][0]) fMap[fData[i][0]] = fData[i];
    }
  }

  if (pSheet) {
    const pData = pSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      if (pData[i][0]) pMap[pData[i][0]] = pData[i];
    }
  }

  if (prSheet) {
    const prData = prSheet.getDataRange().getValues();
    for (let i = 1; i < prData.length; i++) {
      if (prData[i][0]) prMap[prData[i][0]] = prData[i];
    }
  }

  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const noSpk = row[0];
    if (!noSpk) continue;

    const fRow = fMap[noSpk] || [];
    const pRow = pMap[noSpk] || [];
    const prRow = prMap[noSpk] || [];

    let histBayar = [];
    if (fRow[8]) {
      try { histBayar = JSON.parse(fRow[8]); } catch(e) {}
    }

    results.push({
      id: 'spk-' + noSpk,
      no_spk: noSpk,
      tanggal_order: row[1] || '',
      nama_customer: row[2] || '',
      telepon_customer: row[3] || '',
      nama_produk: row[4] || '',
      nama_sales: row[5] || '',
      ukuran_produk: row[6] || '',
      jumlah_order: Number(row[7]) || 0,
      harga_satuan: Number(row[8]) || 0,
      total_nominal: Number(row[9]) || 0,
      jenis_bahan: row[10] || 'Ivory 300',
      desain_cetakan: row[11] || 'Full Colour CMYK',
      keterangan_warna: row[12] || '',
      tipe_laminasi: row[13] || 'Tanpa Laminasi',
      sisi_laminasi: row[14] || '1 Sisi Bagian Luar',
      catatan_sales: row[15] || '',
      jenis_pembayaran: row[16] || 'DP',
      status_global: row[17] || 'draft',
      status_finance: row[18] || 'belum_proses',
      status_ppic: row[19] || 'antrean',
      status_produksi: row[20] || 'antrean',
      is_canceled: row[21] === 'Ya',
      alasan_cancel: row[22] || '',
      updated_at: row[23] || '',

      // Finance
      total_terbayar: Number(fRow[3]) || 0,
      sisa_pembayaran: Number(fRow[4]) || (Number(row[9]) || 0),
      is_lunas: fRow[5] === 'Lunas',
      tanggal_dp: fRow[6] || '',
      tanggal_deadline_spk: fRow[7] || '',
      history_pembayaran: histBayar,

      // PPIC
      tanggal_masuk_ppic: pRow[2] || '',
      tanggal_deadline_ppic: pRow[3] || '',
      tanggal_selesai_ppic: pRow[4] || '',
      plano_bahan: pRow[5] || '79 x 109',
      ukuran_bahan_cetak: pRow[6] || '',
      isi_cetakan: Number(pRow[7]) || 1,
      potong_out: Number(pRow[8]) || 1,
      kebutuhan_lembar_cetak: Number(pRow[9]) || 0,
      kebutuhan_plano_murni: Number(pRow[10]) || 0,
      insheet_persen: Number(pRow[11]) || 3,
      total_plano_kebutuhan: Number(pRow[12]) || 0,
      status_material_kertas: pRow[13] || 'Menunggu',
      tanggal_order_kertas: pRow[14] || '',
      status_plat_cetak: pRow[15] || 'Menunggu',
      tanggal_order_plat: pRow[16] || '',
      status_pisau_pond: pRow[17] || 'Menunggu',
      tanggal_order_pisau: pRow[18] || '',
      catatan_ppic: pRow[19] || '',

      // Produksi
      tanggal_masuk_produksi: prRow[2] || '',
      tanggal_deadline_produksi: prRow[3] || '',
      tanggal_selesai_produksi: prRow[4] || '',
      tahap_cetak: {
        operator: prRow[5] || '',
        mesin: prRow[6] || 'Heidelberg SM 74',
        jumlah_miss: Number(prRow[7]) || 0,
        selesai: !!prRow[5]
      },
      tahap_laminasi: {
        operator: prRow[8] || '',
        mesin: prRow[9] || 'Laminasi Thermal 1080',
        jumlah_miss: Number(prRow[10]) || 0,
        selesai: !!prRow[8]
      },
      tahap_pond: {
        operator: prRow[11] || '',
        mesin: prRow[12] || 'Pond Die Cut 1040',
        jumlah_miss: Number(prRow[13]) || 0,
        selesai: !!prRow[11]
      },
      tahap_finishing: {
        operator: prRow[14] || '',
        mesin: 'Line Finishing',
        jumlah_miss: Number(prRow[15]) || 0,
        keterangan_reject: prRow[16] || '',
        selesai: !!prRow[14]
      },
      is_siap_kirim: prRow[19] === 'SIAP'
    });
  }

  return results;
}

function deleteSpkFromSheet(noSpk) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [SHEET_SALES, SHEET_FINANCE, SHEET_PPIC, SHEET_PRODUKSI];

  sheets.forEach(function(sName) {
    const sheet = ss.getSheetByName(sName);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === noSpk) {
          sheet.deleteRow(i + 1);
        }
      }
    }
  });

  return { status: 'success', message: 'SPK ' + noSpk + ' berhasil dihapus!' };
}

function cancelSpkInSheet(job) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName(SHEET_SALES);
  if (!salesSheet) return { status: 'error', message: 'Sheet tidak ditemukan' };

  const data = salesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.no_spk) {
      salesSheet.getRange(i + 1, 18).setValue('dibatalkan');
      salesSheet.getRange(i + 1, 22).setValue('Ya');
      salesSheet.getRange(i + 1, 23).setValue(job.alasan_cancel || 'Dibatalkan');
      salesSheet.getRange(i + 1, 24).setValue(new Date().toLocaleString('id-ID'));
      break;
    }
  }

  return { status: 'success', message: 'SPK ' + job.no_spk + ' telah dibatalkan.' };
}
`;
}

export function generateStandaloneIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Woondypack Internasional - ERP Percetakan</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    [v-cloak] { display: none; }
  </style>

  <!-- Vue 3 CDN for reactive standalone frontend in Apps Script -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body class="bg-slate-100 text-slate-800 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
  
  <div id="app" v-cloak class="min-h-screen flex flex-col">
    
    <!-- Top Header -->
    <header class="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-xl text-white">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 flex items-center justify-center shadow-lg">
            <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400">
              W
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-black tracking-tight">WOONDYPACK INTERNASIONAL</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                ERP GAS
              </span>
            </div>
            <p class="text-xs text-slate-400">Sistem Produksi Percetakan Terintegrasi Google Sheets</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button @click="fetchData" :disabled="isLoading" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm">
            <span :class="{'animate-spin': isLoading}">🔄</span>
            <span>{{ isLoading ? 'Memuat Data...' : 'Refresh Sheets' }}</span>
          </button>
        </div>

      </div>

      <!-- Navigation Tabs -->
      <div class="bg-slate-950/80 border-t border-slate-800/80 px-4 py-2 overflow-x-auto">
        <div class="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
          <button 
            @click="activeTab = 'dashboard'"
            :class="activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
            class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-slate-800"
          >
            <span>📊</span>
            <span>Dashboard KPI</span>
          </button>

          <button 
            @click="activeTab = 'sales'"
            :class="activeTab === 'sales' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
            class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-slate-800"
          >
            <span>🛒</span>
            <span>Sales Order & SPK</span>
            <span v-if="jobs.length" class="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-800 text-white text-[10px]">{{ jobs.length }}</span>
          </button>

          <button 
            @click="activeTab = 'finance'"
            :class="activeTab === 'finance' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
            class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-slate-800"
          >
            <span>💰</span>
            <span>Finance (10 Hari)</span>
            <span v-if="pendingFinanceCount" class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">{{ pendingFinanceCount }}</span>
          </button>

          <button 
            @click="activeTab = 'ppic'"
            :class="activeTab === 'ppic' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
            class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-slate-800"
          >
            <span>📦</span>
            <span>PPIC Material (4 Hari)</span>
            <span v-if="pendingPpicCount" class="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px]">{{ pendingPpicCount }}</span>
          </button>

          <button 
            @click="activeTab = 'produksi'"
            :class="activeTab === 'produksi' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
            class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-slate-800"
          >
            <span>⚙️</span>
            <span>Produksi 4 Tahap</span>
            <span v-if="activeProduksiCount" class="ml-1 px-1.5 py-0.5 rounded-full bg-purple-400 text-slate-950 font-bold text-[10px]">{{ activeProduksiCount }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Body -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      <!-- DASHBOARD TAB -->
      <section v-if="activeTab === 'dashboard'" class="space-y-6">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase">Total Pesanan SPK</span>
            <div class="text-2xl font-black text-slate-900 mt-1">{{ jobs.length }}</div>
            <span class="text-[11px] text-emerald-600 font-semibold">{{ activeJobs.length }} SPK Sedang Aktif</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase">Omset Nilai SPK</span>
            <div class="text-xl font-black text-emerald-700 mt-1">{{ formatRupiah(totalRevenue) }}</div>
            <span class="text-[11px] text-slate-500">Terbayar: {{ formatRupiah(totalTerbayar) }}</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase">Antrian Produksi</span>
            <div class="text-2xl font-black text-purple-700 mt-1">{{ activeProduksiCount }}</div>
            <span class="text-[11px] text-amber-600 font-semibold">PPIC Menunggu: {{ pendingPpicCount }}</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase">Total Selesai / Kirim</span>
            <div class="text-2xl font-black text-blue-700 mt-1">{{ completedJobs.length }}</div>
            <span class="text-[11px] text-slate-500">Lolos QC & Siap Kirim</span>
          </div>
        </div>

        <!-- Flow Pipeline -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-900 text-sm">Alur Pipeline Operasional Woondypack</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <span class="font-bold text-emerald-900 block">1. Sales Order</span>
              <p class="text-emerald-700">Input spesifikasi box, ukuran plano, kalkulasi harga, dan penerbitan nomor SPK otomatis.</p>
            </div>
            <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <span class="font-bold text-amber-900 block">2. Finance & DP</span>
              <p class="text-amber-700">Pencatatan DP memicu deadline 10 hari kerja kalender secara otomatis.</p>
            </div>
            <div class="p-4 rounded-xl bg-cyan-50 border border-cyan-200 space-y-2">
              <span class="font-bold text-cyan-900 block">3. PPIC Center</span>
              <p class="text-cyan-700">Kalkulasi lembar plano + 3% insheet, monitoring plat & pisau pond dalam deadline 4 hari.</p>
            </div>
            <div class="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
              <span class="font-bold text-purple-900 block">4. Produksi Control</span>
              <p class="text-purple-700">Monitoring 4 tahap (Cetak, Laminasi, Pond, Finishing) & pencatatan rasio reject/miss.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- SALES TAB -->
      <section v-if="activeTab === 'sales'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base">Daftar Surat Perintah Kerja (SPK)</h3>
          <button @click="openNewSpkModal" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md">
            <span>➕</span>
            <span>Buat SPK Baru</span>
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th class="p-3.5">No SPK</th>
                  <th class="p-3.5">Tanggal</th>
                  <th class="p-3.5">Customer & Produk</th>
                  <th class="p-3.5">Qty & Bahan</th>
                  <th class="p-3.5">Nilai Total</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="job in jobs" :key="job.no_spk" class="hover:bg-slate-50/80 transition">
                  <td class="p-3.5 font-bold font-mono text-emerald-800">{{ job.no_spk }}</td>
                  <td class="p-3.5 text-slate-500">{{ job.tanggal_order }}</td>
                  <td class="p-3.5">
                    <div class="font-bold text-slate-900">{{ job.nama_customer }}</div>
                    <div class="text-[11px] text-slate-500">{{ job.nama_produk }}</div>
                  </td>
                  <td class="p-3.5">
                    <div class="font-bold text-slate-800">{{ job.jumlah_order.toLocaleString() }} pcs</div>
                    <div class="text-[11px] text-slate-500">{{ job.jenis_bahan }} &bull; {{ job.tipe_laminasi }}</div>
                  </td>
                  <td class="p-3.5 font-bold text-emerald-700">{{ formatRupiah(job.total_nominal) }}</td>
                  <td class="p-3.5">
                    <span :class="getStatusBadgeClass(job)" class="px-2.5 py-1 rounded-full text-[10px] font-bold">
                      {{ formatStatus(job) }}
                    </span>
                  </td>
                  <td class="p-3.5 text-center space-x-1">
                    <button @click="viewSpk(job)" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer">
                      Detail
                    </button>
                    <button @click="editJob(job)" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold cursor-pointer">
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- FINANCE TAB -->
      <section v-if="activeTab === 'finance'" class="space-y-6">
        <h3 class="font-bold text-slate-900 text-base">Monitoring Finance, DP & Deadline 10 Hari</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="job in jobs" :key="'fin-' + job.no_spk" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div class="flex items-center justify-between border-b pb-2">
              <span class="font-mono font-bold text-slate-900">{{ job.no_spk }}</span>
              <span :class="job.is_lunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'" class="px-2 py-0.5 rounded text-[10px] font-bold">
                {{ job.is_lunas ? 'LUNAS' : (job.status_finance === 'sudah_proses' ? 'DP DITERIMA' : 'BELUM DP') }}
              </span>
            </div>
            <div>
              <div class="font-bold text-slate-900">{{ job.nama_customer }}</div>
              <div class="text-slate-500">Total: <strong>{{ formatRupiah(job.total_nominal) }}</strong></div>
              <div class="text-emerald-700">Terbayar: <strong>{{ formatRupiah(job.total_terbayar || 0) }}</strong></div>
              <div class="text-rose-600">Sisa: <strong>{{ formatRupiah(job.sisa_pembayaran || job.total_nominal) }}</strong></div>
            </div>
            <div v-if="job.tanggal_deadline_spk" class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              ⏳ Deadline SPK 10 Hari: <strong>{{ job.tanggal_deadline_spk }}</strong>
            </div>
            <button @click="openPaymentModal(job)" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer">
              Catat Pembayaran / DP
            </button>
          </div>
        </div>
      </section>

      <!-- PPIC TAB -->
      <section v-if="activeTab === 'ppic'" class="space-y-6">
        <h3 class="font-bold text-slate-900 text-base">PPIC Center (Kalkulasi Kertas 3% Insheet & Deadline 4 Hari)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="job in jobs" :key="'ppic-' + job.no_spk" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div class="flex items-center justify-between border-b pb-2">
              <span class="font-mono font-bold text-slate-900">{{ job.no_spk }}</span>
              <span :class="job.status_ppic === 'selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-cyan-100 text-cyan-800'" class="px-2 py-0.5 rounded text-[10px] font-bold">
                {{ job.status_ppic === 'selesai' ? 'SIAP PRODUKSI' : 'PROSES PPIC' }}
              </span>
            </div>
            <div>
              <div class="font-bold text-slate-900">{{ job.nama_customer }}</div>
              <div class="text-slate-500">Order: {{ job.jumlah_order.toLocaleString() }} pcs &bull; Plano: {{ job.plano_bahan || '79 x 109' }}</div>
              <div class="text-cyan-800 font-semibold mt-1">
                Kebutuhan Plano: <strong>{{ job.total_plano_kebutuhan || 0 }} lembar</strong> (Inc. Insheet 3%)
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div class="p-1.5 rounded bg-slate-100">Kertas: <strong>{{ job.status_material_kertas || 'Menunggu' }}</strong></div>
              <div class="p-1.5 rounded bg-slate-100">Plat: <strong>{{ job.status_plat_cetak || 'Menunggu' }}</strong></div>
              <div class="p-1.5 rounded bg-slate-100">Pisau: <strong>{{ job.status_pisau_pond || 'Menunggu' }}</strong></div>
            </div>
            <button @click="openPpicModal(job)" class="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition cursor-pointer">
              Update Material PPIC
            </button>
          </div>
        </div>
      </section>

      <!-- PRODUKSI TAB -->
      <section v-if="activeTab === 'produksi'" class="space-y-6">
        <h3 class="font-bold text-slate-900 text-base">Produksi Control (4 Tahap & Miss Reject Tracking)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="job in jobs" :key="'prod-' + job.no_spk" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div class="flex items-center justify-between border-b pb-2">
              <span class="font-mono font-bold text-slate-900">{{ job.no_spk }}</span>
              <span :class="job.is_siap_kirim ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'" class="px-2 py-0.5 rounded text-[10px] font-bold">
                {{ job.is_siap_kirim ? 'SIAP KIRIM' : 'PROSES PROD' }}
              </span>
            </div>
            <div>
              <div class="font-bold text-slate-900">{{ job.nama_customer }}</div>
              <div class="text-slate-500">Target: {{ job.jumlah_order.toLocaleString() }} pcs</div>
            </div>
            <div class="space-y-1.5 text-[11px]">
              <div class="flex justify-between p-1 rounded bg-slate-50">
                <span>1. Cetak Offset:</span>
                <span class="font-semibold">{{ job.tahap_cetak?.operator || '-' }} (Miss: {{ job.tahap_cetak?.jumlah_miss || 0 }})</span>
              </div>
              <div class="flex justify-between p-1 rounded bg-slate-50">
                <span>2. Laminasi:</span>
                <span class="font-semibold">{{ job.tahap_laminasi?.operator || '-' }} (Miss: {{ job.tahap_laminasi?.jumlah_miss || 0 }})</span>
              </div>
              <div class="flex justify-between p-1 rounded bg-slate-50">
                <span>3. Pond / Creasing:</span>
                <span class="font-semibold">{{ job.tahap_pond?.operator || '-' }} (Miss: {{ job.tahap_pond?.jumlah_miss || 0 }})</span>
              </div>
              <div class="flex justify-between p-1 rounded bg-slate-50">
                <span>4. Finishing / Lem:</span>
                <span class="font-semibold">{{ job.tahap_finishing?.operator || '-' }} (Miss: {{ job.tahap_finishing?.jumlah_miss || 0 }})</span>
              </div>
            </div>
            <button @click="openProduksiModal(job)" class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer">
              Update Tahapan Produksi
            </button>
          </div>
        </div>
      </section>

    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
      &copy; Woondypack Internasional &bull; Google Apps Script Standalone ERP
    </footer>

  </div>

  <script>
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
      setup() {
        const activeTab = ref('dashboard');
        const jobs = ref([]);
        const isLoading = ref(false);

        // Fetch data from backend Code.gs
        const fetchData = () => {
          isLoading.value = true;
          if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
              .withSuccessHandler((response) => {
                isLoading.value = false;
                if (response && response.jobs) {
                  jobs.value = response.jobs;
                }
              })
              .withFailureHandler((err) => {
                isLoading.value = false;
                alert('Gagal mengambil data dari Google Sheets: ' + err);
              })
              .apiGetInitialData();
          } else {
            // Mock sample for local test
            isLoading.value = false;
            jobs.value = [
              {
                no_spk: 'SPK-2026-001',
                tanggal_order: '2026-08-26',
                nama_customer: 'PT Surya Rasa Nusantara',
                nama_produk: 'Box Dimsum Ivory 300',
                jumlah_order: 5000,
                harga_satuan: 1200,
                total_nominal: 6000000,
                total_terbayar: 3000000,
                sisa_pembayaran: 3000000,
                jenis_bahan: 'Ivory 300',
                tipe_laminasi: 'Glossy',
                status_global: 'proses_produksi',
                status_finance: 'sudah_proses',
                status_ppic: 'selesai',
                status_produksi: 'dalam_proses',
                tanggal_deadline_spk: '2026-09-05',
                total_plano_kebutuhan: 1288,
                tahap_cetak: { operator: 'Pak Budi', jumlah_miss: 15 },
                tahap_laminasi: { operator: 'Mas Joko', jumlah_miss: 8 },
                tahap_pond: { operator: 'Mas Agus', jumlah_miss: 5 },
                tahap_finishing: { operator: 'Mbak Rina', jumlah_miss: 2 }
              }
            ];
          }
        };

        onMounted(() => {
          fetchData();
        });

        const activeJobs = computed(() => jobs.value.filter(j => !j.is_canceled && !j.is_siap_kirim));
        const completedJobs = computed(() => jobs.value.filter(j => j.is_siap_kirim));
        const pendingFinanceCount = computed(() => jobs.value.filter(j => !j.is_canceled && j.status_finance === 'belum_proses').length);
        const pendingPpicCount = computed(() => jobs.value.filter(j => !j.is_canceled && j.status_finance === 'sudah_proses' && j.status_ppic !== 'selesai').length);
        const activeProduksiCount = computed(() => jobs.value.filter(j => !j.is_canceled && j.status_ppic === 'selesai' && !j.is_siap_kirim).length);
        
        const totalRevenue = computed(() => jobs.value.reduce((sum, j) => sum + (j.total_nominal || 0), 0));
        const totalTerbayar = computed(() => jobs.value.reduce((sum, j) => sum + (j.total_terbayar || 0), 0));

        const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

        const getStatusBadgeClass = (job) => {
          if (job.is_canceled) return 'bg-rose-100 text-rose-800';
          if (job.is_siap_kirim) return 'bg-blue-100 text-blue-800';
          if (job.status_ppic === 'selesai') return 'bg-purple-100 text-purple-800';
          if (job.status_finance === 'sudah_proses') return 'bg-cyan-100 text-cyan-800';
          return 'bg-amber-100 text-amber-800';
        };

        const formatStatus = (job) => {
          if (job.is_canceled) return 'Dibatalkan';
          if (job.is_siap_kirim) return 'Siap Kirim';
          if (job.status_ppic === 'selesai') return 'Sedang Produksi';
          if (job.status_finance === 'sudah_proses') return 'Siap PPIC';
          return 'Menunggu DP';
        };

        const openNewSpkModal = () => {
          const cust = prompt('Nama Customer:');
          if (!cust) return;
          const produk = prompt('Nama Produk:');
          const qty = Number(prompt('Jumlah Order (pcs):', '5000')) || 5000;
          const harga = Number(prompt('Harga Satuan (Rp):', '1200')) || 1200;
          const newNoSpk = 'SPK-' + new Date().getFullYear() + '-' + String(jobs.value.length + 1).padStart(3, '0');

          const newJob = {
            no_spk: newNoSpk,
            tanggal_order: new Date().toISOString().split('T')[0],
            nama_customer: cust,
            nama_produk: produk || 'Packaging Box',
            jumlah_order: qty,
            harga_satuan: harga,
            total_nominal: qty * harga,
            jenis_bahan: 'Ivory 300',
            tipe_laminasi: 'Tanpa Laminasi',
            status_global: 'draft',
            status_finance: 'belum_proses',
            status_ppic: 'antrean',
            status_produksi: 'antrean'
          };

          if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
              .withSuccessHandler(() => {
                fetchData();
                alert('SPK ' + newNoSpk + ' berhasil disimpan ke Google Sheets!');
              })
              .apiSaveSpk(newJob);
          } else {
            jobs.value.unshift(newJob);
          }
        };

        const viewSpk = (job) => {
          alert('Detail SPK ' + job.no_spk + ':\\nCustomer: ' + job.nama_customer + '\\nProduk: ' + job.nama_produk + '\\nTotal: ' + formatRupiah(job.total_nominal));
        };

        const editJob = (job) => {
          const newCust = prompt('Edit Nama Customer:', job.nama_customer);
          if (newCust) {
            job.nama_customer = newCust;
            if (typeof google !== 'undefined' && google.script && google.script.run) {
              google.script.run.withSuccessHandler(fetchData).apiSaveSpk(job);
            }
          }
        };

        const openPaymentModal = (job) => {
          const nominal = Number(prompt('Masukkan Nominal Pembayaran (Rp):', job.sisa_pembayaran || (job.total_nominal / 2))) || 0;
          if (nominal > 0) {
            job.total_terbayar = (job.total_terbayar || 0) + nominal;
            job.sisa_pembayaran = Math.max(0, job.total_nominal - job.total_terbayar);
            job.is_lunas = job.sisa_pembayaran === 0;
            job.status_finance = 'sudah_proses';
            if (!job.tanggal_dp) {
              job.tanggal_dp = new Date().toISOString().split('T')[0];
              const d = new Date();
              d.setDate(d.getDate() + 10);
              job.tanggal_deadline_spk = d.toISOString().split('T')[0];
            }
            if (typeof google !== 'undefined' && google.script && google.script.run) {
              google.script.run.withSuccessHandler(fetchData).apiUpdateFinance(job);
            }
          }
        };

        const openPpicModal = (job) => {
          const plano = Number(prompt('Total Kebutuhan Lembar Plano:', job.total_plano_kebutuhan || '1200')) || 1200;
          job.total_plano_kebutuhan = plano;
          job.status_material_kertas = 'Ready';
          job.status_plat_cetak = 'Ready';
          job.status_pisau_pond = 'Ready';
          job.status_ppic = 'selesai';

          if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run.withSuccessHandler(fetchData).apiUpdatePpic(job);
          }
        };

        const openProduksiModal = (job) => {
          const isDone = confirm('Apakah pekerjaan ini sudah selesai semua tahap (Cetak, Laminasi, Pond, Finishing) dan Siap Kirim?');
          if (isDone) {
            job.is_siap_kirim = true;
            job.status_produksi = 'selesai';
            if (typeof google !== 'undefined' && google.script && google.script.run) {
              google.script.run.withSuccessHandler(fetchData).apiUpdateProduksi(job);
            }
          }
        };

        return {
          activeTab,
          jobs,
          isLoading,
          fetchData,
          activeJobs,
          completedJobs,
          pendingFinanceCount,
          pendingPpicCount,
          activeProduksiCount,
          totalRevenue,
          totalTerbayar,
          formatRupiah,
          getStatusBadgeClass,
          formatStatus,
          openNewSpkModal,
          viewSpk,
          editJob,
          openPaymentModal,
          openPpicModal,
          openProduksiModal
        };
      }
    }).mount('#app');
  </script>

</body>
</html>`;
}

export const generateCodeGs = generateFullCodeGs;
export const generateIndexHtml = generateStandaloneIndexHtml;
