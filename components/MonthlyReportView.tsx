import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronDown, X, Calendar, MessageCircle, Building, Check, Wallet, Inbox, Lock } from 'lucide-react';
import { Transaction, Unit, FileEntry, BuildingInfo } from '../types';
import { PDFService } from '../pdfService';
import { useAndroidBackHandler } from '../appBackButton';
import { createFinancialReportPdf } from './reportPdfUtils';
import PdfActionButton from './PdfActionButton';
import { fixCommonTurkishText, upperTr } from '../textUtils';

const withTransactionDate = (date: string, label: string) => `${date} ${label}`;
const toIsoDate = (date: string) => date.split('.').reverse().join('-');

interface MonthlyReportViewProps {
  transactions: Transaction[];
  units: Unit[];
  info: BuildingInfo;
  onClose: () => void;
  buildingName: string;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
  currentDate: Date;
}

const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ transactions, units, info, onClose, buildingName, onAddFile, currentDate }) => {
  const now = currentDate;
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedVault, setSelectedVault] = useState<'genel' | 'demirbas'>('genel');
  const [isProcessing, setIsProcessing] = useState(false);

  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  useAndroidBackHandler(() => {
    if (showVaultPicker) {
      setShowVaultPicker(false);
      return true;
    }

    if (showYearPicker) {
      setShowYearPicker(false);
      return true;
    }

    if (showDatePicker) {
      setShowDatePicker(false);
      return true;
    }

    return false;
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const years = [2024, 2025, 2026];

  const getTxParts = (tx: Transaction) => {
    const parts = tx.date.split('.');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if ([day, month, year].some(Number.isNaN)) return null;
    return { day, month, year };
  };

  const isInOrBeforeSelectedPeriod = (tx: Transaction) => {
    const parts = getTxParts(tx);
    if (!parts) return false;

    const byTransactionDate =
      parts.year < selectedYear ||
      (parts.year === selectedYear && parts.month <= selectedMonth);
    if (!byTransactionDate) return false;

    if (tx.periodMonth === undefined || tx.periodYear === undefined) return true;
    return tx.periodYear < selectedYear ||
      (tx.periodYear === selectedYear && tx.periodMonth <= selectedMonth);
  };

  function isCreditBalanceIncome(tx: Transaction) {
    if (tx.type !== 'GELİR') return false;
    const normalizedDescription = (tx.description || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return /KRED[İI]/i.test(tx.description) ||
      (!!tx.unitId && normalizedDescription.includes('DEVIR') && normalizedDescription.includes('ALACAK'));
  }

  const { totalCredit, netDebt } = useMemo(() => {
    const duesValue = info.duesAmount || 0;
    const reportTransactions = transactions.filter(isInOrBeforeSelectedPeriod);

    return units.reduce((acc, unit) => {
      const isExempt = info?.isManagerExempt && unit.id === info?.managerUnitId;
      if (isExempt) return acc;

      const unitTransactions = reportTransactions.filter(tx => tx.unitId === unit.id);
      const vaultTransactions = unitTransactions.filter(tx => {
        const txVaultType = tx.description.toLowerCase().includes('[demirbas]') ? 'demirbas' : 'genel';
        return txVaultType === selectedVault;
      });

      let credit = 0;
      let debt = 0;

      if (selectedVault === 'genel') {
        const totalIncome = vaultTransactions
          .filter(tx => tx.type === 'GELİR' && !isCreditBalanceIncome(tx))
          .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpense = vaultTransactions
          .filter(tx => tx.type === 'GİDER')
          .reduce((sum, tx) => sum + tx.amount, 0);
        const totalManualDebt = vaultTransactions
          .filter(tx => tx.type === 'BORÇLANDIRMA')
          .reduce((sum, tx) => sum + tx.amount, 0);

        let paidDues = 0;
        let unpaidDues = 0;
        if (duesValue > 0) {
          for (let month = 0; month <= selectedMonth; month += 1) {
            const hasManualDues = vaultTransactions.some(tx =>
              tx.type === 'BORÇLANDIRMA' &&
              tx.periodMonth === month &&
              tx.periodYear === selectedYear &&
              tx.description.toUpperCase().includes('AİDAT')
            );
            if (!hasManualDues) {
              const paid = vaultTransactions.some(tx =>
                tx.type === 'GELİR' &&
                tx.periodMonth === month &&
                tx.periodYear === selectedYear
              );
              if (paid) paidDues += duesValue;
              else unpaidDues += duesValue;
            }
          }
        }

        credit = Math.max(0, totalIncome - totalExpense - paidDues);
        debt = totalManualDebt + unpaidDues;
      } else {
        const totalIncome = vaultTransactions
          .filter(tx => tx.type === 'GELİR' && !isCreditBalanceIncome(tx))
          .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpense = vaultTransactions
          .filter(tx => tx.type === 'GİDER')
          .reduce((sum, tx) => sum + tx.amount, 0);
        debt = vaultTransactions
          .filter(tx => tx.type === 'BORÇLANDIRMA')
          .reduce((sum, tx) => sum + tx.amount, 0);
        credit = Math.max(0, totalIncome - totalExpense);
      }

      return {
        totalCredit: acc.totalCredit + credit,
        netDebt: acc.netDebt + Math.max(0, debt - credit)
      };
    }, { totalCredit: 0, netDebt: 0 });
  }, [transactions, units, info, selectedMonth, selectedYear, selectedVault]);

  const previousDevir = useMemo(() => {
    const transactionsSum = transactions.reduce((sum, tx) => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return sum;
      const txMonth = parseInt(parts[1]) - 1;
      const txYear = parseInt(parts[2]);

      if (txYear < selectedYear || (txYear === selectedYear && txMonth < selectedMonth)) {
        const txVaultType = tx.description.toLowerCase().includes('[demirbas]') ? 'demirbas' : 'genel';
        if (txVaultType === selectedVault) {
          if (tx.type === 'GELİR' && isCreditBalanceIncome(tx)) return sum;
          if (tx.type === 'GELİR') return sum + tx.amount;
          if (tx.type === 'GİDER') return sum - tx.amount;
        }
      }
      return sum;
    }, 0);
    return transactionsSum;
  }, [transactions, selectedMonth, selectedYear, selectedVault]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return false;
      const txMonth = parseInt(parts[1]) - 1;
      const txYear = parseInt(parts[2]);
      const txVaultType = tx.description.toLowerCase().includes('[demirbas]') ? 'demirbas' : 'genel';
      return txMonth === selectedMonth && txYear === selectedYear && txVaultType === selectedVault;
    });
  }, [transactions, selectedMonth, selectedYear, selectedVault]);

  const reportData = useMemo(() => {
    const incomeGroups: Record<string, { label: string, date: string, total: number, count: number, minDate: string }> = {};
    const expenseGroups: Record<string, { label: string, date: string, total: number, count: number, minDate: string }> = {};

    filteredTransactions.forEach(tx => {
      let label = tx.description.replace(/\s*\(?MALİK\)?/gi, '')
        .replace(/\s*\(?KİRACI\)?/gi, '')
        .replace(/EFT\/HAVALE/gi, '')
        .replace(/TAHSİLATI/gi, '')
        .replace(/\(\s*\)/g, '')
        .split('[')[0].trim();
      label = upperTr(label);

      if (!label) label = upperTr(tx.description.split('[')[0].trim());
      const isoDate = toIsoDate(tx.date);

      if (tx.type === 'GELİR') {
        if (isCreditBalanceIncome(tx)) return;

        const rawDescription = upperTr(tx.description);
        const isSerbestIncome = /SERBEST\s+TAHS[İI]LAT/i.test(rawDescription);
        const isDuesIncome = tx.periodMonth !== undefined || tx.periodYear !== undefined || /A[İI]DAT/i.test(rawDescription);
        const incomeLabel = isSerbestIncome ? 'AY SERBEST GELİRİ' : (isDuesIncome ? 'AY İÇİ AİDAT GELİRİ' : label);
        const incomeKey = `${tx.date}\u0000${incomeLabel}`;

        if (!incomeGroups[incomeKey]) incomeGroups[incomeKey] = { label: incomeLabel, date: tx.date, total: 0, count: 0, minDate: isoDate };
        incomeGroups[incomeKey].total += tx.amount;
        incomeGroups[incomeKey].count += 1;
      } else if (tx.type === 'GİDER') {
        const expenseKey = `${tx.date}\u0000${label}`;
        if (!expenseGroups[expenseKey]) expenseGroups[expenseKey] = { label, date: tx.date, total: 0, count: 0, minDate: isoDate };
        expenseGroups[expenseKey].total += tx.amount;
        expenseGroups[expenseKey].count += 1;
      }
    });

    const incomes = Object.values(incomeGroups).map((data) => ({
      label: withTransactionDate(data.date, data.label === "AİDAT GELİRLERİ" && data.count > 1 ? `${data.label} (${data.count})` : data.label),
      total: data.total,
      minDate: data.minDate
    })).sort((a, b) => a.minDate.localeCompare(b.minDate));

    if (previousDevir !== 0) {
      incomes.unshift({ label: "ÖNCEKİ AYDAN DEVİR", total: previousDevir, minDate: "0000-00-00" });
    }

    return {
      incomes,
      expenses: Object.values(expenseGroups).map((data) => ({
        label: withTransactionDate(data.date, data.label), total: data.total, minDate: data.minDate
      })).sort((a, b) => a.minDate.localeCompare(b.minDate))
    };
  }, [filteredTransactions, previousDevir]);

  const displayIncomeItems = useMemo(() => {
    const incomeGroups: Record<string, { label: string; date?: string; isoDate: string; total: number }> = {};

    filteredTransactions.forEach(tx => {
      if (tx.type !== 'GELİR' || isCreditBalanceIncome(tx)) return;

      const rawDescription = upperTr(tx.description);
      const cleanLabelRaw = tx.description
        .replace(/\s*\(?MAL[Iİ]K\)?/gi, '')
        .replace(/\s*\(?K[Iİ]RACI\)?/gi, '')
        .replace(/EFT\/HAVALE/gi, '')
        .replace(/TAHS[Iİ]LATI/gi, '')
        .replace(/\(\s*\)/g, '')
        .split('[')[0].trim();
      const cleanLabel = upperTr(cleanLabelRaw);

      let label: string;
      let includeDate = true;
      if (/SERBEST\s+TAHS[Iİ]LAT/i.test(rawDescription)) {
        label = 'AY İÇİ AİDAT GELİRİ';
        includeDate = false;
      } else if (tx.periodMonth !== undefined || tx.periodYear !== undefined || /A[Iİ]DAT/i.test(rawDescription)) {
        label = 'AY İÇİ AİDAT GELİRİ';
        includeDate = false;
      } else {
        label = cleanLabel || 'DİĞER GELİR';
      }

      const key = `${includeDate ? tx.date : ''}\u0000${label}`;
      if (!incomeGroups[key]) incomeGroups[key] = { label, date: includeDate ? tx.date : undefined, isoDate: toIsoDate(tx.date), total: 0 };
      incomeGroups[key].total += tx.amount;
      if (toIsoDate(tx.date) < incomeGroups[key].isoDate) incomeGroups[key].isoDate = toIsoDate(tx.date);
    });

    return Object.values(incomeGroups)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
      .map((item) => ({ label: item.date ? withTransactionDate(item.date, item.label) : item.label, total: item.total }));
  }, [filteredTransactions]);

  const monthActualIncome = displayIncomeItems.reduce((sum, item) => sum + item.total, 0);
  const totalIncomeWithDevir = monthActualIncome + previousDevir;
  const totalExpense = filteredTransactions.filter(tx => tx.type === 'GİDER').reduce((sum, tx) => sum + tx.amount, 0);
  const cashTotal = totalIncomeWithDevir - totalExpense;

  const formatCurrency = (val: number) => {
    return "₺" + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const generateAndHandlePdf = async (mode: 'share' | 'download') => {
    setIsProcessing(true);
    try {
      const incomePdfItems = [
        ...(previousDevir !== 0 ? [{ label: 'ÖNCEKİ AYDAN DEVİR', total: previousDevir, tone: 'info' as const }] : []),
        ...displayIncomeItems.map((item) => ({ label: item.label, total: item.total, tone: 'default' as const })),
        { label: 'FAZLA ÖDEME', total: totalCredit, tone: 'info' as const },
        { label: 'AİDAT ALACAĞI', total: netDebt, tone: 'danger' as const },
      ];

      const pdf = await createFinancialReportPdf({
        buildingName,
        reportTitle: `${months[selectedMonth]} Ayı Apartman Hesap Durum Çizelgesi`,
        leftTitle: 'Giderler',
        rightTitle: 'Gelirler',
        leftItems: reportData.expenses.map((item) => ({ label: item.label, total: item.total, tone: 'default' as const })),
        rightItems: incomePdfItems,
        leftTotal: totalExpense,
        cashLabel: 'Kasa Durumu',
        cashPeriodLabel: `${months[selectedMonth]} ${selectedYear} Sonu`,
        cashTotal,
      });

      const fileName = `${months[selectedMonth]} Ayı Gelir Gider ${selectedYear}.pdf`;

      const shouldShare = mode === 'share';
      const savedInfo = await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare);
      onAddFile(fileName, 'Karar', savedInfo.uri, savedInfo.size, savedInfo.fileName);

      if (mode === 'download') {
        alert('PDF başarıyla indirildi ve Dosyalar bölümüne eklendi!');
      }
    } catch (error) {
      console.error(error);
      alert('PDF oluşturulurken hata oluştu: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="relative flex items-center justify-center px-4 pt-6 pb-2">
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center space-x-3">
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
            <Building className="text-white" size={22} />
          </div>
          <div className="text-left">
            <h2 className="whitespace-nowrap text-[17px] font-black text-white uppercase tracking-wider leading-none">AYLIK BİLANÇO</h2>
          </div>
        </div>
        <div className="ml-auto flex space-x-2">
          <button onClick={onClose} className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center border border-red-500/50 active:scale-95 shadow-lg">
            <X className="text-white" size={24} />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] px-4 pt-4 pb-3 border-b border-white/5 shadow-[0_14px_24px_rgba(15,23,42,0.55)]">
        <div>
        <div className="grid grid-cols-1 gap-3 mb-4 min-[360px]:grid-cols-2">
          <PdfActionButton type="download" onClick={() => generateAndHandlePdf('download')} disabled={isProcessing} />
          <PdfActionButton type="share" onClick={() => generateAndHandlePdf('share')} disabled={isProcessing} />
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <button onClick={() => setShowVaultPicker(!showVaultPicker)} className="bg-[#1e293b] h-9 rounded-lg px-2 flex items-center justify-between border border-white/5 shadow-inner">
            <span className="text-[12px] font-black text-white/70 uppercase truncate">{selectedVault === 'genel' ? 'Genel Gider' : 'Demirbaş'}</span>
            <ChevronDown size={12} className="text-white/20" />
          </button>
          <button onClick={() => setShowYearPicker(true)} className="bg-[#1e293b] h-9 rounded-lg px-2 flex items-center justify-between border border-white/5 shadow-inner">
            <span className="text-[12px] font-black text-white/70 uppercase">{selectedYear}</span>
            <ChevronDown size={12} className="text-white/20" />
          </button>
          <button onClick={() => setShowDatePicker(true)} className="bg-[#1e293b] h-9 rounded-lg px-2 flex items-center justify-between border border-white/5 shadow-inner">
            <span className="text-[12px] font-black text-white/70 uppercase truncate">{months[selectedMonth]}</span>
            <ChevronDown size={12} className="text-white/20" />
          </button>
        </div>

        {showVaultPicker && (
          <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-8" onClick={() => setShowVaultPicker(false)}>
            <div className="bg-[#1e293b] w-full rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSelectedVault('genel'); setShowVaultPicker(false); }} className="w-full py-4 text-white text-[11px] font-black uppercase border-b border-white/5 active:bg-white/5">Genel Kasa</button>
              <button onClick={() => { setSelectedVault('demirbas'); setShowVaultPicker(false); }} className="w-full py-4 text-white text-[11px] font-black uppercase active:bg-white/5">Demirbaş Kasası</button>
            </div>
          </div>
        )}

        {showYearPicker && (
          <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-8" onClick={() => setShowYearPicker(false)}>
            <div className="bg-[#1e293b] w-full max-h-[70vh] rounded-2xl overflow-hidden border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 bg-black/20 text-center"><span className="text-[10px] font-black text-white/50 uppercase tracking-widest">YIL SEÇİN</span></div>
              <div className="overflow-y-auto no-scrollbar">
                {years.filter(y => y <= now.getFullYear()).map((y) => (
                  <button key={y} onClick={() => { setSelectedYear(y); setShowYearPicker(false); }} className={`w-full py-3.5 text-[11px] font-black uppercase border-b border-white/5 last:border-0 ${selectedYear === y ? 'text-blue-400 bg-blue-500/5' : 'text-white'}`}>{y}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDatePicker && (
          <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-8" onClick={() => setShowDatePicker(false)}>
            <div className="bg-[#1e293b] w-full max-h-[70vh] rounded-2xl overflow-hidden border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 bg-black/20 text-center"><span className="text-[10px] font-black text-white/50 uppercase tracking-widest">AY SEÇİN</span></div>
              <div className="overflow-y-auto no-scrollbar">
                {months.map((m, i) => {
                  const isFuture = selectedYear === now.getFullYear() && i > now.getMonth();
                  if (isFuture) return null;
                  return <button key={m} onClick={() => { setSelectedMonth(i); setShowDatePicker(false); }} className={`w-full py-3.5 text-[11px] font-black uppercase border-b border-white/5 last:border-0 ${selectedMonth === i ? 'text-blue-400 bg-blue-500/5' : 'text-white'}`}>{m}</button>;
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-row space-x-2">
          <div className="flex-1 min-w-0 bg-white/5 rounded-xl border border-white/5 p-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 shadow-inner">
            <span className="min-w-0 text-left text-[9px] font-black text-white uppercase tracking-wide leading-tight whitespace-nowrap">ALACAK BAKİYESİ</span>
            <span className="shrink-0 text-right text-[14px] font-black text-red-500 tracking-tight tabular-nums">{formatCurrency(netDebt).replace('₺', '')}</span>
          </div>
          <div className="flex-1 min-w-0 bg-white/5 rounded-xl border border-white/5 p-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 shadow-inner">
            <span className="min-w-0 text-left text-[9px] font-black text-white uppercase tracking-wide leading-tight whitespace-nowrap">KREDİ BAKİYESİ</span>
            <span className="shrink-0 text-right text-[14px] font-black text-white tracking-tight tabular-nums">{formatCurrency(totalCredit).replace('₺', '')}</span>
          </div>
        </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
        <div className="bg-[#1e293b]/40 rounded-[32px] border border-white/5 px-2 py-6 mb-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
          <div className="grid grid-cols-1 gap-6 relative min-[380px]:grid-cols-2 min-[380px]:gap-3">
            <div className="absolute left-1/2 top-0 bottom-0 hidden w-[1px] bg-white/10 min-[380px]:block" />
            <div>
              <h3 className="text-[13px] font-black text-white mb-2 pb-1 border-b border-white/20 tracking-wide uppercase">Gider Kalemleri</h3>
              <div className="space-y-3 min-h-[200px]">
                {reportData.expenses.length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-20 py-10"><span className="text-[8px] font-black uppercase italic">Kayıt Yok</span></div>
                ) : (
                  reportData.expenses.map((ex, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[12px] font-black text-white pr-1 leading-tight">{fixCommonTurkishText(ex.label)}</span>
                      <span className="text-[12px] font-black text-white shrink-0">{formatCurrency(ex.total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 text-right"><span className="text-[16px] font-black text-white tracking-tighter">{formatCurrency(totalExpense)}</span></div>
            </div>
            <div>
              <h3 className="text-[13px] font-black text-white mb-2 pb-1 border-b border-white/20 tracking-wide uppercase">Gelir Kalemleri</h3>
              <div className="space-y-3 min-h-[200px]">
                {displayIncomeItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-20 py-10"><span className="text-[8px] font-black uppercase italic">Kayıt Yok</span></div>
                ) : (
                  displayIncomeItems.map((inc, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[12px] font-black text-white pr-1 leading-tight">{fixCommonTurkishText(inc.label)}</span>
                      <span className="text-[12px] font-black text-white shrink-0">{formatCurrency(inc.total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 text-right"><span className="text-[16px] font-black text-white tracking-tighter">{formatCurrency(monthActualIncome)}</span></div>
            </div>
          </div>
        </div>

        <div className="space-y-2 px-1">
          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">ÖNCEKİ AYDAN DEVİR</span>
            <span className="text-[13px] font-black text-white">{formatCurrency(previousDevir).replace('₺', '')}</span>
          </div>
          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">GELİR TOPLAMI</span>
            <span className="text-[13px] font-black text-white">{formatCurrency(totalIncomeWithDevir).replace('₺', '')}</span>
          </div>
          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">GİDER TOPLAMI</span>
            <span className="text-[13px] font-black text-white">{formatCurrency(totalExpense).replace('₺', '')}</span>
          </div>
          <div className="embossed-cash bg-blue-900/40 rounded-xl h-12 px-5 flex items-center justify-between border border-blue-500/20 shadow-xl mt-4">
            <span className="text-[13px] font-black text-white uppercase tracking-[0.2em]">KASA TOPLAMI</span>
            <span className={`embossed-cash-value text-[18px] font-black tracking-tighter ${cashTotal >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(cashTotal).replace('₺', '')}</span>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-t-white border-white/10 rounded-full animate-spin" />
            <Building className="absolute inset-0 m-auto text-white animate-pulse" size={32} />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">DOSYA HAZIRLANIYOR</h3>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none opacity-0 overflow-hidden" style={{ zIndex: -1 }}>
        <div id="pdf-report-content" ref={reportRef} style={{ width: '860px', backgroundColor: '#ffffff', color: '#000', padding: '22px 18px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#000', margin: '0' }}>{buildingName.toUpperCase()}</h1>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#000', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '5px', marginTop: '10px' }}>
              {months[selectedMonth].toUpperCase()} AYI APARTMAN HESAP DURUM ÇİZELGESİ
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#000', border: '2px solid #000' }}>
            <div style={{ backgroundColor: '#fff', padding: '16px 10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ef4444', borderBottom: '2px solid #ef4444', marginBottom: '15px', paddingBottom: '5px' }}>GİDERLER</h3>
              {reportData.expenses.map((ex, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px', fontSize: '16px', lineHeight: '1.45', borderBottom: '1px solid #eee', paddingTop: '2px', paddingBottom: '8px', minHeight: '34px' }}>
                  <span style={{ fontWeight: '700', flex: '1', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: '1.45' }}>{ex.label}</span><span style={{ fontWeight: '800', whiteSpace: 'nowrap', flexShrink: 0, display: 'block', lineHeight: '1.45' }}>{formatCurrency(ex.total)}</span>
                </div>
              ))}
              <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'right' }}><span style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444' }}>{formatCurrency(totalExpense)}</span></div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '16px 10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e', borderBottom: '2px solid #22c55e', marginBottom: '15px', paddingBottom: '5px' }}>GELİRLER</h3>
              {[...(previousDevir !== 0 ? [{ label: 'ÖNCEKİ AYDAN DEVİR', total: previousDevir }] : []), ...displayIncomeItems].map((inc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px', fontSize: '16px', lineHeight: '1.45', borderBottom: '1px solid #eee', paddingTop: '2px', paddingBottom: '8px', minHeight: '34px' }}>
                  <span style={{ fontWeight: '700', color: inc.label.includes('DEVİR') ? '#2563eb' : '#000', flex: '1', minWidth: 0, display: 'block', lineHeight: '1.45' }}>{inc.label}</span><span style={{ fontWeight: '800', color: inc.label.includes('DEVİR') ? '#2563eb' : '#000', whiteSpace: 'nowrap', flexShrink: 0, display: 'block', lineHeight: '1.45' }}>{formatCurrency(inc.total)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px', fontSize: '16px', lineHeight: '1.45', borderBottom: '1px solid #eee', paddingTop: '2px', paddingBottom: '8px', minHeight: '34px' }}>
                <span style={{ fontWeight: '700', color: '#2563eb', display: 'block', lineHeight: '1.45' }}>FAZLA ÖDEME</span>
                <span style={{ fontWeight: '800', color: '#2563eb', whiteSpace: 'nowrap', flexShrink: 0, display: 'block', lineHeight: '1.45' }}>{formatCurrency(totalCredit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px', fontSize: '16px', lineHeight: '1.45', borderBottom: '1px solid #eee', paddingTop: '2px', paddingBottom: '8px', minHeight: '34px' }}>
                <span style={{ fontWeight: '700', color: '#ef4444', display: 'block', lineHeight: '1.45' }}>AİDAT ALACAĞI</span>
                <span style={{ fontWeight: '800', color: '#ef4444', whiteSpace: 'nowrap', flexShrink: 0, display: 'block', lineHeight: '1.45' }}>{formatCurrency(netDebt)}</span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'right' }}></div>
            </div>
          </div>
          <div style={{ marginTop: '24px', padding: '18px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', fontWeight: '900', color: '#64748b' }}>KASA DURUMU</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: '900' }}>{months[selectedMonth].toUpperCase()} {selectedYear} SONU</p>
            </div>
            <span style={{ fontSize: '32px', fontWeight: '900', color: cashTotal >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(cashTotal)}</span>
          </div>
          <div style={{ marginTop: '50px', textAlign: 'center' }}><p style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>Galata Aidat Takip Sistemi Tarafından Oluşturmuştur</p></div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportView;
