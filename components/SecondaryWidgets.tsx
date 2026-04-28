
import React from 'react';
import { CalendarDays, BarChart3, TrendingUp } from 'lucide-react';

interface SecondaryWidgetsProps {
  onActionClick?: (action: string) => void;
}

const SecondaryWidgets: React.FC<SecondaryWidgetsProps> = ({ onActionClick }) => {
  const iconSize = 28;
  
  return (
    <div className="grid grid-cols-3 gap-3 pb-4">
      {/* Aidat Çizelge */}
      <button 
        onClick={() => onActionClick?.('AİDAT ÇİZELGE')}
        className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/20 to-blue-500/20 backdrop-blur-md rounded-[28px] p-3 h-[90px] border border-white/10 shadow-xl active:scale-90 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
        <div className="text-[#22c55e] group-hover:scale-110 transition-transform duration-300 mb-1 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
          <CalendarDays size={iconSize} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 text-center leading-tight">
          AİDAT<br/>ÇİZELGE
        </span>
      </button>

      {/* Aylık Bilanço */}
      <button 
        onClick={() => onActionClick?.('AYLIK BİLANÇO')}
        className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-md rounded-[28px] p-3 h-[90px] border border-white/10 shadow-xl active:scale-90 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
        <div className="text-[#22c55e] group-hover:scale-110 transition-transform duration-300 mb-1 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
          <BarChart3 size={iconSize} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 text-center leading-tight">
          AYLIK<br/>BLANCO
        </span>
      </button>

      {/* Yıllık Bilanço */}
      <button 
        onClick={() => onActionClick?.('YILLIK BİLANÇO')}
        className="flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 backdrop-blur-md rounded-[28px] p-3 h-[90px] border border-white/10 shadow-xl active:scale-90 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
        <div className="text-[#22c55e] group-hover:scale-110 transition-transform duration-300 mb-1 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
          <TrendingUp size={iconSize} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 text-center leading-tight">
          YILLIK<br/>BLANCO
        </span>
      </button>
    </div>
  );
};

export default SecondaryWidgets;
