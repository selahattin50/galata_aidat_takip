
import React, { useRef, useState, useMemo } from 'react';
import { ArrowLeft, Edit3, X, Save, Phone, Info, UserCheck, User, Home, Trash2, Calendar, ArrowRight, FileText, Loader2, Plus } from 'lucide-react';
import { Unit, BuildingInfo, Transaction, OwnerHistory, TenantHistory } from '../types.ts';
import { PDFService } from '../pdfService';
import { createUnitStatementPdf } from './reportPdfUtils';
import PdfActionButton from './PdfActionButton';
import { fixCommonTurkishText } from '../textUtils';
import { appConfirm } from './AppDialog';

interface UnitDetailViewProps {
  unit: Unit;
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onUpdate: (unit: Unit) => void;
  onDelete: (id: string) => boolean | Promise<boolean>;
  currentDate: Date;
}

const UnitDetailView: React.FC<UnitDetailViewProps> = ({ unit, info, transactions, onClose, onUpdate, onDelete, currentDate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...unit });
  const [historyModal, setHistoryModal] = useState<null | 'owner' | 'tenant'>(null);
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({ name: '', phone: '', startDate: currentDate.toISOString().split('T')[0] });
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const getTodayIso = () => currentDate.toISOString().split('T')[0];

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

  const makeCurrentOwnerHistory = (targetUnit: Unit, startDate: string): OwnerHistory[] => {
    if (targetUnit.ownerHistory?.length) return targetUnit.ownerHistory;
    if (!targetUnit.ownerName) return [];
    return [{
      id: createHistoryId(),
      name: targetUnit.ownerName,
      phone: targetUnit.phone || '',
      startDate,
      isCurrent: true
    }];
  };

  const syncOwnerHistoryForSave = (targetUnit: Unit): Unit => {
    const today = getTodayIso();
    const ownerName = toTitleCase((targetUnit.ownerName || '').trim());
    const ownerPhone = (targetUnit.phone || '').trim();
    const existingHistory = makeCurrentOwnerHistory(targetUnit, today);
    const currentOwner = existingHistory.find(item => item.isCurrent);

    if (!ownerName) {
      return {
        ...targetUnit,
        ownerName: '',
        phone: '',
        ownerHistory: existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || today } : item),
        status: targetUnit.tenantName ? 'Kiracı' : 'Malik'
      };
    }

    if (currentOwner && isSamePerson(currentOwner.name, currentOwner.phone || '', ownerName, ownerPhone)) {
      const ownerHistory = existingHistory.filter(item =>
        item.isCurrent || !isSamePerson(item.name, item.phone || '', ownerName, ownerPhone)
      );
      return {
        ...targetUnit,
        ownerName,
        phone: ownerPhone,
        ownerHistory,
        status: targetUnit.tenantName ? 'Kiracı' : 'Malik'
      };
    }

    const ownerHistory = [
      ...existingHistory
        .filter(item => !isSamePerson(item.name, item.phone || '', ownerName, ownerPhone))
        .map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || today } : item),
      { id: createHistoryId(), name: ownerName, phone: ownerPhone, startDate: today, isCurrent: true }
    ];

    return {
      ...targetUnit,
      ownerName,
      phone: ownerPhone,
      ownerHistory,
      status: targetUnit.tenantName ? 'Kiracı' : 'Malik'
    };
  };

  const makeCurrentTenantHistory = (targetUnit: Unit, startDate: string): TenantHistory[] => {
    if (targetUnit.tenantHistory?.length) return targetUnit.tenantHistory;
    if (!targetUnit.tenantName) return [];
    return [{
      id: createHistoryId(),
      name: targetUnit.tenantName,
      phone: targetUnit.tenantPhone || '',
      startDate,
      isCurrent: true
    }];
  };

  const syncTenantHistoryForSave = (targetUnit: Unit): Unit => {
    const today = getTodayIso();
    const tenantName = toTitleCase((targetUnit.tenantName || '').trim());
    const tenantPhone = (targetUnit.tenantPhone || '').trim();
    const existingHistory = makeCurrentTenantHistory(targetUnit, today);
    const currentTenant = existingHistory.find(item => item.isCurrent);

    if (!tenantName) {
      return {
        ...targetUnit,
        tenantName: '',
        tenantPhone: '',
        tenantHistory: existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || today } : item),
        status: 'Malik'
      };
    }

    if (currentTenant && currentTenant.name === tenantName && currentTenant.phone === tenantPhone) {
      return {
        ...targetUnit,
        tenantName,
        tenantPhone,
        tenantHistory: existingHistory,
        status: 'Kiracı'
      };
    }

    const tenantHistory = [
      ...existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || today } : item),
      { id: createHistoryId(), name: tenantName, phone: tenantPhone, startDate: today, isCurrent: true }
    ];

    return {
      ...targetUnit,
      tenantName,
      tenantPhone,
      tenantHistory,
      status: 'Kiracı'
    };
  };

  const vacateTenantInUnit = (targetUnit: Unit): Unit => {
    const today = getTodayIso();
    const currentName = toTitleCase((targetUnit.tenantName || '').trim());
    const currentPhone = (targetUnit.tenantPhone || '').trim();
    const existingHistory = targetUnit.tenantHistory?.length
      ? targetUnit.tenantHistory
      : currentName
        ? [{
          id: createHistoryId(),
          name: currentName,
          phone: currentPhone,
          startDate: today,
          isCurrent: true
        } as TenantHistory]
        : [];

    return {
      ...targetUnit,
      tenantName: '',
      tenantPhone: '',
      tenantHistory: existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || today } : item),
      status: 'Malik'
    };
  };

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

  const openHistoryModal = (type: 'owner' | 'tenant') => {
    setHistoryModal(type);
    setIsAddingHistory(false);
    setHistoryForm({ name: '', phone: '', startDate: getTodayIso() });
  };

  const handleAddHistoryPerson = () => {
    const name = toTitleCase(historyForm.name.trim());
    if (!historyModal || !name) return;

    const phone = historyForm.phone.trim();
    const startDate = historyForm.startDate || getTodayIso();

    setEditForm(prev => {
      let updatedUnit: Unit;

      if (historyModal === 'owner') {
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

  const handleClearPerson = async (type: 'owner' | 'tenant') => {
    const isOwner = type === 'owner';
    const label = isOwner ? 'Malik' : 'Kiracı';
    const confirmed = await appConfirm(
      `${label} bilgisi silinecek.\n\nMevcut ${label.toLocaleLowerCase('tr-TR')} geçmişte pasif kayıt olarak kalacak. Devam etmek istiyor musunuz?`,
      'Silme Onayı',
      'SİL'
    );
    if (!confirmed) return;

    const today = getTodayIso();
    setEditForm(prev => {
      if (isOwner) {
        const existingHistory = prev.ownerHistory?.length
          ? prev.ownerHistory
          : prev.ownerName
            ? [{
              id: createHistoryId(),
              name: prev.ownerName,
              phone: prev.phone || '',
              startDate: today,
              isCurrent: true
            } as OwnerHistory]
            : [];

        return {
          ...prev,
          ownerName: '',
          phone: '',
          ownerHistory: existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: today } : item),
          status: prev.tenantName ? 'Kiracı' : 'Malik'
        };
      }

      const existingHistory = prev.tenantHistory?.length
        ? prev.tenantHistory
        : prev.tenantName
          ? [{
            id: createHistoryId(),
            name: prev.tenantName,
            phone: prev.tenantPhone || '',
            startDate: today,
            isCurrent: true
          } as TenantHistory]
          : [];

      return {
        ...prev,
        tenantName: '',
        tenantPhone: '',
        tenantHistory: existingHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: today } : item),
        status: 'Malik'
      };
    });
    setShowDeleteMenu(false);
  };

  const handleVacateTenant = async () => {
    const today = getTodayIso();
    const firstConfirmed = await appConfirm(
      `Daire ${unit.no} boşaltma işlemine hazırlanıyor.\n\nBu işlem mevcut kiracıyı pasife alır ve çıkış tarihini bugün olarak kaydeder. Devam ederseniz son bir boşaltma onayı daha sorulacak.`,
      '1. Boşaltma Onayı',
      'DEVAM'
    );
    if (!firstConfirmed) return;

    const confirmed = await appConfirm(
      `Daire bugün boşaltılacak.\n\nMevcut kiracı silinmez; çıkış tarihi ${formatHistoryDate(today)} olarak kiracı geçmişine işlenir. Daire varsayılan olarak malik/sakin durumuna döner. Devam etmek istiyor musunuz?`,
      'Daireyi Boşalt',
      'BOŞALT'
    );
    if (!confirmed) return;

    setEditForm(prev => {
      const updatedUnit = vacateTenantInUnit(prev);
      onUpdate(updatedUnit);
      return updatedUnit;
    });
    setIsEditing(false);
    setShowDeleteMenu(false);
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

  const handleQuickUpdate = () => {
    const updatedForm = syncTenantHistoryForSave(syncOwnerHistoryForSave(editForm));
    onUpdate(updatedForm);
    setIsEditing(false);
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

  const handlePDF = async (shouldShare: boolean) => {
    setIsProcessing(true);
    try {
      const pdf = await createUnitStatementPdf({
        buildingName: info.name,
        unitNo: unit.no,
        ownerName: unit.ownerName,
        tenantName: unit.tenantName,
        debts: allDebts.map(d => ({ description: d.description, amount: d.amount, date: d.date })),
        payments: generalTransactions.filter(tx => tx.type === 'GELİR' || tx.type === 'GİDER').map(p => ({
          description: p.description,
          amount: p.amount,
          date: p.date
        })),
        totalDebt: reportDebt,
        totalCredit: reportCredit,
        netBalance: Math.abs(reportNetBalance),
        isCredit: isReportCredit
      });

      const fileName = `${unit.no} - ${unit.ownerName} Ekstre.pdf`.replace(/\s+/g, ' ');
      await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare);

      if (!shouldShare) {
        alert('PDF başarıyla indirildi!');
      }
    } catch (error) {
      console.error(error);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0 shadow-xl">
        <button onClick={onClose} className="app-back-button">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDeleteMenu(true)}
                className="embossed-cash bg-red-600/20 p-2 rounded-xl text-red-500 border border-red-500/30 active:scale-90 transition-all mr-2"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="embossed-cash h-10 px-3 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 active:scale-95 transition-all"
              >
                <X size={17} />
                <span>İPTAL</span>
              </button>
              <button onClick={handleQuickUpdate} className="embossed-cash h-10 px-4 rounded-xl bg-green-500/10 text-green-300 border border-green-500/30 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-lg active:scale-95 transition-all">
                <Save size={18} />
                <span>KAYDET</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="embossed-cash bg-white/5 p-2 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5">
              <Edit3 size={20} />
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex-1 no-scrollbar ${
          isEditing ? 'overflow-y-auto p-4 space-y-3' : 'overflow-hidden p-3 space-y-2'
        }`}
        ref={cardRef}
      >

        {/* ANA BİLGİ VE DÜZENLEME ALANI */}
        <section className={isEditing ? 'space-y-3' : 'space-y-2'}>
          {isEditing ? (
            <div className="space-y-3">
              {/* Malik Giriş Alanı */}
              <div className="bg-[#1e293b]/60 backdrop-blur-xl rounded-[24px] p-4 border border-blue-500/20 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">MALİK BİLGİLERİ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHistoryModal('owner')}
                    className="embossed-cash h-8 px-3 rounded-xl bg-blue-500/15 border border-blue-400/25 text-blue-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus size={13} />
                    <span>Yeni Ekle</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Ad Soyad</label>
                    <input
                      className="bg-transparent text-sm font-black text-white w-full outline-none"
                      value={editForm.ownerName}
                      placeholder="Malik Adı Soyadı"
                      onChange={(e) => setEditForm({ ...editForm, ownerName: toTitleCase(e.target.value) })}
                    />
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Telefon</label>
                    <input
                      className="bg-transparent text-sm font-bold text-green-400 w-full outline-none"
                      value={editForm.phone}
                      placeholder="Telefon (05xx...)"
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Kiracı Giriş Alanı */}
              <div className="bg-[#1e293b]/40 backdrop-blur-xl rounded-[24px] p-4 border border-orange-500/20 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <UserCheck size={14} className="text-orange-400" />
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">KİRACI BİLGİLERİ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHistoryModal('tenant')}
                    className="embossed-cash h-8 px-3 rounded-xl bg-orange-500/15 border border-orange-400/25 text-orange-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus size={13} />
                    <span>Yeni Ekle</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Ad Soyad</label>
                    <input
                      className="bg-transparent text-sm font-black text-white w-full outline-none"
                      value={editForm.tenantName || ''}
                      placeholder="Boş bırakılırsa Kiracı Yok sayılır"
                      onChange={(e) => setEditForm({ ...editForm, tenantName: toTitleCase(e.target.value) })}
                    />
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Telefon</label>
                    <input
                      className="bg-transparent text-sm font-bold text-green-400 w-full outline-none"
                      value={editForm.tenantPhone || ''}
                      placeholder="Kiracı Telefonu"
                      onChange={(e) => setEditForm({ ...editForm, tenantPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  </div>
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
            </>
          )}
        </section>

        {/* Rapor Butonu */}
        <button
          onClick={() => setShowReport(true)}
          className="w-full bg-blue-500/10 backdrop-blur-xl rounded-[18px] py-2.5 border border-blue-500/30 shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-all"
        >
          <FileText size={20} className="text-blue-400" />
          <span className="text-[13px] font-black text-blue-400 uppercase tracking-[0.2em]">RAPOR</span>
        </button>

        {/* İndir & Paylaş Butonları */}
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          <PdfActionButton type="download" onClick={() => handlePDF(false)} disabled={isProcessing} />
          <PdfActionButton type="share" onClick={() => handlePDF(true)} disabled={isProcessing} />
        </div>

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
        <section>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">MALİ DURUM</h3>
            <div className="flex space-x-4">
              <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">KREDİ</span>
              <span className="text-[9px] font-black text-red-500/40 tracking-widest uppercase">BORÇ</span>
            </div>
          </div>
          <div className="bg-[#111827] rounded-[20px] p-2 border border-white/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/10">
                {[{ label: 'GENEL GİDER', credit: unit.credit, debt: unit.debt }, { label: 'DEMİRBAŞ', credit: demirbasCredit, debt: demirbasDebt }].map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 px-2 text-[10px] font-black text-white/40 uppercase tracking-widest">{row.label}</td>
                    <td className="py-2 px-2 text-right text-[14px] font-black text-white">₺{formatCurrency(row.credit)}</td>
                    <td className="py-2 px-2 text-right text-[14px] font-black text-red-500">₺{formatCurrency(row.debt)}</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.03]">
                  <td className="py-2.5 px-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">TOPLAM</td>
                  <td className="py-2.5 px-2 text-right text-[16px] font-black text-white">₺{formatCurrency(unit.credit)}</td>
                  <td className="py-2.5 px-2 text-right text-[16px] font-black text-red-500">₺{formatCurrency(unit.debt)}</td>
                </tr>
              </tbody>
            </table>
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
      </div>

      {showDeleteMenu && (
        <div className="fixed inset-0 z-[390] bg-black/70 backdrop-blur-md flex items-end min-[520px]:items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[28px] bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-black text-white uppercase tracking-widest">Daire İşlemleri</h3>
                <p className="text-[11px] font-bold text-white/45 mt-1">Kiracıyı boşaltın veya daire kaydını silin.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteMenu(false)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={handleVacateTenant}
                disabled={!editForm.tenantName && !editForm.tenantPhone}
                className="w-full rounded-2xl border border-orange-400/25 bg-orange-500/10 px-4 py-4 text-left active:scale-[0.98] transition-all disabled:opacity-35"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-400/25 flex items-center justify-center text-orange-300">
                    <UserCheck size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-orange-200 uppercase tracking-wider">Daireyi Boşalt</p>
                    <p className="text-[11px] font-bold text-white/45 truncate">{editForm.tenantName ? `${editForm.tenantName} - çıkış tarihi bugün` : 'Kiracı kaydı yok'}</p>
                  </div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={async () => {
                  const firstConfirmed = await appConfirm(
                    `Daire ${unit.no} tamamen silme işlemine hazırlanıyor.\n\nBu işlem daire kaydını listeden kaldırır. Devam ederseniz son bir silme onayı daha sorulacak.`,
                    '1. Silme Onayı',
                    'DEVAM'
                  );
                  if (!firstConfirmed) return;
                  setShowDeleteMenu(false);
                  await onDelete(unit.id);
                }}
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-left active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-300">
                    <Trash2 size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-red-200 uppercase tracking-wider">Daireyi Tamamen Sil</p>
                    <p className="text-[11px] font-bold text-white/45">Tüm daire kaydı silinir.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal && (() => {
        const isOwner = historyModal === 'owner';
        const entries = (isOwner ? getOwnerHistory() : getTenantHistory())
          .slice()
          .sort((a, b) => {
            if (a.isCurrent !== b.isCurrent) return isOwner ? Number(b.isCurrent) - Number(a.isCurrent) : Number(a.isCurrent) - Number(b.isCurrent);
            const dateA = a.endDate || a.startDate || '';
            const dateB = b.endDate || b.startDate || '';
            return dateB.localeCompare(dateA);
          });
        const accentClass = isOwner
          ? 'border-blue-400/25 bg-blue-500/10 text-blue-200'
          : 'border-orange-400/25 bg-orange-500/10 text-orange-200';
        const activeCardClass = isOwner
          ? 'bg-blue-600/20 border-blue-400/30'
          : 'bg-emerald-500/12 border-emerald-400/35';

        return (
          <div className="fixed inset-0 z-[380] bg-black/70 backdrop-blur-md flex items-start justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] animate-in fade-in">
            <div className="w-full max-w-xl max-h-[88vh] overflow-hidden rounded-[28px] bg-[#0f172a] border border-white/10 shadow-2xl flex flex-col">
              <div className="px-5 py-4 border-b border-white/5 bg-[#0f172a] flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${accentClass}`}>
                    {isOwner ? <Home size={23} /> : <UserCheck size={23} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-black text-white uppercase tracking-wide leading-tight">
                      {isOwner ? 'Malikler' : 'Kirac\u0131lar'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddingHistory(true)}
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
                  entries.map(item => (
                    <div
                      key={item.id}
                      className={`rounded-[22px] border p-4 shadow-lg ${
                        item.isCurrent ? activeCardClass : 'bg-slate-800/70 border-amber-300/35'
                      }`}
                    >
                      {(() => {
                        const showDateLine = Boolean(!isOwner && (item.startDate || item.endDate));
                        return (
                          <>
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <p className="text-[16px] font-black text-white leading-tight truncate min-w-0">{item.name}</p>
                        <span className={`shrink-0 inline-flex px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-lg ${item.isCurrent ? 'bg-emerald-400/20 border-emerald-300/45 text-emerald-100 shadow-emerald-950/20' : 'bg-amber-400/20 border-amber-300/50 text-amber-100 shadow-amber-950/30'}`}>
                          {item.isCurrent ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
                        {showDateLine && (
                          <p className="text-[13px] font-bold text-orange-300 whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.startDate ? `Giri\u015f: ${formatHistoryDate(item.startDate)}` : ''}
                            {item.endDate ? `${item.startDate ? ' - ' : ''}\u00c7\u0131k\u0131\u015f: ${formatHistoryDate(item.endDate)}` : ''}
                          </p>
                        )}
                        {item.isCurrent && (
                          <p className="text-[12px] font-black text-orange-300 whitespace-nowrap">
                            Mevcut {isOwner ? 'Malik' : 'Kirac\u0131'}
                          </p>
                        )}
                      </div>
                          </>
                        );
                      })()}
                      {item.phone && <p className="text-[13px] font-black text-emerald-300 mt-1">{item.phone}</p>}
                    </div>
                  ))
                )}

                {isAddingHistory && (
                  <div className="rounded-[22px] border border-green-400/25 bg-green-500/10 p-4 space-y-3 animate-in slide-in-from-bottom-2">
                    <div className="grid gap-3 min-[520px]:grid-cols-2">
                      <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                        <label className="text-[8px] font-black text-white/35 uppercase block mb-1">Ad Soyad</label>
                        <input
                          className="bg-transparent text-sm font-black text-white w-full outline-none"
                          value={historyForm.name}
                          placeholder={isOwner ? 'Yeni malik adı' : 'Yeni kiracı adı'}
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
                    {!isOwner && (
                      <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                        <label className="text-[8px] font-black text-white/35 uppercase block mb-1">Giriş Tarihi</label>
                        <input
                          type="date"
                          className="bg-transparent text-sm font-black text-white w-full outline-none"
                          value={historyForm.startDate}
                          onChange={(e) => setHistoryForm({ ...historyForm, startDate: e.target.value })}
                        />
                      </div>
                    )}
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
            <div className="w-10" />
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
      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
          <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
          <span className="text-white text-[12px] font-black uppercase tracking-widest">PDF HAZIRLANIYOR</span>
        </div>
      )}
    </div>
  );
};

export default UnitDetailView;
