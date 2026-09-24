import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Scissors, 
  Factory, 
  CreditCard, 
  Calendar, 
  User, 
  Phone, 
  Package, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import { SpkJob } from '../types';
import { 
  formatRupiah, 
  formatTanggalIndo, 
  calculateJobMiss,
  isOverdue
} from '../utils/calculator';

interface SpkReviewModalProps {
  job: SpkJob | null;
  onClose: () => void;
}

export const SpkReviewModal: React.FC<SpkReviewModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const { totalMissPcs, missPercent } = calculateJobMiss(job);

  const isOverdueFromDp = job.tanggal_deadline_spk
    ? isOverdue(job.tanggal_deadline_spk, job.is_siap_kirim ? job.tanggal_selesai_produksi : undefined)
    : false;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 print:my-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Header / Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
              SPK
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Lembar Review Surat Perintah Kerja (SPK)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-mono font-black">
                  {job.no_spk}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Woondypack Internasional &bull; Digital Work Order Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Lembar SPK</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SPK Document Body */}
        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-6 text-slate-900 text-xs">
          
          {/* Company Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                WOONDYPACK INTERNASIONAL
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Premium Offset Printing, Packaging &amp; Box Manufacturing
              </p>
              <p className="text-[11px] text-slate-500">
                Kawasan Industri Percetakan Modern &bull; Layanan Cepat &amp; Tepat Waktu (SOP 10 Hari Kerja)
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-lg bg-slate-950 text-white font-mono font-black text-sm">
                NO: {job.no_spk}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tgl Order: <strong>{formatTanggalIndo(job.tanggal_order)}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Sales: <strong>{job.nama_sales}</strong>
              </p>
            </div>
          </div>

          {/* Section 1: Customer & Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Customer Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <User className="w-4 h-4 text-emerald-600" /> Informasi Customer
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Nama Customer / Perusahaan:</p>
                <p className="font-bold text-sm text-slate-900">{job.nama_customer}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Kontak / Telepon:</p>
                <p className="font-semibold text-slate-800">{job.telepon_customer || '-'}</p>
              </div>
            </div>

            {/* Product Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <Package className="w-4 h-4 text-indigo-600" /> Spesifikasi Produk
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Nama Produk Cetakan:</p>
                <p className="font-bold text-sm text-slate-900">{job.nama_produk}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500 text-[10px]">Ukuran Produk:</p>
                  <p className="font-semibold text-slate-800">{job.ukuran_produk || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">Jumlah Pesanan (Qty):</p>
                  <p className="font-bold text-emerald-800 text-sm">{job.jumlah_order.toLocaleString('id-ID')} pcs</p>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Spesifikasi Kertas, Cetak & Finishing */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Layers className="w-4 h-4 text-cyan-600" /> Spesifikasi Kertas, Warna Cetak &amp; Laminasi
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block">Jenis Kertas</span>
                <span className="font-bold text-slate-900">{job.jenis_bahan}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Laminasi</span>
                <span className="font-bold text-slate-900">{job.tipe_laminasi}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Sisi Laminasi</span>
                <span className="font-bold text-slate-900">{job.sisi_laminasi}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Warna Desain</span>
                <span className="font-bold text-slate-900">
                  {job.desain_cetakan} {job.keterangan_warna ? `(${job.keterangan_warna})` : ''}
                </span>
              </div>
            </div>

            {job.catatan_sales && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-medium">
                <strong>Catatan Khusus / Add-on Sales:</strong> {job.catatan_sales}
              </div>
            )}
          </div>

          {/* Section 3: PPIC & Rumus Cutting Paper */}
          <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-200 pb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-950">
                <Scissors className="w-4 h-4 text-cyan-700" /> Hasil Kalkulasi PPIC &amp; Kebutuhan Material
              </span>
              <span className="text-[10px] font-bold text-cyan-800">
                Status PPIC: {job.status_ppic.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2 bg-white rounded-xl border border-cyan-100">
                <span className="text-[10px] text-slate-500 block">Ukuran Plano</span>
                <span className="font-bold text-slate-900">{job.plano_bahan}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-cyan-100">
                <span className="text-[10px] text-slate-500 block">Ukuran Cetak</span>
                <span className="font-bold text-slate-900">{job.ukuran_bahan_cetak}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-cyan-100">
                <span className="text-[10px] text-slate-500 block">Potong Out</span>
                <span className="font-bold text-slate-900">{job.potong_out} out</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-cyan-100">
                <span className="text-[10px] text-slate-500 block">Lembar Cetak</span>
                <span className="font-bold text-slate-900">{job.kebutuhan_lembar_cetak} lbr</span>
              </div>
              <div className="p-2 bg-cyan-700 text-white rounded-xl">
                <span className="text-[10px] text-cyan-200 block">Total Plano (+3%)</span>
                <span className="font-black text-sm">{job.total_plano_kebutuhan} Plano</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>Bahan Kertas:</span>
                <strong className={job.status_material_kertas === 'Ready' ? 'text-emerald-700' : 'text-amber-700'}>
                  {job.status_material_kertas || 'Menunggu'}
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>Plat Cetak CTP:</span>
                <strong className={job.status_plat_cetak === 'Ready' ? 'text-emerald-700' : 'text-amber-700'}>
                  {job.status_plat_cetak || 'Menunggu'}
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>Pisau Pond:</span>
                <strong className={job.status_pisau_pond === 'Ready' ? 'text-emerald-700' : 'text-amber-700'}>
                  {job.status_pisau_pond || 'Menunggu'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 4: Produksi & Miss Reject */}
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200 pb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                <Factory className="w-4 h-4 text-purple-700" /> Catatan 4 Tahapan Produksi &amp; Miss Reject
              </span>
              <span className="text-[10px] font-bold text-purple-800">
                Status Produksi: {job.status_produksi.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Cetak */}
              <div className="p-2.5 rounded-xl bg-white border border-purple-100 space-y-1">
                <span className="font-bold text-purple-900 block border-b border-slate-100 pb-1">
                  1. Cetak Offset {job.tahap_cetak?.selesai ? '✓' : ''}
                </span>
                <p className="text-[10px] text-slate-600">Op: {job.tahap_cetak?.operator || '-'}</p>
                <p className="text-[10px] text-slate-600">Mesin: {job.tahap_cetak?.mesin || '-'}</p>
                <p className="text-[10px] text-rose-600 font-semibold">Miss: {job.tahap_cetak?.jumlah_miss || 0} pcs</p>
              </div>

              {/* Laminasi */}
              <div className="p-2.5 rounded-xl bg-white border border-purple-100 space-y-1">
                <span className="font-bold text-purple-900 block border-b border-slate-100 pb-1">
                  2. Laminasi {job.tahap_laminasi?.selesai ? '✓' : ''}
                </span>
                <p className="text-[10px] text-slate-600">Op: {job.tahap_laminasi?.operator || '-'}</p>
                <p className="text-[10px] text-slate-600">Mesin: {job.tahap_laminasi?.mesin || '-'}</p>
                <p className="text-[10px] text-rose-600 font-semibold">Miss: {job.tahap_laminasi?.jumlah_miss || 0} pcs</p>
              </div>

              {/* Pond */}
              <div className="p-2.5 rounded-xl bg-white border border-purple-100 space-y-1">
                <span className="font-bold text-purple-900 block border-b border-slate-100 pb-1">
                  3. Pond / Die-Cut {job.tahap_pond?.selesai ? '✓' : ''}
                </span>
                <p className="text-[10px] text-slate-600">Op: {job.tahap_pond?.operator || '-'}</p>
                <p className="text-[10px] text-slate-600">Mesin: {job.tahap_pond?.mesin || '-'}</p>
                <p className="text-[10px] text-rose-600 font-semibold">Miss: {job.tahap_pond?.jumlah_miss || 0} pcs</p>
              </div>

              {/* Finishing */}
              <div className="p-2.5 rounded-xl bg-white border border-purple-100 space-y-1">
                <span className="font-bold text-purple-900 block border-b border-slate-100 pb-1">
                  4. Finishing &amp; Lem {job.tahap_finishing?.selesai ? '✓' : ''}
                </span>
                <p className="text-[10px] text-slate-600">Op: {job.tahap_finishing?.operator || '-'}</p>
                <p className="text-[10px] text-slate-600">Reject: {job.tahap_finishing?.jumlah_miss || 0} pcs</p>
                {job.tahap_finishing?.keterangan_reject && (
                  <p className="text-[9px] text-slate-500 italic truncate">{job.tahap_finishing.keterangan_reject}</p>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-purple-100 flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Total Miss Produksi &amp; Reject:
              </span>
              <span className="font-black text-sm text-purple-950">
                {totalMissPcs} pcs ({missPercent}% dari jumlah order)
              </span>
            </div>
          </div>

          {/* Section 5: Keuangan & Deadline 10 Hari */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Keuangan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Ringkasan Keuangan
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Harga Satuan:</span>
                  <span className="font-semibold">{formatRupiah(job.harga_satuan)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Nilai Order:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(job.total_nominal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Terbayar:</span>
                  <span className="font-bold">{formatRupiah(job.total_terbayar)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-slate-200">
                  <span>Sisa Tagihan:</span>
                  <span>{job.sisa_pembayaran === 0 ? 'LUNAS (Rp 0)' : formatRupiah(job.sisa_pembayaran)}</span>
                </div>
              </div>
            </div>

            {/* Deadline Control */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Kontrol Waktu &amp; Deadline
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Tgl Pembayaran DP:</span>
                  <span className="font-semibold">{formatTanggalIndo(job.tanggal_dp)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Deadline (10 Hari Kerja):</span>
                  <span className={`font-bold ${isOverdueFromDp ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatTanggalIndo(job.tanggal_deadline_spk)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status Siap Kirim:</span>
                  <span className={`font-bold ${job.is_siap_kirim ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {job.is_siap_kirim ? `Siap Kirim (${formatTanggalIndo(job.tanggal_selesai_produksi)})` : 'Dalam Proses'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Evaluasi Ketepatan:</span>
                  <span className={`font-bold ${isOverdueFromDp ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {isOverdueFromDp ? 'Terlambat (> 10 Hari Kerja)' : 'Tepat Waktu'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Signatures Area (For Printing) */}
          <div className="hidden print:grid grid-cols-4 gap-4 pt-10 text-center text-[10px]">
            <div>
              <p className="font-bold">Sales / Admin</p>
              <div className="h-16"></div>
              <p className="border-t border-slate-400 pt-1 font-semibold">{job.nama_sales}</p>
            </div>
            <div>
              <p className="font-bold">Finance</p>
              <div className="h-16"></div>
              <p className="border-t border-slate-400 pt-1 font-semibold">( .......................... )</p>
            </div>
            <div>
              <p className="font-bold">PPIC Center</p>
              <div className="h-16"></div>
              <p className="border-t border-slate-400 pt-1 font-semibold">( .......................... )</p>
            </div>
            <div>
              <p className="font-bold">Kepala Produksi</p>
              <div className="h-16"></div>
              <p className="border-t border-slate-400 pt-1 font-semibold">( .......................... )</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
