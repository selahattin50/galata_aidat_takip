
import React, { useState, useMemo } from 'react';
import { Inbox, ChevronDown, ArrowLeft, TrendingUp, AlertCircle, CalendarDays } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';

interface AidatCizelgeViewProps {
  units: Unit[];
  transactions: Transaction[];
  info: BuildingInfo;
  onClose: () => void;
  onAddDues: (unitId: string, amount: number, month: number, year: number) => void;
}

const AidatCizelgeView: React.FC<AidatCizelgeViewProps> = ({ units, transactions, info, onClose, onAddDues }) => {
  const now = new Date();
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

    const totalIncome = transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'GELİR')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalManualDebt = transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    let runningCredit = totalIncome - totalManualDebt;
    const duesValue = info.duesAmount || 750;

    for (let m = 1; m <= 12; m++) {
      const mIdx = m - 1;
      
      const hasManualForThisMonth = transactions.some(tx => 
        tx.unitId === unit.id && 
        tx.type === 'BORÇLANDIRMA' && 
        tx.periodMonth === mIdx && 
        tx.periodYear === selectedYear
      );
      
      let isPaidThisMonth = false;
      if (!hasManualForThisMonth) {
        if (runningCredit >= duesValue) {
          runningCredit -= duesValue;
          isPaidThisMonth = true;
        }
      }

      if (m === month) {
        return isPaidThisMonth ? 'paid' : 'unpaid';
      }
    }

    return 'none';
  };

  const stats = useMemo(() => {
    const actualCollection = transactions.reduce((sum, tx) => {
      if (tx.type === 'GELİR' && tx.periodYear === selectedYear) return sum + tx.amount;
      return sum;
    }, 0);

    const totalPending = units.reduce((sum, u) => sum + u.debt, 0);

    return { collected: actualCollection, pending: totalPending };
  }, [units, transactions, selectedYear]);

  const formatCurrency = (val: number) => {
    return "₺" + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(val);
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

        <div className="grid grid-cols-2 gap-3 px-1">
          <div className="bg-[#0f172a] border border-green-500/20 rounded-[24px] p-3 flex flex-col items-center justify-center text-center shadow-lg">
             <div className="flex items-center space-x-1.5 mb-1">
               <TrendingUp size={12} className="text-green-500" />
               <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.15em]">GERÇEK TAHSİLAT</span>
             </div>
             <p className="text-lg font-black text-white tracking-tight leading-none">{formatCurrency(stats.collected)}</p>
          </div>
          
          <div className="bg-[#0f172a] border border-red-500/20 rounded-[24px] p-3 flex flex-col items-center justify-center text-center shadow-lg">
             <div className="flex items-center space-x-1.5 mb-1">
               <AlertCircle size={12} className="text-red-500" />
               <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.15em]">TOPLAM ALACAK</span>
             </div>
             <p className="text-lg font-black text-red-500 tracking-tight leading-none">{formatCurrency(stats.pending)}</p>
          </div>
        </div>
      </div>

      <div className="px-2 mt-4 space-y-2">
        {units.sort((a,b) => parseInt(a.no) - parseInt(b.no)).map((unit) => (
          <div key={unit.id} className="bg-[#111827]/60 backdrop-blur-md rounded-[20px] p-4 border border-white/5 shadow-xl flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline space-x-4 min-w-0">
                <span className="text-xl font-black text-white/90 leading-none">{unit.no}</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-widest truncate block">
                    {unit.tenantName || unit.ownerName}
                  </span>
                  {unit.tenantName && <span className="text-[7px] font-black text-orange-500/60 uppercase tracking-[0.2em] leading-none">KİRACI</span>}
                </div>
              </div>
              <div className="flex flex-col items-end">
                {unit.credit > 0 && <span className="text-[8px] font-black text-blue-400 uppercase">KREDİ: {formatCurrency(unit.credit)}</span>}
                {unit.debt > 0 && <span className="text-[8px] font-black text-red-500 uppercase">BORÇ: {formatCurrency(unit.debt)}</span>}
              </div>
            </div>

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
