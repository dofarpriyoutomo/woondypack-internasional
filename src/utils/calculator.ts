import { SpkJob } from '../types';

/**
 * Format Angka ke Rupiah (e.g. Rp 1.500.000)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Format Tanggal Indonesia (e.g. 26 Agt 2026)
 */
export function formatTanggalIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Tambah hari kerja (melewati hari Minggu)
 */
export function addWorkingDays(startDateStr: string, daysToAdd: number): string {
  try {
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return '';
    
    let added = 0;
    while (added < daysToAdd) {
      date.setDate(date.getDate() + 1);
      // Skip Minggu (0)
      if (date.getDay() !== 0) {
        added++;
      }
    }
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Cek apakah sebuah tanggal sudah melewati deadline
 */
export function isOverdue(deadlineStr?: string, completedDateStr?: string): boolean {
  if (!deadlineStr) return false;
  const deadline = new Date(deadlineStr);
  const compareDate = completedDateStr ? new Date(completedDateStr) : new Date();
  
  // Strip time for exact date comparison
  deadline.setHours(23, 59, 59, 999);
  return compareDate.getTime() > deadline.getTime();
}

/**
 * Hitung selisih hari kerja antara dua tanggal
 */
export function calculateWorkingDaysBetween(startDateStr: string, endDateStr: string): number {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end < start) return 0;

    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    return workingDays;
  } catch {
    return 0;
  }
}

/**
 * Hitung Kebutuhan Bahan Plano & Lembar Cetak
 * Mengikuti rumus cutting paper percetakan
 */
export function calculatePaperNeeds(
  planoOption: string,
  printSheetSize: string,
  isiCetakan: number,
  jumlahOrder: number
) {
  const isi = Math.max(1, isiCetakan || 1);
  const order = Math.max(1, jumlahOrder || 1);

  // Lembar cetak yang harus dicetak
  const lembarCetak = Math.ceil(order / isi);

  // Parsing dimensi plano (cm)
  let planoW = 79;
  let planoH = 109;
  if (planoOption) {
    const parts = planoOption.split('x').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      planoW = parts[0];
      planoH = parts[1];
    }
  }

  // Parsing dimensi ukuran cetak (cm)
  let sheetW = 54;
  let sheetH = 39;
  if (printSheetSize) {
    const parts = printSheetSize.split('x').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      sheetW = parts[0];
      sheetH = parts[1];
    }
  }

  // Hitung Out potong (2 orientasi potong)
  // Orientasi 1: sejajar
  const out1 = Math.floor(planoW / sheetW) * Math.floor(planoH / sheetH);
  // Orientasi 2: silang
  const out2 = Math.floor(planoW / sheetH) * Math.floor(planoH / sheetW);
  const bestOut = Math.max(1, Math.max(out1, out2));

  // Kebutuhan plano murni
  const planoMurni = Math.ceil(lembarCetak / bestOut);

  // Insheet lebihan kertas 3%
  const insheetPersen = 3;
  const totalPlano = Math.ceil(planoMurni * (1 + insheetPersen / 100));

  return {
    potongOut: bestOut,
    kebutuhanLembarCetak: lembarCetak,
    kebutuhanPlanoMurni: planoMurni,
    insheetPersen,
    totalPlanoKebutuhan: totalPlano,
  };
}

/**
 * Generate No SPK Berikutnya (contoh: SPK 001, SPK 002)
 * Memastikan tidak ada duplikasi nomor
 */
export function generateNextSpkNumber(existingJobs: SpkJob[]): string {
  let maxNumber = 0;
  
  existingJobs.forEach((job) => {
    if (job.no_spk) {
      const match = job.no_spk.match(/SPK\s*(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  const padded = String(nextNumber).padStart(3, '0');
  return `SPK ${padded}`;
}

/**
 * Hitung total reject & miss per SPK
 */
export function calculateJobMiss(job: SpkJob): {
  totalMissPcs: number;
  missPercent: number;
} {
  const missCetak = job.tahap_cetak?.jumlah_miss || 0;
  const missLaminasi = job.tahap_laminasi?.jumlah_miss || 0;
  const missPond = job.tahap_pond?.jumlah_miss || 0;
  const missFinishing = job.tahap_finishing?.jumlah_miss || 0;

  const totalMissPcs = missCetak + missLaminasi + missPond + missFinishing;
  const orderPcs = job.jumlah_order || 1;
  const missPercent = Number(((totalMissPcs / orderPcs) * 100).toFixed(2));

  return {
    totalMissPcs,
    missPercent,
  };
}
