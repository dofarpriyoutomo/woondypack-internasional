import React, { useState, useMemo } from 'react';
import { 
  BadgeDollarSign, 
  Clock, 
  CheckCircle2, 
  Wallet, 
  History, 
  ArrowRight, 
  CreditCard, 
  FileText, 
  DollarSign, 
  Plus, 
  Search, 
  Calendar,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import { SpkJob, PaymentHistoryItem } from '../types';
import { 
  formatRupiah, 
  formatTanggalIndo, 
  addWorkingDays 
} from '../utils/calculator';

interface FinanceViewProps {
  jobs: SpkJob[];
  onUpdateFinance: (job: SpkJob) => void;
  onOpenSpkReview: (job: SpkJob) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  jobs,
  onUpdateFinance,
  onOpenSpkReview,
}) => {
  // Stage Tab: 'belum_proses' | 'sudah_proses'
  const [activeStage, setActiveStage] = useState<'belum_proses' | 'sudah_proses'>('belum_proses');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Pembayaran (DP / Termin / Pelunasan)
  const [paymentModalJob, setPaymentModalJob] = useState<SpkJob | null>(null);
  const [inputPaymentNominal, setInputPaymentNominal] = useState<number>(0);
  const [inputPaymentDate, setInputPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inputPaymentKeterangan, setInputPaymentKeterangan] = useState<string>('DP Awal 50%');
  const [inputPaymentMethod, setInputPaymentMethod] = useState<string>('Transfer BCA');
  const [isTerminApproval, setIsTerminApproval] = useState<boolean>(false);

  // Filter Jobs by Stage & Search
  const stageJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (job.is_canceled) return false;

      // Filter by stage
      if (activeStage === 'belum_proses') {
        if (job.status_finance !== 'belum_proses') return false;
      } else {
        if (job.status_finance !== 'sudah_proses') return false;
      }

      // Search filter
      const term = searchTerm.toLowerCase();
      return (
        job.no_spk.toLowerCase().includes(term) ||
        job.nama_customer.toLowerCase().includes(term) ||
        job.nama_produk.toLowerCase().includes(term) ||
        (job.nama_sales && job.nama_sales.toLowerCase().includes(term))
      );
    });
  }, [jobs, activeStage, searchTerm]);

  // Counts
  const belumProsesCount = jobs.filter((j) => !j.is_canceled && j.status_finance === 'belum_proses').length;
  const sudahProsesCount = jobs.filter((j) => !j.is_canceled && j.status_finance === 'sudah_proses').length;

  // Total Kas Masuk
  const totalKasMasuk = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.total_terbayar || 0), 0);
  }, [jobs]);

  const totalPiutangSisa = useMemo(() => {
    return jobs.filter((j) => !j.is_canceled).reduce((sum, j) => sum + (j.sisa_pembayaran || 0), 0);
  }, [jobs]);

  // Open modal for Payment
  const handleOpenPaymentModal = (job: SpkJob, type: 'dp' | 'pelunasan' | 'termin') => {
    setPaymentModalJob(job);
    setInputPaymentDate(new Date().toISOString().split('T')[0]);
    setInputPaymentMethod('Transfer BCA');

    if (type === 'dp') {
      const defaultDp = Math.round(job.total_nominal * 0.5);
      setInputPaymentNominal(defaultDp);
      setInputPaymentKeterangan('DP Awal 50% (Penerbitan SPK)');
      setIsTerminApproval(false);
    } else if (type === 'pelunasan') {
      setInputPaymentNominal(job.sisa_pembayaran);
      setInputPaymentKeterangan('Pelunasan Order');
      setIsTerminApproval(false);
    } else if (type === 'termin') {
      setInputPaymentNominal(0);
      setInputPaymentKeterangan(`Persetujuan Termin PO Customer (${job.nama_customer})`);
      setIsTerminApproval(true);
    }
  };

  // Submit Payment & Auto advance to PPIC
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalJob) return;

    const nominal = Number(inputPaymentNominal) || 0;
    const isTermin = isTerminApproval || paymentModalJob.jenis_pembayaran === 'Termin';

    // Buat item transaksi baru
    const newTransaction: PaymentHistoryItem = {
      id: `pay-${Date.now()}`,
      tanggal: inputPaymentDate,
      nominal: nominal,
      keterangan: inputPaymentKeterangan,
      metode: inputPaymentMethod,
      created_at: new Date().toISOString(),
    };

    const newHistory = [...(paymentModalJob.history_pembayaran || []), newTransaction];
    const newTotalTerbayar = (paymentModalJob.total_terbayar || 0) + nominal;
    const newSisa = Math.max(0, paymentModalJob.total_nominal - newTotalTerbayar);
    const isLunas = newSisa === 0;

    // Aturan Kunci Deadline:
    // Jika belum pernah ada tanggal DP, catat tanggal DP pertama dan kunci deadline 10 hari kerja
    const existingDpDate = paymentModalJob.tanggal_dp;
    const finalDpDate = existingDpDate || inputPaymentDate;
    const finalDeadline = paymentModalJob.tanggal_deadline_spk || addWorkingDays(finalDpDate, 10);

    // Update job
    const updatedJob: SpkJob = {
      ...paymentModalJob,
      status_finance: 'sudah_proses',
      total_terbayar: newTotalTerbayar,
      sisa_pembayaran: newSisa,
      is_lunas: isLunas,
      tanggal_dp: finalDpDate,
      tanggal_deadline_spk: finalDeadline,
      history_pembayaran: newHistory,

      // Teruskan otomatis ke antrean PPIC jika baru pertama kali diproses Finance
      status_ppic: paymentModalJob.status_ppic === 'antrean' ? 'antrean' : paymentModalJob.status_ppic,
      tanggal_masuk_ppic: paymentModalJob.tanggal_masuk_ppic || inputPaymentDate,
      tanggal_deadline_ppic: paymentModalJob.tanggal_deadline_ppic || addWorkingDays(inputPaymentDate, 4),
      status_global: isLunas ? (paymentModalJob.is_siap_kirim ? 'selesai' : paymentModalJob.status_global) : 'ppic_antrean',
      updated_at: new Date().toISOString(),
    };

    onUpdateFinance(updatedJob);
    setPaymentModalJob(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Kas Metrics */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
              MODUL FINANCE
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Finance, Kas &amp; Pembayaran Order
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan DP (Kunci Deadline 10 Hari Kerja), Termin PO, Pelunasan, dan Riwayat Pembayaran.
          </p>
        </div>

        {/* Quick Finance Counters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex-1 lg:flex-initial">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Kas Masuk</span>
            <span className="text-sm sm:text-base font-black text-emerald-950">{formatRupiah(totalKasMasuk)}</span>
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex-1 lg:flex-initial">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Sisa Tagihan / Piutang</span>
            <span className="text-sm sm:text-base font-black text-amber-950">{formatRupiah(totalPiutangSisa)}</span>
          </div>
        </div>
      </div>

      {/* Tahapan Tab Nav (Belum Proses vs Sudah Proses) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        
        {/* Stage Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveStage('belum_proses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'belum_proses'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Belum Proses (Menunggu DP/Termin)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {belumProsesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveStage('sudah_proses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStage === 'sudah_proses'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>2. Sudah Proses (DP/Termin/Lunas)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-slate-900 font-bold">
              {sudahProsesCount}
            </span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari SPK / Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

      </div>

      {/* Finance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No SPK &amp; Customer</th>
                <th className="py-3.5 px-4">Produk &amp; Qty</th>
                <th className="py-3.5 px-4">Nilai Total Order</th>
                <th className="py-3.5 px-4">Total Terbayar</th>
                <th className="py-3.5 px-4">Sisa Pembayaran</th>
                <th className="py-3.5 px-4">Status &amp; Tgl DP</th>
                <th className="py-3.5 px-4 text-center">Aksi Finance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stageJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada SPK pada tahapan <strong>{activeStage === 'belum_proses' ? 'Belum Proses' : 'Sudah Proses'}</strong>.
                  </td>
                </tr>
              ) : (
                stageJobs.map((job) => {
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* No SPK & Customer */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-[11px]">
                          {job.no_spk}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">{job.nama_customer}</p>
                        <p className="text-[10px] text-slate-400">Sales: {job.nama_sales}</p>
                      </td>

                      {/* Produk & Qty */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{job.nama_produk}</p>
                        <p className="text-slate-500 text-[11px]">{job.jumlah_order.toLocaleString('id-ID')} pcs</p>
                      </td>

                      {/* Nilai Total */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {formatRupiah(job.total_nominal)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Tipe: {job.jenis_pembayaran}
                        </span>
                      </td>

                      {/* Total Terbayar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(job.total_terbayar)}
                        </span>
                        {job.history_pembayaran && job.history_pembayaran.length > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {job.history_pembayaran.length}x transaksi
                          </span>
                        )}
                      </td>

                      {/* Sisa Pembayaran */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-black text-xs ${
                          job.sisa_pembayaran === 0 ? 'text-emerald-600' : 'text-amber-700'
                        }`}>
                          {job.sisa_pembayaran === 0 ? 'Rp 0 (LUNAS)' : formatRupiah(job.sisa_pembayaran)}
                        </span>
                      </td>

                      {/* Status & Tgl DP */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.status_finance === 'belum_proses' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Menunggu DP
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.is_lunas ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {job.is_lunas ? 'LUNAS' : 'DP Terbayar'}
                            </span>
                            <p className="text-[10px] text-slate-500">
                              DP: {formatTanggalIndo(job.tanggal_dp)}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Aksi Finance */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Review */}
                          <button
                            onClick={() => onOpenSpkReview(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                            title="Review Detail Transaksi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Tombol Input DP jika belum proses */}
                          {job.status_finance === 'belum_proses' ? (
                            <>
                              {job.jenis_pembayaran === 'Termin' ? (
                                <button
                                  onClick={() => handleOpenPaymentModal(job, 'termin')}
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Proses Termin (Tanpa DP)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenPaymentModal(job, 'dp')}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1"
                                >
                                  <BadgeDollarSign className="w-3.5 h-3.5" />
                                  <span>Input DP &amp; Lanjut PPIC</span>
                                </button>
                              )}
                            </>
                          ) : (
                            /* Tombol Update Pembayaran / Pelunasan jika sudah proses dan belum lunas */
                            !job.is_lunas && (
                              <button
                                onClick={() => handleOpenPaymentModal(job, 'pelunasan')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Update Pelunasan</span>
                              </button>
                            )
                          )}
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

      {/* MODAL INPUT PEMBAYARAN (DP / PELUNASAN / TERMIN) */}
      {paymentModalJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {paymentModalJob.status_finance === 'belum_proses' ? 'Input Pembayaran DP' : 'Update Pelunasan Kas'}
                  </h3>
                  <p className="text-xs text-amber-200">
                    {paymentModalJob.no_spk} - {paymentModalJob.nama_customer}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalJob(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              
              {/* Ringkasan Biaya */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Total Nilai Order:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(paymentModalJob.total_nominal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Sudah Terbayar Sebelumnya:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(paymentModalJob.total_terbayar)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 pt-1 border-t border-amber-200">
                  <span>Sisa Tagihan Saat Ini:</span>
                  <span className="text-sm font-black">{formatRupiah(paymentModalJob.sisa_pembayaran)}</span>
                </div>
              </div>

              {/* History Pembayaran Sebelumnya */}
              {paymentModalJob.history_pembayaran && paymentModalJob.history_pembayaran.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-slate-400" /> Riwayat Transaksi Sebelumnya:
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px]">
                    {paymentModalJob.history_pembayaran.map((hist) => (
                      <div key={hist.id} className="flex items-center justify-between text-slate-600">
                        <span>{formatTanggalIndo(hist.tanggal)} &bull; {hist.keterangan} ({hist.metode})</span>
                        <span className="font-bold text-slate-900">{formatRupiah(hist.nominal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Nominal Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Pembayaran Sekarang (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={paymentModalJob.sisa_pembayaran}
                  value={inputPaymentNominal}
                  onChange={(e) => setInputPaymentNominal(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Tanggal & Metode Bayar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pembayaran DP/Kas
                  </label>
                  <input
                    type="date"
                    value={inputPaymentDate}
                    onChange={(e) => setInputPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    *Deadline 10 hari kerja terkunci sejak tanggal ini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={inputPaymentMethod}
                    onChange={(e) => setInputPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Transfer BNI / BRI">Transfer BNI / BRI</option>
                    <option value="Cash / Tunai">Cash / Tunai Kasir</option>
                    <option value="Termin PO 30 Hari">Termin PO (Kredit Perusahaan)</option>
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan / Catatan Transaksi
                </label>
                <input
                  type="text"
                  value={inputPaymentKeterangan}
                  onChange={(e) => setInputPaymentKeterangan(e.target.value)}
                  placeholder="Misal: DP 50% / Pelunasan sebelum kirim"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold shadow-md shadow-amber-500/25 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi &amp; Lanjut ke PPIC</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
