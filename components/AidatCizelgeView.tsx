
import React, { useState, useMemo } from 'react';
import { Inbox, ChevronDown, ArrowLeft, CalendarDays } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';
import { useScrollReveal } from './useScrollReveal';

interface AidatCizelgeViewProps {
  units: Unit[];
  transactions: Transaction[];
  info: BuildingInfo;
  onClose: () => void;
  onAddDues: (unitId: string, amount: number, month: number, year: number) => void;
  currentDate: Date;
}

const AidatCizelgeView: React.FC<AidatCizelgeViewProps> = ({ units, transactions, info, onClose, onAddDues, currentDate }) => {
  const now = currentDate;
  const currentMonthActual = now.getMonth() + 1; // 1-12
  const currentYearActual = now.getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYearActual);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const unitReveal = useScrollReveal<HTMLDivElement>();

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2024, 2025, 2026];

  const getMonthStatus = (unit: Unit, month: number): 'paid' | 'unpaid' | 'future' | 'exempt' | 'none' => {
    if (selectedYear > currentYearActual || (selectedYear === currentYearActual && month > currentMonthActual)) {
      return 'future';
    }

    if (unit.id === info.managerUnitId && info.isManagerExempt) {
      return 'exempt';
    }

    const duesValue = info.duesAmount ?? 0;
    const currentYear = currentDate.getFullYear();

    for (let m = 1; m <= 12; m++) {
      const mIdx = m - 1;

      // O aya özel ödeme var mı?
      const hasSpecificPayment = transactions.some(tx =>
        tx.unitId === unit.id &&
        tx.type === 'GELİR' &&
        tx.periodMonth === mIdx &&
        tx.periodYear === currentYear
      );

      if (hasSpecificPayment) {
        if (m === month) return 'paid';
        continue;
      }

      if (m === month) {
        return 'unpaid';
      }
    }

    return 'none';
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden pt-0 touch-pan-y">
      <div className="z-30 flex-shrink-0 px-4 pt-4 pb-2 bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] border-b border-white/5 shadow-[0_14px_24px_rgba(15,23,42,0.55)]">
        <div className="relative mb-4 flex h-10 items-center justify-center">
          <button onClick={onClose} className="app-back-button absolute left-0">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>

          <div className="absolute left-1/2 flex max-w-[calc(100%-120px)] -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap">
            <CalendarDays size={20} className="text-blue-400" />
            <h3 className="text-[17px] font-black uppercase tracking-[0.1em] text-white">AİDAT ÇİZELGESİ</h3>
          </div>

          <div className="absolute right-0">
            <button onClick={() => setIsYearPickerOpen(!isYearPickerOpen)} className="h-9 w-auto bg-white/5 rounded-xl px-2.5 flex items-center border border-white/5">
              <span className="text-white font-black text-[17px] leading-none tracking-[0.1em]">{selectedYear}</span>
              <ChevronDown size={14} className={`ml-1.5 text-white/40 transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {isYearPickerOpen && (
              <div className="absolute top-full right-0 mt-2 w-28 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden">
                {years.map(y => (
                  <button key={y} onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); }} className={`w-full py-4 text-xs font-black text-center border-b border-white/5 last:border-0 hover:bg-white/5 ${selectedYear === y ? 'text-green-400 bg-white/5' : 'text-white/40'}`}>{y}</button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-4 space-y-1.5 no-scrollbar touch-pan-y">
        {units.sort((a, b) => parseInt(a.no) - parseInt(b.no)).map((unit, index) => (
          <div 
            key={unit.id} 
            ref={unitReveal.observe(unit.id)}
            className={`w-full max-w-full bg-[#1e293b]/50 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-xl flex flex-col scroll-reveal-from-top-right relative overflow-hidden ${unitReveal.isVisible(unit.id) ? 'is-visible' : ''}`}
            style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
          >
            {/* Sol ve Sağ Mavi Çizgiler */}
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-40" />
            <div className="absolute top-0 right-0 w-1 h-full bg-blue-600 opacity-40" />
            
            <div className="flex items-baseline justify-between mb-2 relative z-10">
              <div className="flex items-baseline space-x-4 min-w-0">
                <span className="text-xl font-black text-white/90 leading-none">{unit.no}</span>
                <div className="min-w-0 flex items-center space-x-2">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-widest truncate">
                    {unit.tenantName || unit.ownerName}
                  </span>
                  {unit.tenantName && <span className="text-[7px] font-black text-orange-500/60 uppercase tracking-[0.2em] leading-none flex-shrink-0"> KİRACI</span>}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/30 w-full mb-3" />

            <div className="grid grid-cols-12 gap-0.5 w-full">
              {months.map((m) => {
                const status = getMonthStatus(unit, m);
                let bgColor = 'bg-[#1e293b] border-white/5';
                let textColor = 'text-white/20';

                if (status === 'paid') {
                  bgColor = 'bg-[#22c55e] border-[#22c55e]/20';
                  textColor = 'text-white';
                } else if (status === 'unpaid') {
                  bgColor = 'bg-[#ef4444] border-[#ef4444]/20';
                  textColor = 'text-white';
                } else if (status === 'exempt') {
                  bgColor = 'bg-blue-600/40 border-blue-400/20';
                  textColor = 'text-white';
                }

                return (
                  <div key={m} className={`h-5 rounded-[4px] flex items-center justify-center border transition-all duration-300 ${bgColor} shadow-inner`}>
                    <span className={`text-[8px] font-black leading-none ${textColor}`}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AidatCizelgeView;
