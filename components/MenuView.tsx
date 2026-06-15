
import React, { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
  HandCoins, UserPlus, RotateCcw, TrendingUp, TrendingDown,
  ArrowLeftRight, Building2, History, UserCheck, CalendarDays,
  BarChart3, ShieldCheck, Settings, Folder, UserCircle, ChevronRight,
  LayoutDashboard, PieChart, LogOut, ArrowLeft
} from 'lucide-react';

interface MenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  targetSubView?: string;
  targetTab?: 'home' | 'menu' | 'sessions' | 'settings' | 'files';
}

interface MenuSection {
  title: string;
  actions: MenuAction[];
}

interface MenuViewProps {
  onActionClick: (targetSubView: string | null, targetTab?: any) => void;
  onLogout: () => void;
  onClose: () => void;
}

const MenuView: React.FC<MenuViewProps> = ({ onActionClick, onLogout, onClose }) => {
  const [appVersion, setAppVersion] = useState('1.2');

  useEffect(() => {
    CapacitorApp.getInfo()
      .then((info) => {
        if (info.version) setAppVersion(info.version);
      })
      .catch(() => {});
  }, []);

  const sections: MenuSection[] = [
    {
      title: "FİNANSAL İŞLEMLER",
      actions: [
        { id: 'tahsilat', label: "Tahsilat", icon: <HandCoins size={20} />, color: "text-green-500", targetSubView: 'tahsilat' },
        { id: 'borclandir', label: "Borçlandırma", icon: <UserPlus size={20} />, color: "text-orange-500", targetSubView: 'borclandir' },
        { id: 'gelir', label: "Diğer Gelirler", icon: <TrendingUp size={20} />, color: "text-emerald-500", targetSubView: 'gelir' },
        { id: 'gider', label: "Gider Kaydı", icon: <TrendingDown size={20} />, color: "text-red-500", targetSubView: 'gider' },
        { id: 'transfer', label: "Kasa Transferi", icon: <ArrowLeftRight size={20} />, color: "text-indigo-500", targetSubView: 'transfer' },
        { id: 'iade', label: "İade İşlemleri", icon: <RotateCcw size={20} />, color: "text-rose-500", targetSubView: 'iade' },
      ]
    },
    {
      title: "RAPORLAR VE TAKİP",
      actions: [
        { id: 'aidat-cizelge', label: "Aidat Çizelgesi", icon: <CalendarDays size={20} />, color: "text-blue-400", targetSubView: 'aidat-cizelge' },
        { id: 'receivables', label: "Alacak Listesi", icon: <UserCheck size={20} />, color: "text-red-400", targetSubView: 'receivables' },
        { id: 'monthly-report', label: "Aylık Bilanço", icon: <BarChart3 size={20} />, color: "text-yellow-500", targetSubView: 'monthly-report' },
        { id: 'yearly-report', label: "Yıllık Bilanço", icon: <PieChart size={20} />, color: "text-purple-500", targetSubView: 'yearly-report' },
        { id: 'history', label: "İşlem Geçmişi", icon: <History size={20} />, color: "text-zinc-400", targetSubView: 'history' },
      ]
    },
    {
      title: "YÖNETİM",
      actions: [
        { id: 'units', label: "Daire Listesi", icon: <Building2 size={20} />, color: "text-blue-500", targetSubView: 'units' },
        { id: 'board', label: "Yönetim Kurulu", icon: <ShieldCheck size={20} />, color: "text-cyan-500", targetSubView: 'board' },
        { id: 'sessions', label: "Oturum Yönetimi", icon: <UserCircle size={20} />, color: "text-amber-500", targetTab: 'sessions' },
      ]
    },
    {
      title: "SİSTEM",
      actions: [
        { id: 'settings', label: "Genel Ayarlar", icon: <Settings size={20} />, color: "text-zinc-500", targetTab: 'settings' },
        { id: 'files', label: "Dosya Arşivi", icon: <Folder size={20} />, color: "text-zinc-500", targetTab: 'files' },
      ]
    },
    {
      title: "OTURUM",
      actions: [
        { id: 'logout', label: "Çıkış Yap", icon: <LogOut size={20} />, color: "text-red-500", targetSubView: 'logout' },
      ]
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 pb-32">
      <div className="flex flex-col items-center mb-8 px-4 text-center relative">
        <button
          onClick={onClose}
          className="app-back-button absolute left-4 top-0"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mb-4 shadow-2xl">
          <LayoutDashboard size={32} className="text-green-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-[17px] font-light tracking-[0.2em] text-white uppercase">Uygulama Menüsü</h2>
        <p className="text-[9px] font-medium text-white/10 uppercase tracking-[0.4em] mt-1">Yönetim Dijital Paneli</p>
      </div>

      <div className="space-y-6 px-2">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-2">
            <div className="flex items-center space-x-3 px-3 mb-2">
              <div className="h-px bg-white/5 flex-1"></div>
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] whitespace-nowrap">{section.title}</h3>
              <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {section.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.id === 'logout') {
                      onLogout();
                    } else {
                      onActionClick(action.targetSubView || null, action.targetTab);
                    }
                  }}
                  className="embossed-cash bg-[#111827]/80 backdrop-blur-xl rounded-[24px] py-2.5 px-4 flex items-center justify-between group border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_5px_0_rgba(2,6,23,0.42),0_13px_20px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:scale-[0.99] active:bg-[#111827]/90 active:border-white/10 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_0_rgba(2,6,23,0.52),0_9px_15px_rgba(0,0,0,0.18)] transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`embossed-cash p-2 rounded-xl bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_3px_0_rgba(2,6,23,0.45),0_8px_12px_rgba(0,0,0,0.18)] group-hover:scale-105 group-active:translate-y-0.5 group-active:scale-100 group-active:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_0_rgba(2,6,23,0.55),0_5px_9px_rgba(0,0,0,0.16)] transition-all ${action.color}`}>
                      {action.icon}
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
                      {action.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 group-active:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center flex flex-col items-center">
        <div className="w-12 h-0.5 bg-white/20 mb-4 rounded-full"></div>
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/35">GALATA SÜRÜM {appVersion}</p>
      </div>
    </div>
  );
};

export default MenuView;
