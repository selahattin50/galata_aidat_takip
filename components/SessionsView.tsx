import React, { useState } from 'react';
import { Home, ArrowLeft, Building2, Pencil, MapPin, User, Users, Check, Loader2 } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { db } from '../databaseService';

interface SessionsViewProps {
  info: BuildingInfo;
  units: Unit[];
  onClose: () => void;
  onUpdateInfo: (info: BuildingInfo) => void;
}

const SessionsView: React.FC<SessionsViewProps> = ({ info, units, onClose, onUpdateInfo }) => {
  console.log('🔵 SessionsView render - info:', info);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: info.name || '',
    managerName: info.managerName || '',
    address: info.address || '',
    taxNo: info.taxNo || ''
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

  // Düzenleme formu
  if (isEditing) {
    return (
    <div className="absolute inset-0 z-[120] bg-[#030712] p-6 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-[100] -mx-6 px-6 py-4 mb-6 bg-[#030712]/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button 
          onClick={() => {
            setIsEditing(false);
            setFormData({
              name: info.name || '',
              managerName: info.managerName || '',
              address: info.address || '',
              taxNo: info.taxNo || ''
            });
          }} 
          disabled={isSubmitting} 
          className="p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all"
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
              placeholder="Galata Apartmanı" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">VERGİ NO</label>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="3881743149" 
              value={formData.taxNo} 
              onChange={e => setFormData({...formData, taxNo: e.target.value})} 
              className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">YÖNETİCİ ADI SOYADI *</label>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Ad Soyad" 
              value={formData.managerName} 
              onChange={e => setFormData({...formData, managerName: e.target.value})} 
              className="w-full h-14 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">YÖNETİM ADRESİ</label>
          <div className="relative group">
            <textarea 
              placeholder="Cevherdudaev Mahallesi Yasemin Sokak No 6 Nevşehir" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              className="w-full h-28 bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 pt-4 text-[13px] font-bold text-white outline-none focus:border-blue-500/50 transition-all resize-none placeholder:text-white/10" 
            />
            <MapPin size={18} className="absolute left-4 top-4 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSubmitting} 
          className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all mt-6 shadow-xl disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin text-white" size={20} />
          ) : (
            <>
              <Check size={18} className="text-white" strokeWidth={3} />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.15em]">BİLGİLERİ KAYDET</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
  }

  // Ana oturumlar ekranı
  console.log('🔵 SessionsView: Ana ekran gösteriliyor');
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32">
      <div className="sticky top-0 z-[100] -mx-4 px-4 py-4 mb-6 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-center">
        <button onClick={onClose} className="absolute left-4 bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">OTURUM YÖNETİMİ</h3>
      </div>

      <div className="px-4 space-y-6">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start space-x-3">
          <Building2 size={20} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">MEVCUT YÖNETİM DÜZENLE</h4>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Bilgileri Güncelle butonuna tıklayarak apartman bilgilerinizi düzenleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-3xl p-6 border border-white/10 shadow-xl">
          <div className="mb-5">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">YÖNETİM ADI</p>
            <p className="text-[18px] font-black text-white uppercase tracking-tight">{info.name || '---'}</p>
          </div>

          <div className="mb-5">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">VERGİ NO</p>
            <p className="text-[16px] font-black text-white">{info.taxNo || '---'}</p>
          </div>

          <div className="mb-5">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">DAİRE SAYISI</p>
            <p className="text-[16px] font-black text-blue-400">{units?.length || 0}</p>
          </div>

          <div className="mb-5">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">YÖNETİCİ ADI SOYADI</p>
            <p className="text-[16px] font-black text-white">{info.managerName || '---'}</p>
          </div>

          <div className="mb-5">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">YÖNETİM ADRESİ</p>
            <p className="text-[12px] font-bold text-white/80 leading-relaxed">
              {info.address || 'Adres bilgisi yok'}
            </p>
          </div>

          <button 
            onClick={() => setIsEditing(true)}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all shadow-lg"
          >
            <Pencil size={16} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.15em]">BİLGİLERİ GÜNCELLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionsView;
