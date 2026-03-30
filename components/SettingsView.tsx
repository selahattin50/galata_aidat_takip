
import React, { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Save, Loader2, X, Check, ChevronLeft, ChevronRight, UserCog, Building2, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeft, TriangleAlert } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { db } from '../databaseService';
import { auth } from '../firebaseConfig';
import UserManagementView from './UserManagementView.tsx';
import { useAndroidBackHandler } from '../appBackButton';

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
}

const SettingsView: React.FC<SettingsViewProps> = ({ buildingInfo, onUpdateBuildingInfo, units, onResetMoney, onClose }) => {
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
    bulkMessageReminderDay: (buildingInfo?.bulkMessageReminderDay || buildingInfo?.bulkMessageStartDay || 19).toString()
  });
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      bulkMessageStartDay: normalizedBulkMessageReminderDay
    });
    setSt(prev => ({
      ...prev,
      bulkMessageInfoDay: normalizedBulkMessageInfoDay.toString(),
      bulkMessageReminderDay: normalizedBulkMessageReminderDay.toString()
    }));
    setIsSaving(false);
  };

  const selectedManagerUnit = units?.find(u => u && u.id === st.managerUnitId);

  if (showAdminPanel) {
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
              {/* TOPLU MESAJ OLUŞTURMA BAŞLIĞI VE TOGGLE */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-0.5">
                  <h2 className="text-sm font-black tracking-[0.15em] text-white">TOPLU MESAJ OLUŞTURMA</h2>
                  <p className="text-[9px] font-bold text-zinc-500 max-w-[200px] uppercase tracking-wider leading-relaxed">
                    AÇIKKEN BİLGİLENDİRME VE HATIRLATMA GÜNLERİNE GÖRE KART ÜRETİR
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <button 
                  onClick={() => setSt({ ...st, isBulkMessageEnabled: !st.isBulkMessageEnabled })}
                  className={`relative w-12 h-7 rounded-full border-2 transition-all duration-300 flex items-center px-1 ${
                    st.isBulkMessageEnabled 
                      ? "border-[#3b82f6] bg-[#3b82f6]/10" 
                      : "border-zinc-700 bg-transparent"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    st.isBulkMessageEnabled 
                      ? "translate-x-5 bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                      : "translate-x-0 bg-zinc-600"
                  }`} />
                </button>
              </div>

              {/* M1 M2 SEÇME BÖLÜMÜ */}
              <div className={`space-y-4 transition-all duration-500 ${st.isBulkMessageEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                
                <div className="flex items-center justify-around bg-[#111827] rounded-[30px] p-4 border border-white/5 shadow-inner">
                  {/* M1 Butonu */}
                  <button
                    onClick={() => setBulkMessageEditor('info')}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      bulkMessageEditor === 'info'
                        ? 'bg-[#7dd3fc] text-[#0f172a] shadow-[0_0_20px_rgba(125,211,252,0.4)] scale-110'
                        : 'bg-[#1f2937] text-zinc-400'
                    }`}
                  >
                    <span className="text-lg font-black italic">M 1</span>
                  </button>

                  {/* Orta Bilgi Kartı */}
                  <div className="flex-1 max-w-[150px] mx-2 flex flex-col items-center justify-center p-3 border border-zinc-800 rounded-[25px] bg-black/20 min-h-[80px]">
                    <span className="text-[8px] font-black text-center text-zinc-400 uppercase tracking-widest mb-1">
                      {bulkMessageEditor === 'info' ? 'M1 AİDAT BİLGİLENDİRME' : 'M2 AİDAT HATIRLATMASI'}
                    </span>
                    <input
                      type="number"
                      value={bulkMessageEditor === 'info' ? st.bulkMessageInfoDay : st.bulkMessageReminderDay}
                      onChange={e => setSt({
                        ...st,
                        [bulkMessageEditor === 'info' ? 'bulkMessageInfoDay' : 'bulkMessageReminderDay']: e.target.value
                      })}
                      className="bg-transparent text-center outline-none font-black text-3xl text-white w-full"
                    />
                  </div>

                  {/* M2 Butonu */}
                  <button
                    onClick={() => setBulkMessageEditor('reminder')}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      bulkMessageEditor === 'reminder'
                        ? 'bg-[#7dd3fc] text-[#0f172a] shadow-[0_0_20px_rgba(125,211,252,0.4)] scale-110'
                        : 'bg-[#1f2937] text-zinc-400'
                    }`}
                  >
                    <span className="text-lg font-black italic">M 2</span>
                  </button>
                </div>

                {/* Alt Metinler */}
                <div className="px-2">
                  <p className="text-[10px] font-black text-white/70 leading-relaxed text-center">
                    Degisiklikten sonra ustteki ayarlari kaydet butonuna basin.
                  </p>
                </div>
              </div>
            </div>
            {auth.currentUser?.email === 'selahattin50@gmail.com' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="w-full mt-8 bg-white/5 border border-emerald-500/30 rounded-2xl py-3 flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="font-black text-[10px] tracking-[0.2em] uppercase text-emerald-400">ADMIN PANELİ</span>
              </button>
            )}
          </section>

          {/* 3. VERİ YÖNETİMİ */}
          <section className="bg-purple-900/10 backdrop-blur-md rounded-[40px] p-6 border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 opacity-40 mb-1 px-1">
              <ShieldCheck size={16} className="text-purple-400" />
              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-purple-100">VERİ YÖNETİMİ</h2>
            </div>

            <div className="space-y-3">
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
        </div>
      </div>
    </SettingsErrorBoundary>
  );
};

export default SettingsView;
