
import React from 'react';
import { Home, Menu, UserCircle, Settings, Folder } from 'lucide-react';
import { ActiveTab } from '../types.ts';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Ana Sayfa', icon: <Home className="w-6 h-6" /> },
    { id: 'menu', label: 'Menü', icon: <Menu className="w-6 h-6" /> },
    { id: 'sessions', label: 'Oturumlar', icon: <UserCircle className="w-6 h-6" /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings className="w-6 h-6" /> },
    { id: 'files', label: 'Dosyalar', icon: <Folder className="w-6 h-6" /> },
  ] as const;

  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/5 bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] px-3 pt-2.5">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as ActiveTab)}
          className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all duration-300 ${
            activeTab === tab.id ? 'text-white scale-110' : 'text-white/30'
          }`}
        >
          {tab.icon}
          <span className={`max-w-full truncate text-[8px] min-[360px]:text-[9px] font-bold uppercase tracking-wide ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
            {tab.label}
          </span>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 h-0.5 w-5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
          )}
        </button>
      ))}
      </div>
    </nav>
  );
};

export default BottomNav;
