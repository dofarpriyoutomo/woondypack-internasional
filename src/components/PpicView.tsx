import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Scissors, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calculator, 
  Calendar, 
  Search, 
  ArrowRight, 
  Plus, 
  Edit3, 
  Eye, 
  Sparkles,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  SpkJob, 
  PlanoOption, 
  ItemReadyStatus 
} from '../types';
import { 
  formatTanggalIndo, 
  calculatePaperNeeds, 
  addWorkingDays, 
  isOverdue, 
  calculateWorkingDaysBetween 
} from '../utils/calculator';

interface PpicViewProps {
  jobs: SpkJob[];
  onUpdatePpic: (job: SpkJob) => void;
  onOpenSpkReview: (job: SpkJob) => void;
}

const PLANO_PRESETS: PlanoOption[] = [
  '61 x 86',
  '65 x 90',
  '65 x 100',
  '70 x 100',
  '79 x 109',
  '90 x 120',
  'Custom',
];

export const PpicView: React.FC<PpicViewProps> = ({
  jobs,
  onUpdatePpic,
  onOpenSpkReview,
}) => {
  // 3 Stages of PPIC
  const [activeStage, setActiveStage] = useState<'antrean' | 'on_proses' | 'selesai'>('antrean');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Update / Kalkulasi PPIC
  const [modalJob, setModalJob] = useState<SpkJob | null>(null);

  // Form States for PPIC
  const [formPlano, setFormPlano] = useState<PlanoOption>('79 x 109');
  const [formUkuranCetak, setFormUkuranCetak] = useState<string>('54 x 39');
  const [formIsiCetakan, setFormIsiCetakan] = useState<number>(2);
  const [formStatusKertas, setFormStatusKertas] = useState<ItemReadyStatus>('Ready');
  const [formTglOrderKertas, setFormTglOrderKertas] = useState<string>('');
  const [formStatusPlat, setFormStatusPlat] = useState<ItemReadyStatus>('Ready');
  const [formTglOrderPlat, setFormTglOrderPlat] = useState<string>('');
  const [formStatusPisau, setFormStatusPisau] = useState<ItemReadyStatus>('Ready');
  const [formTglOrderPisau, setFormTglOrderPisau] = useState<string>('');
  const [formCatatanPpic, setFormCatatanPpic] = useState<string>('');

  // Filter Jobs belonging to PPIC (Sudah lolos verifikasi Finance)
  const ppicJobs = useMemo(() => {
    return jobs.filter((j) => !j.is_canceled && j.status_finance === 'sudah_proses');
  }, [jobs]);

  // Stage filtered list
  const stageJobs = useMemo(() => {
    return ppicJobs.filter((job) => {
      if (job.status_ppic !== activeStage) return false;

      const term = searchTerm.toLowerCase();
      return (
        job.no_spk.toLowerCase().includes(term) ||
        job.nama_customer.toLowerCase().includes(term) ||
        job.nama_produk.toLowerCase().includes(term)
      );
    });
  }, [ppicJobs, activeStage, searchTerm]);

  // Stage Counters
  const antreanCount = ppicJobs.filter((j) => j.status_ppic === 'antrean').length;
  const onProsesCount = ppicJobs.filter((j) => j.status_ppic === 'on_proses').length;
  const selesaiCount = ppicJobs.filter((j) => j.status_ppic === 'selesai').length;

  // Open Modal to Edit / Process PPIC
  const handleOpenPpicModal = (job: SpkJob) => {
    setModalJob(job);
    setFormPlano(job.plano_bahan || '79 x 109');
    setFormUkuranCetak(job.ukuran_bahan_cetak || '54 x 39');
    setFormIsiCetakan(job.isi_cetakan || 2);
    setFormStatusKertas(job.status_material_kertas || 'Ready');
    setFormTglOrderKertas(job.tanggal_order_kertas || new Date().toISOString().split('T')[0]);
    setFormStatusPlat(job.status_plat_cetak || 'Ready');
    setFormTglOrderPlat(job.tanggal_order_plat || new Date().toISOString().split('T')[0]);
    setFormStatusPisau(job.status_pisau_pond || 'Ready');
    setFormTglOrderPisau(job.tanggal_order_pisau || new Date().toISOString().split('T')[0]);
    setFormCatatanPpic(job.catatan_ppic || '');
  };

  // Live calculation of paper needs
  const calculatedPaper = useMemo(() => {
    if (!modalJob) return null;
    return calculatePaperNeeds(
      formPlano,
      formUkuranCetak,
      formIsiCetakan,
      modalJob.jumlah_order
    );
  }, [modalJob, formPlano, formUkuranCetak, formIsiCetakan]);

  // Save & Update PPIC
  const handleSavePpic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalJob || !calculatedPaper) return;

    // Cek apakah semua material sudah READY
    const allMaterialsReady = 
      formStatusKertas === 'Ready' && 
      formStatusPlat === 'Ready' && 
      formStatusPisau === 'Ready';

    const nowStr = new Date().toISOString().split('T')[0];
    const newStage: 'antrean' | 'on_proses' | 'selesai' = allMaterialsReady ? 'selesai' : 'on_proses';

    const updatedJob: SpkJob = {
      ...modalJob,
      status_ppic: newStage,
      plano_bahan: formPlano,
      ukuran_bahan_cetak: formUkuranCetak,
      isi_cetakan: formIsiCetakan,
      potong_out: calculatedPaper.potongOut,
      kebutuhan_lembar_cetak: calculatedPaper.kebutuhanLembarCetak,
      kebutuhan_plano_murni: calculatedPaper.kebutuhanPlanoMurni,
      insheet_persen: calculatedPaper.insheetPersen,
      total_plano_kebutuhan: calculatedPaper.totalPlanoKebutuhan,
      
      status_material_kertas: formStatusKertas,
      tanggal_order_kertas: formTglOrderKertas,
      status_plat_cetak: formStatusPlat,
      tanggal_order_plat: formTglOrderPlat,
      status_pisau_pond: formStatusPisau,
      tanggal_order_pisau: formTglOrderPisau,
      catatan_ppic: formCatatanPpic,

      tanggal_selesai_ppic: allMaterialsReady ? (modalJob.tanggal_selesai_ppic || nowStr) : undefined,

      // Jika selesai PPIC, otomatis masuk ke antrean Produksi!
      status_produksi: allMaterialsReady ? (modalJob.status_produksi === 'antrean' ? 'antrean' : modalJob.status_produksi) : modalJob.status_produksi,
      tanggal_masuk_produksi: allMaterialsReady ? (modalJob.tanggal_masuk_produksi || nowStr) : modalJob.tanggal_masuk_produksi,
      tanggal_deadline_produksi: allMaterialsReady ? (modalJob.tanggal_deadline_produksi || addWorkingDays(nowStr, 5)) : modalJob.tanggal_deadline_produksi,

      status_global: allMaterialsReady ? 'prod_antrean' : 'ppic_on_proses',
      updated_at: new Date().toISOString(),
    };

    onUpdatePpic(updatedJob);
    setModalJob(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold">
              MODUL PPIC CENTER
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Kalkulator Kebutuhan Kertas &amp; Monitoring Kesiapan Material
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hitung otomatis kebutuhan lembar cetak &amp; plano (+3% Insheet), kontrol kesiapan Plat &amp; Pisau (Maksimal 4 hari kerja).
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-xl bg-cyan-50/80 border border-cyan-200 text-xs text-cyan-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-700 flex-shrink-0" />
          <span>
            <strong>Standar PPIC:</strong> Bahan Kertas, Plat CTP &amp; Pisau Pond wajib Ready dalam <strong>4 Hari Kerja</strong>.
          </span>
        </div>
      </div>

      {/* 3 Stage Nav Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          {/* Stage 1: Antrean */}
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

          {/* Stage 2: On Proses */}
          <button
            onClick={() => setActiveStage('on_proses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'on_proses'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>2. On Proses (Pemesanan Material)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {onProsesCount}
            </span>
          </button>

          {/* Stage 3: Selesai */}
          <button
            onClick={() => setActiveStage('selesai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'selesai'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Selesai (Siap Cetak Produksi)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {selesaiCount}
            </span>
          </button>

        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari SPK PPIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* PPIC Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No SPK &amp; Customer</th>
                <th className="py-3.5 px-4">Spesifikasi &amp; Qty Order</th>
                <th className="py-3.5 px-4">Kalkulasi Plano &amp; Insheet</th>
                <th className="py-3.5 px-4">Status Material (Kertas/Plat/Pisau)</th>
                <th className="py-3.5 px-4">Add-on Sales</th>
                <th className="py-3.5 px-4">Deadline PPIC (4H)</th>
                <th className="py-3.5 px-4 text-center">Aksi PPIC</th>
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
                  const isPpicLate = job.tanggal_deadline_ppic
                    ? isOverdue(job.tanggal_deadline_ppic, job.tanggal_selesai_ppic)
                    : false;

                  const hasOrderPending = 
                    job.status_material_kertas === 'Order' || 
                    job.status_plat_cetak === 'Order' || 
                    job.status_pisau_pond === 'Order';

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* No SPK */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-[11px]">
                          {job.no_spk}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">{job.nama_customer}</p>
                        <p className="text-[10px] text-slate-400">Masuk: {formatTanggalIndo(job.tanggal_masuk_ppic)}</p>
                      </td>

                      {/* Spesifikasi & Qty */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{job.nama_produk}</p>
                        <p className="text-[11px] text-slate-600 font-medium">Bahan: {job.jenis_bahan}</p>
                        <p className="text-xs font-bold text-emerald-800 mt-0.5">
                          {job.jumlah_order.toLocaleString('id-ID')} pcs
                        </p>
                      </td>

                      {/* Kalkulasi Plano */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="text-slate-700">
                            Plano: <strong>{job.plano_bahan}</strong> &bull; Cetak: <strong>{job.ukuran_bahan_cetak}</strong>
                          </p>
                          <p className="text-slate-600">
                            Isi (Up): <strong>{job.isi_cetakan}</strong> &bull; Potong Out: <strong>{job.potong_out}</strong>
                          </p>
                          <p className="font-bold text-cyan-900">
                            Kebutuhan: {job.total_plano_kebutuhan || 0} Plano ({job.kebutuhan_lembar_cetak || 0} lembar cetak + 3% insheet)
                          </p>
                        </div>
                      </td>

                      {/* Status Material */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-14 font-semibold text-slate-500">Kertas:</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              job.status_material_kertas === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {job.status_material_kertas || 'Menunggu'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-14 font-semibold text-slate-500">Plat CTP:</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              job.status_plat_cetak === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {job.status_plat_cetak || 'Menunggu'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-14 font-semibold text-slate-500">Pisau Pond:</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              job.status_pisau_pond === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {job.status_pisau_pond || 'Menunggu'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Add-on Sales */}
                      <td className="py-3.5 px-4">
                        {job.catatan_sales ? (
                          <span className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium block max-w-xs">
                            {job.catatan_sales}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Tidak ada add-on</span>
                        )}
                      </td>

                      {/* Deadline PPIC */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className={`text-[11px] font-bold ${isPpicLate ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatTanggalIndo(job.tanggal_deadline_ppic)}
                        </p>
                        {isPpicLate && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Lewat 4 Hari
                          </span>
                        )}
                        {hasOrderPending && (
                          <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                            Alarm: Ada Material Diorder
                          </span>
                        )}
                      </td>

                      {/* Aksi PPIC */}
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
                            onClick={() => handleOpenPpicModal(job)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Kalkulasi &amp; Material</span>
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

      {/* MODAL KALKULATOR & UPDATE PPIC */}
      {modalJob && calculatedPaper && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-cyan-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Kalkulasi Bahan &amp; Kesiapan PPIC</h3>
                  <p className="text-xs text-cyan-200">
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

            {/* Form */}
            <form onSubmit={handleSavePpic} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Bagian 1: Kalkulator Cutting Paper */}
              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" /> Rumus Cutting Paper &amp; Insheet 3%
                  </span>
                  <span className="text-[11px] font-semibold text-cyan-800">
                    Bahan: {modalJob.jenis_bahan}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opsi Ukuran Plano
                    </label>
                    <select
                      value={formPlano}
                      onChange={(e) => setFormPlano(e.target.value as PlanoOption)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                    >
                      {PLANO_PRESETS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ukuran Bahan Cetak (P x L)
                    </label>
                    <input
                      type="text"
                      value={formUkuranCetak}
                      onChange={(e) => setFormUkuranCetak(e.target.value)}
                      placeholder="Contoh: 54 x 39"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Isi Cetakan / Up (Pcs)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formIsiCetakan}
                      onChange={(e) => setFormIsiCetakan(Math.max(1, Number(e.target.value)))}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Hasil Kalkulasi Otomatis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-cyan-200 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-cyan-100">
                    <span className="text-[10px] text-slate-500 block">Potong Out</span>
                    <span className="text-sm font-black text-slate-900">{calculatedPaper.potongOut} out</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-cyan-100">
                    <span className="text-[10px] text-slate-500 block">Lembar Cetak</span>
                    <span className="text-sm font-black text-slate-900">{calculatedPaper.kebutuhanLembarCetak} lbr</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-cyan-100">
                    <span className="text-[10px] text-slate-500 block">Plano Murni</span>
                    <span className="text-sm font-black text-slate-900">{calculatedPaper.kebutuhanPlanoMurni} plano</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-700 text-white">
                    <span className="text-[10px] text-cyan-200 block">+ Insheet 3%</span>
                    <span className="text-sm font-black text-white">{calculatedPaper.totalPlanoKebutuhan} Plano</span>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Status Material, Plat & Pisau */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Kesiapan Material Produksi (Kertas, Plat &amp; Pisau)
                </h4>

                {/* 1. Kertas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status Bahan Kertas</label>
                    <select
                      value={formStatusKertas}
                      onChange={(e) => setFormStatusKertas(e.target.value as ItemReadyStatus)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Ready">Ready (Tersedia di Gudang)</option>
                      <option value="Order">Order (Sedang Dipesan ke Suplier)</option>
                      <option value="Menunggu">Menunggu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Order Bahan</label>
                    <input
                      type="date"
                      value={formTglOrderKertas}
                      onChange={(e) => setFormTglOrderKertas(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                {/* 2. Plat Cetak */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status Plat Cetak CTP</label>
                    <select
                      value={formStatusPlat}
                      onChange={(e) => setFormStatusPlat(e.target.value as ItemReadyStatus)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Ready">Ready (Plat Sudah Siap)</option>
                      <option value="Order">Order (Sedang Expose CTP Vendor)</option>
                      <option value="Menunggu">Menunggu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Order Plat</label>
                    <input
                      type="date"
                      value={formTglOrderPlat}
                      onChange={(e) => setFormTglOrderPlat(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                {/* 3. Pisau Pond */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status Pisau Pond (Die-Cut)</label>
                    <select
                      value={formStatusPisau}
                      onChange={(e) => setFormStatusPisau(e.target.value as ItemReadyStatus)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Ready">Ready (Pisau Sudah Ada / Siap)</option>
                      <option value="Order">Order (Dibuat di Pembuat Pisau)</option>
                      <option value="Menunggu">Menunggu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Order Pisau</label>
                    <input
                      type="date"
                      value={formTglOrderPisau}
                      onChange={(e) => setFormTglOrderPisau(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Add-on & PPIC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan PPIC
                </label>
                <textarea
                  rows={2}
                  value={formCatatanPpic}
                  onChange={(e) => setFormCatatanPpic(e.target.value)}
                  placeholder="Catatan palet, instruksi potong, atau add-on yang harus disiapkan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white text-xs font-semibold shadow-md shadow-cyan-500/25 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Progress PPIC</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
