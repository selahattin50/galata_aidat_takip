
import React from 'react';
import {
  HandCoins, UserPlus, RotateCcw, TrendingUp, TrendingDown,
  ArrowLeftRight, Building2, History, UserCheck, ChevronRight
} from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
}

interface ActionGridProps {
  variant?: 'grid' | 'list';
  onActionClick?: (label: string) => void;
}

const ActionGrid: React.FC<ActionGridProps> = ({ variant = 'grid', onActionClick }) => {
  const iconSize = variant === 'grid' ? 28 : 22;
  const actions: ActionItem[] = [
    { icon: <HandCoins size={iconSize} />, label: "Tahsilat" },
    { icon: <UserPlus size={iconSize} />, label: "Borçlandır" },
    { icon: <RotateCcw size={iconSize} />, label: "İade" },
    { icon: <TrendingUp size={iconSize} />, label: "Gelir" },
    { icon: <TrendingDown size={iconSize} />, label: "Gider" },
    { icon: <ArrowLeftRight size={iconSize} />, label: "Transfer" },
    { icon: <Building2 size={iconSize} />, label: "Bağımsız Bölümler" },
    { icon: <History size={iconSize} />, label: "İşlem Hareketleri" },
    { icon: <UserCheck size={iconSize} />, label: "Alacak Listesi" },
  ];

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-3 gap-2 pb-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onActionClick?.(action.label)}
            className="flex flex-col items-center justify-center glass-panel rounded-[24px] p-3 h-[88px] active:bg-green-600/20 active:border-green-500/30 active:scale-95 transition-all border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group"
          >
            <div className="text-[#22c55e] group-hover:text-green-400 group-hover:scale-110 transition-all duration-300 mb-2">
              {action.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80 text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 pb-4">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onActionClick?.(action.label)}
          className="flex items-center glass-panel rounded-2xl p-4 w-full active:bg-green-600/10 active:scale-[0.98] transition-all hover:bg-white/5 border border-white/5 shadow-lg group"
        >
          <div className="bg-green-500/10 p-2.5 rounded-xl mr-4 text-[#22c55e] group-hover:bg-green-500/20 transition-all">
            {action.icon}
          </div>
          <span className="text-[14px] font-medium uppercase tracking-[0.1em] text-white/80">
            {action.label}
          </span>
          <ChevronRight size={18} className="ml-auto opacity-20 group-hover:opacity-100 transition-all text-green-500" />
        </button>
      ))}
    </div>
  );
};

export default ActionGrid;
