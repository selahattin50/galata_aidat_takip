
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, Save, Home, Loader2, User, UserCheck, Wallet, Briefcase } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';
import DatePickerModal from './DatePickerModal';
import { fixCommonTurkishText } from '../textUtils';
import { toLocalIsoDate } from '../dateUtils';
import { DEBT_SETTLEMENT_MARKER } from '../balanceUtils';

interface TahsilatViewProps {
  units: Unit[];
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onSave: (amount: number, description: string, vault: 'genel' | 'demirbas', date: string, unitId: string, month?: number, year?: number) => void;
  currentDate: Date;
}

const TahsilatView: React.FC<TahsilatViewProps> = ({ units, info, transactions, onClose, onSave, currentDate }) => {
  const now = currentDate;
  const currentMonthIdx = now.getMonth();
  const currentYearActual = now.getFullYear();
  const currentIsoDate = toLocalIsoDate(now);
  const previousDefaultDateRef = useRef(currentIsoDate);

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(currentIsoDate);
  const [selectedPayerType, setSelectedPayerType] = useState<'Malik' | 'Kiracı'>('Kiracı');
  const [selectedVault, setSelectedVault] = useState<'genel' | 'demirbas'>('genel');
  const [paymentMethod, setPaymentMethod] = useState<'EFT/Havale' | 'Elden Ödeme' | 'Kredi Bakiyesinden'>('EFT/Havale');
  const [collectionType, setCollectionType] = useState<'aidat' | 'diger' | 'serbest'>('aidat');
  const [otherDescription, setOtherDescription] = useState('');
  const [showCollectionTypeList, setShowCollectionTypeList] = useState(false);
  const [showPaymentMethodList, setShowPaymentMethodList] = useState(false);
  const [showUnitGrid, setShowUnitGrid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    const previousDefaultDate = previousDefaultDateRef.current;
    setSelectedDate(prev => prev === previousDefaultDate ? currentIsoDate : prev);
    previousDefaultDateRef.current = currentIsoDate;
  }, [currentIsoDate]);

  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId), [units, selectedUnitId]);
  const selectedCredit = selectedUnit
    ? (selectedVault === 'genel' ? selectedUnit.credit : (selectedUnit.demirbasCredit || 0))
    : 0;

  const selectableUnits = useMemo(() =>
    units.filter(u => !(info.isManagerExempt && u.id === info.managerUnitId))
      .sort((a, b) => parseInt(a.no) - parseInt(b.no)),
    [units, info]
  );

  const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(val);
  };

  const collectionTypeLabel = collectionType === 'aidat'
    ? 'Aidat'
    : collectionType === 'diger'
      ? 'Aidat Dışı'
      : 'Serbest Tahsilat';

  const handleCollectionTypeSelect = (type: 'aidat' | 'diger' | 'serbest') => {
    setCollectionType(type);
    setShowCollectionTypeList(false);
    setAmount('');
    setOtherDescription('');

    if (type === 'aidat') {
      setSelectedVault('genel');
    } else if (type === 'diger') {
      setPaymentMethod('Kredi Bakiyesinden');
      setShowPaymentMethodList(false);
    } else if (paymentMethod === 'Kredi Bakiyesinden') {
      setPaymentMethod('EFT/Havale');
    }
  };

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnitId(unit.id);
    setShowUnitGrid(false);
    setAmount('');
    setCollectionType('aidat');
    setSelectedVault('genel');
    setOtherDescription('');
    if (unit.tenantName && unit.tenantName.trim() !== '') {
      setSelectedPayerType('Kiracı');
    } else {
      setSelectedPayerType('Malik');
    }
  };

  const handleProcess = async (debtItem?: any) => {
    const finalAmount = debtItem ? debtItem.amount : parseFloat(amount);
    const payerLabel = selectedPayerType === 'Kiracı' ? 'KİRACI' : 'MALİK';
    const methodLabel = paymentMethod === 'EFT/Havale' ? '(TAHSİLATI)' : (paymentMethod === 'Elden Ödeme' ? '(ELDEN)' : '(KREDİ)');
    const isManualAmountCollection = !debtItem;

    if (!selectedUnitId || isNaN(finalAmount) || finalAmount <= 0) return;
    if (isManualAmountCollection && collectionType === 'diger' && !otherDescription.trim()) {
      setWarningMessage('Aidat dışı tahsilat için açıklama giriniz.');
      return;
    }

    if (collectionType === 'diger' && paymentMethod !== 'Kredi Bakiyesinden') {
      setWarningMessage('Aidat dışı tahsilat yalnızca kredi bakiyesinden yapılabilir.');
      return;
    }

    if (paymentMethod === 'Kredi Bakiyesinden' && selectedUnit) {
      const availableCredit = selectedVault === 'genel' ? selectedUnit.credit : (selectedUnit.demirbasCredit || 0);
      if (availableCredit <= 0) {
        setWarningMessage('Seçili kasada kullanılabilir kredi bakiyesi bulunmuyor.');
        return;
      }
      if (availableCredit < finalAmount) {
        setWarningMessage("Kredi bakiyesi yapılacak tahsilatı karşılamıyor.");
        return;
      }
    }

    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const description = debtItem?.kind === 'other'
      ? `${debtItem.title} TAHSİLATI ${methodLabel} [${debtItem.vault}] [${DEBT_SETTLEMENT_MARKER}:${debtItem.debtId}]`
      : isManualAmountCollection && collectionType === 'diger'
      ? `${otherDescription.trim()} TAHSİLATI ${methodLabel} [${selectedVault}] [${DEBT_SETTLEMENT_MARKER}]`
      : isManualAmountCollection
      ? `${payerLabel} SERBEST TAHSİLAT ${methodLabel}`
      : `${months[debtItem.month]} AYI AİDATI ${methodLabel}${selectedPayerType === 'Kiracı' ? ' KİRACI' : ''}`;

    const finalMonth = debtItem ? debtItem.month : undefined;
    const finalYear = debtItem ? debtItem.year : undefined;
    const finalVault = debtItem?.kind === 'other' ? debtItem.vault : (debtItem ? 'genel' : selectedVault);

    onSave(finalAmount, fixCommonTurkishText(description), finalVault, selectedDate, selectedUnitId, finalMonth, finalYear);
    setIsSaving(false);
    setIsSuccess(true);
  };

  const getPendingOtherDebts = (unit: Unit) => {
    let unassignedSettlement = transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'GELİR')
      .filter(tx => (tx.description || '').includes(`[${DEBT_SETTLEMENT_MARKER}]`))
      .filter(tx => {
        const vault = (tx.description || '').toLocaleLowerCase('tr-TR').includes('[demirbas]') ? 'demirbas' : 'genel';
        return vault === selectedVault;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    return transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA')
      .filter(tx => !/A[İI]DAT/i.test(tx.description || ''))
      .filter(tx => {
        const vault = (tx.description || '').toLocaleLowerCase('tr-TR').includes('[demirbas]') ? 'demirbas' : 'genel';
        return vault === selectedVault;
      })
      .map(tx => {
        const specificallyPaidAmount = transactions
          .filter(payment => payment.unitId === unit.id && payment.type === 'GELİR')
          .filter(payment => (payment.description || '').includes(`[${DEBT_SETTLEMENT_MARKER}:${tx.id}]`))
          .reduce((sum, payment) => sum + payment.amount, 0);
        const remainingAfterSpecificPayment = Math.max(0, tx.amount - specificallyPaidAmount);
        const assignedSettlement = Math.min(remainingAfterSpecificPayment, unassignedSettlement);
        unassignedSettlement -= assignedSettlement;
        const vault = (tx.description || '').toLocaleLowerCase('tr-TR').includes('[demirbas]') ? 'demirbas' : 'genel';
        return {
          kind: 'other',
          debtId: tx.id,
          vault,
          amount: remainingAfterSpecificPayment - assignedSettlement,
          title: (tx.description || 'AİDAT DIŞI BORÇ').split('[')[0].trim(),
          id: tx.id
        };
      })
      .filter(debt => debt.amount > 0);
  };

  const getPendingDebts = (unit: Unit) => {
    const pendingList = [];
    const duesValue = info.duesAmount ?? 0;
    for (let i = 0; i < 12; i++) {
      const hasPayment = transactions.some(tx =>
        tx.unitId === unit.id &&
        tx.type === 'GELİR' &&
        tx.periodMonth === i &&
        tx.periodYear === currentYearActual
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
      <div className="fixed inset-0 z-[400] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h3 className="text-xl font-black text-white uppercase tracking-widest">İŞLEM TAMAMLANDI</h3>
        <p className="text-white/40 text-xs mt-2 uppercase font-bold">Ödeme başarıyla kaydedildi.</p>
        <button onClick={onClose} className="embossed-cash mt-8 px-10 py-4 bg-blue-600 rounded-2xl font-black text-white active:scale-95 transition-all">GERİ DÖN</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="relative px-4 py-6 flex items-center justify-center">
        <button onClick={onClose} className="app-back-button absolute left-4">
          <ArrowLeft size={22} />
        </button>
        <h3 className="absolute left-1/2 flex max-w-[calc(100%-96px)] -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap text-[17px] font-black uppercase tracking-[0.08em] text-white">
          <Wallet size={20} />
          <span>TAHSİLAT</span>
        </h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
        <section>
          <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">1. DAİRE SEÇİMİ</label>
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all bg-[#111827]">
            <button onClick={() => setShowUnitGrid(!showUnitGrid)} className="w-full min-h-[50px] py-1.5 flex items-center justify-between px-4 active:scale-[0.98] transition-all">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-xl shrink-0">
                  <Home size={18} className="text-green-500" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className={`text-[15px] font-black uppercase tracking-tighter leading-none truncate ${selectedUnit ? 'text-white' : 'text-blue-500'}`}>
                    {selectedUnit ? (selectedUnit.tenantName || selectedUnit.ownerName || '').toUpperCase() : 'DAİRE SEÇİNİZ...'}
                  </span>
                </div>
              </div>
              <ChevronDown size={18} className={`text-zinc-500 transition-transform duration-300 ${showUnitGrid ? 'rotate-180' : ''}`} />
            </button>
            {showUnitGrid && (
              <div className="flex flex-col space-y-1 p-1 bg-[#0b101b] max-h-[300px] overflow-y-auto no-scrollbar border-t border-white/10">
                {selectableUnits.map((unit) => {
                  return (
                    <button key={unit.id} onClick={() => handleUnitSelect(unit)} className={`w-full py-3.5 px-4 flex items-center transition-all ${selectedUnitId === unit.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 mr-4">
                        {unit.no}
                      </div>
                      <div className="flex items-center justify-between w-full gap-3 min-w-0">
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-[14px] font-black text-white uppercase tracking-tight truncate leading-tight">
                            {unit.tenantName || unit.ownerName || `${unit.no}. DAİRE`}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">BAKİYE:</span>
                            <span className="text-[9px] font-black text-green-500">ALACAK ₺{formatCurrency(unit.credit)}</span>
                            <span className="text-[9px] font-black text-red-500">BORÇ ₺{formatCurrency(unit.debt)}</span>
                          </div>
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
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <button
                onClick={() => setSelectedPayerType('Kiracı')}
                className={`embossed-cash flex items-center justify-center space-x-2 h-12 rounded-xl border transition-all ${selectedPayerType === 'Kiracı' ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
              >
                <UserCheck size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">KİRACI</span>
              </button>
              <button
                onClick={() => setSelectedPayerType('Malik')}
                className={`embossed-cash flex items-center justify-center space-x-2 h-12 rounded-xl border transition-all ${selectedPayerType === 'Malik' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
              >
                <User size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">MALİK</span>
              </button>
            </div>
          </section>
        )}

        {selectedUnit && (
          <section className="animate-in fade-in zoom-in-95 duration-300 relative z-[120]">
            <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">TAHSİLAT TÜRÜ</label>
            <button
              type="button"
              onClick={() => setShowCollectionTypeList(!showCollectionTypeList)}
              className="embossed-cash w-full bg-[#1e293b] rounded-xl h-12 flex items-center justify-between px-4 border border-white/10 hover:bg-[#203140] transition-all shadow-lg"
            >
              <span className="text-[13px] font-black uppercase tracking-wider text-white">{collectionTypeLabel}</span>
              <ChevronDown size={16} className={`text-white/30 transition-transform ${showCollectionTypeList ? 'rotate-180' : ''}`} />
            </button>

            {showCollectionTypeList && (
              <div className="absolute top-full left-0 right-0 z-[130] mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1e293b] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                {[
                  { id: 'aidat', label: 'Aidat' },
                  { id: 'serbest', label: 'Serbest Tahsilat' },
                  { id: 'diger', label: 'Aidat Dışı' }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleCollectionTypeSelect(option.id as 'aidat' | 'diger' | 'serbest')}
                    className={`embossed-cash w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-blue-500/20 ${collectionType === option.id ? 'bg-blue-500/10 text-blue-400' : 'text-white/70'}`}
                  >
                    <span className="text-[12px] font-black uppercase tracking-widest">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedUnit && (
          <section className="animate-in fade-in zoom-in-95 duration-300 relative">
            <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">
              {selectedUnit.tenantName ? '3. ÖDEME ŞEKLİ' : '2. ÖDEME ŞEKLİ'}
            </label>
            <button
              onClick={() => collectionType !== 'diger' && setShowPaymentMethodList(!showPaymentMethodList)}
              disabled={collectionType === 'diger'}
              className="embossed-cash w-full bg-[#1e293b] rounded-xl h-12 flex items-center justify-between px-4 border border-white/10 hover:bg-[#203140] transition-all shadow-lg disabled:cursor-not-allowed"
            >
              <span className="text-[13px] font-black uppercase tracking-wider text-white">
                {paymentMethod}
              </span>
              {collectionType !== 'diger'
                ? <ChevronDown size={16} className={`text-white/30 transition-transform ${showPaymentMethodList ? 'rotate-180' : ''}`} />
                : <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">ZORUNLU</span>}
            </button>

            {collectionType !== 'diger' && showPaymentMethodList && (
              <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                {(collectionType === 'serbest' ? ['EFT/Havale', 'Elden Ödeme'] : ['EFT/Havale', 'Elden Ödeme', 'Kredi Bakiyesinden']).map((method) => (
                  <button
                    key={method}
                    onClick={() => { setPaymentMethod(method as any); setShowPaymentMethodList(false); }}
                    className={`embossed-cash w-full py-3 px-4 text-left border-b border-white/5 last:border-0 hover:bg-blue-500/20 transition-colors ${paymentMethod === method ? 'bg-blue-500/10 text-blue-400' : 'text-white/60'}`}
                  >
                    <span className="text-[12px] font-black uppercase tracking-widest">{method}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedUnit && collectionType !== 'aidat' && (
          <section className="animate-in fade-in zoom-in-95 duration-300">
            <label className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">TAHSİLAT KASASI</label>
            <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
              <button
                onClick={() => setSelectedVault('genel')}
                className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${selectedVault === 'genel' ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'}`}
              >
                <Wallet size={18} />
                <span className="text-[12px] font-black uppercase tracking-widest">GENEL GİDER</span>
              </button>
              <button
                onClick={() => setSelectedVault('demirbas')}
                className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${selectedVault === 'demirbas' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'}`}
              >
                <Briefcase size={18} />
                <span className="text-[12px] font-black uppercase tracking-widest">DEMİRBAŞ</span>
              </button>
            </div>
          </section>
        )}

        {selectedUnit && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4">
            {collectionType !== 'aidat' && (
            <section className="bg-[#111827] rounded-[28px] p-5 border border-white/10 shadow-2xl space-y-4">
              {collectionType === 'diger' && (
                <div className={`rounded-xl border px-3 py-2 text-center ${selectedCredit > 0 ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedCredit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    Kullanılabilir kredi: ₺{formatCurrency(selectedCredit)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 mb-1.5 block">İşlem Tarihi</label>
                  <div className="relative">
                    <DatePickerModal value={selectedDate} onChange={setSelectedDate} />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 mb-1.5 block">Ödeme Tutarı (₺)</label>
                  <input
                    type="number"
                    max={collectionType === 'diger' ? selectedCredit : undefined}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-[46px] bg-black/40 border border-white/10 rounded-xl px-3 text-[22px] font-black text-green-500 text-center outline-none focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {collectionType === 'diger' && (
                <div>
                  <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 mb-1.5 block">Açıklama</label>
                  <input
                    type="text"
                    placeholder="Örn: Su gideri borcu"
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    className="w-full h-[46px] bg-black/40 border border-white/10 rounded-xl px-3 text-[14px] font-bold text-white outline-none focus:border-blue-500/40 transition-all shadow-inner"
                  />
                </div>
              )}

              <button
                onClick={() => handleProcess()}
                disabled={!amount || parseFloat(amount) <= 0 || (collectionType === 'diger' && (!otherDescription.trim() || selectedCredit <= 0 || parseFloat(amount) > selectedCredit)) || isSaving}
                className="embossed-cash w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /><span className="text-[12px] font-black uppercase tracking-[0.2em]">TAHSİLATI KAYDET</span></>}
              </button>
            </section>
            )}

            {collectionType !== 'serbest' && (
            <>
              <div className="flex items-center space-x-2 px-1">
                <div className="h-px bg-white/5 flex-1"></div>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">BEKLEYEN BORÇLAR</span>
                <div className="h-px bg-white/5 flex-1"></div>
              </div>

              <section className="space-y-3">
                {(collectionType === 'aidat' ? getPendingDebts(selectedUnit) : getPendingOtherDebts(selectedUnit)).map((debt: any) => (
                <button key={debt.id} onClick={() => handleProcess(debt)} className="embossed-cash w-full bg-slate-800/40 rounded-[24px] py-4 px-5 border border-white/5 text-left active:scale-[0.98] transition-all flex items-center justify-between shadow-lg">
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
                {(collectionType === 'aidat' ? getPendingDebts(selectedUnit) : getPendingOtherDebts(selectedUnit)).length === 0 && (
                <div className="text-center py-6 bg-white/5 rounded-[24px] border border-dashed border-white/10">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    {collectionType === 'aidat' ? 'ÖDENMEMİŞ AİDAT BULUNMUYOR' : 'ÖDENMEMİŞ AİDAT DIŞI BORÇ BULUNMUYOR'}
                  </p>
                </div>
                )}
              </section>
            </>
            )}
          </div>
        )}
      </div>

      {warningMessage && (
        <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-[26px] border border-blue-400/25 bg-[#17233a] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500/60 via-emerald-400/60 to-blue-500/60" />
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/80">Bilgilendirme</p>
              <p className="mt-3 text-[15px] font-black leading-snug text-white">
                {warningMessage}
              </p>
              <button
                onClick={() => setWarningMessage('')}
                className="embossed-cash mt-5 ml-auto flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
              >
                TAMAM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TahsilatView;
