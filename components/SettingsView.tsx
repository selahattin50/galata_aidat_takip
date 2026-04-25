
import React, { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Save, Loader2, X, Check, ChevronLeft, ChevronRight, UserCog, Building2, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeft, TriangleAlert } from 'lucide-react';
import { BuildingInfo, Unit, Transaction } from '../types.ts';
import { db } from '../databaseService';
import { auth } from '../firebaseConfig';
import UserManagementView from './UserManagementView.tsx';
import { useAndroidBackHandler } from '../appBackButton';
import CarryOverView from './CarryOverView.tsx';

interface SettingsErrorBoundaryProps {
  children: ReactNode;
}

interface SettingsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SettingsErrorBoundary extends Component<SettingsErrorBoundaryProps, SettingsErrorBoundaryState> {
  declare props: SettingsErrorBoundaryProps;
  declare state: SettingsErrorBoundaryState;

  constructor(props: SettingsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): SettingsErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('Settings Crash:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 pb-32 pt-24 text-red-500 bg-black min-h-screen z-[999] relative">
          <h1 className="font-black text-xl mb-4 text-white">Ayarlar Ekranı Çöktü :(</h1>
          <p className="font-bold text-sm bg-red-900/30 p-4 rounded-xl border border-red-500/50 break-all">
            {this.state.error?.toString() || 'Bilinmeyen Hata'}
          </p>
          <button onClick={() => window.location.reload()} className="mt-8 bg-white/10 p-3 rounded-lg text-white font-bold w-full active:scale-95">Yenile</button>
        </div>
      );
    }
    return this.props.children;
  }
}


