
import React, { useState } from 'react';
import { Save, Loader2, X, Check, ChevronRight, UserCog, Building2, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { db } from '../databaseService';

interface SettingsViewProps {
  buildingInfo: BuildingInfo;
  onUpdateBuildingInfo: (i: BuildingInfo) => void;
  units: Unit[];
  onResetMoney: () => void;
  onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ buildingInfo, onUpdateBuildingInfo, units, onResetMoney, onClose }) => {
  const [st, setSt] = useState({ 
    name: buildingInfo?.name || '',
    address: buildingInfo?.address || '',
    managerName: buildingInfo?.managerName || '',
    duesAmount: (buildingInfo?.duesAmount || 750).toString(),
    managerUnitId: buildingInfo?.managerUnitId || '',
    isManagerExempt: buildingInfo?.isManagerExempt || false,
    isAutoDuesEnabled: buildingInfo?.isAutoDuesEnabled || false
  });
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    onUpdateBuildingInfo({ 
      ...buildingInfo, 
      name: st.name, 
      address: st.address, 
      managerName: st.managerName, 
      duesAmount: parseFloat(st.duesAmount) || 0, 
      managerUnitId: st.managerUnitId, 
      isManagerExempt: st.isManagerExempt, 
      isAutoDuesEnabled: st.isAutoDuesEnabled 
    });
    setIsSaving(false);
  };

  const selectedManagerUnit = units.find(u => u.id === st.managerUnitId);

  return (
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
              <AlertTriangle size={24} />
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
              <AlertTriangle size={24} />
              <span>TEMİZLE</span>
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
              {units.sort((a,b) => parseInt(a.no) - parseInt(b.no)).map(u => (
                <button 
                  key={u.id} 
                  onClick={() => { setSt({ ...st, managerUnitId: u.id }); setShowUnitModal(false); }} 
                  className={`w-full py-4 px-5 rounded-2xl flex items-center justify-between border transition-all active:scale-[0.98] ${st.managerUnitId === u.id ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black uppercase text-white tracking-tight">{u.no}. Daire</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{u.ownerName}</span>
                  </div>
                  {st.managerUnitId === u.id && <Check size={20} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SettingsView;
