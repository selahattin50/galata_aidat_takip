
import React, { useState } from 'react';
import { Home, ChevronLeft, Check, Building, MapPin, Users, Loader2, User } from 'lucide-react';
import { db } from '../databaseService';

interface CreateManagementViewProps {
  onClose: () => void;
  onSuccess: (data: { 
    sessionId: string,
    name: string, 
    address: string, 
    unitCount: number,
    managerName: string,
    phone: string
  }) => void;
}

const CreateManagementView: React.FC<CreateManagementViewProps> = ({ onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    unitCount: '',
    managerName: '',
    phone: ''
  });

  const toTitleCase = (str: string) => {
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

  const handleCreate = async () => {
    if (!formData.name || !formData.unitCount || !formData.managerName) {
      alert("Lütfen zorunlu alanları (*) doldurunuz.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Yeni oturum oluştur
      const sessionId = await db.createSession(toTitleCase(formData.name));
      console.log('✓ Yeni oturum ID:', sessionId);
      
      await new Promise(r => setTimeout(r, 800));
      setIsSubmitting(false);
      setIsDone(true);
      await new Promise(r => setTimeout(r, 800));
      
      onSuccess({
        sessionId: sessionId,
        name: toTitleCase(formData.name),
        address: formData.address,
        unitCount: parseInt(formData.unitCount) || 0,
        managerName: toTitleCase(formData.managerName),
        phone: formData.phone
      });
    } catch (error) {
      console.error('Oturum oluşturma hatası:', error);
      alert('Oturum oluşturulamadı. Lütfen tekrar deneyin.');
      setIsSubmitting(false);
    }
  };

  if (isDone) return (
    <div className="absolute inset-0 z-[150] bg-[#030712] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce border border-green-500/30">
        <Check size={48} className="text-green-500" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">SİSTEM OLUŞTURULDU</h2>
      <p className="text-white/40 text-xs font-bold mt-2 uppercase tracking-widest">Yönetim paneline yönlendiriliyorsunuz...</p>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[120] bg-[#030712] p-8 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
      {/* Geri Butonu */}
      <button 
        onClick={onClose} 
        disabled={isSubmitting} 
        className="absolute left-6 top-8 p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all"
      >
        <ChevronLeft size={24} className="text-zinc-500" />
      </button>

      {/* Üst İkon ve Başlık */}
      <div className="flex flex-col items-center text-center mt-12 mb-12">
        <div className="w-20 h-20 bg-white/5 rounded-[28px] border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <Home size={44} className="text-white" strokeWidth={1.5} />
        </div>
        <h2 className="text-[26px] font-black text-white uppercase tracking-tight leading-none">YÖNETİM KURULUMU</h2>
      </div>

      {/* Form Alanları */}
      <div className="space-y-6 max-w-sm mx-auto pb-20">
        <div>
          <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 block ml-1">YÖNETİM ADI *</label>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Galata Apartmanı" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full h-15 bg-[#111827] border border-white/10 rounded-[18px] pl-14 pr-4 py-4 text-[15px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <Building size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 block ml-1">YÖNETİCİ ADI SOYADI *</label>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Ad Soyad" 
              value={formData.managerName} 
              onChange={e => setFormData({...formData, managerName: e.target.value})} 
              className="w-full h-15 bg-[#111827] border border-white/10 rounded-[18px] pl-14 pr-4 py-4 text-[15px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <User size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 block ml-1">TAM ADRES</label>
          <div className="relative group">
            <textarea 
              placeholder="Şehir, Mahalle, Sokak..." 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              className="w-full h-28 bg-[#111827] border border-white/10 rounded-[18px] pl-14 pr-4 pt-4 text-[14px] font-bold text-white outline-none focus:border-blue-500/50 transition-all resize-none placeholder:text-white/10" 
            />
            <MapPin size={20} className="absolute left-5 top-5 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 block ml-1">DAİRE SAYISI *</label>
          <div className="relative group">
            <input 
              type="number" 
              placeholder="24" 
              value={formData.unitCount} 
              onChange={e => setFormData({...formData, unitCount: e.target.value})} 
              className="w-full h-15 bg-[#111827] border border-white/10 rounded-[18px] pl-14 pr-4 py-4 text-[15px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" 
            />
            <Users size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500/50 transition-colors" />
          </div>
        </div>

        {/* Tamamlama Butonu */}
        <button 
          onClick={handleCreate} 
          disabled={isSubmitting} 
          className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-[22px] flex items-center justify-center space-x-3 active:scale-[0.98] transition-all mt-6 shadow-[0_15px_40px_rgba(37,99,235,0.3)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin text-white" size={24} />
          ) : (
            <>
              <span className="text-sm font-black text-white uppercase tracking-[0.15em] ml-4">KURULUMU TAMAMLA</span>
              <Check size={22} className="text-white" strokeWidth={3} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateManagementView;
