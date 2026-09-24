import React, { useState, useMemo } from 'react';
import { 
  Factory, 
  Printer, 
  Layers, 
  Scissors, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Eye, 
  Edit3, 
  X, 
  Sparkles,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  SpkJob, 
  ProductionStageDetail 
} from '../types';
import { 
  formatTanggalIndo, 
  calculateJobMiss, 
  isOverdue, 
  calculateWorkingDaysBetween 
} from '../utils/calculator';

interface ProduksiViewProps {
  jobs: SpkJob[];
  onUpdateProduksi: (job: SpkJob) => void;
  onOpenSpkReview: (job: SpkJob) => void;
}

export const ProduksiView: React.FC<ProduksiViewProps> = ({
  jobs,
  onUpdateProduksi,
  onOpenSpkReview,
}) => {
  // 3 Stages of Production (all in 1 tab)
  const [activeStage, setActiveStage] = useState<'antrean' | 'on_proses' | 'selesai'>('antrean');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Update Progress Produksi
  const [modalJob, setModalJob] = useState<SpkJob | null>(null);

  // Form States for 4 Production Stages
  // 1. Cetak
  const [cetakOperator, setCetakOperator] = useState('');
  const [cetakMesin, setCetakMesin] = useState('');
  const [cetakTglMulai, setCetakTglMulai] = useState('');
  const [cetakTglSelesai, setCetakTglSelesai] = useState('');
  const [cetakMiss, setCetakMiss] = useState<number>(0);
  const [cetakSelesai, setCetakSelesai] = useState(false);

  // 2. Laminasi
  const [laminasiOperator, setLaminasiOperator] = useState('');
  const [laminasiMesin, setLaminasiMesin] = useState('');
  const [laminasiTglMulai, setLaminasiTglMulai] = useState('');
  const [laminasiTglSelesai, setLaminasiTglSelesai] = useState('');
  const [laminasiMiss, setLaminasiMiss] = useState<number>(0);
  const [laminasiSelesai, setLaminasiSelesai] = useState(false);

  // 3. Pond
  const [pondOperator, setPondOperator] = useState('');
  const [pondMesin, setPondMesin] = useState('');
  const [pondTglMulai, setPondTglMulai] = useState('');
  const [pondTglSelesai, setPondTglSelesai] = useState('');
  const [pondMiss, setPondMiss] = useState<number>(0);
  const [pondSelesai, setPondSelesai] = useState(false);

  // 4. Finishing
  const [finishingOperator, setFinishingOperator] = useState('');
  const [finishingMesin, setFinishingMesin] = useState('');
  const [finishingTglMulai, setFinishingTglMulai] = useState('');
  const [finishingTglSelesai, setFinishingTglSelesai] = useState('');
  const [finishingMiss, setFinishingMiss] = useState<number>(0);
  const [finishingKeteranganReject, setFinishingKeteranganReject] = useState('');
  const [finishingSelesai, setFinishingSelesai] = useState(false);

  // Checklist Selesai & Siap Kirim
  const [isSiapKirimChecked, setIsSiapKirimChecked] = useState(false);

  // Jobs that have entered Production (Lolos PPIC Selesai)
  const produksiJobs = useMemo(() => {
    return jobs.filter((j) => !j.is_canceled && j.status_ppic === 'selesai');
  }, [jobs]);

  // Filter by active stage & search
  const stageJobs = useMemo(() => {
    return produksiJobs.filter((job) => {
      if (activeStage === 'antrean' && (job.status_produksi !== 'antrean' || job.is_siap_kirim)) return false;
      if (activeStage === 'on_proses' && (job.status_produksi !== 'on_proses' || job.is_siap_kirim)) return false;
      if (activeStage === 'selesai' && (!job.is_siap_kirim && job.status_produksi !== 'selesai')) return false;

      const term = searchTerm.toLowerCase();
      return (
        job.no_spk.toLowerCase().includes(term) ||
        job.nama_customer.toLowerCase().includes(term) ||
        job.nama_produk.toLowerCase().includes(term)
      );
    });
  }, [produksiJobs, activeStage, searchTerm]);

  // Counts
  const antreanCount = produksiJobs.filter((j) => j.status_produksi === 'antrean' && !j.is_siap_kirim).length;
  const onProsesCount = produksiJobs.filter((j) => j.status_produksi === 'on_proses' && !j.is_siap_kirim).length;
  const selesaiCount = produksiJobs.filter((j) => j.is_siap_kirim || j.status_produksi === 'selesai').length;

  // Open Edit Modal with last state loaded
  const handleOpenProduksiModal = (job: SpkJob) => {
    setModalJob(job);

    // Cetak
    setCetakOperator(job.tahap_cetak?.operator || '');
    setCetakMesin(job.tahap_cetak?.mesin || '');
    setCetakTglMulai(job.tahap_cetak?.tanggal_mulai || '');
    setCetakTglSelesai(job.tahap_cetak?.tanggal_selesai || '');
    setCetakMiss(job.tahap_cetak?.jumlah_miss || 0);
    setCetakSelesai(job.tahap_cetak?.selesai || false);

    // Laminasi
    setLaminasiOperator(job.tahap_laminasi?.operator || '');
    setLaminasiMesin(job.tahap_laminasi?.mesin || '');
    setLaminasiTglMulai(job.tahap_laminasi?.tanggal_mulai || '');
    setLaminasiTglSelesai(job.tahap_laminasi?.tanggal_selesai || '');
    setLaminasiMiss(job.tahap_laminasi?.jumlah_miss || 0);
    setLaminasiSelesai(job.tahap_laminasi?.selesai || false);

    // Pond
    setPondOperator(job.tahap_pond?.operator || '');
    setPondMesin(job.tahap_pond?.mesin || '');
    setPondTglMulai(job.tahap_pond?.tanggal_mulai || '');
    setPondTglSelesai(job.tahap_pond?.tanggal_selesai || '');
    setPondMiss(job.tahap_pond?.jumlah_miss || 0);
    setPondSelesai(job.tahap_pond?.selesai || false);

    // Finishing
    setFinishingOperator(job.tahap_finishing?.operator || '');
    setFinishingMesin(job.tahap_finishing?.mesin || '');
    setFinishingTglMulai(job.tahap_finishing?.tanggal_mulai || '');
    setFinishingTglSelesai(job.tahap_finishing?.tanggal_selesai || '');
    setFinishingMiss(job.tahap_finishing?.jumlah_miss || 0);
    setFinishingKeteranganReject(job.tahap_finishing?.keterangan_reject || '');
    setFinishingSelesai(job.tahap_finishing?.selesai || false);

    // Siap Kirim
    setIsSiapKirimChecked(job.is_siap_kirim || false);
  };

  // Submit Save Produksi
  const handleSaveProduksi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalJob) return;

    const anyProcessStarted = Boolean(
      cetakOperator || laminasiOperator || pondOperator || finishingOperator ||
      cetakTglMulai || laminasiTglMulai || pondTglMulai || finishingTglMulai
    );

    const isFinished = isSiapKirimChecked;
    const newStage: 'antrean' | 'on_proses' | 'selesai' = isFinished
      ? 'selesai'
      : (anyProcessStarted ? 'on_proses' : 'antrean');

    const nowStr = new Date().toISOString().split('T')[0];

    const updatedJob: SpkJob = {
      ...modalJob,
      status_produksi: newStage,
      is_siap_kirim: isFinished,
      tanggal_selesai_produksi: isFinished ? (modalJob.tanggal_selesai_produksi || nowStr) : undefined,

      tahap_cetak: {
        operator: cetakOperator,
        mesin: cetakMesin,
        tanggal_mulai: cetakTglMulai,
        tanggal_selesai: cetakTglSelesai,
        jumlah_miss: Number(cetakMiss) || 0,
        selesai: cetakSelesai,
      },
      tahap_laminasi: {
        operator: laminasiOperator,
        mesin: laminasiMesin,
        tanggal_mulai: laminasiTglMulai,
        tanggal_selesai: laminasiTglSelesai,
        jumlah_miss: Number(laminasiMiss) || 0,
        selesai: laminasiSelesai,
      },
      tahap_pond: {
        operator: pondOperator,
        mesin: pondMesin,
        tanggal_mulai: pondTglMulai,
        tanggal_selesai: pondTglSelesai,
        jumlah_miss: Number(pondMiss) || 0,
        selesai: pondSelesai,
      },
      tahap_finishing: {
        operator: finishingOperator,
        mesin: finishingMesin,
        tanggal_mulai: finishingTglMulai,
        tanggal_selesai: finishingTglSelesai,
        jumlah_miss: Number(finishingMiss) || 0,
        keterangan_reject: finishingKeteranganReject,
        selesai: finishingSelesai,
      },

      status_global: isFinished ? (modalJob.is_lunas ? 'selesai' : 'siap_kirim') : 'prod_on_proses',
      updated_at: new Date().toISOString(),
    };

    onUpdateProduksi(updatedJob);
    setModalJob(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold">
              MODUL PRODUKSI CONTROL
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Pengawasan Produksi: Cetak, Laminasi, Pond &amp; Finishing
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Catat operator, mesin, waktu pengerjaan, reject miss, alarm 5 hari produksi, dan ketepatan deadline total 10 hari kerja.
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-700 flex-shrink-0" />
          <span>
            <strong>Ketentuan Deadline:</strong> Produksi maks <strong>5 hari</strong> &bull; Total dari DP s/d Siap Kirim maks <strong>10 hari kerja</strong>.
          </span>
        </div>
      </div>

      {/* 3 Stage Nav Buttons (1 Tab Terpadu) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          <button
            onClick={() => setActiveStage('antrean')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'antrean'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Antrean Proses</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {antreanCount}
            </span>
          </button>

          <button
            onClick={() => setActiveStage('on_proses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'on_proses'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>2. On Proses (Sedang Dikerjakan)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {onProsesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveStage('selesai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'selesai'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>3. Selesai (Siap Kirim &amp; Lolos QC)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {selesaiCount}
            </span>
          </button>

        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari SPK Produksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Table Produksi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No SPK &amp; Customer</th>
                <th className="py-3.5 px-4">Produk &amp; Order</th>
                <th className="py-3.5 px-4">Status 4 Tahapan Kerja</th>
                <th className="py-3.5 px-4">Total Miss &amp; Reject</th>
                <th className="py-3.5 px-4">Deadline Produksi &amp; Total (10H)</th>
                <th className="py-3.5 px-4">Evaluasi Ketepatan</th>
                <th className="py-3.5 px-4 text-center">Aksi Produksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stageJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada SPK pada tahapan <strong>{activeStage.toUpperCase()}</strong>.
                  </td>
                </tr>
              ) : (
                stageJobs.map((job) => {
                  const { totalMissPcs, missPercent } = calculateJobMiss(job);

                  // Cek evaluasi deadline 10 hari sejak DP
                  const isOverallLate = job.tanggal_deadline_spk
                    ? isOverdue(job.tanggal_deadline_spk, job.is_siap_kirim ? job.tanggal_selesai_produksi : undefined)
                    : false;

                  const isProd5DayLate = job.tanggal_deadline_produksi
                    ? isOverdue(job.tanggal_deadline_produksi, job.is_siap_kirim ? job.tanggal_selesai_produksi : undefined)
                    : false;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* No SPK */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-[11px]">
                          {job.no_spk}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">{job.nama_customer}</p>
                        <p className="text-[10px] text-slate-400">Masuk Prod: {formatTanggalIndo(job.tanggal_masuk_produksi)}</p>
                      </td>

                      {/* Produk & Qty */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{job.nama_produk}</p>
                        <p className="text-[11px] text-slate-600">
                          {job.jumlah_order.toLocaleString('id-ID')} pcs &bull; {job.jenis_bahan}
                        </p>
                        {job.catatan_sales && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Add-on: {job.catatan_sales}
                          </span>
                        )}
                      </td>

                      {/* 4 Tahapan Kerja Status Chips */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {/* Cetak */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.tahap_cetak?.selesai 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : job.tahap_cetak?.operator 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            Cetak {job.tahap_cetak?.selesai ? '✓' : ''}
                          </span>

                          {/* Laminasi */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.tahap_laminasi?.selesai 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : job.tahap_laminasi?.operator 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            Laminasi {job.tahap_laminasi?.selesai ? '✓' : ''}
                          </span>

                          {/* Pond */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.tahap_pond?.selesai 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : job.tahap_pond?.operator 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            Pond {job.tahap_pond?.selesai ? '✓' : ''}
                          </span>

                          {/* Finishing */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.tahap_finishing?.selesai 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : job.tahap_finishing?.operator 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            Finishing {job.tahap_finishing?.selesai ? '✓' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Total Miss & Reject */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">
                          {totalMissPcs} pcs
                        </p>
                        <p className={`text-[11px] font-black ${
                          missPercent <= 3 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {missPercent}% dari order
                        </p>
                      </td>

                      {/* Deadline Produksi & 10 Hari */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-[11px] text-slate-600">
                          Prod (5H): <strong className={isProd5DayLate ? 'text-rose-600' : 'text-slate-800'}>{formatTanggalIndo(job.tanggal_deadline_produksi)}</strong>
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Total DP (10H): <strong className={isOverallLate ? 'text-rose-600' : 'text-slate-800'}>{formatTanggalIndo(job.tanggal_deadline_spk)}</strong>
                        </p>
                      </td>

                      {/* Evaluasi Ketepatan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.is_siap_kirim ? (
                          isOverallLate ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Terlambat (&gt;10H)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Sesuai Deadline (Tepat)
                            </span>
                          )
                        ) : (
                          isOverallLate ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Warning Melebihi DL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                              Dalam Pengerjaan
                            </span>
                          )
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenSpkReview(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                            title="Review Detail SPK"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenProduksiModal(job)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Update Progress</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL UPDATE PROGRESS PRODUKSI */}
      {modalJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-purple-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Update Kontrol Produksi 4 Tahap</h3>
                  <p className="text-xs text-purple-200">
                    SPK: {modalJob.no_spk} - {modalJob.nama_customer} ({modalJob.jumlah_order.toLocaleString('id-ID')} pcs)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalJob(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form 4 Tahapan */}
            <form onSubmit={handleSaveProduksi} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* TAHAP 1: CETAK */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">1. Tahap Cetak Offset</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cetakSelesai}
                      onChange={(e) => setCetakSelesai(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Selesai Cetak</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Operator Cetak</label>
                    <input
                      type="text"
                      value={cetakOperator}
                      onChange={(e) => setCetakOperator(e.target.value)}
                      placeholder="Nama Operator"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mesin Cetak (Manual)</label>
                    <input
                      type="text"
                      value={cetakMesin}
                      onChange={(e) => setCetakMesin(e.target.value)}
                      placeholder="Misal: Heidelberg SM 74"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jumlah Miss Cetak (Pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={cetakMiss}
                      onChange={(e) => setCetakMiss(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mulai Cetak</label>
                    <input
                      type="date"
                      value={cetakTglMulai}
                      onChange={(e) => setCetakTglMulai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai Cetak</label>
                    <input
                      type="date"
                      value={cetakTglSelesai}
                      onChange={(e) => setCetakTglSelesai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* TAHAP 2: LAMINASI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">2. Tahap Laminasi ({modalJob.tipe_laminasi} - {modalJob.sisi_laminasi})</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={laminasiSelesai}
                      onChange={(e) => setLaminasiSelesai(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Selesai Laminasi</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operator Laminasi</label>
                    <input
                      type="text"
                      value={laminasiOperator}
                      onChange={(e) => setLaminasiOperator(e.target.value)}
                      placeholder="Nama Operator"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mesin Laminasi</label>
                    <input
                      type="text"
                      value={laminasiMesin}
                      onChange={(e) => setLaminasiMesin(e.target.value)}
                      placeholder="Misal: Thermal YDFM-720"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jumlah Miss Laminasi (Pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={laminasiMiss}
                      onChange={(e) => setLaminasiMiss(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mulai Laminasi</label>
                    <input
                      type="date"
                      value={laminasiTglMulai}
                      onChange={(e) => setLaminasiTglMulai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai Laminasi</label>
                    <input
                      type="date"
                      value={laminasiTglSelesai}
                      onChange={(e) => setLaminasiTglSelesai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* TAHAP 3: POND / DIE-CUT */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">3. Tahap Pond (Cutting / Die-Cut)</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pondSelesai}
                      onChange={(e) => setPondSelesai(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Selesai Pond</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operator Pond</label>
                    <input
                      type="text"
                      value={pondOperator}
                      onChange={(e) => setPondOperator(e.target.value)}
                      placeholder="Nama Operator"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mesin Pond</label>
                    <input
                      type="text"
                      value={pondMesin}
                      onChange={(e) => setPondMesin(e.target.value)}
                      placeholder="Misal: Pond ML-750"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jumlah Miss Pond (Pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={pondMiss}
                      onChange={(e) => setPondMiss(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mulai Pond</label>
                    <input
                      type="date"
                      value={pondTglMulai}
                      onChange={(e) => setPondTglMulai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai Pond</label>
                    <input
                      type="date"
                      value={pondTglSelesai}
                      onChange={(e) => setPondTglSelesai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* TAHAP 4: FINISHING & PACKING */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">4. Tahap Finishing, Lem &amp; Packing</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={finishingSelesai}
                      onChange={(e) => setFinishingSelesai(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Selesai Finishing</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operator Finishing</label>
                    <input
                      type="text"
                      value={finishingOperator}
                      onChange={(e) => setFinishingOperator(e.target.value)}
                      placeholder="Nama Operator"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mesin / Line Lem</label>
                    <input
                      type="text"
                      value={finishingMesin}
                      onChange={(e) => setFinishingMesin(e.target.value)}
                      placeholder="Folder Gluer / Manual"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Total Reject Finishing (Pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={finishingMiss}
                      onChange={(e) => setFinishingMiss(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan / Penyebab Reject Finishing</label>
                  <input
                    type="text"
                    value={finishingKeteranganReject}
                    onChange={(e) => setFinishingKeteranganReject(e.target.value)}
                    placeholder="Misal: Lem kurang rekat di sudut / lid miring..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mulai Finishing</label>
                    <input
                      type="date"
                      value={finishingTglMulai}
                      onChange={(e) => setFinishingTglMulai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai Finishing</label>
                    <input
                      type="date"
                      value={finishingTglSelesai}
                      onChange={(e) => setFinishingTglSelesai(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* CEKLIST SELESAI & SIAP KIRIM */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Konfirmasi Selesai Produksi &amp; Lolos QC
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Centang untuk mengubah status job menjadi <strong>Siap Kirim &amp; Selesai</strong> dan berpindah ke tab Selesai Proses.
                  </p>
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-900 cursor-pointer shadow-sm">
                  <input
                    type="checkbox"
                    checked={isSiapKirimChecked}
                    onChange={(e) => setIsSiapKirimChecked(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Selesai &amp; Siap Kirim</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Progress Produksi</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
