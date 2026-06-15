import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowRight, History, Loader2, CalendarDays } from 'lucide-react';
import { BalanceSummary, BuildingInfo, Unit, Transaction } from '../types.ts';
import DatePickerModal from './DatePickerModal';
import { appConfirm } from './AppDialog';
import { fixCommonTurkishText } from '../textUtils';

interface CarryOverViewProps {
  units: Unit[];
  transactions: Transaction[];
  info: BuildingInfo;
  appBalance: BalanceSummary;
  onCarryOver: (transactions: Transaction[]) => void;
  onClose: () => void;
}

type VaultType = 'genel' | 'demirbas';

const ACCOUNTING_START_YEAR = 2026;

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const formatCurrency = (value: number) =>
  value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizeText = (value: string) =>
  value
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');

const parseYearFromDate = (date: string) => {
  const parts = date.split('.');
  if (parts.length === 3) return Number(parts[2]);
  const isoParts = date.split('-');
  if (isoParts.length === 3) return Number(isoParts[0]);
  return NaN;
};

const getTransactionVault = (tx: Transaction): VaultType => {
  const description = normalizeText(tx.description || '');
  return description.includes('DEMIRBAS') ? 'demirbas' : 'genel';
};

const isCreditBalanceTransaction = (tx: Transaction) =>
  normalizeText(tx.description || '').includes('KREDI');

const isCarryOverCreditTransaction = (tx: Transaction) => {
  if (tx.type !== 'GELİR' || !tx.unitId) return false;
  const description = normalizeText(tx.description || '');
  return description.includes('DEVIR') && description.includes('ALACAK');
};

const isCashlessIncomeTransaction = (tx: Transaction) =>
  isCreditBalanceTransaction(tx) || isCarryOverCreditTransaction(tx);

const isYearCarryOverTransaction = (tx: Transaction, year: number) => {
  const description = normalizeText(tx.description || '');
  if (!description.includes('DEVIR')) return false;
  if (description.includes(`${year} YIL DEVIR`) || description.includes(`DEVIR-YIL:${year}`)) return true;

  const txYear = parseYearFromDate(tx.date || '');
  const isLegacyCarryOver = description.includes('GECMIS DONEMDEN DEVIR') || description.includes('ACILIS DEVIR');
  return isLegacyCarryOver && (tx.periodYear === year + 1 || txYear === year + 1);
};

const isSystemDuesDebtTransaction = (tx: Transaction) => {
  if (tx.type !== 'BORÇLANDIRMA') return false;
  const description = normalizeText(tx.description || '');
  return description.includes('AIDAT') &&
    (tx.periodMonth !== undefined || tx.periodYear !== undefined || description.includes('BORCU'));
};

const getTransferDirection = (tx: Transaction): { from: VaultType; to: VaultType } | null => {
  if (tx.type !== 'TRANSFER') return null;
  const description = normalizeText(tx.description || '');
  const generalIndex = description.indexOf('GENEL');
  const demirbasIndex = description.indexOf('DEMIRBAS');
  if (generalIndex === -1 || demirbasIndex === -1) return null;
  return generalIndex < demirbasIndex
    ? { from: 'genel', to: 'demirbas' }
    : { from: 'demirbas', to: 'genel' };
};

