import React, { useState } from 'react';
import { Home, ArrowLeft, Building2, Pencil, MapPin, User, Users, Check, Loader2 } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { db } from '../databaseService';
import { useAndroidBackHandler } from '../appBackButton';
import { auth } from '../firebaseConfig';

interface SessionsViewProps {
  info: BuildingInfo;
  units: Unit[];
  onClose: () => void;
  onUpdateInfo: (info: BuildingInfo) => void;
  onUpdateUnits: (count: number) => Promise<void>;
  userSites: { id: string, name: string }[];
  activeSiteId: string;
  onSelectSite: (id: string) => void;
  onCreateSite: (name: string) => void;
  onDeleteSite: (id: string) => void;
}

const SessionsView: React.FC<SessionsViewProps> = ({
  info, units, onClose, onUpdateInfo, onUpdateUnits, userSites, activeSiteId, onSelectSite, onCreateSite, onDeleteSite
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  useAndroidBackHandler(() => {
    if (showCreateModal) {
      setShowCreateModal(false);
      return true;
    }

    if (isEditing) {
      setIsEditing(false);
      return true;
    }

    return false;
  });

  const [formData, setFormData] = useState({
    name: info.name || '',
    managerName: info.managerName || '',
    address: info.address || '',
    taxNo: info.taxNo || '',
    unitCount: units?.length ? units.length.toString() : ''
  });

  const toTitleCase = (str: string) => {
    return str.split(/(\s+)/).map(part => {
      if (part.trim().length > 0) {
        return part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR');
      }
      return part;
    }).join('');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.managerName) {
      alert("Lütfen zorunlu alanları (*) doldurunuz.");
      return;
    }
    const normalizedUnitCount = parseInt(formData.unitCount, 10) || 0;
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 500));

      const updatedInfo: BuildingInfo = {
        ...info,
        name: toTitleCase(formData.name),
        address: formData.address,
        managerName: toTitleCase(formData.managerName),
        taxNo: formData.taxNo
      };

      await db.saveBuildingInfo(updatedInfo);

      // Daire sayısı değişmişse App.tsx'e bildir
      if (normalizedUnitCount !== units.length) {
        await onUpdateUnits(normalizedUnitCount);
      }

      onUpdateInfo(updatedInfo);

      setIsSubmitting(false);
      setIsEditing(false);
      alert('Bilgiler başarıyla kaydedildi!');
    } catch (error) {
      console.error('Bilgi güncelleme hatası:', error);
      alert('Bilgiler kaydedilemedi. Lütfen tekrar deneyin.');
      setIsSubmitting(false);
    }
  };

  const handleCreate = () => {
    if (!newSiteName.trim()) return;
    onCreateSite(toTitleCase(newSiteName.trim()));
    setNewSiteName('');
    setShowCreateModal(false);
  };

  if (isEditing) {
    return (
      <div className="absolute inset-0 z-[120] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
        <div className="sticky top-0 z-[100] -mx-6 px-6 py-4 mb-6 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">BİLGİLERİ GÜNCELLE</h3>
          <div className="w-10" />
        </div>

        <div className="space-y-5 max-w-sm mx-auto pb-20">
          <div>
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">YÖNETİM ADI *</label>
            <div className="relative group">
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all"
              />
              <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">YÖNETİCİ ADI *</label>
            <div className="relative group">
              <input type="text" value={formData.managerName} onChange={e => setFormData({ ...formData, managerName: e.target.value })} className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all" />
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">TOPLAM DAİRE SAYISI</label>
            <div className="relative group">
              <input
                type="number"
                placeholder="0"
                value={formData.unitCount}
                onChange={e => setFormData({ ...formData, unitCount: e.target.value })}
                className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10"
              />
              <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">ADRES</label>
            <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full h-24 bg-[#111827] border border-white/10 rounded-2xl p-4 text-[13px] font-bold text-white outline-none focus:border-blue-500/50 transition-all resize-none" />
          </div>
          <button onClick={handleSave} disabled={isSubmitting} className="w-full h-14 bg-blue-600 rounded-2xl font-black text-white uppercase tracking-widest active:scale-95 transition-all mt-4 shadow-xl flex items-center justify-center space-x-2">
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /><span>KAYDET</span></>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32">
      <div className="sticky top-0 z-[100] px-4 py-4 mb-6 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-center">
        <button onClick={onClose} className="absolute left-4 bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">OTURUM YÖNETİMİ</h3>
      </div>

      <div className="px-4 space-y-6">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Building2 size={20} className="text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">DİĞER YÖNETİMLERİM</h4>
              <p className="text-[11px] text-white/60 leading-relaxed font-bold">
                Aşağıdaki listeden yönetmek istediğiniz binaya geçiş yapabilir veya yeni bir bina ekleyebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {userSites.map((site) => (
            <div key={site.id} className={`bg-[#1e293b] rounded-2xl border transition-all overflow-hidden ${activeSiteId === site.id ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/5'}`}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeSiteId === site.id ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/20'}`}>
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-black uppercase truncate ${activeSiteId === site.id ? 'text-white' : 'text-white/40'}`}>{site.name}</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                      {activeSiteId === site.id ? 'ŞU AN AKTİF' : 'BEKLEMEDE'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {activeSiteId !== site.id && (
                    <button
                      onClick={() => onSelectSite(site.id)}
                      className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
                    >
                      SEÇ
                    </button>
                  )}
                  {activeSiteId === site.id && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20 active:scale-95 transition-all"
                    >
                      <Pencil size={18} className="text-blue-400" />
                    </button>
                  )}
                  {userSites.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`${site.name} yönetimini silmek istediğinize emin misiniz? (Tüm veriler temizlenecektir)`)) {
                          onDeleteSite(site.id);
                        }
                      }}
                      className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/20 active:scale-95 transition-all"
                    >
                      <span className="text-red-400 font-black text-xs">X</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              const isAdmin = auth.currentUser?.email === 'selahattin50@gmail.com';
              if (!isAdmin && userSites.length >= 1) {
                alert('Yeni bir apartman/site eklemek ücretli bir özelliktir. Lütfen bizimle iletişime geçin.\n\nİletişim: selahattin50@gmail.com');
                return;
              }
              setShowCreateModal(true);
            }}
            className="w-full h-14 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-2xl flex items-center justify-center space-x-3 active:scale-[0.98] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <span className="text-2xl font-light">+</span>
            </div>
            <span className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] group-hover:text-white transition-colors">YENİ BİNA EKLE</span>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-[32px] p-6 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mb-6 text-center">YENİ BİNA OLUŞTUR</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">BİNA / SİTE ADI</label>
                <input
                  type="text"
                  autoFocus
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  placeholder="Örn: Galata Sitesi"
                  className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl px-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/5"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 bg-white/5 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-widest active:scale-95 transition-all"
                >
                  İPTAL
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newSiteName.trim()}
                  className="flex-1 h-12 bg-blue-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest active:scale-95 transition-all disabled:opacity-20"
                >
                  OLUŞTUR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsView;
