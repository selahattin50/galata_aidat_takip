
import React, { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, Save, Home, Loader2, User, UserCheck, Calendar } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';

interface TahsilatViewProps {
  units: Unit[];
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onSave: (amount: number, description: string, vault: 'genel' | 'demirbas', date: string, unitId: string, month: number, year: number) => void;
}

const TahsilatView: React.FC<TahsilatViewProps> = ({ units, info, transactions, onClose, onSave }) => {
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearActual = now.getFullYear();

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(now.toISOString().split('T')[0]);
  const [selectedPayerType, setSelectedPayerType] = useState<'Malik' | 'Kiracı'>('Kiracı');
  const [paymentMethod, setPaymentMethod] = useState<'EFT/Havale' | 'Elden Ödeme' | 'Kredi Bakiyesinden'>('EFT/Havale');
  const [showPaymentMethodList, setShowPaymentMethodList] = useState(false);
  const [showUnitGrid, setShowUnitGrid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId), [units, selectedUnitId]);
  
  const selectableUnits = useMemo(() => 
    units.filter(u => !(info.isManagerExempt && u.id === info.managerUnitId))
         .sort((a, b) => parseInt(a.no) - parseInt(b.no)),
    [units, info]
  );

  const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(val);
  };

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnitId(unit.id);
    setShowUnitGrid(false);
    setAmount('');
    if (unit.tenantName && unit.tenantName.trim() !== '') {
      setSelectedPayerType('Kiracı');
    } else {
      setSelectedPayerType('Malik');
    }
  };

  const handleProcess = async (debtItem?: any) => {
    let finalAmount = debtItem ? debtItem.amount : parseFloat(amount);
    const dateObj = new Date(selectedDate);
    let finalMonth = debtItem ? debtItem.month : dateObj.getMonth();
    let finalYear = debtItem ? debtItem.year : dateObj.getFullYear();
    const payerLabel = selectedPayerType === 'Kiracı' ? 'KİRACI' : 'MALİK';
    
    if (!selectedUnitId || isNaN(finalAmount) || finalAmount <= 0) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const description = debtItem 
      ? `${months[debtItem.month]} AYI AİDAT` 
      : `TAHSİLAT`;

    onSave(finalAmount, description, 'genel', selectedDate, selectedUnitId, finalMonth, finalYear);
    setIsSaving(false);
    setIsSuccess(true);
  };

  const getPendingDebts = (unit: Unit) => {
    const pendingList = [];
    const duesValue = info.duesAmount || 750;
    for (let i = 0; i < 12; i++) {
        const hasPayment = transactions.some(tx => 
            tx.unitId === unit.id && tx.type === 'GELİR' && tx.periodMonth === i && tx.periodYear === currentYearActual
        );
        if (!hasPayment) {
            if (i <= currentMonthIdx && !(unit.id === info.managerUnitId && info.isManagerExempt)) {
                pendingList.push({ 
                  month: i, 
                  year: currentYearActual, 
                  amount: duesValue, 
                  title: `${months[i]} ${currentYearActual} AİDAT BORCU`, 
                  id: Math.random().toString() 
                });
            }
        }
    }
    return pendingList;
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[400] bg-[#030712] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h3 className="text-xl font-black text-white uppercase tracking-widest">İŞLEM TAMAMLANDI</h3>
        <p className="text-white/40 text-xs mt-2 uppercase font-bold">Ödeme başarıyla kaydedildi.</p>
        <button onClick={onClose} className="mt-8 px-10 py-4 bg-blue-600 rounded-2xl font-black text-white active:scale-95 transition-all">GERİ DÖN</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#030712] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-[#030712]/90 backdrop-blur-xl shrink-0 shadow-xl">
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
           <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-white">BORÇ TAHSİLAT</h3>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <section>
          <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-2 block ml-1">1. DAİRE SEÇİMİ</label>
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all bg-[#111827]">
            <button onClick={() => setShowUnitGrid(!showUnitGrid)} className="w-full min-h-[64px] py-2 flex items-center justify-between px-4 active:scale-[0.98] transition-all">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-xl shrink-0">
                  <Home size={20} className="text-green-500" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className={`text-[13px] font-black uppercase tracking-[0.1em] leading-none truncate ${selectedUnit ? 'text-white' : 'text-blue-500'}`}>
                    {selectedUnit ? (selectedUnit.tenantName || selectedUnit.ownerName || '').toUpperCase() : 'DAİRE SEÇİNİZ...'}
                  </span>
                </div>
              </div>
              <ChevronDown size={18} className={`text-zinc-500 transition-transform duration-300 ${showUnitGrid ? 'rotate-180' : ''}`} />
            </button>
            {showUnitGrid && (
              <div className="flex flex-col space-y-1 p-1 bg-[#0b101b] max-h-[300px] overflow-y-auto no-scrollbar border-t border-white/10">
                {selectableUnits.map((unit) => {
                  const bakiye = (unit.credit - unit.debt);
                  return (
                    <button key={unit.id} onClick={() => handleUnitSelect(unit)} className={`w-full py-3.5 px-4 flex items-center transition-all ${selectedUnitId === unit.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 mr-4">
                        {unit.no}
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-[14px] font-black text-white uppercase tracking-tight truncate leading-tight">
                          {unit.tenantName || unit.ownerName || `${unit.no}. DAİRE`}
                        </span>
                        <div className="flex items-center space-x-1 mt-0.5 opacity-40">
                          <span className="text-[9px] font-black uppercase tracking-widest">BAKİYE:</span>
                          <span className={`text-[9px] font-black ${bakiye < 0 ? 'text-red-500' : 'text-green-500'}`}>₺{formatCurrency(bakiye)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {selectedUnit && selectedUnit.tenantName && selectedUnit.tenantName.trim() !== '' && (
          <section className="animate-in fade-in zoom-in-95 duration-300">
            <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">2. ÖDEMEYİ YAPAN</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedPayerType('Kiracı')} 
                className={`flex items-center justify-center space-x-2 h-12 rounded-xl border transition-all ${selectedPayerType === 'Kiracı' ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
              >
                <UserCheck size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">KİRACI</span>
              </button>
              <button 
                onClick={() => setSelectedPayerType('Malik')} 
                className={`flex items-center justify-center space-x-2 h-12 rounded-xl border transition-all ${selectedPayerType === 'Malik' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
              >
                <User size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">MALİK</span>
              </button>
            </div>
          </section>
        )}

        {selectedUnit && (
          <section className="animate-in fade-in zoom-in-95 duration-300 relative">
            <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">
              {selectedUnit.tenantName ? '3. ÖDEME ŞEKLİ' : '2. ÖDEME ŞEKLİ'}
            </label>
            <button 
              onClick={() => setShowPaymentMethodList(!showPaymentMethodList)}
              className="w-full bg-[#1e293b] rounded-xl h-12 flex items-center justify-between px-4 border border-white/10 hover:bg-[#203140] transition-all shadow-lg"
            >
              <span className="text-[13px] font-black uppercase tracking-wider text-white">
                {paymentMethod}
              </span>
              <ChevronDown size={16} className={`text-white/30 transition-transform ${showPaymentMethodList ? 'rotate-180' : ''}`} />
            </button>
            
            {showPaymentMethodList && (
              <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                {['EFT/Havale', 'Elden Ödeme', 'Kredi Bakiyesinden'].map((method) => (
                  <button 
                    key={method}
                    onClick={() => { setPaymentMethod(method as any); setShowPaymentMethodList(false); }}
                    className={`w-full py-3 px-4 text-left border-b border-white/5 last:border-0 hover:bg-blue-500/20 transition-colors ${paymentMethod === method ? 'bg-blue-500/10 text-blue-400' : 'text-white/60'}`}
                  >
                    <span className="text-[12px] font-black uppercase tracking-widest">{method}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedUnit && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4">
            <section className="bg-[#111827] rounded-[28px] p-5 border border-white/10 shadow-2xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 mb-1.5 block">İşlem Tarihi</label>
                   <div className="relative">
                     <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="w-full h-[52px] bg-black/40 border border-white/10 rounded-xl px-3 text-[15px] font-black text-white outline-none focus:border-blue-500/30 transition-all shadow-inner" 
                     />
                     <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                   </div>
                </div>
                <div>
                   <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 mb-1.5 block">Ödeme Tutarı (₺)</label>
                   <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-xl font-black text-green-500 text-center outline-none focus:border-green-500/30 transition-all shadow-inner" 
                   />
                </div>
              </div>
              
              <button 
                onClick={() => handleProcess()} 
                disabled={!amount || parseFloat(amount) <= 0 || isSaving} 
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /><span className="text-[12px] font-black uppercase tracking-[0.2em]">TAHSİLAT GİRİŞİ YAP</span></>}
              </button>
            </section>

            <div className="flex items-center space-x-2 px-1">
              <div className="h-px bg-white/5 flex-1"></div>
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">BEKLEYEN BORÇLAR</span>
              <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <section className="space-y-3">
              {getPendingDebts(selectedUnit).map((debt) => (
                <button key={debt.id} onClick={() => handleProcess(debt)} className="w-full bg-slate-800/40 rounded-[24px] py-4 px-5 border border-white/5 text-left active:scale-[0.98] transition-all flex items-center justify-between shadow-lg">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1 block">{debt.title}</span>
                    <span className="text-[14px] font-black text-white uppercase truncate block">
                      {(selectedPayerType === 'Kiracı' && selectedUnit.tenantName) ? selectedUnit.tenantName : selectedUnit.ownerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-red-500">₺{debt.amount}</span>
                  </div>
                </button>
              ))}
              {getPendingDebts(selectedUnit).length === 0 && (
                <div className="text-center py-6 bg-white/5 rounded-[24px] border border-dashed border-white/10">
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">ÖDENMEMİŞ BORÇ BULUNMUYOR</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default TahsilatView;
