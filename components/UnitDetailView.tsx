
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Edit3, X, Save, Phone, UserCheck, Home, Trash2, Calendar, FileText, Plus, Share2, Loader2, Archive } from 'lucide-react';
import { Unit, BuildingInfo, Transaction, OwnerHistory, TenantHistory } from '../types.ts';
import { PDFService } from '../pdfService';
import { createUnitStatementPdf } from './reportPdfUtils';
import { fixCommonTurkishText } from '../textUtils';
import { appConfirm } from './AppDialog';
import { toLocalIsoDate } from '../dateUtils';

interface UnitDetailViewProps {
  unit: Unit;
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onUpdate: (unit: Unit) => void;
  onDelete: (id: string) => boolean | Promise<boolean>;
  currentDate: Date;
}

const UnitDetailView: React.FC<UnitDetailViewProps> = ({ unit, info, transactions, onClose, onUpdate, currentDate }) => {
  const currentIsoDate = toLocalIsoDate(currentDate);
  const previousDefaultDateRef = useRef(currentIsoDate);
  const [editForm, setEditForm] = useState({ ...unit });
  const [historyModal, setHistoryModal] = useState<null | 'all'>(null);
  const [historyPersonType, setHistoryPersonType] = useState<'owner' | 'tenant'>('owner');
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({ name: '', phone: '', startDate: currentIsoDate });
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editHistoryForm, setEditHistoryForm] = useState({ name: '', phone: '', startDate: '', endDate: '' });
  const [showReport, setShowReport] = useState(false);
  const [isSharingReport, setIsSharingReport] = useState(false);
  const [isEditingDepoNo, setIsEditingDepoNo] = useState(false);
  const [depoNo, setDepoNo] = useState(unit.depoNo || '');

  const cardRef = useRef<HTMLDivElement>(null);
  const months = ["Ocak", "\u015eubat", "Mart", "Nisan", "May\u0131s", "Haziran", "Temmuz", "A\u011fustos", "Eyl\u00fcl", "Ekim", "Kas\u0131m", "Aral\u0131k"];
  const currentYearActual = currentDate.getFullYear();

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(/(\s+)/)
      .map(part => {
        if (part.trim().length > 0) {
          return part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR');
        }
        return part;
      })
      .join('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const getTodayIso = () => toLocalIsoDate(currentDate);

  useEffect(() => {
    setDepoNo(unit.depoNo || '');
  }, [unit.depoNo]);

  const handleSaveDepoNo = () => {
    const normalizedDepoNo = depoNo.trim();
    onUpdate({ ...unit, depoNo: normalizedDepoNo });
    setDepoNo(normalizedDepoNo);
    setIsEditingDepoNo(false);
  };

  useEffect(() => {
    const previousDefaultDate = previousDefaultDateRef.current;
    setHistoryForm(prev => prev.startDate === previousDefaultDate ? { ...prev, startDate: currentIsoDate } : prev);
    previousDefaultDateRef.current = currentIsoDate;
  }, [currentIsoDate]);

  const formatHistoryDate = (date?: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}.${month}.${year}`;
  };

  const createHistoryId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizePersonName = (value: string) => value.trim().toLocaleUpperCase('tr-TR');
  const normalizePhone = (value: string) => value.replace(/\D/g, '');
  const isSamePerson = (aName: string, aPhone: string, bName: string, bPhone: string) =>
    normalizePersonName(aName) === normalizePersonName(bName) && normalizePhone(aPhone) === normalizePhone(bPhone);

  const getOwnerHistory = (): OwnerHistory[] => {
    if (editForm.ownerHistory?.length) return editForm.ownerHistory;
    if (!editForm.ownerName) return [];
    return [{
      id: 'current-owner',
      name: editForm.ownerName,
      phone: editForm.phone || '',
      startDate: '',
      isCurrent: true
    }];
  };

  const getTenantHistory = (): TenantHistory[] => {
    if (editForm.tenantHistory?.length) return editForm.tenantHistory;
    if (!editForm.tenantName) return [];
    return [{
      id: 'current-tenant',
      name: editForm.tenantName,
      phone: editForm.tenantPhone || '',
      startDate: '',
      isCurrent: true
    }];
  };

  const openHistoryModal = () => {
    setEditForm({ ...unit });
    setHistoryModal('all');
    setHistoryPersonType('owner');
    setIsAddingHistory(false);
    setEditingHistoryId(null);
    setHistoryForm({ name: '', phone: '', startDate: getTodayIso() });
  };

  const handleAddHistoryPerson = () => {
    const name = toTitleCase(historyForm.name.trim());
    if (!name) return;

    const phone = historyForm.phone.trim();
    const startDate = historyForm.startDate || getTodayIso();

    setEditForm(prev => {
      let updatedUnit: Unit;

      if (historyPersonType === 'owner') {
        const existingHistory = prev.ownerHistory?.length
          ? prev.ownerHistory
          : prev.ownerName
            ? [{
              id: createHistoryId(),
              name: prev.ownerName,
              phone: prev.phone || '',
              startDate,
              isCurrent: true
            } as OwnerHistory]
            : [];
        const currentOwner = existingHistory.find(item => item.isCurrent);
        if (currentOwner && isSamePerson(currentOwner.name, currentOwner.phone || '', name, phone)) {
          const ownerHistory = existingHistory.filter(item =>
            item.isCurrent || !isSamePerson(item.name, item.phone || '', name, phone)
          );
          updatedUnit = {
            ...prev,
            ownerName: name,
            phone,
            ownerHistory,
            status: prev.tenantName ? 'Kiracı' : 'Malik'
          };
          onUpdate(updatedUnit);
          return updatedUnit;
        }

        const ownerHistory = [
          ...existingHistory
            .filter(item => !isSamePerson(item.name, item.phone || '', name, phone))
            .map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: startDate } : item),
          { id: createHistoryId(), name, phone, startDate, isCurrent: true }
        ];

        updatedUnit = {
          ...prev,
          ownerName: name,
          phone,
          ownerHistory,
          status: prev.tenantName ? 'Kiracı' : 'Malik'
        };

        onUpdate(updatedUnit);
        return updatedUnit;
      }

      const existingHistory = prev.tenantHistory?.length
        ? prev.tenantHistory
        : prev.tenantName
          ? [{
            id: createHistoryId(),
            name: prev.tenantName,
            phone: prev.tenantPhone || '',
            startDate,
            isCurrent: true
          } as TenantHistory]
          : [];

      const tenantHistory = [
        ...existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: startDate } : item),
        { id: createHistoryId(), name, phone, startDate, isCurrent: true }
      ];

      updatedUnit = {
        ...prev,
        tenantName: name,
        tenantPhone: phone,
        tenantHistory,
        status: 'Kiracı'
      };

      onUpdate(updatedUnit);
      return updatedUnit;
    });

    setHistoryForm({ name: '', phone: '', startDate: getTodayIso() });
    setIsAddingHistory(false);
  };

  const beginEditingHistoryPerson = (item: OwnerHistory | TenantHistory, type: 'owner' | 'tenant') => {
    setIsAddingHistory(false);
    setHistoryPersonType(type);
    setEditingHistoryId(item.id);
    setEditHistoryForm({
      name: item.name,
      phone: item.phone || '',
      startDate: item.startDate || '',
      endDate: item.endDate || ''
    });
  };

  const handleSaveHistoryPerson = () => {
    const name = toTitleCase(editHistoryForm.name.trim());
    if (!editingHistoryId || !name) return;

    const phone = editHistoryForm.phone.trim();
    setEditForm(prev => {
      if (historyPersonType === 'owner') {
        const existingHistory: OwnerHistory[] = prev.ownerHistory?.length
          ? prev.ownerHistory
          : prev.ownerName
            ? [{ id: editingHistoryId, name: prev.ownerName, phone: prev.phone || '', startDate: '', isCurrent: true }]
            : [];
        const target = existingHistory.find(item => item.id === editingHistoryId);
        const ownerHistory = existingHistory.map(item => item.id === editingHistoryId ? {
          ...item,
          name,
          phone,
          startDate: editHistoryForm.startDate,
          endDate: item.isCurrent ? undefined : (editHistoryForm.endDate || undefined)
        } : item);
        const updatedUnit: Unit = {
          ...prev,
          ownerName: target?.isCurrent ? name : prev.ownerName,
          phone: target?.isCurrent ? phone : prev.phone,
          ownerHistory
        };
        onUpdate(updatedUnit);
        return updatedUnit;
      }

      const existingHistory: TenantHistory[] = prev.tenantHistory?.length
        ? prev.tenantHistory
        : prev.tenantName
          ? [{ id: editingHistoryId, name: prev.tenantName, phone: prev.tenantPhone || '', startDate: '', isCurrent: true }]
          : [];
      const target = existingHistory.find(item => item.id === editingHistoryId);
      const tenantHistory = existingHistory.map(item => item.id === editingHistoryId ? {
        ...item,
        name,
        phone,
        startDate: editHistoryForm.startDate,
        endDate: item.isCurrent ? undefined : (editHistoryForm.endDate || undefined)
      } : item);
      const updatedUnit: Unit = {
        ...prev,
        tenantName: target?.isCurrent ? name : prev.tenantName,
        tenantPhone: target?.isCurrent ? phone : prev.tenantPhone,
        tenantHistory
      };
      onUpdate(updatedUnit);
      return updatedUnit;
    });

    setEditingHistoryId(null);
  };

  const handleDeleteHistoryPerson = async (item: OwnerHistory | TenantHistory, type: 'owner' | 'tenant') => {
    const label = type === 'owner' ? 'malik' : 'kiracı';
    const firstConfirmed = await appConfirm(
      `${item.name} adlı ${label} kaydını silmek üzeresiniz.${item.isCurrent ? `\n\nBu kayıt aktif olduğu için dairenin güncel ${label} bilgisi de temizlenecek.` : ''}\n\nDevam ederseniz son bir silme onayı daha sorulacak.`,
      '1. Silme Onayı',
      'DEVAM'
    );
    if (!firstConfirmed) return;

    const finalConfirmed = await appConfirm(
      `${item.name} adlı ${label} kaydı kalıcı olarak silinecek.\n\nBu işlem geri alınamaz. Silme işlemini onaylıyor musunuz?`,
      '2. Kesin Silme Onayı',
      'KALICI OLARAK SİL'
    );
    if (!finalConfirmed) return;

    setEditForm(prev => {
      if (type === 'owner') {
        const existingHistory = prev.ownerHistory?.length ? prev.ownerHistory : getOwnerHistory();
        const updatedUnit: Unit = {
          ...prev,
          ownerName: item.isCurrent ? '' : prev.ownerName,
          phone: item.isCurrent ? '' : prev.phone,
          ownerHistory: existingHistory.filter(entry => entry.id !== item.id),
          status: prev.tenantName ? 'Kiracı' : 'Malik'
        };
        onUpdate(updatedUnit);
        return updatedUnit;
      }

      const existingHistory = prev.tenantHistory?.length ? prev.tenantHistory : getTenantHistory();
      const updatedUnit: Unit = {
        ...prev,
        tenantName: item.isCurrent ? '' : prev.tenantName,
        tenantPhone: item.isCurrent ? '' : prev.tenantPhone,
        tenantHistory: existingHistory.filter(entry => entry.id !== item.id),
        status: item.isCurrent ? 'Malik' : prev.status
      };
      onUpdate(updatedUnit);
      return updatedUnit;
    });

    if (editingHistoryId === item.id) setEditingHistoryId(null);
  };

  const getMonthStatus = (mIdx: number) => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if (mIdx > currentMonth) {
      return 'future';
    }

    if (unit.id === info.managerUnitId && info.isManagerExempt) {
      return 'exempt';
    }

    const hasSpecificPayment = transactions.some(tx =>
      tx.unitId === unit.id &&
      tx.type === 'GELİR' &&
      tx.periodMonth === mIdx &&
      tx.periodYear === currentYear
    );

    return hasSpecificPayment ? 'paid' : 'unpaid';
  };

  const unitTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.unitId === unit.id)
      .sort((a, b) => {
        const dateA = a.date ? a.date.split('.').reverse().join('') : '0';
        const dateB = b.date ? b.date.split('.').reverse().join('') : '0';
        return dateB.localeCompare(dateA);
      });
  }, [transactions, unit.id]);

  const generalTransactions = useMemo(() => {
    return unitTransactions.filter(tx => {
      const desc = (tx.description || '').toLocaleLowerCase('tr-TR');
      return !desc.includes('demirbas') && !desc.includes('demirbaş');
    });
  }, [unitTransactions]);

  const accruedDues = useMemo(() => {
    const duesValue = info.duesAmount || 0;
    const isExempt = info.isManagerExempt && unit.id === info.managerUnitId;
    if (duesValue <= 0 || isExempt) return [];

    const entries: Transaction[] = [];
    const currentMonthIdx = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    for (let m = 0; m <= currentMonthIdx; m++) {
      const hasManualDues = generalTransactions.some(tx =>
        tx.type === 'BORÇLANDIRMA' &&
        tx.periodMonth === m &&
        tx.periodYear === currentYear &&
        tx.description.toUpperCase().includes('AİDAT')
      );

      if (!hasManualDues) {
        entries.push({
          id: `accrued-${m}`,
          type: 'BORÇLANDIRMA',
          amount: duesValue,
          description: `${months[m].toUpperCase()} AYI AİDATI`,
          date: `01.${(m + 1).toString().padStart(2, '0')}.${currentYear}`,
          unitId: unit.id,
          periodMonth: m,
          periodYear: currentYear
        } as Transaction);
      }
    }
    return entries;
  }, [info.duesAmount, info.isManagerExempt, info.managerUnitId, unit.id, generalTransactions, currentDate, months]);

  const allDebts = useMemo(() => {
    return [...generalTransactions.filter(tx => tx.type === 'BORÇLANDIRMA'), ...accruedDues]
      .sort((a, b) => {
        const dateA = a.date ? a.date.split('.').reverse().join('') : '0';
        const dateB = b.date ? b.date.split('.').reverse().join('') : '0';
        return dateB.localeCompare(dateA);
      });
  }, [generalTransactions, accruedDues]);

  const reportDebt = unit.debt || 0;
  const reportCredit = unit.credit || 0;
  const demirbasCredit = unit.demirbasCredit || 0;
  const demirbasDebt = unit.demirbasDebt || 0;
  const reportNetBalance = reportCredit - reportDebt;
  const isReportCredit = reportNetBalance >= 0;
  const currentOwnerHistory = useMemo(() => {
    return (unit.ownerHistory || []).find(item => item.isCurrent);
  }, [unit.ownerHistory]);
  const currentTenantHistory = useMemo(() => {
    return (unit.tenantHistory || []).find(item => item.isCurrent);
  }, [unit.tenantHistory]);
  const handleShareReportPdf = async () => {
    setIsSharingReport(true);
    try {
      const pdf = await createUnitStatementPdf({
        buildingName: info.name,
        unitNo: unit.no,
        ownerName: unit.ownerName,
        tenantName: unit.tenantName,
        debts: allDebts.map(debt => ({
          description: debt.description,
          amount: debt.amount,
          date: debt.date
        })),
        payments: generalTransactions
          .filter(transaction => transaction.type === 'GELİR' || transaction.type === 'GİDER')
          .map(payment => ({
            description: payment.description,
            amount: payment.amount,
            date: payment.date
          })),
        totalDebt: reportDebt,
        totalCredit: reportCredit,
        netBalance: Math.abs(reportNetBalance),
        isCredit: isReportCredit
      });

      const fileName = `${unit.no} - ${unit.ownerName || 'Daire'} Ekstre.pdf`.replace(/\s+/g, ' ');
      await PDFService.saveAndShareFromJsPDF(pdf, fileName, true);
    } catch (error) {
      console.error('Daire ekstresi paylaşılamadı:', error);
      alert('PDF paylaşılırken bir hata oluştu.');
    } finally {
      setIsSharingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0 shadow-xl">
        <button onClick={onClose} className="app-back-button">
          <ArrowLeft size={22} />
        </button>
        <button onClick={openHistoryModal} className="embossed-cash bg-white/5 p-2 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5">
          <Edit3 size={20} />
        </button>
      </div>

      <div
        className="flex-1 no-scrollbar overflow-y-auto p-3 space-y-2"
        ref={cardRef}
      >

        {/* ANA BİLGİ ALANI */}
        <section className="space-y-2">
              {/* MALİK KARTI */}
              <div className="bg-[#1e293b]/60 backdrop-blur-xl rounded-[20px] p-3 border border-blue-500/20 shadow-2xl relative overflow-hidden">
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400/30 flex flex-col items-center justify-center shadow-lg shrink-0">
                    <span className="text-[7px] font-black text-white/50 uppercase leading-none mb-0.5">NO</span>
                    <span className="text-lg font-black text-white leading-none">{unit.no}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5 block">MALİK BİLGİLERİ</span>
                    <h2 className="text-[16px] font-black text-white uppercase leading-tight tracking-tight break-words">
                      {unit.ownerName || 'İSİM BELİRTİLMEDİ'}
                    </h2>
                    <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                      <Phone size={10} className="text-green-500" />
                      <span className="text-[12px] font-bold text-green-400 tracking-wide">
                        {unit.phone || 'TELEFON YOK'}
                      </span>
                    </div>
                    {currentOwnerHistory?.startDate && (
                      <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                        <Calendar size={10} className="text-blue-300" />
                        <span className="text-[11px] font-bold text-blue-200 tracking-wide">
                          Giriş: {formatHistoryDate(currentOwnerHistory.startDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2">
                    <Archive size={16} className="shrink-0 text-cyan-300" />
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300/70">Depo No</span>
                    {isEditingDepoNo ? (
                      <input
                        autoFocus
                        type="text"
                        value={depoNo}
                        onChange={(event) => setDepoNo(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSaveDepoNo();
                          if (event.key === 'Escape') {
                            setDepoNo(unit.depoNo || '');
                            setIsEditingDepoNo(false);
                          }
                        }}
                        placeholder="Depo numarası"
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-black text-white outline-none placeholder:text-white/25"
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[13px] font-black text-white">
                        {unit.depoNo || 'Belirtilmedi'}
                      </span>
                    )}
                  </div>
                  {isEditingDepoNo ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDepoNo}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 active:scale-95"
                        aria-label="Depo numarasını kaydet"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDepoNo(unit.depoNo || '');
                          setIsEditingDepoNo(false);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 active:scale-95"
                        aria-label="Depo numarası düzenlemeyi iptal et"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingDepoNo(true)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300 active:scale-95"
                      aria-label="Depo numarasını düzenle"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* KİRACI KARTI (Varsa) */}
              {unit.tenantName && (
                <div className="bg-[#1e293b]/40 backdrop-blur-xl rounded-[20px] p-3 border border-orange-500/20 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                      <UserCheck size={22} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em] mb-0.5 block">KİRACI BİLGİLERİ</span>
                      <h2 className="text-[16px] font-black text-white uppercase leading-tight tracking-tight break-words">
                        {unit.tenantName}
                      </h2>
                      <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                        <Phone size={10} className="text-green-500" />
                        <span className="text-[12px] font-bold text-green-400 tracking-wide">
                          {unit.tenantPhone || 'TELEFON YOK'}
                        </span>
                      </div>
                      {currentTenantHistory?.startDate && (
                        <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                          <Calendar size={10} className="text-orange-300" />
                          <span className="text-[11px] font-bold text-orange-200 tracking-wide">
                            Giriş: {formatHistoryDate(currentTenantHistory.startDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
        </section>

        <>
            {/* Rapor Butonu */}
            <button
              onClick={() => setShowReport(true)}
              className="w-full bg-blue-500/10 backdrop-blur-xl rounded-[18px] py-2.5 border border-blue-500/30 shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-all"
            >
              <FileText size={20} className="text-blue-400" />
              <span className="text-[13px] font-black text-blue-400 uppercase tracking-[0.2em]">RAPOR</span>
            </button>

            <section className="grid grid-cols-2 gap-2">
              <div className="bg-green-500/10 rounded-[18px] p-3 border border-green-500/30 shadow-2xl">
                <h3 className="text-[9px] font-black text-green-500/70 tracking-[0.15em] uppercase mb-1.5">Kredi Bakiyesi</h3>
                <p className="text-[22px] font-black text-green-500 leading-none">₺{formatCurrency(unit.credit)}</p>
              </div>
              <div className="bg-red-500/10 rounded-[18px] p-3 border border-red-500/30 shadow-2xl">
                <h3 className="text-[9px] font-black text-[#ff3b3b]/80 tracking-[0.15em] uppercase mb-1.5">Aidat Borcu</h3>
                <p className="text-[22px] font-black text-[#ff3b3b] leading-none">₺{formatCurrency(unit.debt)}</p>
              </div>
            </section>

            {/* Hesap Özeti - Tablo */}
            <section className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-[#172033] via-[#111827] to-[#0b1220] p-2.5 shadow-2xl">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

          <div className="relative mb-2 flex items-center justify-between px-1">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Mali Durum</h3>
              <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.18em] text-white/25">Daire hesap özeti</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <span className="rounded-lg border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">Kredi</span>
              <span className="rounded-lg border border-rose-400/15 bg-rose-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-rose-300">Borç</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[17px] border border-white/[0.07] bg-black/15">
            {[
              { label: 'Genel Gider', credit: unit.credit, debt: unit.debt },
              { label: 'Demirbaş', credit: demirbasCredit, debt: demirbasDebt }
            ].map((row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_minmax(76px,auto)_minmax(76px,auto)] items-center gap-2 px-3 py-2 ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">{row.label}</span>
                <span className="text-right text-[13px] font-black tracking-tight text-emerald-300">₺{formatCurrency(row.credit)}</span>
                <span className="text-right text-[13px] font-black tracking-tight text-rose-400">₺{formatCurrency(row.debt)}</span>
              </div>
            ))}

            <div className="grid grid-cols-[1fr_minmax(76px,auto)_minmax(76px,auto)] items-center gap-2 border-t border-blue-400/15 bg-gradient-to-r from-blue-500/10 via-white/[0.04] to-rose-500/10 px-3 py-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Toplam</span>
              <span className="text-right text-[16px] font-black tracking-tight text-emerald-300">₺{formatCurrency(unit.credit)}</span>
              <span className="text-right text-[16px] font-black tracking-tight text-rose-400">₺{formatCurrency(unit.debt)}</span>
            </div>
          </div>
            </section>

            {/* Aidat Özeti - Grid */}
            <section className="pb-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">AİDAT ÇİZELGESİ</h3>
            <span className="text-[10px] font-black text-white/10">{currentYearActual}</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {months.map((m, idx) => {
              const status = getMonthStatus(idx);
              let bgColor = 'bg-[#1e293b] border-white/5 opacity-40';

              if (status === 'paid') {
                bgColor = 'bg-green-700/60 border-green-500/40';
              } else if (status === 'unpaid') {
                bgColor = 'bg-rose-800/60 border-rose-500/40';
              } else if (status === 'exempt') {
                bgColor = 'bg-blue-600/40 border-blue-400/20';
              }

              return (
                <div key={m} className={`h-7 flex items-center justify-center rounded-[6px] border transition-all ${bgColor}`}>
                  <span className="text-[9px] font-black text-white leading-none">{idx + 1}</span>
                </div>
              );
            })}
          </div>
            </section>
          </>
      </div>

      {historyModal && (() => {
        const entries = [
          ...getOwnerHistory().map(item => ({ item, personType: 'owner' as const })),
          ...getTenantHistory().map(item => ({ item, personType: 'tenant' as const }))
        ]
          .sort((a, b) => {
            if (a.item.isCurrent !== b.item.isCurrent) return Number(b.item.isCurrent) - Number(a.item.isCurrent);
            const dateA = a.item.endDate || a.item.startDate || '';
            const dateB = b.item.endDate || b.item.startDate || '';
            return dateB.localeCompare(dateA);
          });
        const isAddingOwner = historyPersonType === 'owner';
        return (
          <div className="fixed inset-0 z-[380] bg-black/70 backdrop-blur-md flex items-start justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] animate-in fade-in">
            <div className="w-full max-w-xl max-h-[88vh] overflow-hidden rounded-[28px] bg-[#0f172a] border border-white/10 shadow-2xl flex flex-col">
              <div className="px-5 py-4 border-b border-white/5 bg-[#0f172a] flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-200 flex items-center justify-center shrink-0">
                    <Home size={23} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-black text-white uppercase tracking-wide leading-tight">
                      Malik ve Kiracılar
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHistoryId(null);
                      setHistoryPersonType('owner');
                      setHistoryForm({ name: '', phone: '', startDate: getTodayIso() });
                      setIsAddingHistory(true);
                    }}
                    className="embossed-cash h-10 rounded-xl border border-emerald-400/35 bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={15} />
                    <span>Yeni Ekle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryModal(null);
                      setIsAddingHistory(false);
                      setEditingHistoryId(null);
                    }}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center active:scale-95 transition-all shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {entries.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                    <p className="text-[12px] font-black text-white/35 uppercase tracking-widest">{'Kay\u0131t Yok'}</p>
                  </div>
                ) : (
                  entries.map(({ item, personType }) => {
                    const isOwner = personType === 'owner';
                    return (
                    <div
                      key={`${personType}-${item.id}`}
                      className={`border bg-slate-800/70 px-2.5 py-1.5 shadow-lg transition-colors ${
                        item.isCurrent ? 'border-emerald-400/80' : 'border-slate-400/70'
                      }`}
                    >
                      {editingHistoryId === item.id ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                            <label className="bg-black/20 p-2.5 border border-white/10">
                              <span className="mb-1 block text-[8px] font-black uppercase text-white/40">Ad Soyad</span>
                              <input
                                value={editHistoryForm.name}
                                onChange={(e) => setEditHistoryForm({ ...editHistoryForm, name: toTitleCase(e.target.value) })}
                                className="w-full bg-transparent text-[12px] font-black text-white outline-none"
                              />
                            </label>
                            <label className="bg-black/20 p-2.5 border border-white/10">
                              <span className="mb-1 block text-[8px] font-black uppercase text-white/40">Telefon</span>
                              <input
                                type="tel"
                                value={editHistoryForm.phone}
                                onChange={(e) => setEditHistoryForm({ ...editHistoryForm, phone: e.target.value })}
                                className="w-full bg-transparent text-[12px] font-black text-emerald-400 outline-none"
                              />
                            </label>
                            <label className="bg-black/20 p-2.5 border border-white/10">
                              <span className="mb-1 block text-[8px] font-black uppercase text-white/40">Giriş Tarihi</span>
                              <input
                                type="date"
                                value={editHistoryForm.startDate}
                                onChange={(e) => setEditHistoryForm({ ...editHistoryForm, startDate: e.target.value })}
                                className="w-full bg-transparent text-[12px] font-black text-white outline-none"
                              />
                            </label>
                            {!item.isCurrent && (
                              <label className="bg-black/20 p-2.5 border border-white/10">
                                <span className="mb-1 block text-[8px] font-black uppercase text-white/40">Çıkış Tarihi</span>
                                <input
                                  type="date"
                                  value={editHistoryForm.endDate}
                                  onChange={(e) => setEditHistoryForm({ ...editHistoryForm, endDate: e.target.value })}
                                  className="w-full bg-transparent text-[12px] font-black text-white outline-none"
                                />
                              </label>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingHistoryId(null)}
                              className="inline-flex h-9 items-center gap-1.5 border border-white/15 bg-white/5 px-3 text-[9px] font-black uppercase tracking-wider text-white/65 active:scale-95"
                            >
                              <X size={14} /> İptal
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveHistoryPerson}
                              disabled={!editHistoryForm.name.trim()}
                              className="inline-flex h-9 items-center gap-1.5 border border-emerald-400/40 bg-emerald-600 px-3 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-40 active:scale-95"
                            >
                              <Save size={14} /> Kaydet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
                            <span className={`inline-flex h-7 items-center justify-center px-2.5 text-[9px] font-black uppercase tracking-wide ${
                              isOwner ? 'bg-blue-900/80 text-blue-200' : 'bg-amber-900/80 text-amber-200'
                            }`}>
                              {isOwner ? 'Malik' : 'Kirac\u0131'}
                            </span>
                            <span className={`inline-flex h-7 items-center justify-center px-2.5 text-[9px] font-black uppercase tracking-wide ${
                              item.isCurrent ? 'bg-emerald-800/80 text-emerald-200' : 'bg-slate-600/70 text-slate-200'
                            }`}>
                              {item.isCurrent ? 'Aktif' : 'Pasif'}
                            </span>
                            <p className="min-w-0 truncate text-[11px] font-black uppercase leading-tight text-white">
                              {item.name}
                            </p>
                            <div className="col-span-3 flex min-w-0 items-center justify-between gap-2">
                              {item.phone ? (
                                <a
                                  href={`tel:${item.phone.replace(/\s+/g, '')}`}
                                  className="min-w-0 truncate whitespace-nowrap text-[10px] font-black text-emerald-400"
                                >
                                  {item.phone}
                                </a>
                              ) : (
                                <span className="text-[10px] font-bold text-white/30">Telefon yok</span>
                              )}
                              <p className="shrink-0 whitespace-nowrap text-right text-[9px] font-bold text-slate-100">
                                {item.startDate ? formatHistoryDate(item.startDate) : '-'}
                                {' - '}
                                {item.isCurrent ? 'Devam ediyor' : (item.endDate ? formatHistoryDate(item.endDate) : '-')}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1.5 flex justify-end gap-1.5 border-t border-white/5 pt-1.5">
                            <button
                              type="button"
                              onClick={() => beginEditingHistoryPerson(item, personType)}
                              className="inline-flex h-7 items-center gap-1 border border-blue-400/25 bg-blue-500/10 px-2 text-[8px] font-black uppercase tracking-wider text-blue-200 active:scale-95"
                            >
                              <Edit3 size={12} /> Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryPerson(item, personType)}
                              className="inline-flex h-7 items-center gap-1 border border-red-400/25 bg-red-500/10 px-2 text-[8px] font-black uppercase tracking-wider text-red-200 active:scale-95"
                            >
                              <Trash2 size={12} /> Sil
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    );
                  })
                )}

                {isAddingHistory && (
                  <div className="rounded-[22px] border border-green-400/25 bg-green-500/10 p-4 space-y-3 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHistoryPersonType('owner')}
                        className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                          isAddingOwner
                            ? 'border-blue-400/50 bg-blue-600 text-white'
                            : 'border-white/10 bg-white/5 text-white/45'
                        }`}
                      >
                        Malik
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryPersonType('tenant')}
                        className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                          !isAddingOwner
                            ? 'border-orange-400/50 bg-orange-600 text-white'
                            : 'border-white/10 bg-white/5 text-white/45'
                        }`}
                      >
                        Kiracı
                      </button>
                    </div>
                    <div className="grid gap-3 min-[520px]:grid-cols-2">
                      <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                        <label className="text-[8px] font-black text-white/35 uppercase block mb-1">Ad Soyad</label>
                        <input
                          className="bg-transparent text-sm font-black text-white w-full outline-none"
                          value={historyForm.name}
                          placeholder={isAddingOwner ? 'Yeni malik adı' : 'Yeni kiracı adı'}
                          onChange={(e) => setHistoryForm({ ...historyForm, name: toTitleCase(e.target.value) })}
                        />
                      </div>
                      <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                        <label className="text-[8px] font-black text-white/35 uppercase block mb-1">Telefon</label>
                        <input
                          className="bg-transparent text-sm font-bold text-green-400 w-full outline-none"
                          value={historyForm.phone}
                          placeholder="Telefon"
                          onChange={(e) => setHistoryForm({ ...historyForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                      <label className="text-[8px] font-black text-white/35 uppercase block mb-1">
                        {isAddingOwner ? 'Malik Giriş / Devir Tarihi' : 'Kiracı Giriş Tarihi'}
                      </label>
                      <input
                        type="date"
                        className="bg-transparent text-sm font-black text-white w-full outline-none"
                        value={historyForm.startDate}
                        onChange={(e) => setHistoryForm({ ...historyForm, startDate: e.target.value })}
                      />
                      <p className="mt-1.5 text-[9px] font-bold text-white/35">
                        Yeni kayıt eklenince mevcut {isAddingOwner ? 'malikin satış/çıkış' : 'kiracının çıkış'} tarihi bu tarih olur.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddHistoryPerson}
                      disabled={!historyForm.name.trim()}
                      className="embossed-cash w-full h-12 rounded-2xl bg-green-600 text-white text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:active:scale-100 active:scale-95 transition-all"
                    >
                      <Save size={17} />
                      <span>Kaydet</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rapor (Bilanço) Overlay */}
      {showReport && (
        <div className="fixed inset-0 z-[400] bg-[#0f172a] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0 shadow-xl">
            <button onClick={() => setShowReport(false)} className="app-back-button">
              <ArrowLeft size={22} />
            </button>
            <div className="text-center">
              <h3 className="text-[17px] font-black text-white uppercase tracking-widest leading-none">DAİRE EKSTRESİ</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase mt-1">HESAP HAREKET BİLANÇOSU</p>
            </div>
            <button
              type="button"
              onClick={handleShareReportPdf}
              disabled={isSharingReport}
              aria-label="Daire ekstresini PDF olarak paylaş"
              className="embossed-cash flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-blue-200 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isSharingReport ? <Loader2 size={19} className="animate-spin" /> : <Share2 size={19} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
            {/* Üst Bilgi Özeti */}
            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden ring-1 ring-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">TOPLAM BORÇ</p>
                  <p className="text-2xl font-black text-red-500">₺{formatCurrency(reportDebt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">KREDİ BAKİYESİ</p>
                  <p className="text-2xl font-black text-green-500">₺{formatCurrency(reportCredit)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-black text-white/60 uppercase">MEVCUT DURUM</span>
                <span className={`text-xl font-black ${isReportCredit ? 'text-green-500' : 'text-red-500'}`}>
                  ₺{formatCurrency(Math.abs(reportNetBalance))}
                  <span className="text-[10px] ml-1 uppercase font-black">
                    {isReportCredit ? 'ALACAKLI' : 'BORÇLU'}
                  </span>
                </span>
              </div>
            </div>

            {/* İki Sütunlu Bilanço */}
            <div className="bg-[#1e293b]/40 rounded-[32px] border border-white/5 px-2 py-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
              <div className="grid grid-cols-1 gap-6 relative min-[380px]:grid-cols-2 min-[380px]:gap-3">
                <div className="absolute left-1/2 top-0 bottom-0 hidden w-[1px] bg-white/10 min-[380px]:block" />

                {/* Sol Taraf: Borçlandırmalar */}
                <div>
                  <h3 className="text-[13px] font-black text-red-500 mb-2 pb-1 border-b border-red-500/20 tracking-wide uppercase">BORÇLAR</h3>
                  <div className="space-y-3 min-h-[200px]">
                    {allDebts.length === 0 ? (
                      <div className="h-full flex items-center justify-center opacity-20 py-10"><span className="text-[8px] font-black uppercase italic">Kayıt Yok</span></div>
                    ) : (
                      allDebts.map((ex, i) => (
                        <div key={i} className="flex flex-col border-b border-white/5 pb-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[11px] font-black text-white pr-1 leading-tight uppercase">{fixCommonTurkishText(ex.description.split('[')[0])}</span>
                            <span className="text-[11px] font-black text-[#ff3b3b] shrink-0">₺{formatCurrency(ex.amount)}</span>
                          </div>
                          <span className="text-[8px] font-bold text-white/30 mt-1">{ex.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-6 text-right pt-2 border-t border-white/10">
                    <span className="text-[10px] font-black text-white/30 mr-2 uppercase">TOPLAM</span>
                    <span className="text-[16px] font-black text-red-500 tracking-tighter">₺{formatCurrency(reportDebt)}</span>
                  </div>
                </div>

                {/* Sağ Taraf: Ödemeler */}
                <div>
                  <h3 className="text-[13px] font-black text-green-500 mb-2 pb-1 border-b border-green-500/20 tracking-wide uppercase">ÖDEMELER</h3>
                  <div className="space-y-3 min-h-[200px]">
                    {generalTransactions.filter(tx => tx.type === 'GELİR' || tx.type === 'GİDER').length === 0 ? (
                      <div className="h-full flex items-center justify-center opacity-20 py-10"><span className="text-[8px] font-black uppercase italic">Kayıt Yok</span></div>
                    ) : (
                      generalTransactions.filter(tx => tx.type === 'GELİR' || tx.type === 'GİDER').map((inc, i) => (
                        <div key={i} className="flex flex-col border-b border-white/5 pb-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[11px] font-black text-white pr-1 leading-tight uppercase">{fixCommonTurkishText(inc.description.split('[')[0])}</span>
                            <span className={`text-[11px] font-black shrink-0 ${inc.type === 'GELİR' ? 'text-green-400' : 'text-orange-400'}`}>
                              {inc.type === 'GELİR' ? '' : '-'}₺{formatCurrency(inc.amount)}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold text-white/30 mt-1">{inc.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-6 text-right pt-2 border-t border-white/10">
                    <span className="text-[10px] font-black text-white/30 mr-2 uppercase">KREDİ BAKİYESİ</span>
                    <span className="text-[16px] font-black text-green-500 tracking-tighter">₺{formatCurrency(reportCredit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center py-6">
              <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">Galata Aidat Takip Sistemi</p>
            </div>
          </div>
        </div>
      )}
      {isSharingReport && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in">
          <Loader2 size={38} className="mb-3 animate-spin text-blue-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white">PDF hazırlanıyor</span>
        </div>
      )}
    </div>
  );
};

export default UnitDetailView;
