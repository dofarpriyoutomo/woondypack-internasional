import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  Ban, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Calculator,
  User,
  Calendar,
  X,
  CreditCard,
  Layers,
  FileText
} from 'lucide-react';
import { 
  SpkJob, 
  PaperType, 
  LaminationType, 
  LaminationSide, 
  PrintColorType 
} from '../types';
import { 
  formatRupiah, 
  formatTanggalIndo, 
  generateNextSpkNumber,
  addWorkingDays
} from '../utils/calculator';

interface SalesOrderViewProps {
  jobs: SpkJob[];
  onSaveJob: (job: SpkJob) => void;
  onDeleteJob: (noSpk: string) => void;
  onCancelJob: (noSpk: string, reason: string) => void;
  onOpenSpkReview: (job: SpkJob) => void;
}

const PAPER_OPTIONS: PaperType[] = [
  'Ivory 210',
  'Ivory 250',
  'Ivory 300',
  'Ivory 350',
  'Ivory 400',
  'Duplex 250',
  'Duplex 310',
  'Duplex 350',
  'Duplex 400',
  'Art Carton 120',
  'Art Carton 150',
  'Art Carton 260',
  'Art Carton 310',
  'Kraft 120',
  'Kraft 150',
  'Kraft 200',
  'Kraft 275',
  'Kraft 290 Laminasi',
  'Kraft 300',
  'Kraft 315 Laminasi',
  'Custom',
];

