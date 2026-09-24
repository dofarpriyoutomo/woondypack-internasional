import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Percent, 
  Ban, 
  Calendar, 
  Filter, 
  Users, 
  Layers, 
  Clock, 
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { AppTab, SpkJob } from '../types';
import { 
  formatRupiah, 
  formatTanggalIndo, 
  calculateJobMiss, 
  calculateWorkingDaysBetween, 
  isOverdue 
} from '../utils/calculator';

interface DashboardViewProps {
  jobs: SpkJob[];
  onOpenSpkReview: (job: SpkJob) => void;
  onSelectTab?: (tab: AppTab) => void;
  onNavigateToTab?: (tab: AppTab) => void;
  onOpenGasModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  onOpenSpkReview,
  onSelectTab,
  onNavigateToTab,
  onOpenGasModal,
}) => {
  const handleNavigate = (tab: AppTab) => {
    if (tab === 'gas_export' && onOpenGasModal) {
      onOpenGasModal();
      return;
    }
    if (onSelectTab) {
      onSelectTab(tab);
    } else if (onNavigateToTab) {
      onNavigateToTab(tab);
    }
  };
  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08'); // YYYY-MM
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [useCustomDate, setUseCustomDate] = useState<boolean>(false);

  // Filtered Jobs based on Month or Custom Range
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const orderDate = job.tanggal_order || job.created_at.split('T')[0];
      
      if (useCustomDate) {
        if (dateRangeStart && orderDate < dateRangeStart) return false;
        if (dateRangeEnd && orderDate > dateRangeEnd) return false;
        return true;
      } else {
        return orderDate.startsWith(selectedMonth);
      }
    });
  }, [jobs, selectedMonth, dateRangeStart, dateRangeEnd, useCustomDate]);

  // Calculations
  const stats = useMemo(() => {
    const totalJobsInPeriod = filteredJobs.length;
    const nonCanceledJobs = filteredJobs.filter((j) => !j.is_canceled);

    // 1. Total Job Aktif = Job Belum Proses + Job On Proses
    const jobBelumProses = nonCanceledJobs.filter(
      (j) => j.status_finance === 'belum_proses' || j.status_global === 'draft' || j.status_global === 'menunggu_dp'
    ).length;

    const jobOnProses = nonCanceledJobs.filter(
      (j) => j.status_global !== 'selesai' && 
             j.status_global !== 'draft' && 
             j.status_global !== 'menunggu_dp' && 
             !j.is_siap_kirim
    ).length;

    const totalJobAktif = jobBelumProses + jobOnProses;

    // 2. Job Selesai dalam bulan tersebut
    const jobSelesaiBulanIni = nonCanceledJobs.filter(
      (j) => j.status_global === 'selesai' || j.is_siap_kirim
    ).length;

    // 3. Total Omset dalam bulan tersebut
    const totalOmsetBulanIni = nonCanceledJobs.reduce(
      (acc, j) => acc + (j.total_nominal || 0),
      0
    );

    // 4. Total Job Terlambat (% Keterlambatan dari total job yang masuk)
    // Deadline: 10 hari kerja sejak DP hingga selesai produksi siap kirim
    let totalTerlambatCount = 0;
    nonCanceledJobs.forEach((job) => {
      if (job.tanggal_dp) {
        if (job.is_siap_kirim && job.tanggal_selesai_produksi) {
          // Cek apakah waktu pengerjaan melebihi 10 hari kerja
          const workDays = calculateWorkingDaysBetween(job.tanggal_dp, job.tanggal_selesai_produksi);
          if (workDays > 10) {
            totalTerlambatCount++;
          }
        } else if (job.tanggal_deadline_spk) {
          // Sedang berjalan tapi tanggal sekarang sudah melebihi deadline 10 hari
          if (isOverdue(job.tanggal_deadline_spk)) {
            totalTerlambatCount++;
          }
        }
      }
    });

    const persenKeterlambatan = totalJobsInPeriod > 0 
      ? Number(((totalTerlambatCount / totalJobsInPeriod) * 100).toFixed(1)) 
      : 0;

    // 5. Rata-rata % Miss Produksi (persentase dari jumlah order tiap job)
    let totalMissPercentSum = 0;
    let jobWithProductionCount = 0;

    nonCanceledJobs.forEach((job) => {
      const { missPercent } = calculateJobMiss(job);
      if (job.status_ppic === 'selesai' || job.status_produksi !== 'antrean' || job.is_siap_kirim) {
        totalMissPercentSum += missPercent;
        jobWithProductionCount++;
      }
    });

    const rataRataMissProduksi = jobWithProductionCount > 0
      ? Number((totalMissPercentSum / jobWithProductionCount).toFixed(2))
      : 0;

    // 6. Total Dibatalkan
    const totalDibatalkan = filteredJobs.filter((j) => j.is_canceled).length;

    return {
      totalJobsInPeriod,
      totalJobAktif,
      jobBelumProses,
      jobOnProses,
      jobSelesaiBulanIni,
      totalOmsetBulanIni,
      totalTerlambatCount,
      persenKeterlambatan,
      rataRataMissProduksi,
      totalDibatalkan,
    };
  }, [filteredJobs]);

  // Performa Tiap Sales
  const salesPerformance = useMemo(() => {
    const map: Record<string, { totalSpk: number; totalOmset: number; lunas: number; proses: number }> = {};

    filteredJobs.forEach((job) => {
      if (job.is_canceled) return;
      const sales = job.nama_sales || 'Unassigned';
      if (!map[sales]) {
        map[sales] = { totalSpk: 0, totalOmset: 0, lunas: 0, proses: 0 };
      }
      map[sales].totalSpk += 1;
      map[sales].totalOmset += job.total_nominal || 0;
      if (job.is_lunas) {
        map[sales].lunas += 1;
      } else {
        map[sales].proses += 1;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.totalOmset - a.totalOmset);
  }, [filteredJobs]);

  // Department Funnel Counts
  const funnel = useMemo(() => {
    const nonCanceled = filteredJobs.filter((j) => !j.is_canceled);
    return {
      sales: nonCanceled.length,
      financeBelum: nonCanceled.filter((j) => j.status_finance === 'belum_proses').length,
      financeSudah: nonCanceled.filter((j) => j.status_finance === 'sudah_proses').length,
      ppicAntrean: nonCanceled.filter((j) => j.status_finance === 'sudah_proses' && j.status_ppic === 'antrean').length,
      ppicProses: nonCanceled.filter((j) => j.status_ppic === 'on_proses').length,
      ppicSelesai: nonCanceled.filter((j) => j.status_ppic === 'selesai').length,
      prodAntrean: nonCanceled.filter((j) => j.status_ppic === 'selesai' && j.status_produksi === 'antrean').length,
      prodProses: nonCanceled.filter((j) => j.status_produksi === 'on_proses').length,
      prodSelesai: nonCanceled.filter((j) => j.is_siap_kirim || j.status_produksi === 'selesai').length,
    };
  }, [filteredJobs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner & Period Filter */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Executive Dashboard Percetakan & Packaging
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Woondypack Internasional
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Monitoring performa real-time mulai dari Sales Order, Verifikasi Finance, Kalkulasi PPIC, hingga Selesai Produksi Siap Kirim.
            </p>
          </div>

          {/* Filter Controller */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 w-full lg:w-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Periode Laporan
              </span>
              <button
                onClick={() => setUseCustomDate(!useCustomDate)}
                className="text-xs text-indigo-200 hover:text-white underline cursor-pointer transition"
              >
                {useCustomDate ? 'Ganti ke Pilihan Bulan' : 'Ganti Rentang Tanggal'}
              </button>
            </div>

            {!useCustomDate ? (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-300" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  <option value="2026-08">Agustus 2026 (Bulan Ini)</option>
                  <option value="2026-07">Juli 2026</option>
                  <option value="2026-06">Juni 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-10">Oktober 2026</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="bg-slate-900/90 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-xs text-slate-300">s/d</span>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="bg-slate-900/90 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 KARTU UTAMA KPI DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        
        {/* KPI 1: Total Job Aktif */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-5 border border-blue-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 tracking-wide uppercase">
              Total Job Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-950">
              {stats.totalJobAktif}
            </span>
            <span className="text-xs font-semibold text-blue-700">SPK Aktif</span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px] font-medium text-blue-800">
            <span className="bg-amber-100/90 text-amber-900 px-2 py-0.5 rounded-md">
              {stats.jobBelumProses} Belum Proses
            </span>
            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
              {stats.jobOnProses} On Proses
            </span>
          </div>
        </div>

        {/* KPI 2: Job Selesai Bulan Ini */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl p-5 border border-emerald-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
              Job Selesai
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">
              {stats.jobSelesaiBulanIni}
            </span>
            <span className="text-xs font-semibold text-emerald-700">SPK Selesai</span>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Siap kirim & Lolos QC</span>
          </div>
        </div>

        {/* KPI 3: Total Omset Bulan Ini */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl p-5 border border-amber-200/80 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 tracking-wide uppercase">
              Total Omset
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-amber-950 block truncate">
              {formatRupiah(stats.totalOmsetBulanIni)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-medium text-amber-800">
            <span>{stats.totalJobsInPeriod} SPK Terdaftar</span>
            <span className="text-amber-950 font-bold">100% Tercatat</span>
          </div>
        </div>

        {/* KPI 4: % Keterlambatan (Deadline 10 Hari Sejak DP) */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50/60 rounded-2xl p-5 border border-rose-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 tracking-wide uppercase">
              % Keterlambatan
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-950">
              {stats.persenKeterlambatan}%
            </span>
            <span className="text-xs font-semibold text-rose-700">
              ({stats.totalTerlambatCount} SPK &gt;10 Hari)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-200/60 flex items-center gap-1 text-[11px] font-medium text-rose-800">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>Tolok ukur 10 hari sejak DP</span>
          </div>
        </div>

        {/* KPI 5: Rata-rata % Miss Produksi */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50/60 rounded-2xl p-5 border border-purple-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 tracking-wide uppercase">
              Rata-rata % Miss
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-950">
              {stats.rataRataMissProduksi}%
            </span>
            <span className="text-xs font-semibold text-purple-700">dari Qty Order</span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200/60 flex items-center justify-between text-[11px] font-medium text-purple-800">
            <span>Standar Toleransi: &le;3%</span>
            <span className={stats.rataRataMissProduksi <= 3 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
              {stats.rataRataMissProduksi <= 3 ? 'Aman' : 'Tinggi'}
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 2: EXECUTIVE SUMMARY & PIPELINE FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline Departemen Interaktif */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Alur Pipeline Percetakan & Packaging
              </h2>
              <p className="text-xs text-slate-500">
                Integrasi otomatis status job antar departemen dari Sales hingga Siap Kirim
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Sales Stage */}
            <div 
              onClick={() => handleNavigate('sales')}
              className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-2">
                <span>1. SALES ORDER</span>
                <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-2xl font-black text-emerald-950">
                {funnel.sales}
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">SPK terdaftar</p>
            </div>

            {/* Finance Stage */}
            <div 
              onClick={() => handleNavigate('finance')}
              className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-2">
                <span>2. FINANCE</span>
                <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-2xl font-black text-amber-950">
                {funnel.financeSudah}
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-700 mt-1">
                <span>DP/Termin Aktif</span>
                {funnel.financeBelum > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold text-[10px]">
                    {funnel.financeBelum} Wait
                  </span>
                )}
              </div>
            </div>

            {/* PPIC Stage */}
            <div 
              onClick={() => handleNavigate('ppic')}
              className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-cyan-800 text-xs font-bold mb-2">
                <span>3. PPIC CENTER</span>
                <ChevronRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-2xl font-black text-cyan-950">
                {funnel.ppicSelesai}
              </div>
              <div className="flex items-center justify-between text-[11px] text-cyan-700 mt-1">
                <span>Material Ready</span>
                <span className="text-cyan-900 font-semibold">{funnel.ppicProses} Proses</span>
              </div>
            </div>

            {/* Produksi Stage */}
            <div 
              onClick={() => handleNavigate('produksi')}
              className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 hover:border-purple-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-purple-800 text-xs font-bold mb-2">
                <span>4. PRODUKSI</span>
                <ChevronRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-2xl font-black text-purple-950">
                {funnel.prodSelesai}
              </div>
              <div className="flex items-center justify-between text-[11px] text-purple-700 mt-1">
                <span>Siap Kirim</span>
                <span className="text-purple-900 font-semibold">{funnel.prodProses} Proses</span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                <strong>Aturan Deadline Pabrik:</strong> PPIC maks 4 hari kerja &bull; Produksi maks 5 hari kerja &bull; Total dari DP s/d Siap Kirim maks 10 hari kerja.
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card & Monthly Conclusion */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-500/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Kesimpulan Performa
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15 font-medium">
                {!useCustomDate ? selectedMonth : 'Custom Range'}
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-3">
              Status Operasional Percetakan
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></span>
                <span>
                  Tingkat ketepatan waktu pabrik mencapai <strong className="text-white">{(100 - stats.persenKeterlambatan).toFixed(1)}%</strong> terhadap deadline 10 hari kerja.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5"></span>
                <span>
                  Rata-rata miss/reject produksi berada di angka <strong className="text-white">{stats.rataRataMissProduksi}%</strong> ({stats.rataRataMissProduksi <= 3 ? 'Di bawah batas insheet 3%' : 'Perlu perhatian khusus'}).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5"></span>
                <span>
                  Total perputaran omset periode ini tercatat <strong className="text-white">{formatRupiah(stats.totalOmsetBulanIni)}</strong>.
                </span>
              </li>
              {stats.totalDibatalkan > 0 && (
                <li className="flex items-start gap-2 text-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5"></span>
                  <span>
                    Terdapat <strong className="text-white">{stats.totalDibatalkan} SPK dibatalkan</strong> oleh customer/sales.
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Woondypack Cloud ERP</span>
            <button
              onClick={() => handleNavigate('gas_export')}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Buka Google Sheets
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 3: TABEL SPK AKTIF & PERFORMA SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabel SPK Monitoring */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monitoring SPK &amp; Deadline 10 Hari Kerja
              </h3>
              <p className="text-xs text-slate-500">
                Daftar job aktif beserta tanggal deadline yang terkunci sejak pembayaran DP
              </p>
            </div>
            <button
              onClick={() => handleNavigate('sales')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
            >
              Lihat Semua SPK <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">No SPK</th>
                  <th className="py-3 px-4">Customer &amp; Produk</th>
                  <th className="py-3 px-4">Sales</th>
                  <th className="py-3 px-4">Tgl DP &amp; Deadline</th>
                  <th className="py-3 px-4">Status Progress</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.slice(0, 6).map((job) => {
                  const isLate = job.tanggal_deadline_spk 
                    ? isOverdue(job.tanggal_deadline_spk, job.is_siap_kirim ? job.tanggal_selesai_produksi : undefined)
                    : false;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-[11px]">
                          {job.no_spk}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{job.nama_customer}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{job.nama_produk}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {job.nama_sales}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="text-[11px] text-slate-600">
                          DP: {formatTanggalIndo(job.tanggal_dp)}
                        </p>
                        <p className={`text-[11px] font-bold ${isLate ? 'text-rose-600' : 'text-slate-800'}`}>
                          DL: {formatTanggalIndo(job.tanggal_deadline_spk)}
                          {isLate && ' (Lewat)'}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {job.is_canceled ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Dibatalkan
                          </span>
                        ) : job.is_siap_kirim ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Siap Kirim / Selesai
                          </span>
                        ) : job.status_ppic !== 'selesai' ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                            PPIC ({job.status_ppic})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Produksi ({job.status_produksi})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onOpenSpkReview(job)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                          title="Review Detail SPK"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaderboard Performa Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" /> Performa Omset Tiap Sales
                </h3>
                <p className="text-xs text-slate-500">Omset per sales pada periode terpilih</p>
              </div>
            </div>

            <div className="space-y-3">
              {salesPerformance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada data sales pada periode ini</p>
              ) : (
                salesPerformance.map((sales, idx) => (
                  <div 
                    key={sales.name}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{sales.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {sales.totalSpk} SPK ({sales.lunas} Lunas, {sales.proses} Proses)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-xs text-emerald-950">
                        {formatRupiah(sales.totalOmset)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Total Sales Aktif: {salesPerformance.length} Personil
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