const CarryOverView: React.FC<CarryOverViewProps> = ({ units, transactions, info, appBalance, onCarryOver, onClose }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (let year = ACCOUNTING_START_YEAR; year <= currentYear; year++) years.add(year);
    transactions.forEach(tx => {
      const txYear = parseYearFromDate(tx.date || '');
      if (!Number.isNaN(txYear) && txYear >= ACCOUNTING_START_YEAR && txYear <= currentYear) years.add(txYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(yearOptions[0] || ACCOUNTING_START_YEAR);
  const [selectedDate, setSelectedDate] = useState(`${(yearOptions[0] || ACCOUNTING_START_YEAR) + 1}-01-01`);

  useEffect(() => {
    setSelectedDate(`${selectedYear + 1}-01-01`);
  }, [selectedYear]);

  const selectedDateYear = Number(selectedDate.split('-')[0]);
  const selectedDateMonth = Number(selectedDate.split('-')[1]) - 1;
  const selectedDateDay = selectedDate.split('-')[2] || '01';
  const selectedDateMonthLabel = months[selectedDateMonth] || '';
  const formattedDate = `${selectedDateDay}.${String(selectedDateMonth + 1).padStart(2, '0')}.${selectedDateYear}`;
  const minimumCarryDateYear = selectedYear + 1;
  const isYearEndReached = now.getTime() >= new Date(selectedYear, 11, 31, 0, 0, 0, 0).getTime();
  const isSelectedDateValid = selectedDate.split('-').length === 3 &&
    !Number.isNaN(selectedDateYear) &&
    selectedDateMonth >= 0 &&
    selectedDateMonth <= 11;

  const isSelectedYearClosed = isSelectedDateValid && selectedDateYear >= minimumCarryDateYear && isYearEndReached;
  const hasCarryOverForYear = useMemo(
    () => transactions.some(tx => isYearCarryOverTransaction(tx, selectedYear)),
    [transactions, selectedYear]
  );

  const previousYearTransactions = useMemo(() => {
    return transactions
      .filter(tx => parseYearFromDate(tx.date || '') === selectedYear)
      .filter(tx => !(selectedYear === 2025 && isSystemDuesDebtTransaction(tx)))
      .sort((a, b) => {
        const [da = 1, ma = 1, ya = selectedYear] = (a.date || '').split('.').map(Number);
        const [db = 1, mb = 1, yb = selectedYear] = (b.date || '').split('.').map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
      });
  }, [transactions, selectedYear]);

  const transactionsUntilSelectedYear = useMemo(
    () => transactions.filter(tx => {
      const txYear = parseYearFromDate(tx.date || '');
      if (selectedYear === 2025 && isSystemDuesDebtTransaction(tx)) return false;
      return !Number.isNaN(txYear) && txYear >= ACCOUNTING_START_YEAR && txYear <= selectedYear;
    }),
    [transactions, selectedYear]
  );

  const closingBalance = useMemo(() => {
    if (selectedYear === currentYear) {
      return {
        cashByVault: {
          genel: appBalance.mevcutBakiye || 0,
          demirbas: appBalance.demirbasKasasi || 0
        },
        unitsWithClosingBalances: units,
        generalDebt: appBalance.alacakBakiyesi || 0,
        generalCredit: units.reduce((sum, unit) => sum + Math.max(0, (unit.credit || 0) - (unit.debt || 0)), 0),
        demirbasDebt: appBalance.demirbasAlacakBakiyesi || 0,
        demirbasCredit: units.reduce((sum, unit) => sum + Math.max(0, (unit.demirbasCredit || 0) - (unit.demirbasDebt || 0)), 0)
      };
    }

    const cashByVault: Record<VaultType, number> = { genel: 0, demirbas: 0 };
    transactionsUntilSelectedYear.forEach(tx => {
      const transfer = getTransferDirection(tx);
      if (transfer) {
        cashByVault[transfer.from] -= tx.amount;
        cashByVault[transfer.to] += tx.amount;
        return;
      }
      if (isCashlessIncomeTransaction(tx)) return;
      const vault = getTransactionVault(tx);
      if (tx.type === 'GELİR') cashByVault[vault] += tx.amount;
      if (tx.type === 'GİDER') cashByVault[vault] -= tx.amount;
    });

    const unitsWithClosingBalances = units.map(unit => {
      const unitTransactions = transactionsUntilSelectedYear.filter(tx => tx.unitId === unit.id);
      const generalTransactions = unitTransactions.filter(tx => getTransactionVault(tx) === 'genel');
      const demirbasTransactions = unitTransactions.filter(tx => getTransactionVault(tx) === 'demirbas');
      const totalIncome = generalTransactions.filter(tx => tx.type === 'GELİR' && !isCashlessIncomeTransaction(tx)).reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpense = generalTransactions.filter(tx => tx.type === 'GİDER').reduce((sum, tx) => sum + tx.amount, 0);
      const totalManualDebt = generalTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((sum, tx) => sum + tx.amount, 0);
      const totalDemirbasIncome = demirbasTransactions.filter(tx => tx.type === 'GELİR' && !isCashlessIncomeTransaction(tx)).reduce((sum, tx) => sum + tx.amount, 0);
      const totalDemirbasExpense = demirbasTransactions.filter(tx => tx.type === 'GİDER').reduce((sum, tx) => sum + tx.amount, 0);
      const totalDemirbasDebt = demirbasTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((sum, tx) => sum + tx.amount, 0);

      let paidDues = 0;
      let unpaidDues = 0;
      const duesValue = info.duesAmount || 0;
      const isExempt = info.isManagerExempt && unit.id === info.managerUnitId;
      if (duesValue > 0 && !isExempt) {
        const lastDuesMonth = selectedYear < currentYear ? 11 : currentMonth;
        for (let month = 0; month <= lastDuesMonth; month++) {
          const hasManualDues = generalTransactions.some(tx =>
            tx.type === 'BORÇLANDIRMA' &&
            tx.periodMonth === month &&
            tx.periodYear === selectedYear &&
            normalizeText(tx.description || '').includes('AIDAT')
          );
          if (!hasManualDues) {
            const paid = generalTransactions.some(tx =>
              tx.type === 'GELİR' &&
              tx.periodMonth === month &&
              tx.periodYear === selectedYear
            );
            if (paid) paidDues += duesValue;
            else unpaidDues += duesValue;
          }
        }
      }

      return {
        ...unit,
        credit: Math.max(0, totalIncome - totalExpense - paidDues),
        debt: totalManualDebt + unpaidDues,
        demirbasCredit: Math.max(0, totalDemirbasIncome - totalDemirbasExpense),
        demirbasDebt: totalDemirbasDebt
      };
    });

    const generalDebt = unitsWithClosingBalances.reduce((sum, unit) => sum + Math.max(0, unit.debt - unit.credit), 0);
    const generalCredit = unitsWithClosingBalances.reduce((sum, unit) => sum + Math.max(0, unit.credit - unit.debt), 0);
    const demirbasDebt = unitsWithClosingBalances.reduce((sum, unit) => sum + Math.max(0, (unit.demirbasDebt || 0) - (unit.demirbasCredit || 0)), 0);
    const demirbasCredit = unitsWithClosingBalances.reduce((sum, unit) => sum + Math.max(0, (unit.demirbasCredit || 0) - (unit.demirbasDebt || 0)), 0);

    return {
      cashByVault,
      unitsWithClosingBalances,
      generalDebt,
      generalCredit,
      demirbasDebt,
      demirbasCredit
    };
  }, [transactionsUntilSelectedYear, units, info, selectedYear, currentYear, currentMonth, appBalance]);

  const carryPreviewCount = useMemo(() => {
    let count = 0;
    if (closingBalance.cashByVault.genel !== 0) count += 1;
    if (closingBalance.cashByVault.demirbas !== 0) count += 1;
    closingBalance.unitsWithClosingBalances.forEach(unit => {
      if ((unit.credit || 0) - (unit.debt || 0) !== 0) count += 1;
      if ((unit.demirbasCredit || 0) - (unit.demirbasDebt || 0) !== 0) count += 1;
    });
    return count;
  }, [closingBalance]);

  const handleProcess = async () => {
    if (!isSelectedDateValid) {
      alert('Lütfen geçerli bir devir tarihi seçin.');
      return;
    }
    if (!isYearEndReached) {
      alert(`${selectedYear} yılı devri 31.12.${selectedYear} tarihinden önce yapılamaz.`);
      return;
    }
    if (!isSelectedYearClosed) {
      alert(`${selectedYear} yılı devri için devir tarihi en erken ${minimumCarryDateYear} yılı olmalıdır.`);
      return;
    }
    if (hasCarryOverForYear) {
      alert(`${selectedYear} yılı devri daha önce yapılmış. Aynı yıl için ikinci devir oluşturulamaz.`);
      return;
    }

    const confirmMessage = `${selectedYear} yılı kapanış bakiyeleri ${formattedDate} tarihine DEVİR olarak aktarılacak.\n\nEski hareketler kayıtlarda görünmeye devam edecek; yeni döneme sadece kasa, borç ve kredi bakiyeleri açılış kaydı olarak yansıyacak. Onaylıyor musunuz?`;
    if (!(await appConfirm(confirmMessage))) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    const carryTransactions: Transaction[] = [];
    const createTransaction = (type: Transaction['type'], amount: number, description: string, unitId?: string): Transaction => ({
      id: Math.random().toString(36).slice(2),
      type,
      amount,
      description: `${selectedYear} YIL DEVİR ${description} [devir-yil:${selectedYear}]`,
      unitId,
      date: formattedDate
    });

    const addCashCarry = (amount: number, vault: VaultType) => {
      if (amount === 0) return;
      const label = vault === 'genel' ? 'GENEL KASA AÇILIŞ' : 'DEMİRBAŞ KASASI AÇILIŞ';
      carryTransactions.push(createTransaction(
        amount > 0 ? 'GELİR' : 'GİDER',
        Math.abs(amount),
        `${label} [${vault}]`
      ));
    };

    addCashCarry(closingBalance.cashByVault.genel, 'genel');
    addCashCarry(closingBalance.cashByVault.demirbas, 'demirbas');

    closingBalance.unitsWithClosingBalances.forEach(unit => {
      const generalBalance = (unit.credit || 0) - (unit.debt || 0);
      if (generalBalance > 0) {
        carryTransactions.push(createTransaction('GELİR', generalBalance, 'ALACAK [genel]', unit.id));
      } else if (generalBalance < 0) {
        carryTransactions.push(createTransaction('BORÇLANDIRMA', Math.abs(generalBalance), 'BORÇ [genel]', unit.id));
      }

      const demirbasBalance = (unit.demirbasCredit || 0) - (unit.demirbasDebt || 0);
      if (demirbasBalance > 0) {
        carryTransactions.push(createTransaction('GELİR', demirbasBalance, 'ALACAK [demirbas]', unit.id));
      } else if (demirbasBalance < 0) {
        carryTransactions.push(createTransaction('BORÇLANDIRMA', Math.abs(demirbasBalance), 'BORÇ [demirbas]', unit.id));
      }
    });

    if (carryTransactions.length === 0) {
      setIsProcessing(false);
      alert(`${selectedYear} yılı için devredilecek kasa, borç veya kredi bakiyesi bulunamadı.`);
      return;
    }

    onCarryOver([...carryTransactions, ...transactions]);
    setIsProcessing(false);
    onClose();
    alert(`${selectedYear} yılı için ${carryTransactions.length} adet devir kaydı oluşturuldu.`);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[98dvh] max-h-[98dvh]">
        <div className="relative p-5 border-b border-white/5 flex items-center justify-center bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a]">
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
            <History className="text-emerald-400" size={20} />
            <h3 className="text-[17px] font-black text-white uppercase tracking-wider">BAKİYE DEVRİ</h3>
          </div>
          <button onClick={onClose} className="absolute right-6 text-white/20 hover:text-white p-2 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="px-5 pb-5 pt-3 flex-1 overflow-hidden space-y-3">
          <div className="rounded-2xl border border-sky-300/35 bg-sky-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_0_rgba(2,6,23,0.34),0_16px_26px_rgba(0,0,0,0.22)]">
            <p className="text-[10.5px] font-black leading-relaxed text-sky-100 uppercase">
              Yıl devri, seçilen yılın kapanış bakiyesini alır. Eski hareketler kayıtlarda kalır; yeni döneme sadece kasa, borç ve kredi bakiyeleri açılış kaydı olur. {selectedYear} devri 01.01.{selectedYear + 1} açılışı içindir.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/50 uppercase ml-2">Devredilecek Yıl</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={18} />
                <select
                  value={selectedYear}
                  onChange={event => setSelectedYear(Number(event.target.value))}
                  className="h-[46px] w-full appearance-none rounded-xl border border-white/5 bg-black/20 pl-10 pr-3 text-[17px] font-bold text-white outline-none transition-all active:scale-95"
                >
                  {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/50 uppercase ml-2">Devir Tarihi</label>
              <DatePickerModal value={selectedDate} onChange={setSelectedDate} className="bg-white/5 border-white/10 rounded-2xl px-4 py-4 text-white font-bold" />
            </div>
          </div>

          <div className={`rounded-2xl px-2.5 py-4 border shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_7px_0_rgba(2,6,23,0.32),0_14px_24px_rgba(0,0,0,0.20)] ${isSelectedYearClosed && !hasCarryOverForYear ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/12 border-amber-300/35'}`}>
            <p className={`whitespace-nowrap text-left text-[10px] font-black uppercase leading-none ${isSelectedYearClosed && !hasCarryOverForYear ? 'text-emerald-300' : 'text-amber-100'}`}>
              {!isYearEndReached
                ? `${selectedYear} yılı devri 31.12.${selectedYear} tarihinden önce yapılamaz.`
                : !isSelectedYearClosed
                  ? `Devir tarihi en erken ${minimumCarryDateYear} yılı içinde olmalıdır.`
                  : hasCarryOverForYear
                    ? `${selectedYear} yılı devri daha önce yapılmış.`
                    : `${selectedYear} yılı devri ${selectedDateMonthLabel} ${selectedDateYear} tarihi için yapılabilir.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="embossed-cash bg-white/5 rounded-2xl px-3 py-2.5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_0_rgba(2,6,23,0.30),0_13px_20px_rgba(0,0,0,0.18)]">
              <span className="block text-[8px] font-black text-white/50 uppercase">Genel Kasa</span>
              <strong className="embossed-cash-value block text-[19px] font-black leading-tight text-white">₺{formatCurrency(closingBalance.cashByVault.genel)}</strong>
            </div>
            <div className="embossed-cash bg-white/5 rounded-2xl px-3 py-2.5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_0_rgba(2,6,23,0.30),0_13px_20px_rgba(0,0,0,0.18)]">
              <span className="block text-[8px] font-black text-white/50 uppercase">Demirbaş Kasa</span>
              <strong className="embossed-cash-value block text-[19px] font-black leading-tight text-white">₺{formatCurrency(closingBalance.cashByVault.demirbas)}</strong>
            </div>
            <div className="bg-white/5 rounded-2xl px-3 py-2.5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_0_rgba(2,6,23,0.30),0_13px_20px_rgba(0,0,0,0.18)]">
              <span className="block text-[8px] font-black text-white/50 uppercase">Borç Bakiyesi</span>
              <strong className="block text-[19px] font-black leading-tight text-red-400">₺{formatCurrency(closingBalance.generalDebt + closingBalance.demirbasDebt)}</strong>
            </div>
            <div className="bg-white/5 rounded-2xl px-3 py-2.5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_0_rgba(2,6,23,0.30),0_13px_20px_rgba(0,0,0,0.18)]">
              <span className="block text-[8px] font-black text-white/50 uppercase">Kredi Bakiyesi</span>
              <strong className="block text-[19px] font-black leading-tight text-emerald-400">₺{formatCurrency(closingBalance.generalCredit + closingBalance.demirbasCredit)}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-white/50 uppercase ml-2">Oluşacak Devir Kaydı ({carryPreviewCount})</label>
            <div className="space-y-1 max-h-[88px] overflow-y-auto pr-2 no-scrollbar">
              {closingBalance.unitsWithClosingBalances.map(unit => {
                const generalBalance = (unit.credit || 0) - (unit.debt || 0);
                const demirbasBalance = (unit.demirbasCredit || 0) - (unit.demirbasDebt || 0);
                if (generalBalance === 0 && demirbasBalance === 0) return null;
                return (
                  <div key={unit.id} className="bg-white/5 rounded-2xl px-3 py-2 flex items-center justify-between border border-white/5">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-black text-white">{unit.no}. Daire</span>
                      <span className="text-[9px] font-bold text-white/50 truncate max-w-[140px] uppercase">{unit.ownerName}</span>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {generalBalance !== 0 && (
                        <div className={`text-[11px] font-black ${generalBalance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Genel {generalBalance > 0 ? '+' : ''}{formatCurrency(generalBalance)}
                        </div>
                      )}
                      {demirbasBalance !== 0 && (
                        <div className={`text-[11px] font-black ${demirbasBalance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Demirbaş {demirbasBalance > 0 ? '+' : ''}{formatCurrency(demirbasBalance)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-white/50 uppercase ml-2">{selectedYear} Yılı Hareketleri ({previousYearTransactions.length})</label>
            <div className="space-y-1 max-h-[88px] overflow-y-auto pr-2 no-scrollbar">
              {previousYearTransactions.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-[10px] font-bold text-white/50 uppercase">
                  Bu yıl için hareket bulunamadı.
                </div>
              ) : previousYearTransactions.map(tx => (
                <div key={tx.id} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between gap-3 border border-white/5">
                  <div className="min-w-0">
                    <span className="block text-[9.5px] font-black text-white truncate leading-tight">{fixCommonTurkishText(tx.description.split('[')[0].trim())}</span>
                    <span className="block text-[7.5px] font-bold text-white/50 uppercase leading-tight">{tx.date} - {tx.type}</span>
                  </div>
                  <span className={`shrink-0 text-[11px] font-black ${tx.type === 'GİDER' || tx.type === 'BORÇLANDIRMA' ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₺{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 bg-white/[0.02] border-t border-white/5">
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-40"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="font-black text-xs tracking-[0.2em] uppercase">YIL DEVİR İŞLEMİNİ YAP</span>
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