export const SalesOrderView: React.FC<SalesOrderViewProps> = ({
  jobs,
  onSaveJob,
  onDeleteJob,
  onCancelJob,
  onOpenSpkReview,
}) => {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesFilter, setSelectedSalesFilter] = useState('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal Form State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<SpkJob | null>(null);

  // Modal Cancel State
  const [cancelModalJob, setCancelModalJob] = useState<SpkJob | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form Fields State
  const [formData, setFormData] = useState<{
    no_spk: string;
    tanggal_order: string;
    nama_customer: string;
    telepon_customer: string;
    nama_produk: string;
    nama_sales: string;
    ukuran_produk: string;
    jumlah_order: number;
    harga_satuan: number;
    jenis_bahan_select: PaperType;
    jenis_bahan_custom: string;
    tipe_laminasi: LaminationType;
    sisi_laminasi: LaminationSide;
    desain_cetakan: PrintColorType;
    keterangan_warna: string;
    catatan_sales: string;
    jenis_pembayaran: 'DP' | 'Termin' | 'Cash Lunas';
  }>({
    no_spk: '',
    tanggal_order: new Date().toISOString().split('T')[0],
    nama_customer: '',
    telepon_customer: '',
    nama_produk: '',
    nama_sales: 'Rian Pratama',
    ukuran_produk: '',
    jumlah_order: 1000,
    harga_satuan: 1500,
    jenis_bahan_select: 'Ivory 300',
    jenis_bahan_custom: '',
    tipe_laminasi: 'Tanpa Laminasi',
    sisi_laminasi: 'Tanpa Laminasi',
    desain_cetakan: 'Full Colour CMYK',
    keterangan_warna: '',
    catatan_sales: '',
    jenis_pembayaran: 'DP',
  });

  // Unique list of sales for filter
  const salesList = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.nama_sales) set.add(j.nama_sales);
    });
    return Array.from(set);
  }, [jobs]);

  // Open modal create new SPK
  const handleOpenCreateModal = () => {
    const nextSpk = generateNextSpkNumber(jobs);
    setEditingJob(null);
    setFormData({
      no_spk: nextSpk,
      tanggal_order: new Date().toISOString().split('T')[0],
      nama_customer: '',
      telepon_customer: '',
      nama_produk: '',
      nama_sales: salesList[0] || 'Rian Pratama',
      ukuran_produk: '',
      jumlah_order: 2000,
      harga_satuan: 1750,
      jenis_bahan_select: 'Ivory 300',
      jenis_bahan_custom: '',
      tipe_laminasi: 'Tanpa Laminasi',
      sisi_laminasi: 'Tanpa Laminasi',
      desain_cetakan: 'Full Colour CMYK',
      keterangan_warna: '',
      catatan_sales: '',
      jenis_pembayaran: 'DP',
    });
    setIsModalOpen(true);
  };

  // Open modal edit SPK
  const handleOpenEditModal = (job: SpkJob) => {
    // Validasi aturan: hanya bisa diedit jika belum diproses finance
    if (job.status_finance === 'sudah_proses') {
      alert('SPK ini sudah diproses Finance/PPIC dan terkunci! Tim Sales tidak dapat mengedit lagi.');
      return;
    }

    setEditingJob(job);
    const isCustomPaper = !PAPER_OPTIONS.includes(job.jenis_bahan as any);
    
    setFormData({
      no_spk: job.no_spk,
      tanggal_order: job.tanggal_order || new Date().toISOString().split('T')[0],
      nama_customer: job.nama_customer || '',
      telepon_customer: job.telepon_customer || '',
      nama_produk: job.nama_produk || '',
      nama_sales: job.nama_sales || 'Rian Pratama',
      ukuran_produk: job.ukuran_produk || '',
      jumlah_order: job.jumlah_order || 1000,
      harga_satuan: job.harga_satuan || 1500,
      jenis_bahan_select: isCustomPaper ? 'Custom' : (job.jenis_bahan as PaperType),
      jenis_bahan_custom: isCustomPaper ? job.jenis_bahan : '',
      tipe_laminasi: job.tipe_laminasi || 'Tanpa Laminasi',
      sisi_laminasi: job.sisi_laminasi || 'Tanpa Laminasi',
      desain_cetakan: job.desain_cetakan || 'Full Colour CMYK',
      keterangan_warna: job.keterangan_warna || '',
      catatan_sales: job.catatan_sales || '',
      jenis_pembayaran: job.jenis_pembayaran || 'DP',
    });
    setIsModalOpen(true);
  };

  // Hitung total nominal live saat form diisi
  const calculatedTotalNominal = formData.jumlah_order * formData.harga_satuan;

  // Submit Save SPK
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama_customer.trim() || !formData.nama_produk.trim()) {
      alert('Harap isi Nama Customer dan Nama Produk!');
      return;
    }

    const finalBahan = formData.jenis_bahan_select === 'Custom' 
      ? (formData.jenis_bahan_custom.trim() || 'Custom Bahan')
      : formData.jenis_bahan_select;

    const totalNominal = formData.jumlah_order * formData.harga_satuan;

    if (editingJob) {
      // Update SPK
      const updatedJob: SpkJob = {
        ...editingJob,
        tanggal_order: formData.tanggal_order,
        nama_customer: formData.nama_customer,
        telepon_customer: formData.telepon_customer,
        nama_produk: formData.nama_produk,
        nama_sales: formData.nama_sales,
        ukuran_produk: formData.ukuran_produk,
        jumlah_order: Number(formData.jumlah_order),
        harga_satuan: Number(formData.harga_satuan),
        total_nominal: totalNominal,
        jenis_bahan: finalBahan,
        tipe_laminasi: formData.tipe_laminasi,
        sisi_laminasi: formData.sisi_laminasi,
        desain_cetakan: formData.desain_cetakan,
        keterangan_warna: formData.keterangan_warna,
        catatan_sales: formData.catatan_sales,
        jenis_pembayaran: formData.jenis_pembayaran,
        sisa_pembayaran: totalNominal - editingJob.total_terbayar,
        updated_at: new Date().toISOString(),
      };
      onSaveJob(updatedJob);
    } else {
      // Create new SPK
      const newJob: SpkJob = {
        id: `spk-${Date.now()}`,
        no_spk: formData.no_spk,
        tanggal_order: formData.tanggal_order,
        nama_customer: formData.nama_customer,
        telepon_customer: formData.telepon_customer,
        nama_produk: formData.nama_produk,
        nama_sales: formData.nama_sales,
        ukuran_produk: formData.ukuran_produk,
        jumlah_order: Number(formData.jumlah_order),
        harga_satuan: Number(formData.harga_satuan),
        total_nominal: totalNominal,
        jenis_bahan: finalBahan,
        tipe_laminasi: formData.tipe_laminasi,
        sisi_laminasi: formData.sisi_laminasi,
        desain_cetakan: formData.desain_cetakan,
        keterangan_warna: formData.keterangan_warna,
        catatan_sales: formData.catatan_sales,
        
        jenis_pembayaran: formData.jenis_pembayaran,
        status_finance: 'belum_proses',
        total_terbayar: 0,
        sisa_pembayaran: totalNominal,
        is_lunas: false,
        history_pembayaran: [],

        status_ppic: 'antrean',
        plano_bahan: '79 x 109',
        ukuran_bahan_cetak: '54 x 39',
        isi_cetakan: 1,
        potong_out: 4,
        kebutuhan_lembar_cetak: Number(formData.jumlah_order),
        kebutuhan_plano_murni: Math.ceil(Number(formData.jumlah_order) / 4),
        insheet_persen: 3,
        total_plano_kebutuhan: Math.ceil(Math.ceil(Number(formData.jumlah_order) / 4) * 1.03),
        status_material_kertas: 'Menunggu',
        status_plat_cetak: 'Menunggu',
        status_pisau_pond: 'Menunggu',

        status_produksi: 'antrean',
        tahap_cetak: { operator: '', mesin: '', tanggal_mulai: '', tanggal_selesai: '', jumlah_miss: 0, selesai: false },
        tahap_laminasi: { operator: '', mesin: '', tanggal_mulai: '', tanggal_selesai: '', jumlah_miss: 0, selesai: false },
        tahap_pond: { operator: '', mesin: '', tanggal_mulai: '', tanggal_selesai: '', jumlah_miss: 0, selesai: false },
        tahap_finishing: { operator: '', mesin: '', tanggal_mulai: '', tanggal_selesai: '', jumlah_miss: 0, selesai: false },
        is_siap_kirim: false,
        status_global: 'draft',
        is_canceled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onSaveJob(newJob);
    }

    setIsModalOpen(false);
  };

  // Submit Cancel Order
  const handleConfirmCancel = () => {
    if (!cancelModalJob) return;
    if (!cancelReason.trim()) {
      alert('Wajib mengisi alasan pembatalan order!');
      return;
    }
    onCancelJob(cancelModalJob.no_spk, cancelReason.trim());
    setCancelModalJob(null);
    setCancelReason('');
  };

  // Delete Job with validation
  const handleDeleteCheck = (job: SpkJob) => {
    if (job.status_finance === 'sudah_proses') {
      alert('SPK ini sudah masuk ke Finance/PPIC dan tidak bisa dihapus!');
      return;
    }
    if (confirm(`Yakin ingin menghapus SPK ${job.no_spk} - ${job.nama_customer}?`)) {
      onDeleteJob(job.no_spk);
    }
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        job.no_spk.toLowerCase().includes(term) ||
        job.nama_customer.toLowerCase().includes(term) ||
        job.nama_produk.toLowerCase().includes(term) ||
        (job.nama_sales && job.nama_sales.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Sales filter
      if (selectedSalesFilter && job.nama_sales !== selectedSalesFilter) {
        return false;
      }

      // Date range filter
      const jobDate = job.tanggal_order || job.created_at.split('T')[0];
      if (dateStartFilter && jobDate < dateStartFilter) return false;
      if (dateEndFilter && jobDate > dateEndFilter) return false;

      // Status filter
      if (statusFilter === 'active' && (job.is_canceled || job.status_global === 'selesai' || job.is_siap_kirim)) return false;
      if (statusFilter === 'termin' && job.jenis_pembayaran !== 'Termin') return false;
      if (statusFilter === 'canceled' && !job.is_canceled) return false;
      if (statusFilter === 'completed' && (!job.is_siap_kirim && job.status_global !== 'selesai')) return false;

      return true;
    });
  }, [jobs, searchTerm, selectedSalesFilter, dateStartFilter, dateEndFilter, statusFilter]);

  // Total omset dari filtered list
  const filteredOmsetSum = useMemo(() => {
    return filteredJobs
      .filter((j) => !j.is_canceled)
      .reduce((acc, j) => acc + (j.total_nominal || 0), 0);
  }, [filteredJobs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
              MODUL SALES
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Sales Order &amp; Penerbitan SPK
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan order, spesifikasi kertas, warna cetak, add-on, serta monitoring progress pengerjaan.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat SPK Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari No SPK, Customer, Produk, Sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Sales Filter */}
          <div>
            <select
              value={selectedSalesFilter}
              onChange={(e) => setSelectedSalesFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="">Semua Sales</option>
              {salesList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="all">Semua Status</option>
              <option value="active">Sedang Berjalan</option>
              <option value="termin">Pembayaran Termin</option>
              <option value="completed">Selesai / Siap Kirim</option>
              <option value="canceled">Dibatalkan</option>
            </select>
          </div>

          {/* Date Filter Quick Reset */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStartFilter}
              onChange={(e) => setDateStartFilter(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px] text-slate-800 focus:outline-none"
              title="Tanggal Dari"
            />
            <input
              type="date"
              value={dateEndFilter}
              onChange={(e) => setDateEndFilter(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px] text-slate-800 focus:outline-none"
              title="Tanggal Sampai"
            />
          </div>

        </div>

        {/* Filter Summary Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Ditemukan <strong>{filteredJobs.length}</strong> SPK</span>
            {selectedSalesFilter && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Sales: {selectedSalesFilter}
              </span>
            )}
          </div>
          <div className="font-semibold text-emerald-800">
            Total Nilai Order: <span className="text-sm font-black">{formatRupiah(filteredOmsetSum)}</span>
          </div>
        </div>
      </div>

      {/* SPK Table Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No SPK &amp; Tanggal</th>
                <th className="py-3.5 px-4">Customer &amp; Produk</th>
                <th className="py-3.5 px-4">Spesifikasi Kertas &amp; Cetak</th>
                <th className="py-3.5 px-4">Qty &amp; Nilai Order</th>
                <th className="py-3.5 px-4">Pembayaran &amp; DL</th>
                <th className="py-3.5 px-4">Status Alur</th>
                <th className="py-3.5 px-4 text-center">Aksi Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ditemukan data SPK yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isLockedFromSales = job.status_finance === 'sudah_proses';

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* No SPK */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-[11px]">
                            {job.no_spk}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {formatTanggalIndo(job.tanggal_order)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Sales: <strong className="text-slate-600">{job.nama_sales}</strong>
                        </p>
                      </td>

                      {/* Customer & Produk */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{job.nama_customer}</p>
                        <p className="text-slate-600 font-medium">{job.nama_produk}</p>
                        {job.ukuran_produk && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Ukuran: {job.ukuran_produk}
                          </p>
                        )}
                        {job.catatan_sales && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Add-on: {job.catatan_sales}
                          </span>
                        )}
                      </td>

                      {/* Spesifikasi Kertas & Cetak */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 text-[11px]">
                            {job.jenis_bahan}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Laminasi: {job.tipe_laminasi} ({job.sisi_laminasi})
                          </p>
                          <p className="text-[10px] text-indigo-600 font-medium">
                            Cetak: {job.desain_cetakan} {job.keterangan_warna ? `(${job.keterangan_warna})` : ''}
                          </p>
                        </div>
                      </td>

                      {/* Qty & Nilai */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">
                          {job.jumlah_order.toLocaleString('id-ID')} pcs
                        </p>
                        <p className="text-[11px] text-slate-500">
                          @ {formatRupiah(job.harga_satuan)}
                        </p>
                        <p className="text-xs font-black text-emerald-700 mt-0.5">
                          {formatRupiah(job.total_nominal)}
                        </p>
                      </td>

                      {/* Pembayaran & Deadline */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          job.jenis_pembayaran === 'Termin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : job.is_lunas 
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {job.jenis_pembayaran} ({job.is_lunas ? 'Lunas' : 'Belum Lunas'})
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Deadline 10H: <strong className="text-slate-800">{formatTanggalIndo(job.tanggal_deadline_spk)}</strong>
                        </p>
                      </td>

                      {/* Status Alur */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {job.is_canceled ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Dibatalkan
                            </span>
                            <p className="text-[10px] text-rose-600 max-w-[120px] truncate" title={job.alasan_cancel}>
                              {job.alasan_cancel}
                            </p>
                          </div>
                        ) : job.is_siap_kirim ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Siap Kirim / Selesai
                          </span>
                        ) : job.status_finance === 'belum_proses' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Menunggu DP Finance
                          </span>
                        ) : job.status_ppic !== 'selesai' ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                            PPIC: {job.status_ppic}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Produksi: {job.status_produksi}
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Review Detail */}
                          <button
                            onClick={() => onOpenSpkReview(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition cursor-pointer"
                            title="Review Detail SPK"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit (Locked if in Finance/PPIC) */}
                          {!job.is_canceled && (
                            <button
                              onClick={() => handleOpenEditModal(job)}
                              disabled={isLockedFromSales}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isLockedFromSales
                                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                              title={isLockedFromSales ? 'Terkunci: Sudah diproses Finance' : 'Edit SPK'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Order */}
                          {!job.is_canceled && !job.is_siap_kirim && (
                            <button
                              onClick={() => {
                                setCancelModalJob(job);
                                setCancelReason('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                              title="Batalkan Order (Cancel)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete (Only allowed before finance) */}
                          {!isLockedFromSales && (
                            <button
                              onClick={() => handleDeleteCheck(job)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition cursor-pointer"
                              title="Hapus SPK (Salah Input)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* MODAL FORM CREATE / EDIT SPK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingJob ? `Edit SPK: ${editingJob.no_spk}` : 'Formulir SPK Sales Baru'}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Woondypack Internasional - Standard Operational Procedure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Row 1: No SPK, Tanggal, Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. SPK (Otomatis)
                  </label>
                  <input
                    type="text"
                    value={formData.no_spk}
                    readOnly
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Order
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_order}
                    onChange={(e) => setFormData({ ...formData, tanggal_order: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Sales
                  </label>
                  <input
                    type="text"
                    value={formData.nama_sales}
                    onChange={(e) => setFormData({ ...formData, nama_sales: e.target.value })}
                    placeholder="Nama Sales"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Row 2: Customer & Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Customer / Perusahaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama_customer}
                    onChange={(e) => setFormData({ ...formData, nama_customer: e.target.value })}
                    placeholder="Contoh: PT Kopi Nusantara Sentosa"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telepon_customer}
                    onChange={(e) => setFormData({ ...formData, telepon_customer: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Row 3: Nama Produk & Ukuran Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Produk Cetakan / Dus <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama_produk}
                    onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                    placeholder="Contoh: Box Kemasan Kopi Drip Premium"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ukuran Produk (P x L x T)
                  </label>
                  <input
                    type="text"
                    value={formData.ukuran_produk}
                    onChange={(e) => setFormData({ ...formData, ukuran_produk: e.target.value })}
                    placeholder="Contoh: 18 x 12 x 6 cm"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Row 4: Qty, Harga Satuan, Total Nominal (Auto) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Jumlah Order (Pcs) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.jumlah_order}
                    onChange={(e) => setFormData({ ...formData, jumlah_order: Math.max(1, Number(e.target.value)) })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Harga Produk / Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.harga_satuan}
                    onChange={(e) => setFormData({ ...formData, harga_satuan: Math.max(0, Number(e.target.value)) })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Total Nominal Order (Otomatis)
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs sm:text-sm truncate">
                    {formatRupiah(calculatedTotalNominal)}
                  </div>
                </div>
              </div>

              {/* Row 5: Bahan Kertas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opsi Jenis Bahan Kertas
                  </label>
                  <select
                    value={formData.jenis_bahan_select}
                    onChange={(e) => setFormData({ ...formData, jenis_bahan_select: e.target.value as PaperType })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    {PAPER_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {formData.jenis_bahan_select === 'Custom' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ketik Nama Bahan Kertas Custom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.jenis_bahan_custom}
                      onChange={(e) => setFormData({ ...formData, jenis_bahan_custom: e.target.value })}
                      placeholder="Misal: Fancy Paper Linen 250gr"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipe &amp; Sisi Laminasi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.tipe_laminasi}
                      onChange={(e) => setFormData({ ...formData, tipe_laminasi: e.target.value as LaminationType })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                    >
                      <option value="Tanpa Laminasi">Tanpa Laminasi</option>
                      <option value="Glossy">Glossy (Mengkilap)</option>
                      <option value="Doff">Doff (Matte)</option>
                    </select>

                    <select
                      value={formData.sisi_laminasi}
                      onChange={(e) => setFormData({ ...formData, sisi_laminasi: e.target.value as LaminationSide })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                    >
                      <option value="Tanpa Laminasi">Tanpa Sisi</option>
                      <option value="1 Sisi Bagian Luar">1 Sisi Bagian Luar</option>
                      <option value="1 Sisi Bagian Dalam">1 Sisi Bagian Dalam</option>
                      <option value="2 Sisi">2 Sisi (Luar &amp; Dalam)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 6: Desain Cetakan & Warna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Desain Cetakan
                  </label>
                  <select
                    value={formData.desain_cetakan}
                    onChange={(e) => setFormData({ ...formData, desain_cetakan: e.target.value as PrintColorType })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="Full Colour CMYK">Full Colour CMYK</option>
                    <option value="1 Warna Khusus">1 Warna (Input request customer)</option>
                    <option value="2 Warna Khusus">2 Warna (Input request customer)</option>
                    <option value="Custom">Custom Warna Spesial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Warna Cetak (Khusus/Pantone)
                  </label>
                  <input
                    type="text"
                    value={formData.keterangan_warna}
                    onChange={(e) => setFormData({ ...formData, keterangan_warna: e.target.value })}
                    placeholder="Misal: Pantone Warm Red C + Black"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Row 7: Pembayaran & Catatan Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ketentuan Pembayaran Customer
                  </label>
                  <select
                    value={formData.jenis_pembayaran}
                    onChange={(e) => setFormData({ ...formData, jenis_pembayaran: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="DP">DP 50% (Standar Percetakan)</option>
                    <option value="Termin">Termin (Kredit PO Perusahaan)</option>
                    <option value="Cash Lunas">Cash Lunas di Awal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Khusus / Add-on
                  </label>
                  <input
                    type="text"
                    value={formData.catatan_sales}
                    onChange={(e) => setFormData({ ...formData, catatan_sales: e.target.value })}
                    placeholder="Misal: Tambah tali maroon, hotprint gold"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan SPK Order</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL CANCEL ORDER */}
      {cancelModalJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batalkan Pesanan (Cancel Order)</h3>
                <p className="text-xs text-slate-500">SPK: {cancelModalJob.no_spk} - {cancelModalJob.nama_customer}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin membatalkan order ini? Data pembatalan akan dicatat ke dalam statistik dashboard.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Customer menunda proyek launching kemasan / salah spesifikasi..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/25"
              >
                Konfirmasi Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
