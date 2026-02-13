
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
      
      <div className="absolute top-2 left-4 flex items-center space-x-1 opacity-20">
        <Database size={8} />
        <span className="text-[7px] font-black uppercase tracking-widest text-white">DB: GALATA_V16_LOCAL</span>
      </div>

      <div className="flex flex-col items-center mt-2">
        <div className="flex items-center space-x-2 mb-1">
          <Shield size={10} className="text-blue-500/50" />
          <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">SİSTEM YÖNETİCİSİ</span>
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
          {info.managerName || 'YÖNETİCİ TANIMSIZ'}
        </h2>
      </div>

      <button 
        onClick={handleExit}
        className="absolute left-6 top-8 p-3 text-red-500 hover:text-red-400 active:scale-90 transition-all rounded-full group"
        title="Uygulamadan Çık"
      >
        <Power size={22} strokeWidth={2.5} className="transition-colors drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]" />
      </button>
    </div>
  );
};

export default Header;
