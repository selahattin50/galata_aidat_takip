
import React, { useState, useMemo } from 'react';
import { Inbox, ChevronDown, ArrowLeft, CalendarDays } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-0 pb-4 relative">
      <div className="sticky top-0 z-[60] -mx-4 px-4 pt-4 pb-4 bg-[#030712]/95 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-4 relative">
          <button onClick={onClose} className="bg-white/5 p-2 rounded-xl border border-white/5 active:scale-90 transition-all">
            <ArrowLeft size={20} strokeWidth={3} className="text-zinc-400" />
          </button>

          <div className="flex items-center space-x-2">
            <CalendarDays size={20} className="text-blue-400" />
            <h3 className="text-[17px] font-black uppercase tracking-[0.1em] text-white">AİDAT ÇİZELGESİ</h3>
          </div>

          <div className="relative">
            <button onClick={() => setIsYearPickerOpen(!isYearPickerOpen)} className="h-9 bg-white/5 rounded-xl px-3 flex items-center border border-white/5">
              <span className="text-white font-black text-xs tracking-widest">{selectedYear}</span>
              <ChevronDown size={14} className={`ml-2 text-white/40 transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} />
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

      <div className="px-2 mt-4 space-y-2">
        {units.sort((a, b) => parseInt(a.no) - parseInt(b.no)).map((unit) => (
          <div key={unit.id} className="bg-[#111827]/60 backdrop-blur-md rounded-[20px] p-3 border border-white/5 shadow-xl flex flex-col">
            <div className="flex items-baseline justify-between mb-2">
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
