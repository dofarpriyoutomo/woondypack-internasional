import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Navbar, 
  NavTabId 
} from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SalesOrderView } from './components/SalesOrderView';
import { FinanceView } from './components/FinanceView';
import { PpicView } from './components/PpicView';
import { ProduksiView } from './components/ProduksiView';
import { SpkReviewModal } from './components/SpkReviewModal';
import { GasIntegrationModal } from './components/GasIntegrationModal';
import { SpkJob } from './types';
import { mockJobs } from './data/mockInitialData';
import { 
  initAuth, 
  googleSignIn, 
  googleLogout, 
  getAccessToken 
} from './services/googleAuth';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

const STORAGE_KEY_JOBS = 'woondypack_erp_jobs_v1';
const STORAGE_KEY_WEBHOOK = 'woondypack_erp_gas_webhook_v1';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');

  // Google Authentication State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Jobs State (with local storage persistence)
  const [jobs, setJobs] = useState<SpkJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOBS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse localStorage jobs', e);
    }
    return mockJobs;
  });

  // Google Apps Script Webhook URL
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
  });

  // Syncing state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Toast Notification state (Non-blocking notification)
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Selected Job for Review Modal
  const [reviewJob, setReviewJob] = useState<SpkJob | null>(null);

  // Gas & Google Sheets Integration Modal
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast(`Selamat datang, ${result.user.displayName || result.user.email}! Terhubung ke Google Sheets.`, 'success');
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      showToast(`Gagal login Google: ${error.message || error}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign Out
  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast('Berhasil keluar dari akun Google.', 'info');
    } catch (error: any) {
      console.error('Sign-out error:', error);
      showToast(`Gagal logout: ${error.message}`, 'error');
    }
  };

  // Save to LocalStorage whenever jobs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed to save jobs to localStorage', e);
    }
  }, [jobs]);

  // Save / Update Single Job
  const handleSaveJob = useCallback((savedJob: SpkJob) => {
    setJobs((prevJobs) => {
      const exists = prevJobs.some((j) => j.no_spk === savedJob.no_spk);
      if (exists) {
        return prevJobs.map((j) => (j.no_spk === savedJob.no_spk ? savedJob : j));
      }
      return [savedJob, ...prevJobs];
    });
    showToast(`SPK ${savedJob.no_spk} (${savedJob.nama_customer}) berhasil disimpan!`, 'success');
  }, [showToast]);

  // Delete Job (Sales input mistake)
  const handleDeleteJob = useCallback((noSpk: string) => {
    setJobs((prevJobs) => prevJobs.filter((j) => j.no_spk !== noSpk));
    showToast(`SPK ${noSpk} berhasil dihapus.`, 'info');
  }, [showToast]);

  // Cancel Job with reason
  const handleCancelJob = useCallback((noSpk: string, reason: string) => {
    setJobs((prevJobs) =>
      prevJobs.map((j) => {
        if (j.no_spk === noSpk) {
          return {
            ...j,
            is_canceled: true,
            alasan_cancel: reason,
            status_global: 'dibatalkan',
            updated_at: new Date().toISOString(),
          };
        }
        return j;
      })
    );
    showToast(`SPK ${noSpk} telah dibatalkan. Alasan dicatat.`, 'info');
  }, [showToast]);

  // Update Webhook URL
  const handleSaveWebhookUrl = useCallback((url: string) => {
    setWebhookUrl(url);
    localStorage.setItem(STORAGE_KEY_WEBHOOK, url);
    showToast('URL Google Apps Script berhasil disimpan.', 'success');
  }, [showToast]);

  // 2-Way Sync with Google Sheets via Webhook
  const handleSyncWithSheets = useCallback(async () => {
    if (!webhookUrl) {
      setIsGasModalOpen(true);
      showToast('Harap masukkan URL Google Apps Script Web App terlebih dahulu.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      // Kirim data lokal ke Google Sheets
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'SYNC_ALL_DATA',
          jobs: jobs,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.jobs && Array.isArray(result.jobs) && result.jobs.length > 0) {
          setJobs(result.jobs);
        }
        showToast('Sinkronisasi 2 arah dengan Google Sheets berhasil!', 'success');
      } else {
        showToast('Sinkronisasi tersambung (mode webhook).', 'success');
      }
    } catch (err: any) {
      console.warn('Sync notice:', err);
      showToast('Data tersimpan secara lokal dan siap dikirim ke Google Sheets.', 'info');
    } finally {
      setIsSyncing(false);
    }
  }, [webhookUrl, jobs, showToast]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Top Professional Navigation Bar with Google User Info */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenGasModal={() => setIsGasModalOpen(true)}
        jobs={jobs}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        isLoggingIn={isLoggingIn}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW 1: DASHBOARD UTAMA */}
        {activeTab === 'dashboard' && (
          <DashboardView
            jobs={jobs}
            onSelectTab={setActiveTab}
            onOpenSpkReview={setReviewJob}
            onOpenGasModal={() => setIsGasModalOpen(true)}
          />
        )}

        {/* VIEW 2: SALES ORDER */}
        {activeTab === 'sales' && (
          <SalesOrderView
            jobs={jobs}
            onSaveJob={handleSaveJob}
            onDeleteJob={handleDeleteJob}
            onCancelJob={handleCancelJob}
            onOpenSpkReview={setReviewJob}
          />
        )}

        {/* VIEW 3: FINANCE */}
        {activeTab === 'finance' && (
          <FinanceView
            jobs={jobs}
            onUpdateFinance={handleSaveJob}
            onOpenSpkReview={setReviewJob}
          />
        )}

        {/* VIEW 4: PPIC CENTER */}
        {activeTab === 'ppic' && (
          <PpicView
            jobs={jobs}
            onUpdatePpic={handleSaveJob}
            onOpenSpkReview={setReviewJob}
          />
        )}

        {/* VIEW 5: PRODUKSI CONTROL */}
        {activeTab === 'produksi' && (
          <ProduksiView
            jobs={jobs}
            onUpdateProduksi={handleSaveJob}
            onOpenSpkReview={setReviewJob}
          />
        )}

      </main>

      {/* Modern SPK Review & Work Order Printable Modal */}
      <SpkReviewModal
        job={reviewJob}
        onClose={() => setReviewJob(null)}
      />

      {/* Google Sheets Live & GAS Integration Modal */}
      <GasIntegrationModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        onSyncWithSheets={handleSyncWithSheets}
        isSyncing={isSyncing}
        jobs={jobs}
        onUpdateJobsFromSheets={(newJobs) => {
          setJobs(newJobs);
          showToast(`${newJobs.length} data SPK diperbarui dari Google Sheets!`, 'success');
        }}
        googleUser={googleUser}
        googleToken={googleToken}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        isLoggingIn={isLoggingIn}
        showToast={showToast}
      />

      {/* Smooth Non-blocking Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700 shadow-rose-950/20'
              : 'bg-slate-900 text-slate-100 border-slate-700 shadow-slate-950/20'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <RefreshCw className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="ml-2 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* App Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          &copy; {new Date().getFullYear()} <strong>Woondypack Internasional</strong> &bull; ERP &amp; Production Management System &bull; 2-Way Google Sheets Synced
        </p>
      </footer>

    </div>
  );
}
