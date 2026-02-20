
import React from 'react';
import { Database, Shield, Power } from 'lucide-react';
import { BuildingInfo } from '../types.ts';

interface HeaderProps {
  info: BuildingInfo;
  onLogout: () => void;
}

// Android JavaScript Interface tanımı
declare global {
  interface Window {
    AndroidExit?: {
      forceExit: () => void;
    };
  }
}

const Header: React.FC<HeaderProps> = ({ info, onLogout }) => {
  const handleExit = () => {
    console.log('Exit button clicked');
    // Logout yap - giriş ekranına dön
    onLogout();
  };

  return (
    <div className="sticky top-0 z-[100] -mx-4 px-6 pt-8 pb-1 flex flex-col items-center relative animate-in fade-in duration-700 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">

      <div className="flex flex-col items-center mt-2">
        <h1 className="text-lg font-black text-white uppercase tracking-wider leading-none mb-1">
          {info.name || 'GALATA APARTMANI'}
        </h1>
        <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest leading-none mt-[10px]">
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
    </div>
  );
};

export default Header;
