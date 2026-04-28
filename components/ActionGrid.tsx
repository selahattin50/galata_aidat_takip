
import React from 'react';
import {
  HandCoins, UserPlus, RotateCcw, TrendingUp, TrendingDown,
  ArrowLeftRight, Building2, History, UserCheck, CalendarDays, BarChart3, ChevronRight
} from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  color: string;
}

interface ActionGridProps {
  variant?: 'grid' | 'list';
  onActionClick?: (label: string) => void;
}

const ActionGrid: React.FC<ActionGridProps> = ({ variant = 'grid', onActionClick }) => {
  const iconSize = 24; // Biraz daha kompakt ikonlar
  const actions: ActionItem[] = [
    { icon: <HandCoins size={iconSize} />, label: "Tahsilat", color: "from-emerald-500/12 to-teal-500/12" },
    { icon: <UserPlus size={iconSize} />, label: "Borçlandır", color: "from-blue-500/12 to-indigo-500/12" },
    { icon: <RotateCcw size={iconSize} />, label: "İade", color: "from-rose-500/12 to-pink-500/12" },
    { icon: <TrendingUp size={iconSize} />, label: "Gelir", color: "from-green-500/12 to-emerald-500/12" },
    { icon: <TrendingDown size={iconSize} />, label: "Gider", color: "from-orange-500/12 to-amber-500/12" },
    { icon: <ArrowLeftRight size={iconSize} />, label: "Transfer", color: "from-purple-500/12 to-fuchsia-500/12" },
    { icon: <Building2 size={iconSize} />, label: "Bağımsız Bölümler", color: "from-cyan-500/12 to-blue-500/12" },
    { icon: <History size={iconSize} />, label: "İşlem Hareketleri", color: "from-slate-500/12 to-gray-500/12" },
    { icon: <UserCheck size={iconSize} />, label: "Alacak Listesi", color: "from-amber-500/12 to-yellow-500/12" },
    { icon: <CalendarDays size={iconSize} />, label: "AİDAT ÇİZELGE", color: "from-indigo-500/12 to-blue-500/12" },
    { icon: <BarChart3 size={iconSize} />, label: "AYLIK BİLANÇO", color: "from-violet-500/12 to-purple-500/12" },
    { icon: <TrendingUp size={iconSize} />, label: "YILLIK BİLANÇO", color: "from-fuchsia-500/12 to-pink-500/12" },
  ];

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pb-1">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onActionClick?.(action.label)}
            className={`flex flex-col items-center justify-center bg-white/[0.03] backdrop-blur-md rounded-[20px] p-1.5 h-[82px] border border-white/10 shadow-lg active:scale-90 transition-all duration-300 group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
            <div className={`mb-1 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
              {React.cloneElement(action.icon as React.ReactElement, { 
                className: action.color.split(' ')[0].replace('from-', 'text-').replace('/12', '')
              })}
            </div>
            <span className="text-[10px] min-[360px]:text-[11px] font-bold uppercase tracking-tight text-white/90 text-center leading-[1.2]">
              {action.label.includes(' ') && action.label.length > 10 
                ? action.label.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)
                : action.label
              }
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
          className={`flex items-center bg-white/[0.03] backdrop-blur-lg rounded-xl p-3 w-full border border-white/10 shadow-md active:scale-[0.97] transition-all group`}
        >
          <div className={`p-2 rounded-lg mr-3 bg-white/10 group-hover:bg-white/20 transition-all shadow-inner`}>
            {React.cloneElement(action.icon as React.ReactElement, { 
              className: action.color.split(' ')[0].replace('from-', 'text-').replace('/12', '')
            })}
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-wider text-white/90">
            {action.label}
          </span>
          <ChevronRight size={18} className="ml-auto opacity-40 group-hover:opacity-100 transition-all text-[#22c55e] group-hover:translate-x-1" />
        </button>
      ))}
    </div>
  );
};

export default ActionGrid;
