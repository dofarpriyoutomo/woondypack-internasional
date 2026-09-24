import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  BadgeDollarSign, 
  Boxes, 
  Factory, 
  FileSpreadsheet, 
  Printer,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppTab, SpkJob } from '../types';

export type NavTabId = AppTab;

interface NavbarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenGasModal: () => void;
  jobs?: SpkJob[];
  googleUser?: User | null;
  onGoogleSignIn?: () => void;
  isLoggingIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenGasModal,
  jobs = [],
  googleUser = null,
  onGoogleSignIn,
  isLoggingIn = false,
}) => {
  // Hitung counter notifikasi per modul
  const pendingFinanceCount = jobs.filter(
    (j) => !j.is_canceled && j.status_finance === 'belum_proses'
  ).length;

  const pendingPpicCount = jobs.filter(
    (j) => !j.is_canceled && j.status_finance === 'sudah_proses' && j.status_ppic !== 'selesai'
  ).length;

  const activeProduksiCount = jobs.filter(
    (j) => !j.is_canceled && j.status_ppic === 'selesai' && j.status_produksi !== 'selesai'
  ).length;

  const navItems: {
    id: AppTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    activeBg: string;
    iconColor: string;
    isModalTrigger?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Utama',
      sublabel: 'KPI & Performa',
      icon: LayoutDashboard,
      activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25',
      iconColor: 'text-blue-500',
    },
    {
      id: 'sales',
      label: 'Sales Order',
      sublabel: 'SPK & Spesifikasi',
      icon: ShoppingCart,
      activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25',
      iconColor: 'text-emerald-500',
    },
    {
      id: 'finance',
      label: 'Finance & Kas',
      sublabel: 'DP, Termin & Lunas',
      icon: BadgeDollarSign,
      badge: pendingFinanceCount,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold',
      activeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
      iconColor: 'text-amber-500',
    },
    {
      id: 'ppic',
      label: 'PPIC Center',
      sublabel: 'Bahan, Plat & Pisau',
      icon: Boxes,
      badge: pendingPpicCount,
      badgeColor: 'bg-cyan-400 text-slate-950 font-bold',
      activeBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25',
      iconColor: 'text-cyan-500',
    },
    {
      id: 'produksi',
      label: 'Produksi Control',
      sublabel: 'Cetak, Pond, Finishing',
      icon: Factory,
      badge: activeProduksiCount,
      badgeColor: 'bg-purple-400 text-slate-950 font-bold',
      activeBg: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25',
      iconColor: 'text-purple-500',
    },
    {
      id: 'gas_export',
      label: 'Google Sheets & GAS',
      sublabel: 'Live Sync & Code.gs',
      icon: FileSpreadsheet,
      activeBg: 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md shadow-emerald-900/30',
      iconColor: 'text-emerald-400',
      isModalTrigger: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-xl backdrop-blur-md bg-opacity-95 print:hidden">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Printer className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                WOONDYPACK
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 tracking-wider">
                INTERNASIONAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Integrated ERP Percetakan &amp; Packaging Web App
            </p>
          </div>
        </div>

        {/* Status Badge & Google Auth / Sheets Button */}
        <div className="flex items-center gap-2.5">
          {/* Sign in with Google / User Card */}
          {googleUser ? (
            <button
              onClick={onOpenGasModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs transition cursor-pointer"
            >
              {googleUser.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt="User" 
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full border border-emerald-400" 
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {googleUser.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <span className="font-semibold max-w-[120px] truncate">{googleUser.displayName || googleUser.email}</span>
            </button>
          ) : (
            onGoogleSignIn && (
              <button
                onClick={onGoogleSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <div className="w-4 h-4 flex-shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )
          )}

          {/* Direct Google Sheets Modal Launcher */}
          <button
            onClick={onOpenGasModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Google Sheets Live Sync</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Navigation Menus Bar with Bright & High Contrast Active States */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  if (item.isModalTrigger) {
                    onOpenGasModal();
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `${item.activeBg} font-semibold scale-[1.02]`
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition ${
                    isActive ? 'bg-white/20 text-white' : `${item.iconColor} bg-slate-800/80 group-hover:bg-slate-700`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm leading-tight">
                    {item.label}
                  </span>
                  <span className={`text-[10px] leading-tight ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                    {item.sublabel}
                  </span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      item.badgeColor || 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
