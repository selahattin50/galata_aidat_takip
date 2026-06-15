import React from 'react';
import {
  HandCoins, UserPlus, RotateCcw, TrendingUp, TrendingDown,
  ArrowLeftRight, Building2, History, UserCheck, CalendarDays, BarChart3, ChevronRight
} from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  tone: string;
  iconClass: string;
}

interface ActionGridProps {
  variant?: 'grid' | 'list';
  onActionClick?: (label: string) => void;
}

const ActionGrid: React.FC<ActionGridProps> = ({ variant = 'grid', onActionClick }) => {
  const iconSize = 24;
  const actions: ActionItem[] = [
    { icon: <HandCoins size={iconSize} />, label: "Tahsilat", tone: "bg-green-500/10 border-green-500/45 text-green-500", iconClass: "text-green-500" },
    { icon: <UserPlus size={iconSize} />, label: "Borçlandır", tone: "bg-blue-500/10 border-blue-400/45 text-blue-300", iconClass: "text-blue-300" },
    { icon: <RotateCcw size={iconSize} />, label: "İade", tone: "bg-rose-500/10 border-rose-400/45 text-rose-300", iconClass: "text-rose-300" },
    { icon: <TrendingUp size={iconSize} />, label: "Gelir", tone: "bg-green-500/10 border-green-500/45 text-green-500", iconClass: "text-green-500" },
    { icon: <TrendingDown size={iconSize} />, label: "Gider", tone: "bg-orange-500/10 border-orange-400/45 text-orange-300", iconClass: "text-orange-300" },
    { icon: <ArrowLeftRight size={iconSize} />, label: "Transfer", tone: "bg-purple-500/10 border-purple-400/45 text-purple-300", iconClass: "text-purple-300" },
    { icon: <Building2 size={iconSize} />, label: "Daireler", tone: "bg-cyan-500/10 border-cyan-400/45 text-cyan-300", iconClass: "text-cyan-300" },
    { icon: <History size={iconSize} />, label: "İşlem Hareketleri", tone: "bg-slate-400/10 border-slate-300/35 text-slate-300", iconClass: "text-slate-300" },
    { icon: <UserCheck size={iconSize} />, label: "Alacak Listesi", tone: "bg-amber-500/10 border-amber-400/45 text-amber-300", iconClass: "text-amber-300" },
    { icon: <CalendarDays size={iconSize} />, label: "AİDAT ÇİZELGE", tone: "bg-indigo-500/10 border-indigo-400/45 text-indigo-300", iconClass: "text-indigo-300" },
    { icon: <BarChart3 size={iconSize} />, label: "AYLIK BİLANÇO", tone: "bg-violet-500/10 border-violet-400/45 text-violet-300", iconClass: "text-violet-300" },
    { icon: <TrendingUp size={iconSize} />, label: "YILLIK BİLANÇO", tone: "bg-fuchsia-500/10 border-fuchsia-400/45 text-fuchsia-300", iconClass: "text-fuchsia-300" },
  ];

  if (variant === 'grid') {
    return (
      <div className="grid h-full min-h-0 grid-cols-3 content-center gap-2 min-[390px]:gap-2.5 md:grid-cols-4 lg:grid-cols-6">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onActionClick?.(action.label)}
            className={`embossed-cash flex min-h-[64px] flex-col items-center justify-center backdrop-blur-md rounded-[18px] p-1.5 h-[clamp(64px,10.2dvh,92px)] border shadow-lg active:scale-90 transition-all duration-300 group relative overflow-hidden ${action.tone}`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />
            <div className="mb-0.5 min-[380px]:mb-1 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              {React.cloneElement(action.icon as React.ReactElement, {
                className: action.iconClass
              })}
            </div>
            <span className="text-[9px] min-[360px]:text-[10px] min-[420px]:text-[11px] font-bold uppercase tracking-tight text-current text-center leading-[1.12]">
              {action.label.includes(' ') && action.label.length > 10
                ? action.label.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br /></React.Fragment>)
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
          className={`embossed-cash flex items-center backdrop-blur-lg rounded-xl p-3 w-full border shadow-md active:scale-[0.97] transition-all group ${action.tone}`}
        >
          <div className="p-2 rounded-lg mr-3 bg-white/10 group-hover:bg-white/20 transition-all shadow-inner">
            {React.cloneElement(action.icon as React.ReactElement, {
              className: action.iconClass
            })}
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-wider text-current">
            {action.label}
          </span>
          <ChevronRight size={18} className="ml-auto opacity-50 group-hover:opacity-100 transition-all text-current group-hover:translate-x-1" />
        </button>
      ))}
    </div>
  );
};

export default ActionGrid;
