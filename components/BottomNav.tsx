import React from 'react';
import { Home, Menu, UserCircle, Settings, Folder } from 'lucide-react';
import { ActiveTab } from '../types.ts';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Ana Sayfa', icon: Home, active: 'border-blue-400/55 bg-blue-500/12 text-blue-100 shadow-blue-950/30', iconColor: 'text-blue-300' },
    { id: 'menu', label: 'Menü', icon: Menu, active: 'border-emerald-400/55 bg-emerald-500/12 text-emerald-100 shadow-emerald-950/30', iconColor: 'text-emerald-300' },
    { id: 'sessions', label: 'Oturumlar', icon: UserCircle, active: 'border-emerald-400/55 bg-emerald-500/12 text-emerald-100 shadow-emerald-950/30', iconColor: 'text-emerald-300' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, active: 'border-amber-400/55 bg-amber-500/12 text-amber-100 shadow-amber-950/30', iconColor: 'text-amber-300' },
    { id: 'files', label: 'Dosyalar', icon: Folder, active: 'border-violet-400/55 bg-violet-500/12 text-violet-100 shadow-violet-950/30', iconColor: 'text-violet-300' },
  ] as const;

  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/10 bg-slate-800/95 px-2.5 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-5 gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as ActiveTab)}
              className={`embossed-cash relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_5px_0_rgba(2,6,23,0.34),0_12px_18px_rgba(0,0,0,0.18)] transition-all duration-200 active:translate-y-0.5 active:scale-[0.98] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_0_rgba(2,6,23,0.42),0_8px_14px_rgba(0,0,0,0.16)] ${
                isActive
                  ? `${tab.active} shadow-lg`
                  : 'border-white/10 bg-slate-900/25 text-white/42 hover:bg-white/5'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? tab.iconColor : 'text-white/45'
                }`}
                strokeWidth={isActive ? 2.8 : 2.2}
              />
              <span
                className={`max-w-full truncate text-[8px] min-[380px]:text-[9px] font-black uppercase leading-none tracking-tight ${
                  isActive ? 'text-current' : 'text-white/42'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
