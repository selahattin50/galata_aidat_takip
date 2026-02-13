
import React, { useState } from 'react';
import { ChevronLeft, Check, Building, MapPin, Loader2, User, Hash, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight, Building2, Banknote } from 'lucide-react';
import { BuildingInfo, Unit } from '../types';

interface EditManagementViewProps {
  info: BuildingInfo;
  units?: Unit[];
  onClose: () => void;
  onSuccess: (data: BuildingInfo) => void;
}

const EditManagementView: React.FC<EditManagementViewProps> = ({ info, units = [], onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: info?.name || '',
    address: info?.address || '',
    managerName: info?.managerName || '',
    taxNo: info?.taxNo || '',
    duesAmount: (info?.duesAmount || 750).toString(),
    isAutoDuesEnabled: info?.isAutoDuesEnabled || false,
    isManagerExempt: info?.isManagerExempt || false,
    managerUnitId: info?.managerUnitId || ''
  });

  const handleUpdate = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    
    const updatedData: BuildingInfo = {
      ...info,
      name: formData.name,
      managerName: formData.managerName,
      taxNo: formData.taxNo,
      duesAmount: parseFloat(formData.duesAmount) || 0,
      isAutoDuesEnabled: formData.isAutoDuesEnabled,
      isManagerExempt: formData.isManagerExempt,
      managerUnitId: formData.managerUnitId,
      address: formData.address,
    };

    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => onSuccess(updatedData), 1000);
  };

  return (
    <div className="absolute inset-0 z-[140] bg-[#020617] p-8 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
      {!isSuccess && <button onClick={onClose} className="absolute left-6 top-8 p-2 bg-white/5 rounded-xl"><ChevronLeft size={28} className="text-zinc-500" /></button>}

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
           <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30"><CheckCircle2 size={48} className="text-green-500" /></div>
           <h2 className="text-xl font-black text-white uppercase tracking-tighter">BİLGİLER GÜNCELLENDİ</h2>
        </div>
      ) : (
        <div className="max-w-sm mx-auto pt-12 pb-24 space-y-8">
          <div className="text-center mb-10">
            <Building size={64} className="text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">YÖNETİM AYARLARI</h2>
          </div>

          <div className="space-y-6">
            {/* Yönetim Adı */}
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Yönetim Adı</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm font-black text-white outline-none focus:border-blue-500 transition-all" 
                />
                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500" />
              </div>
            </div>

            {/* Vergi No - Yeni Eklenen Bölüm */}
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Vergi No</label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Vergi numarasını giriniz"
                  value={formData.taxNo} 
                  onChange={e => setFormData({...formData, taxNo: e.target.value})} 
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm font-black text-white outline-none focus:border-blue-500 transition-all" 
                />
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500" />
              </div>
            </div>

            {/* Aylık Aidat */}
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Aylık Aidat (₺)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  value={formData.duesAmount} 
                  onChange={e => setFormData({...formData, duesAmount: e.target.value})} 
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-xl font-black text-white outline-none focus:border-emerald-500 transition-all" 
                />
                <Banknote size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 group-focus-within:text-emerald-500" />
              </div>
            </div>

            {/* Tam Adres */}
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Tam Adres</label>
              <div className="relative group">
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 pt-4 text-sm font-black text-white outline-none focus:border-blue-500 resize-none transition-all" 
                />
                <MapPin size={18} className="absolute left-4 top-4 text-white/20 group-focus-within:text-blue-500" />
              </div>
            </div>

            {/* Kaydet Butonu */}
            <button 
              onClick={handleUpdate} 
              disabled={isSubmitting} 
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all mt-4 shadow-xl shadow-blue-900/20"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin text-white" />
              ) : (
                <>
                  <span className="text-sm font-black text-white uppercase tracking-[0.2em]">DEĞİŞİKLİKLERİ KAYDET</span>
                  <Check size={20} className="text-white" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditManagementView;
