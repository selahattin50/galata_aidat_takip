
import React from 'react';
import { Database, Shield, Power, Mail } from 'lucide-react';
import { BuildingInfo } from '../types.ts';
import logo from '../src/assets/logo.png';

interface HeaderProps {
  info: BuildingInfo;
  onLogout: () => void;
  onMessagesClick: () => void;
  unreadCount?: number;
}

// Android JavaScript Interface tanımı
declare global {
  interface Window {
    AndroidExit?: {
      forceExit: () => void;
    };
  }
}

const Header: React.FC<HeaderProps> = ({ info, onLogout, onMessagesClick, unreadCount = 0 }) => {
  const handleExit = () => {
    console.log('Exit button clicked');
    // Logout yap - giriş ekranına dön
    onLogout();
  };

  return (
    <div className="sticky top-0 z-[100] -mx-4 px-6 pt-10 pb-4 flex flex-col items-center relative animate-in fade-in duration-700 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium text-white uppercase tracking-[0.2em] leading-none mb-1">
          {info.name || 'GALATA APARTMANI'}
        </h1>
        <h2 className="text-[10px] font-medium text-blue-400 uppercase tracking-[0.1em] leading-none mt-[8px] opacity-60">
          {info.managerName || 'YÖNETİCİ TANIMSIZ'}
        </h2>
      </div>

      <button
        onClick={handleExit}
        className="absolute left-[34px] top-8 p-3 text-red-500 hover:text-red-400 active:scale-90 transition-all rounded-full group"
        title="Uygulamadan Çık"
      >
        <Power size={22} strokeWidth={2.5} className="transition-colors drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]" />
      </button>

      <button
        onClick={onMessagesClick}
        className="absolute right-[25px] top-8 text-emerald-400 hover:text-emerald-300 active:scale-90 transition-all p-3"
      >
        <Mail size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-pulse border border-[#030712]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default Header;