interface SettingsViewProps {
  buildingInfo: BuildingInfo;
  onUpdateBuildingInfo: (i: BuildingInfo) => void;
  units: Unit[];
  onResetMoney: () => void;
  onClose: () => void;
  onAddTransactions: (txs: Transaction[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ buildingInfo, onUpdateBuildingInfo, units, onResetMoney, onClose, onAddTransactions }) => {
  const BULK_MESSAGE_EDITOR_KEY = 'galata_bulk_message_editor';
  const [st, setSt] = useState({
    name: buildingInfo?.name || '',
    address: buildingInfo?.address || '',
    managerName: buildingInfo?.managerName || '',
    taxNo: buildingInfo?.taxNo || '',
    duesAmount: (buildingInfo?.duesAmount ?? 0).toString(),
    managerUnitId: buildingInfo?.managerUnitId || '',
    isManagerExempt: buildingInfo?.isManagerExempt || false,
    isAutoDuesEnabled: buildingInfo?.isAutoDuesEnabled || false,
    isBulkMessageEnabled: buildingInfo?.isBulkMessageEnabled !== false,
    bulkMessageInfoDay: (buildingInfo?.bulkMessageInfoDay || 1).toString(),
    bulkMessageReminderDay: (buildingInfo?.bulkMessageReminderDay || buildingInfo?.bulkMessageStartDay || 19).toString(),
    expenseCategories: buildingInfo?.expenseCategories || ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Tamirat', 'Yönetim Gideri', 'Huzur Hakkı', 'Bahçe Bakımı', 'Diğer'],
    lastAutoDuesMonth: buildingInfo?.lastAutoDuesMonth || "",
    iban: buildingInfo?.iban || "",
    ibanReceiver: buildingInfo?.ibanReceiver || ""
  });
  const [newCat, setNewCat] = useState('');
  const [showCarryOver, setShowCarryOver] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showExpenseCategories, setShowExpenseCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canAccessAdminPanel = auth.currentUser?.email === 'selahattin50@gmail.com';
  const [bulkMessageEditor, setBulkMessageEditor] = useState<'info' | 'reminder'>(() => {
    const savedEditor = localStorage.getItem(BULK_MESSAGE_EDITOR_KEY);
    return savedEditor === 'reminder' ? 'reminder' : 'info';
  });

  useEffect(() => {
    localStorage.setItem(BULK_MESSAGE_EDITOR_KEY, bulkMessageEditor);
  }, [bulkMessageEditor]);
  useAndroidBackHandler(() => {
    if (showUnitModal) {
      setShowUnitModal(false);
      return true;
    }

    if (showAdminPanel) {
      setShowAdminPanel(false);
      return true;
    }

    return false;
  });

  // handleLogout kullanabilmek için props veya global store gerek ama burda App'ten gelmiyor.
  // Bu yüzden login ekranına atmak için basit bir yöntem:
  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../firebaseConfig');
      await signOut(auth);
      localStorage.removeItem('galata_v16_auth');
      sessionStorage.removeItem('galata_v16_auth');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  const handleSave = async () => {
    const normalizedBulkMessageInfoDay = Math.min(28, Math.max(1, parseInt(st.bulkMessageInfoDay, 10) || 1));
    const normalizedBulkMessageReminderDay = Math.max(
      normalizedBulkMessageInfoDay,
      Math.min(28, Math.max(1, parseInt(st.bulkMessageReminderDay, 10) || 19))
    );
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    onUpdateBuildingInfo({
      ...buildingInfo,
      name: st.name,
      address: st.address,
      managerName: st.managerName,
      taxNo: st.taxNo,
      duesAmount: parseFloat(st.duesAmount) || 0,
      managerUnitId: st.managerUnitId,
      isManagerExempt: st.isManagerExempt,
      isAutoDuesEnabled: st.isAutoDuesEnabled,
      isBulkMessageEnabled: st.isBulkMessageEnabled,
      bulkMessageInfoDay: normalizedBulkMessageInfoDay,
      bulkMessageReminderDay: normalizedBulkMessageReminderDay,
      bulkMessageStartDay: normalizedBulkMessageReminderDay,
      expenseCategories: st.expenseCategories,
      lastAutoDuesMonth: st.lastAutoDuesMonth,
      iban: st.iban,
      ibanReceiver: st.ibanReceiver
    });
    setSt(prev => ({
      ...prev,
      bulkMessageInfoDay: normalizedBulkMessageInfoDay.toString(),
      bulkMessageReminderDay: normalizedBulkMessageReminderDay.toString()
    }));
    setIsSaving(false);
  };

  const handleAddExpenseCategory = () => {
    if (!showExpenseCategories) {
      setShowExpenseCategories(true);
    }

    if (newCat.trim()) {
      setSt({ ...st, expenseCategories: [...st.expenseCategories, newCat.trim()] });
      setNewCat('');
    }
  };

  const selectedManagerUnit = units?.find(u => u && u.id === st.managerUnitId);

  if (showAdminPanel && canAccessAdminPanel) {
    return <UserManagementView onClose={() => setShowAdminPanel(false)} />;
  }

  return (
    <SettingsErrorBoundary>
      <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32">
        <div className="sticky top-0 z-[200] -mx-4 px-4 py-4 mb-6 bg-[#030712] backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => {
              console.log('Settings back button clicked');
              onClose();
            }}
            className="bg-white/5 p-3 rounded-xl active:scale-90 transition-all border border-white/5 hover:bg-white/10"
          >
            <ArrowLeft size={22} className="text-zinc-400" />
          </button>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 text-center">AYARLAR</h3>
          <div className="w-10" />
        </div>

        <div className="space-y-4 px-1">

