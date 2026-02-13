
import React from 'react';
import { CalendarDays, BarChart3, TrendingUp } from 'lucide-react';

interface SecondaryWidgetsProps {
  onActionClick?: (action: string) => void;
}

const SecondaryWidgets: React.FC<SecondaryWidgetsProps> = ({ onActionClick }) => {
  const iconSize = 28;
  
  return (
    <div className="grid grid-cols-3 gap-2.5 px-0.5">
      {/* Aidat Çizelge */}
      <button 
        onClick={() => onActionClick?.('AİDAT ÇİZELGE')}
        className="glass-panel rounded-[24px] p-2 flex flex-col items-center justify-center h-20 active:bg-blue-600/20 active:border-blue-500/30 active:scale-95 transition-transform group border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      >
        <div className="text-[#22c55e] group-hover:text-green-400 group-hover:scale-110 transition-all duration-300 mb-1">
          <CalendarDays size={iconSize} />
        </div>
        <span className="text-[9px] font-black uppercase text-white/80 tracking-widest leading-none text-center">
          AİDAT<br/>ÇİZELGE
        </span>
      </button>

      {/* Aylık Bilanço */}
      <button 
        onClick={() => onActionClick?.('AYLIK BİLANÇO')}
        className="glass-panel rounded-[24px] p-2 flex flex-col items-center justify-center h-20 active:bg-blue-600/20 active:border-blue-500/30 active:scale-95 transition-transform group border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      >
        <div className="text-[#22c55e] group-hover:text-green-400 group-hover:scale-110 transition-all duration-300 mb-1">
          <BarChart3 size={iconSize} />
        </div>
        <span className="text-[9px] font-black uppercase text-white/80 tracking-widest leading-none text-center">
          AYLIK<br/>BİLANÇO
        </span>
      </button>

      {/* Yıllık Bilanço */}
      <button 
        onClick={() => onActionClick?.('YILLIK BİLANÇO')}
        className="glass-panel rounded-[24px] p-2 flex flex-col items-center justify-center h-20 active:bg-blue-600/20 active:border-blue-500/30 active:scale-95 transition-transform group border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      >
        <div className="text-[#22c55e] group-hover:text-green-400 group-hover:scale-110 transition-all duration-300 mb-1">
          <TrendingUp size={iconSize} />
        </div>
        <span className="text-[9px] font-black uppercase text-white/80 tracking-widest leading-none text-center">
          YILLIK<br/>BİLANÇO
        </span>
      </button>
    </div>
  );
};

export default SecondaryWidgets;
