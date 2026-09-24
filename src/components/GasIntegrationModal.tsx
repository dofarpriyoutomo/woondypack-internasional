import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileCode2, 
  ExternalLink, 
  Database, 
  RefreshCw, 
  Cloud,
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  FolderOpen,
  ArrowUpRight,
  Download,
  Upload,
  AlertTriangle,
  LogOut,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import { generateCodeGs, generateIndexHtml } from '../utils/gasGenerator';
import { 
  listUserSpreadsheets, 
  createErpSpreadsheet, 
  pushJobsToGoogleSheets, 
  pullJobsFromGoogleSheets,
  DriveSpreadsheetFile 
} from '../services/googleSheetsDirect';
import { SpkJob } from '../types';

interface GasIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
  onSyncWithSheets: () => Promise<void>;
  isSyncing: boolean;
  jobs: SpkJob[];
  onUpdateJobsFromSheets: (newJobs: SpkJob[]) => void;
  googleUser: User | null;
  googleToken: string | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  isLoggingIn: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GasIntegrationModal: React.FC<GasIntegrationModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl,
  onSyncWithSheets,
  isSyncing,
  jobs,
  onUpdateJobsFromSheets,
  googleUser,
  googleToken,
  onGoogleSignIn,
  onGoogleSignOut,
  isLoggingIn,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'directSheets' | 'gasWebhook' | 'codeGs' | 'indexHtml'>('directSheets');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState(webhookUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Direct Sheets State
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [activeSpreadsheet, setActiveSpreadsheet] = useState<{ id: string; name: string; url: string } | null>(() => {
    try {
      const saved = localStorage.getItem('woondypack_active_spreadsheet');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('woondypack_last_sync_time');
  });

  // Confirmation Modals for Destructive/Mutating Workspace operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'push' | 'pull' | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: null,
  });

  // Fetch Spreadsheets when user is authenticated
  const fetchSpreadsheets = async () => {
    if (!googleToken) return;
    setIsLoadingFiles(true);
    try {
      const files = await listUserSpreadsheets(googleToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error('Failed to list spreadsheets', err);
      showToast(`Gagal memuat file spreadsheet dari Google Drive: ${err.message}`, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (googleToken && isOpen && activeTab === 'directSheets') {
      fetchSpreadsheets();
    }
  }, [googleToken, isOpen, activeTab]);

  if (!isOpen) return null;

  const codeGsContent = generateCodeGs();
  const indexHtmlContent = generateIndexHtml();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWebhookUrl(inputUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSelectSpreadsheet = (file: DriveSpreadsheetFile) => {
    const sheetObj = {
      id: file.id,
      name: file.name,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    };
    setActiveSpreadsheet(sheetObj);
    localStorage.setItem('woondypack_active_spreadsheet', JSON.stringify(sheetObj));
    showToast(`Spreadsheet "${file.name}" berhasil dipilih.`, 'success');
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!googleToken) {
      showToast('Harap login dengan Google terlebih dahulu.', 'info');
      return;
    }
    setIsCreatingSheet(true);
    try {
      const result = await createErpSpreadsheet(googleToken, 'DB ERP Woondypack Internasional');
      const sheetObj = {
        id: result.spreadsheetId,
        name: 'DB ERP Woondypack Internasional',
        url: result.spreadsheetUrl,
      };
      setActiveSpreadsheet(sheetObj);
      localStorage.setItem('woondypack_active_spreadsheet', JSON.stringify(sheetObj));
      await fetchSpreadsheets();
      showToast('Spreadsheet ERP Woondypack berhasil dibuat dengan 4 tab terformat!', 'success');
    } catch (err: any) {
      console.error('Error creating spreadsheet', err);
      showToast(`Gagal membuat spreadsheet: ${err.message}`, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Trigger Push with User Confirmation Dialog
  const requestPushData = () => {
    if (!activeSpreadsheet) {
      showToast('Pilih atau buat Google Spreadsheet terlebih dahulu.', 'info');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Kirim Data ke Google Sheets',
      description: `Apakah Anda yakin ingin menulis ${jobs.length} data SPK ke spreadsheet "${activeSpreadsheet.name}"? Data di tab DB_SPK_Sales, DB_Finance, DB_PPIC, dan DB_Produksi akan diperbarui.`,
      actionType: 'push',
    });
  };

  // Trigger Pull with User Confirmation Dialog
  const requestPullData = () => {
    if (!activeSpreadsheet) {
      showToast('Pilih atau buat Google Spreadsheet terlebih dahulu.', 'info');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Ambil Data dari Google Sheets',
      description: `Apakah Anda yakin ingin mengimpor data terbaru dari spreadsheet "${activeSpreadsheet.name}"? Data SPK lokal akan diselaraskan dengan isi Google Sheets.`,
      actionType: 'pull',
    });
  };

  // Execute Confirmed Operation
  const handleExecuteConfirmedAction = async () => {
    if (!googleToken || !activeSpreadsheet) return;
    const action = confirmDialog.actionType;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

    if (action === 'push') {
      setIsPushing(true);
      try {
        await pushJobsToGoogleSheets(googleToken, activeSpreadsheet.id, jobs);
        const timeStr = new Date().toLocaleString('id-ID');
        setLastSyncTime(timeStr);
        localStorage.setItem('woondypack_last_sync_time', timeStr);
        showToast(`Berhasil mengirim ${jobs.length} SPK ke Google Sheets "${activeSpreadsheet.name}"!`, 'success');
      } catch (err: any) {
        console.error('Error pushing data', err);
        showToast(`Gagal mengirim data: ${err.message}`, 'error');
      } finally {
        setIsPushing(false);
      }
    } else if (action === 'pull') {
      setIsPulling(true);
      try {
        const fetchedJobs = await pullJobsFromGoogleSheets(googleToken, activeSpreadsheet.id);
        if (fetchedJobs && fetchedJobs.length > 0) {
          onUpdateJobsFromSheets(fetchedJobs);
          const timeStr = new Date().toLocaleString('id-ID');
          setLastSyncTime(timeStr);
          localStorage.setItem('woondypack_last_sync_time', timeStr);
          showToast(`Berhasil mengambil ${fetchedJobs.length} SPK dari Google Sheets!`, 'success');
        } else {
          showToast('Spreadsheet belum berisi data SPK yang valid.', 'info');
        }
      } catch (err: any) {
        console.error('Error pulling data', err);
        showToast(`Gagal mengambil data dari Google Sheets: ${err.message}`, 'error');
      } finally {
        setIsPulling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Google Sheets 2-Way Live Sync</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono">
                  Drive &amp; Sheets API
                </span>
              </h3>
              <p className="text-xs text-emerald-200">
                Integrasi langsung Google Sheets &amp; Google Drive dengan otentikasi Google Workspace.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directSheets')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'directSheets'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>1. Google Sheets Langsung (Drive API)</span>
          </button>

          <button
            onClick={() => setActiveTab('gasWebhook')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'gasWebhook'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>2. Apps Script Webhook (Opsional)</span>
          </button>

          <button
            onClick={() => setActiveTab('codeGs')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'codeGs'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>3. Kode Code.gs</span>
          </button>

          <button
            onClick={() => setActiveTab('indexHtml')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'indexHtml'
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>4. Kode Index.html</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs">
          
          {/* TAB 1: DIRECT GOOGLE SHEETS & DRIVE API */}
          {activeTab === 'directSheets' && (
            <div className="space-y-6">
              
              {/* Google Auth Status Card */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  {googleUser ? (
                    <>
                      {googleUser.photoURL ? (
                        <img 
                          src={googleUser.photoURL} 
                          alt="Google User" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                          {googleUser.displayName?.charAt(0) || googleUser.email?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {googleUser.displayName || 'Pengguna Google'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                            Terhubung
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{googleUser.email}</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">Otentikasi Akun Google</h4>
                      <p className="text-xs text-slate-400">
                        Masuk dengan Akun Google untuk membaca dan menulis data langsung ke Google Sheets Anda.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  {googleUser ? (
                    <button
                      onClick={onGoogleSignOut}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Sign out)</span>
                    </button>
                  ) : (
                    /* Official Google Sign-in Button with SVG */
                    <button 
                      onClick={onGoogleSignIn}
                      disabled={isLoggingIn}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center gap-2.5 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-5 h-5 flex-shrink-0">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Spreadsheet & Actions Card */}
              {googleUser && (
                <div className="space-y-4">
                  
                  {/* Selected Spreadsheet Info */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-slate-800 text-xs">Spreadsheet Aktif:</span>
                        {activeSpreadsheet ? (
                          <span className="font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                            {activeSpreadsheet.name}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Belum Ada Spreadsheet Terpilih
                          </span>
                        )}
                      </div>

                      {activeSpreadsheet && (
                        <a
                          href={activeSpreadsheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs hover:shadow transition"
                        >
                          <span>Buka di Google Sheets</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {lastSyncTime && (
                      <p className="text-[11px] text-emerald-800">
                        Sinkronisasi Terakhir: <strong>{lastSyncTime}</strong> &bull; Jumlah SPK Lokal: <strong>{jobs.length}</strong>
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-emerald-200/80">
                      <button
                        onClick={requestPushData}
                        disabled={!activeSpreadsheet || isPushing || isPulling}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                        <span>{isPushing ? 'Mengirim Data...' : 'Kirim Data ke Sheets (Export)'}</span>
                      </button>

                      <button
                        onClick={requestPullData}
                        disabled={!activeSpreadsheet || isPushing || isPulling}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                        <span>{isPulling ? 'Mengambil Data...' : 'Ambil Data dari Sheets (Import)'}</span>
                      </button>

                      <button
                        onClick={handleCreateNewSpreadsheet}
                        disabled={isCreatingSheet}
                        className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <PlusCircle className={`w-4 h-4 text-emerald-600 ${isCreatingSheet ? 'animate-spin' : ''}`} />
                        <span>{isCreatingSheet ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet Baru'}</span>
                      </button>
                    </div>
                  </div>

                  {/* List of User's Spreadsheets from Google Drive */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-slate-700" />
                        <h4 className="font-bold text-slate-800 text-xs">
                          Pilih Spreadsheet dari Google Drive Anda:
                        </h4>
                      </div>

                      <button
                        onClick={fetchSpreadsheets}
                        disabled={isLoadingFiles}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                        <span>Refresh Drive</span>
                      </button>
                    </div>

                    {isLoadingFiles ? (
                      <div className="py-6 text-center text-slate-500 flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                        <span>Memuat spreadsheet dari Google Drive...</span>
                      </div>
                    ) : spreadsheets.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                        <p className="text-slate-500">Belum ada Google Spreadsheet yang ditemukan di Drive Anda.</p>
                        <button
                          onClick={handleCreateNewSpreadsheet}
                          disabled={isCreatingSheet}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs inline-flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Buat Otomatis Sekarang</span>
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {spreadsheets.map((sheet) => {
                          const isSelected = activeSpreadsheet?.id === sheet.id;
                          return (
                            <div
                              key={sheet.id}
                              className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-900 shadow-xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-700'
                              }`}
                              onClick={() => handleSelectSpreadsheet(sheet)}
                            >
                              <div className="flex items-center gap-2.5 truncate mr-2">
                                <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span className="truncate text-xs">{sheet.name}</span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isSelected ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="text-xs text-indigo-600 hover:underline">
                                    Pilih
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 2: GAS WEBHOOK SETUP (ALTERNATIVE) */}
          {activeTab === 'gasWebhook' && (
            <div className="space-y-6">
              
              {/* Webhook Configuration Form */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950">
                      Konfigurasi Webhook Google Apps Script (Metode URL)
                    </h4>
                  </div>
                  {saveSuccess && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> URL Berhasil Disimpan!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveUrl} className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Deployment URL Web App (akhiran /exec)
                    </label>
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-emerald-800">
                      *Masukkan URL Apps Script setelah melakukan Deploy as Web App (Access: Anyone).
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold transition cursor-pointer"
                      >
                        Simpan URL
                      </button>
                      
                      <button
                        type="button"
                        onClick={onSyncWithSheets}
                        disabled={!inputUrl || isSyncing}
                        className={`px-4 py-2 rounded-xl text-white font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          !inputUrl || isSyncing 
                            ? 'bg-slate-300 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Langkah-Langkah Pasang di Google Sheets:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h5 className="font-bold text-slate-900">Buat Google Sheet</h5>
                    <p className="text-slate-600 text-[11px]">
                      Buka Google Sheets baru. Klik menu <strong>Extensions &gt; Apps Script</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h5 className="font-bold text-slate-900">Paste Code.gs &amp; HTML</h5>
                    <p className="text-slate-600 text-[11px]">
                      Salin kode dari tab <strong>Code.gs</strong> dan buat file baru <strong>Index.html</strong> di Apps Script editor.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h5 className="font-bold text-slate-900">Deploy as Web App</h5>
                    <p className="text-slate-600 text-[11px]">
                      Klik <strong>Deploy &gt; New deployment &gt; Web app</strong>. Atur <em>Who has access</em> ke <strong>Anyone</strong>, lalu salin Web App URL-nya.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CODE.GS */}
          {activeTab === 'codeGs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  File: <strong>Code.gs</strong> (Apps Script Backend Engine &amp; Auto Sheet Structurer)
                </span>
                <button
                  onClick={() => handleCopy(codeGsContent, 'codegs')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey === 'codegs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'codegs' ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-emerald-300 max-h-96 overflow-y-auto leading-relaxed">
                <pre>{codeGsContent}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: INDEX.HTML */}
          {activeTab === 'indexHtml' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  File: <strong>Index.html</strong> (Stand-alone Web Interface)
                </span>
                <button
                  onClick={() => handleCopy(indexHtmlContent, 'indexhtml')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey === 'indexhtml' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'indexhtml' ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-cyan-300 max-h-96 overflow-y-auto leading-relaxed">
                <pre>{indexHtmlContent}</pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Aplikasi mendukung integrasi langsung Google Drive &amp; Sheets API serta Webhook Apps Script.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Confirmation Dialog for Destructive / Mutating Workspace Operations */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">{confirmDialog.title}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {confirmDialog.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Konfirmasi &amp; Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