          {/* 0. YÖNETİM BİLGİLERİ */}
          <section className="bg-purple-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <Building2 size={16} className="text-purple-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-purple-100">YÖNETİM BİLGİLERİ</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetim Adı</label>
                <input
                  type="text"
                  value={st.name}
                  onChange={e => setSt({ ...st, name: e.target.value })}
                  className="bg-transparent outline-none font-black text-lg w-full text-white"
                  placeholder="Yeni Yönetim"
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetici Adı</label>
                <input
                  type="text"
                  value={st.managerName}
                  onChange={e => setSt({ ...st, managerName: e.target.value })}
                  className="bg-transparent outline-none font-black text-lg w-full text-white"
                  placeholder="Ad Soyad"
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Vergi No</label>
                <input
                  type="text"
                  value={st.taxNo || ''}
                  onChange={e => setSt({ ...st, taxNo: e.target.value })}
                  className="bg-transparent outline-none font-black text-lg w-full text-white"
                  placeholder="12345678901"
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetim Adresi</label>
                <textarea
                  value={st.address}
                  onChange={e => setSt({ ...st, address: e.target.value })}
                  className="bg-transparent outline-none font-bold text-sm w-full text-white resize-none"
                  placeholder="Mahalle, Sokak, No..."
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* 1. BİNA VE AİDAT AYARLARI */}
          <section className="bg-emerald-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-emerald-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-100">BİNA VE AİDAT AYARLARI</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Aylık Aidat Tutarı</label>
                <div className="flex items-center">
                  <span className="text-emerald-400 text-xl font-black mr-2">₺</span>
                  <input
                    type="number"
                    value={st.duesAmount}
                    onChange={e => setSt({ ...st, duesAmount: e.target.value })}
                    className="bg-transparent outline-none font-black text-2xl w-full text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/20 p-4 rounded-3xl border border-white/5">
                <div className="flex flex-col">
                  <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Otomatik Aidat</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Her ay otomatik borçlandır</p>
                </div>
                <button onClick={() => setSt({ ...st, isAutoDuesEnabled: !st.isAutoDuesEnabled })} className={`transition-all ${st.isAutoDuesEnabled ? "text-emerald-400" : "text-white/20"}`}>
                  {st.isAutoDuesEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>
            </div>
          </section>

          {/* 2. YÖNETİCİ AYARLARI */}
          <section className="bg-blue-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <UserCog size={16} className="text-blue-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-blue-100">YÖNETİCİ AYARLARI</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetici Dairesi</label>
                <button
                  onClick={() => setShowUnitModal(true)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-3xl px-5 flex items-center justify-between active:bg-white/10 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <Building2 size={16} className="text-blue-400" />
                    </div>
                    <span className="text-[12px] font-black text-white truncate max-w-[180px]">
                      {selectedManagerUnit
                        ? `${selectedManagerUnit.no}. Daire - ${selectedManagerUnit.ownerName}`
                        : 'Daire Seçiniz...'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-black/20 p-4 rounded-3xl border border-white/5">
                <div className="flex flex-col">
                  <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Yönetici Muafiyeti</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Seçili daire aidat ödemez</p>
                </div>
                <button
                  disabled={!st.managerUnitId}
                  onClick={() => setSt({ ...st, isManagerExempt: !st.isManagerExempt })}
                  className={`transition-all ${st.isManagerExempt ? "text-blue-400" : "text-white/20"} disabled:opacity-10`}
                >
                  {st.isManagerExempt ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>
            </div>

            {/* Banka Bilgisi */}
            <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-4 mb-5">
              <div className="flex flex-col">
                <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Banka Bilgisi</p>
                <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Aidat ödemeleri için kullanılacak banka hesabı</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">IBAN</label>
                  <input
                    type="text"
                    value={st.iban || ''}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\s+/g, '').toUpperCase();
                      if (!val.startsWith('TR')) {
                        val = 'TR' + val.replace(/[^0-9]/g, '');
                      } else {
                        val = 'TR' + val.substring(2).replace(/[^0-9]/g, '');
                      }
                      val = val.substring(0, 26);
                      let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
                      setSt({ ...st, iban: formatted });
                    }}
                    className="bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-colors tracking-widest placeholder:opacity-30"
                    placeholder="TR__ ____ ____ ____ ____ ____ __"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">ALICI ADI SOYADI</label>
                  <input
                    type="text"
                    value={st.ibanReceiver || ''}
                    onChange={e => setSt({ ...st, ibanReceiver: e.target.value.toUpperCase() })}
                    className="bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-colors placeholder:opacity-30"
                    placeholder="AD SOYAD"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-blue-600 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-blue-900/20"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span className="font-black text-[11px] tracking-[0.2em] uppercase">AYARLARI KAYDET</span>
                  <Save size={16} />
                </>
              )}
            </button>

            <div className="space-y-4 rounded-[40px] bg-[#0c1222] p-5 border border-white/5 shadow-2xl relative overflow-hidden">
              {/* M1 M2 SEÇME BÖLÜMÜ */}
              <div className="space-y-3">
                
                <div className="rounded-[26px] border border-cyan-400/10 bg-[linear-gradient(180deg,#111827_0%,#0b1220_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.16)]">
                  <div className="grid grid-cols-[44px_1fr_44px] items-center gap-1.5 min-[380px]:grid-cols-[52px_1fr_52px] min-[380px]:gap-2">
                  {/* M1 Butonu */}
                  <button
                    onClick={() => setBulkMessageEditor('info')}
                    className={`h-[44px] rounded-[14px] flex items-center justify-center border transition-all min-[380px]:h-[52px] min-[380px]:rounded-[16px] ${
                      bulkMessageEditor === 'info'
                        ? 'border-cyan-200/70 bg-[linear-gradient(180deg,#a5ecff_0%,#72d8ff_100%)] text-[#08111f] shadow-[0_10px_24px_rgba(95,211,255,0.28)]'
                        : 'border-white/6 bg-[#182132] text-zinc-400'
                    }`}
                  >
                    <span className="text-[15px] font-black italic tracking-tight min-[380px]:text-[17px]">M1</span>
                  </button>

                  {/* Orta Bilgi Kartı */}
                  <div className="min-h-[50px] rounded-[16px] border border-white/6 bg-[linear-gradient(180deg,#0b111d_0%,#121826_100%)] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-[380px]:min-h-[56px] min-[380px]:rounded-[18px]">
                    <div className="flex h-full flex-col items-center justify-center">
                    <span className="text-[5px] font-black text-center text-cyan-100/70 uppercase tracking-[0.14em] mb-0.5 leading-tight min-[380px]:text-[6px] min-[380px]:tracking-[0.16em]">
                      {bulkMessageEditor === 'info' ? 'M1 AİDAT BİLGİLENDİRME' : 'M2 AİDAT HATIRLATMASI'}
                    </span>
                    <input
                      type="number"
                      value={bulkMessageEditor === 'info' ? st.bulkMessageInfoDay : st.bulkMessageReminderDay}
                      onChange={e => setSt({
                        ...st,
                        [bulkMessageEditor === 'info' ? 'bulkMessageInfoDay' : 'bulkMessageReminderDay']: e.target.value
                      })}
                      className="w-full bg-transparent text-center outline-none font-black text-[22px] leading-none text-white tracking-tight min-[380px]:text-[26px]"
                    />
                    </div>
                  </div>

                  {/* M2 Butonu */}
                  <button
                    onClick={() => setBulkMessageEditor('reminder')}
                    className={`h-[44px] rounded-[14px] flex items-center justify-center border transition-all min-[380px]:h-[52px] min-[380px]:rounded-[16px] ${
                      bulkMessageEditor === 'reminder'
                        ? 'border-cyan-200/70 bg-[linear-gradient(180deg,#a5ecff_0%,#72d8ff_100%)] text-[#08111f] shadow-[0_10px_24px_rgba(95,211,255,0.28)]'
                        : 'border-white/6 bg-[#182132] text-zinc-400'
                    }`}
                  >
                    <span className="text-[15px] font-black italic tracking-tight min-[380px]:text-[17px]">M2</span>
                  </button>
                  </div>
                </div>

                {/* Alt Metinler */}
                <div className="px-2">
                  <p className="text-[10px] font-black text-white/70 leading-relaxed text-center">
                    Degisiklikten sonra ustteki ayarlari kaydet butonuna basin.
                  </p>
                </div>
              </div>
            </div>
            {canAccessAdminPanel && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="w-full mt-8 bg-white/5 border border-emerald-500/30 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="font-black text-[10px] tracking-[0.2em] uppercase text-emerald-400">ADMIN PANELİ</span>
              </button>
            )}
          </section>

          {/* 3. GİDER KATEGORİLERİ */}
          <section className="bg-amber-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="w-full flex items-center justify-between gap-3 px-1">
              <button
                type="button"
                onClick={() => setShowExpenseCategories(prev => !prev)}
                className="flex-1 flex items-center justify-between opacity-60 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Building2 size={16} className="text-amber-400" />
                  <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-amber-100">GİDER KATEGORİLERİ</h2>
                </div>
                <ChevronRight
                  size={18}
                  className={`text-amber-300 transition-transform duration-300 ${showExpenseCategories ? 'rotate-90' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={handleAddExpenseCategory}
                className="shrink-0 h-9 px-4 rounded-xl bg-amber-600 text-white font-black text-[10px] tracking-[0.18em] uppercase active:scale-95 transition-all shadow-lg shadow-amber-900/20"
              >
                EKLE
              </button>
            </div>

            {showExpenseCategories && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-wrap gap-2">
                  {st.expenseCategories.map((cat, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center space-x-2 animate-in zoom-in-95">
                      <span className="text-xs font-bold text-white/80">{cat}</span>
                      <button
                        onClick={() => setSt({ ...st, expenseCategories: st.expenseCategories.filter((_, i) => i !== idx) })}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex">
                  <input
                    type="text"
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    placeholder="Yeni kategori..."
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 transition-all font-bold"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 4. VERİ YÖNETİMİ */}
          <section className="bg-purple-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-purple-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-purple-100">VERİ YÖNETİMİ</h2>
            </div>

            <div className="space-y-3">
              {/* Bakiye Devri */}
              <div className="bg-emerald-900/20 p-4 rounded-3xl border border-emerald-500/30">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mb-2">Bakiye Devri (Yeni Dönem)</h3>
                <p className="text-[9px] font-bold text-emerald-500/60 leading-relaxed mb-3 uppercase">
                  Mevcut borç ve alacakları dondurup yeni bir "Açılış Bakiyesi" olarak aktarır. Yıl sonu veya yönetim değişimlerinde yapılması önerilir.
                </p>
                <button
                  onClick={() => setShowCarryOver(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-black text-base uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  BAKİYE DEVRİ YAP
                </button>
              </div>

              {/* İptalli Belgeler */}
              <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-white/90 mb-2">İptalli Belgeler</h3>
                <p className="text-[9px] font-bold text-white/50 leading-relaxed mb-3">
                  Hesap hareketlerinde iptal edilen belgeleri silin. Silme işlemi bilançosu kilitlenmeyen aylar için yapılır. Kilitli aylar bu durumdan etkilenmez.
                </p>
                <button
                  onClick={async () => {
                    const currentSession = db.getCurrentSession();
                    if (window.confirm(`"${currentSession}" oturumundaki iptal edilen belgeleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
                      try {
                        // İptal edilen belgeleri sil (sadece aktif oturum için)
                        const transactions = await db.getTransactions();
                        const cancelledTransactions = transactions.filter(t =>
                          t.description && (
                            t.description.includes('İPTAL') ||
                            t.description.includes('IPTAL') ||
                            t.description.toLowerCase().includes('iptal')
                          )
                        );

                        if (cancelledTransactions.length === 0) {
                          alert('İptal edilen belge bulunamadı.');
                          return;
                        }

                        // İptal edilen belgeleri sil
                        for (const tx of cancelledTransactions) {
                          await db.deleteTransaction(tx.id);
                        }

                        alert(`${cancelledTransactions.length} adet iptal edilen belge silindi.`);
                        window.location.reload(); // Sayfayı yenile
                      } catch (error) {
                        console.error('İptal edilen belgeler silinemedi:', error);
                        alert('Silme işlemi başarısız oldu.');
                      }
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl py-3 font-black text-base uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <TriangleAlert size={24} />
                  <span>SİL</span>
                </button>
              </div>

              {/* Muhasebe Verileri */}
              <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-white/90 mb-2">Muhasebe Verileri</h3>
                <p className="text-[9px] font-bold text-white/50 leading-relaxed mb-3">
                  Yönetim verilerini sıfırlayın. Bugüne kadar yapılan tüm muhasebe verileri kalıcı olarak silinir ve bir daha geri döndürülemez. Bağımsız bölümler, apartmanlar, ayarlar, malik ve kiracı bilgileri bu durumdan etkilenmez.
                </p>
                <button
                  onClick={async () => {
                    const currentSession = db.getCurrentSession();
                    if (window.confirm(`"${currentSession}" oturumundaki TÜM muhasebe verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
                      if (window.confirm('SON UYARI: Bu işlem GERİ ALINAMAZ! Devam etmek istiyor musunuz?')) {
                        try {
                          // Sadece aktif oturumun transaction verilerini sil
                          await db.saveTransactions([]);
                          onResetMoney();
                          alert('Muhasebe verileri temizlendi');
                          window.location.reload(); // Sayfayı yenile
                        } catch (error) {
                          console.error('Muhasebe verileri temizlenemedi:', error);
                          alert('Temizleme işlemi başarısız oldu.');
                        }
                      }
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl py-3 font-black text-base uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <TriangleAlert size={24} />
                  <span>TEMİZLE</span>
                </button>
              </div>

              {/* Tüm Verileri Sıfırla (Fabrika Ayarları) */}
              <div className="bg-red-900/10 p-4 rounded-3xl border border-red-500/30">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-red-400 mb-2">FABRİKA AYARLARI (TÜMÜNÜ SİL)</h3>
                <p className="text-[9px] font-bold text-red-500/80 leading-relaxed mb-3">
                  Apartman bilgileri, daireler, kişiler, mesajlar ve bakiye dahil <b>HER ŞEYİ</b> kalıcı olarak veritabanından siler. Uygulama bomboş ilk günkü haline döner.
                </p>
                <button
                  onClick={async () => {
                    if (window.confirm(`DİKKAT! Bu hesaptaki ("${db.getCurrentSession()}") apartman bilgileri, daireler, mesajlar dahil GERİ ALINAMAZ şekilde HER ŞEYİ siliyorsunuz. Emin misiniz?`)) {
                      if (window.confirm('SON UYARI: Hesabınızdaki her şey sıfırlanacak! Onaylıyor musunuz?')) {
                        try {
                          const { auth } = await import('../firebaseConfig');
                          const currentUser = auth.currentUser;

                          if (!currentUser) {
                            alert('Hata: Aktif oturum bulunamadı!');
                            return;
                          }

                          // Veritabanındaki tüm node'u uçur
                          await db.deleteDataDirect(`users/${currentUser.uid}`);

                          alert('Tüm veriler kalıcı olarak silindi! Fabrika ayarlarına dönüldü.');

                          // Oturumu kapat ki tamamen temiz bir sayfa açılsın
                          handleLogout();
                        } catch (error) {
                          console.error('Tüm veriler silinemedi:', error);
                          alert('Silme işlemi başarısız oldu.');
                        }
                      }
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white rounded-xl py-3 font-black text-base uppercase tracking-widest shadow-lg shadow-red-900/40 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <TriangleAlert size={24} />
                  <span>HESABI SIFIRLA</span>
                </button>
              </div>

            </div>
          </section>

          {/* Daire Seçici Modal */}
          {showUnitModal && (
            <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center px-6 animate-in fade-in duration-300">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl max-h-[75vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 px-1">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">YÖNETİCİ DAİRESİ SEÇ</h3>
                  <button onClick={() => setShowUnitModal(false)} className="text-white/40 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar px-1">
                  {[...(units || [])].filter(Boolean).sort((a, b) => parseInt(a?.no || "0") - parseInt(b?.no || "0")).map((u, i) => (
                    <button
                      key={u?.id || i.toString()}
                      onClick={() => { setSt({ ...st, managerUnitId: u?.id || '' }); setShowUnitModal(false); }}
                      className={`w-full py-4 px-5 rounded-2xl flex items-center justify-between border transition-all active:scale-[0.98] ${st.managerUnitId === u?.id ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-black uppercase text-white tracking-tight">{u?.no || '?'}. Daire</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{u?.ownerName || 'Bilinmeyen'}</span>
                      </div>
                      {st.managerUnitId === u?.id && <Check size={20} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bakiye Devri Modal */}
          {showCarryOver && (
            <CarryOverView 
              units={units as any} 
              onClose={() => setShowCarryOver(false)} 
              onCarryOver={(newTxs) => {
                onAddTransactions(newTxs);
                setShowCarryOver(false);
              }}
            />
          )}
        </div>
      </div>
    </SettingsErrorBoundary>
  );
};

export default SettingsView;
