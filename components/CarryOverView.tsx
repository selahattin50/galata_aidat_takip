
import React, { useState } from 'react';
import { X, Check, ArrowRight, Wallet, History, Loader2 } from 'lucide-react';
import { Unit, Transaction } from '../types.ts';
import DatePickerModal from './DatePickerModal';
import { appConfirm } from './AppDialog';

interface CarryOverViewProps {
  units: (Unit & { credit: number; debt: number })[];
  onCarryOver: (transactions: Transaction[]) => void;
  onClose: () => void;
}

const CarryOverView: React.FC<CarryOverViewProps> = ({ units, onCarryOver, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleProcess = async () => {
    if (!(await appConfirm('Seçili tarih itibariyle tüm bakiyeler yeni döneme "DEVİR" olarak aktarılacaktır. Onaylıyor musunuz?'))) return;

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1500)); // Simüle edilen işlem süresi

    const dateParts = selectedDate.split('-');
    const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
    const periodMonth = parseInt(dateParts[1]) - 1;
    const periodYear = parseInt(dateParts[0]);

    const carryTransactions: Transaction[] = [];

    units.forEach(unit => {
      const balance = (unit.credit || 0) - (unit.debt || 0);
      
      if (balance > 0) {
        // Alacaklı devir (GELİR/Ön Ödeme olarak geçer)
        carryTransactions.push({
          id: Math.random().toString(36).slice(2),
          type: 'GELİR',
          amount: balance,
          description: 'GEÇMİŞ DÖNEMDEN DEVİR ALACAK [genel]',
          unitId: unit.id,
          date: formattedDate,
          periodMonth,
          periodYear
        });
      } else if (balance < 0) {
        // Borçlu devir (BORÇLANDIRMA olarak geçer)
        carryTransactions.push({
          id: Math.random().toString(36).slice(2),
          type: 'BORÇLANDIRMA',
          amount: Math.abs(balance),
          description: 'GEÇMİŞ DÖNEMDEN DEVİR BORÇ [genel]',
          unitId: unit.id,
          date: formattedDate,
          periodMonth, periodYear
        });
      }
    });

    onCarryOver(carryTransactions);
    setIsProcessing(false);
    onClose();
    alert(`${carryTransactions.length} adet devir kaydı oluşturuldu.`);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-md rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <History className="text-emerald-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">BAKİYE DEVRİ</h3>
              <p className="text-[9px] font-bold text-emerald-500/60 uppercase">Yeni Dönem Açılışı</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white p-2 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 no-scrollbar">
          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-4">
            <p className="text-[10px] font-bold text-blue-300 leading-relaxed uppercase">
              Bu işlem, dairelerin şu anki net bakiyesini (Alacak - Borç) hesaplar ve seçtiğiniz tarihte yeni bir işlem olarak kaydeder.
            </p>
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase ml-2">Devir Tarihi (Açılış Tarihi)</label>
            <DatePickerModal value={selectedDate} onChange={setSelectedDate} className="bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-white font-bold" />
          </div>

          {/* Units Summary */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-white/30 uppercase ml-2">Devredilecek Bakiyeler ({units.length} Daire)</label>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
              {units.map(u => {
                const bal = (u.credit || 0) - (u.debt || 0);
                if (bal === 0) return null;
                return (
                  <div key={u.id} className="bg-white/5 rounded-2xl p-3 flex items-center justify-between border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white">{u.no}. Daire</span>
                      <span className="text-[9px] font-bold text-white/30 truncate max-w-[120px] uppercase">{u.ownerName}</span>
                    </div>
                    <div className={`text-xs font-black ${bal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bal > 0 ? '+' : ''}{bal.toLocaleString('tr-TR')} ₺
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="font-black text-xs tracking-[0.2em] uppercase">İŞLEMİ BAŞLAT VE DEVRET</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarryOverView;
