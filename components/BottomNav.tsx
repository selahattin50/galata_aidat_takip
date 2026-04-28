
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
    <nav className="fixed bottom-0 left-0 right-0 w-full flex justify-between items-center px-6 py-4 pb-8 safe-area-bottom z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as ActiveTab)}
          className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${
            activeTab === tab.id ? 'text-white scale-110' : 'text-white/30'
          }`}
        >
          {tab.icon}
          <span className={`text-[9px] font-bold uppercase tracking-wider ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
            {tab.label}
          </span>
          {activeTab === tab.id && (
            <div className="w-5 h-0.5 bg-white rounded-full absolute -bottom-1 shadow-[0_0_8px_white]"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
