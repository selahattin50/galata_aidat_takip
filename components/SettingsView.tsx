
import React, { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Save, Loader2, X, Check, ChevronLeft, ChevronRight, UserCog, Building2, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeft, TriangleAlert, Edit3 } from 'lucide-react';
import { BuildingInfo, Unit, Transaction } from '../types.ts';
import { db } from '../databaseService';
import { auth } from '../firebaseConfig';
import UserManagementView from './UserManagementView.tsx';
import { useAndroidBackHandler } from '../appBackButton';
import CarryOverView from './CarryOverView.tsx';
import { appConfirm } from './AppDialog';

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
    duesAmount: buildingInfo?.duesAmount ? buildingInfo.duesAmount.toString() : '',
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
  const [isEditing, setIsEditing] = useState(false);
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
    setIsEditing(false);
  };

  const handleAddExpenseCategory = () => {
    if (!showExpenseCategories) setShowExpenseCategories(true);
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
        <div className="-mx-4 px-4 py-6 mb-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="bg-white/5 p-3 rounded-xl active:scale-90 transition-all border border-white/5 hover:bg-white/10"
          >
            <ArrowLeft size={22} className="text-zinc-400" />
          </button>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 text-center">AYARLAR</h3>
          <div className="w-10" />
        </div>

        <div className="space-y-4 px-1">
          {/* 0. YÖNETİM BİLGİLERİ */}
          <section className="bg-white/5 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <Building2 size={16} className="text-zinc-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-100">YÖNETİM BİLGİLERİ</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetim Adı</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={st.name}
                  onChange={e => setSt({ ...st, name: e.target.value })}
                  className={`bg-transparent outline-none font-black text-lg w-full text-white transition-opacity ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetici Adı</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={st.managerName}
                  onChange={e => setSt({ ...st, managerName: e.target.value })}
                  className={`bg-transparent outline-none font-black text-lg w-full text-white transition-opacity ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Vergi No</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={st.taxNo || ''}
                  onChange={e => setSt({ ...st, taxNo: e.target.value })}
                  className={`bg-transparent outline-none font-black text-lg w-full text-white transition-opacity ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                />
              </div>

              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetim Adresi</label>
                <textarea
                  disabled={!isEditing}
                  value={st.address}
                  onChange={e => setSt({ ...st, address: e.target.value })}
                  className={`bg-transparent outline-none font-bold text-sm w-full text-white resize-none transition-opacity ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* 1. BİNA VE AİDAT AYARLARI */}
          <section className="bg-white/5 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-zinc-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-100">BİNA VE AİDAT AYARLARI</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Aylık Aidat Tutarı</label>
                <div className="flex items-center">
                  <span className="text-emerald-400 text-xl font-black mr-2">₺</span>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={st.duesAmount}
                    onChange={e => setSt({ ...st, duesAmount: e.target.value })}
                    className={`bg-transparent outline-none font-black text-2xl w-full text-white transition-opacity ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/20 p-4 rounded-3xl border border-white/5">
                <div className="flex flex-col opacity-40">
                  <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Otomatik Aidat</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Her ay otomatik borçlandır</p>
                </div>
                <button
                  disabled={!isEditing}
                  onClick={() => setSt({ ...st, isAutoDuesEnabled: !st.isAutoDuesEnabled })}
                  className={`transition-all ${st.isAutoDuesEnabled ? "text-emerald-400" : "text-white/20"} ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                >
                  {st.isAutoDuesEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>

              <div className="h-px bg-white/5 w-full mx-auto" />

              <div>
                <label className="text-[9px] font-black opacity-30 uppercase block mb-1.5 ml-1">Yönetici Dairesi</label>
                <button
                  disabled={!isEditing}
                  onClick={() => setShowUnitModal(true)}
                  className={`w-full h-14 bg-white/5 border border-white/10 rounded-3xl px-5 flex items-center justify-between active:bg-white/10 transition-all ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <Building2 size={16} className="text-blue-400" />
                    </div>
                    <span className="text-[12px] font-black text-white truncate max-w-[180px]">
                      {selectedManagerUnit ? `${selectedManagerUnit.no}. Daire - ${selectedManagerUnit.ownerName}` : 'Daire Seçiniz...'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-black/20 p-4 rounded-3xl border border-white/5">
                <div className="flex flex-col opacity-40">
                  <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Yönetici Muafiyeti</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Yönetici aidattan muaftır</p>
                </div>
                <button
                  disabled={!isEditing || !st.managerUnitId}
                  onClick={() => setSt({ ...st, isManagerExempt: !st.isManagerExempt })}
                  className={`transition-all ${st.isManagerExempt ? "text-blue-400" : "text-white/20"} ${(!isEditing || !st.managerUnitId) ? 'opacity-40' : 'opacity-100'}`}
                >
                  {st.isManagerExempt ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>

              <div className="h-px bg-white/5 w-full mx-auto" />

              <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-4">
                <div className="flex flex-col opacity-40">
                  <p className="text-[12px] font-black uppercase tracking-wider text-white/90">Banka Bilgisi</p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={st.iban || ''}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\s+/g, '').toUpperCase();
                      if (!val.startsWith('TR')) val = 'TR' + val.replace(/[^0-9]/g, '');
                      else val = 'TR' + val.substring(2).replace(/[^0-9]/g, '');
                      val = val.substring(0, 26);
                      let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
                      setSt({ ...st, iban: formatted });
                    }}
                    className={`bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-all tracking-widest ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                    placeholder="IBAN"
                  />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={st.ibanReceiver || ''}
                    onChange={e => setSt({ ...st, ibanReceiver: e.target.value.toUpperCase() })}
                    className={`bg-black/40 outline-none font-black text-sm w-full text-white border border-white/5 rounded-2xl p-3 focus:border-blue-500/50 transition-all ${!isEditing ? 'opacity-40' : 'opacity-100'}`}
                    placeholder="ALICI AD SOYAD"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. M1 M2 MESAJ AYARLARI */}
          <section className="bg-white/5 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-zinc-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-100">MESAJ AYARLARI</h2>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-[#111827] p-4">
              <div className="grid grid-cols-[52px_1fr_52px] items-center gap-2">
                <button onClick={() => setBulkMessageEditor('info')} className={`h-12 rounded-xl flex items-center justify-center border transition-all ${bulkMessageEditor === 'info' ? 'bg-zinc-400 text-black font-black' : 'bg-white/5 text-zinc-400'}`}>M1</button>
                <div className="text-center">
                  <p className="text-[7px] font-black text-zinc-100/50 uppercase mb-1">{bulkMessageEditor === 'info' ? 'M1 BİLGİLENDİRME' : 'M2 HATIRLATMA'}</p>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={bulkMessageEditor === 'info' ? st.bulkMessageInfoDay : st.bulkMessageReminderDay}
                    onChange={e => setSt({...st, [bulkMessageEditor === 'info' ? 'bulkMessageInfoDay' : 'bulkMessageReminderDay']: e.target.value})}
                    className={`w-full bg-transparent text-center font-black text-2xl text-white outline-none ${!isEditing ? 'opacity-40' : ''}`}
                  />
                </div>
                <button onClick={() => setBulkMessageEditor('reminder')} className={`h-12 rounded-xl flex items-center justify-center border transition-all ${bulkMessageEditor === 'reminder' ? 'bg-zinc-400 text-black font-black' : 'bg-white/5 text-zinc-400'}`}>M2</button>
              </div>
            </div>
          </section>

          {/* 4. GİDER KATEGORİLERİ */}
          <section className="bg-white/5 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowExpenseCategories(!showExpenseCategories)}
                className="flex items-center space-x-2 opacity-40 active:scale-95 transition-all"
              >
                <Building2 size={16} className="text-zinc-400" />
                <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-100">GİDER KATEGORİLERİ</h2>
                <ChevronRight size={14} className={`text-zinc-400 transition-transform ${showExpenseCategories ? 'rotate-90' : ''}`} />
              </button>
              <button
                disabled={!isEditing}
                onClick={() => {
                  if (!showExpenseCategories) setShowExpenseCategories(true);
                  handleAddExpenseCategory();
                }}
                className={`bg-zinc-600 px-4 py-1.5 rounded-lg text-[10px] font-black text-white active:scale-95 transition-all ${!isEditing ? 'opacity-40' : ''}`}
              >
                EKLE
              </button>
            </div>

            {showExpenseCategories && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex mb-4">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    placeholder="Yeni kategori adı..."
                    className={`flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-amber-500/50 transition-all font-bold ${!isEditing ? 'opacity-40' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddExpenseCategory();
                    }}
                  />
                </div>
                {st.expenseCategories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-white/80">{cat}</span>
                    {isEditing && <button onClick={() => setSt({...st, expenseCategories: st.expenseCategories.filter((_, i) => i !== idx)})} className="text-red-400 active:scale-90 transition-all"><X size={16}/></button>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ANA AKSİYON BUTONLARI (TAŞINDI) */}
          <div className="space-y-3 px-1">
            <button
              onClick={() => {
                if (isEditing) handleSave();
                else setIsEditing(true);
              }}
              disabled={isSaving}
              className={`w-full ${isEditing ? 'bg-emerald-600' : 'bg-blue-600'} rounded-3xl py-4 flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-2xl border border-white/5`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span className="font-black text-[12px] tracking-[0.2em] uppercase">
                    {isEditing ? 'DEĞİŞİKLİKLERİ KAYDET' : 'AYARLARI DÜZENLE'}
                  </span>
                  {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
                </>
              )}
            </button>

            {canAccessAdminPanel && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="w-full bg-white/5 border border-emerald-500/20 rounded-3xl py-4 flex items-center justify-center space-x-3 active:scale-95 transition-all hover:bg-emerald-500/10 shadow-xl"
              >
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="font-black text-[11px] tracking-[0.2em] uppercase text-emerald-400">ADMIN PANELİ</span>
              </button>
            )}
          </div>

          {/* 5. VERİ YÖNETİMİ */}
          <section className="bg-white/5 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-zinc-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-100">VERİ YÖNETİMİ</h2>
            </div>
            <button disabled={!isEditing} onClick={() => setShowCarryOver(true)} className={`w-full bg-emerald-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg ${!isEditing ? 'opacity-40' : ''}`}>BAKİYE DEVRİ YAP</button>
            <button
              disabled={!isEditing}
              onClick={async () => {
                const currentSession = db.getCurrentSession();
                if (await appConfirm(`"${currentSession}" oturumundaki TÜM muhasebe verilerini silmek istediğinizden emin misiniz?`)) {
                  await db.saveTransactions([]);
                  onResetMoney();
                  alert('Muhasebe verileri temizlendi.');
                  window.location.reload();
                }
              }}
              className={`w-full bg-red-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg ${!isEditing ? 'opacity-40' : ''}`}
            >
              MUHASEBEYİ SIFIRLA
            </button>

            <button
              disabled={!isEditing}
              onClick={async () => {
                const currentSession = db.getCurrentSession();
                if (await appConfirm(`DİKKAT! "${currentSession}" hesabındaki Apartman Bilgileri, Daireler ve Mesajlar dahil HER ŞEYİ kalıcı olarak siliyorsunuz. Emin misiniz?`)) {
                  if (await appConfirm('SON UYARI: Bu işlem geri alınamaz! Hesabınızdaki tüm veriler sıfırlanacak. Onaylıyor musunuz?')) {
                    try {
                      const currentUser = auth.currentUser;
                      if (!currentUser) {
                        alert('Hata: Aktif oturum bulunamadı!');
                        return;
                      }
                      // Firebase'den tüm kullanıcı node'unu sil
                      await db.deleteDataDirect(`users/${currentUser.uid}`);
                      alert('Tüm veriler kalıcı olarak silindi! Fabrika ayarlarına dönüldü.');
                      handleLogout();
                    } catch (error) {
                      console.error('Sıfırlama hatası:', error);
                      alert('İşlem sırasında bir hata oluştu.');
                    }
                  }
                }
              }}
              className={`w-full bg-red-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg ${!isEditing ? 'opacity-40' : ''}`}
            >
              HESABI SIFIRLA (FABRİKA AYARLARI)
            </button>

            <button
              disabled={!isEditing}
              onClick={async () => {
                if (await appConfirm('HESABINIZI TAMAMEN SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? Bu işlem geri alınamaz ve tüm verilerinizle birlikte giriş bilgileriniz de silinecektir.')) {
                  if (await appConfirm('SON ONAY: Hesabınızı ve tüm verilerinizi kalıcı olarak siliyoruz. Onaylıyor musunuz?')) {
                    try {
                      const currentUser = auth.currentUser;
                      if (!currentUser) {
                        alert('Hata: Aktif oturum bulunamadı!');
                        return;
                      }

                      // 1. Verileri sil
                      await db.deleteDataDirect(`users/${currentUser.uid}`);

                      // 2. Kullanıcıyı sil (Firebase Auth)
                      const { deleteUser } = await import('firebase/auth');
                      await deleteUser(currentUser);

                      alert('Hesabınız ve tüm verileriniz başarıyla silindi.');

                      localStorage.removeItem('galata_v16_auth');
                      sessionStorage.removeItem('galata_v16_auth');
                      window.location.reload();
                    } catch (error: any) {
                      console.error('Hesap silme hatası:', error);
                      if (error.code === 'auth/requires-recent-login') {
                        alert('Güvenlik nedeniyle bu işlemi yapabilmek için yakın zamanda giriş yapmış olmanız gerekmektedir. Lütfen çıkış yapıp tekrar giriş yapın ve tekrar deneyin.');
                      } else {
                        alert('Hesap silme işlemi sırasında bir hata oluştu: ' + error.message);
                      }
                    }
                  }
                }
              }}
              className={`w-full bg-red-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg ${!isEditing ? 'opacity-40' : ''}`}
            >
              HESABIMI SİL
            </button>
          </section>
        </div>

        {/* MODAL BÖLÜMLERİ */}
        {showUnitModal && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center px-6">
            <div className="bg-[#1e293b] w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl max-h-[75vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-black uppercase text-white/60">DAİRE SEÇ</h3>
                <button onClick={() => setShowUnitModal(false)}><X size={24} className="text-white/40" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {units?.sort((a,b) => parseInt(a.no)-parseInt(b.no)).map((u) => (
                  <button key={u.id} onClick={() => { setSt({...st, managerUnitId: u.id}); setShowUnitModal(false); }} className={`w-full py-4 px-5 rounded-2xl border transition-all ${st.managerUnitId === u.id ? 'bg-blue-600' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-sm font-black text-white">{u.no}. Daire - {u.ownerName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCarryOver && (
          <CarryOverView units={units as any} onClose={() => setShowCarryOver(false)} onCarryOver={(newTxs) => { onAddTransactions(newTxs); setShowCarryOver(false); }} />
        )}
      </div>
    </SettingsErrorBoundary>
  );
};

export default SettingsView;
