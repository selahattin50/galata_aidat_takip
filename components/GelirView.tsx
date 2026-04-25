
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, TrendingUp, Wallet, Briefcase, Calendar, ChevronDown, Save, Loader2, X, Database } from 'lucide-react';
import DatePickerModal from './DatePickerModal';

interface GelirViewProps {
  onClose: () => void;
  onSave: (amount: number, description: string, vault: 'genel' | 'demirbas', date: string) => void;
  currentDate: Date;
}

const GelirView: React.FC<GelirViewProps> = ({ onClose, onSave, currentDate }) => {
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    kasa: 'genel' as 'genel' | 'demirbas',
    date: currentDate.toISOString().split('T')[0]
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const incomeCategories = [
    { id: 'devir', label: 'Devir Kaynaklı', icon: '🔄' },
    { id: 'aidat', label: 'Aidat', icon: '🏠' },
    { id: 'transfer', label: 'Transfer', icon: '💸' },
    { id: 'reklam', label: 'Reklam', icon: '📢' },
    { id: 'satis', label: 'Satış', icon: '🛒' },
    { id: 'diger', label: 'Diğer', icon: '✨' }
  ];

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category,
      description: prev.description || category.toUpperCase()
    }));
    setShowCategoryList(false);
  };

  const handleProcess = async () => {
    const numAmount = parseFloat(formData.amount);
    if (!formData.category || !numAmount || numAmount <= 0) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setReceiptData({
        amount: numAmount,
        description: formData.description || formData.category,
        vault: formData.kasa,
        date: new Date(formData.date).toLocaleDateString('tr-TR')
    });
    
    setIsSaving(false);
    setIsSuccess(true);
  };

  if (isSuccess && receiptData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500 text-center px-6">
        <div className="bg-green-500/20 p-8 rounded-full mb-6 border border-green-500/30">
          <CheckCircle2 size={64} className="text-green-500" />
        </div>
        <h2 className="text-[24px] font-black uppercase tracking-tighter text-white">İŞLEM ONAYLANDI</h2>
        <div className="w-full bg-[#1e293b] rounded-3xl p-6 border border-white/5 space-y-4 mb-8 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[11px] font-black text-white/30 uppercase">TUTAR</span>
                <span className="text-[20px] font-black text-green-500">₺{new Intl.NumberFormat('tr-TR').format(receiptData.amount)}</span>
            </div>
        </div>
        <button 
            onClick={async () => { 
              try {
                await onSave(receiptData.amount, receiptData.description, receiptData.vault, receiptData.date); 
                onClose();
              } catch (error) {
                console.error('Gelir kaydetme hatası:', error);
                alert('Kaydetme hatası: ' + (error as Error).message);
              }
            }}
            className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3"
        >
            <Database size={20} />
            <span>UYGULAMAYA KAYDET</span>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pt-0 pb-60">
      <div className="sticky top-0 z-[100] px-4 py-2.5 mb-3 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button onClick={onClose} className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={24} className="text-zinc-400" />
        </button>
        <h3 className="text-[17px] font-black uppercase tracking-[0.2em] text-green-500 text-center">GELİR GİRİŞİ</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-4 px-1">
        <section>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">KASA SEÇİMİ</label>
          <div className="grid grid-cols-2 gap-2.5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setFormData(prev => ({...prev, kasa: 'genel'}))} className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${formData.kasa === 'genel' ? 'bg-green-500 shadow-lg text-white' : 'text-white/20'}`}>
              <Wallet size={16} /><span className="text-[11px] font-black uppercase">Genel Gider</span>
            </button>
            <button onClick={() => setFormData(prev => ({...prev, kasa: 'demirbas'}))} className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${formData.kasa === 'demirbas' ? 'bg-blue-600 shadow-lg text-white' : 'text-white/20'}`}>
              <Briefcase size={16} /><span className="text-[11px] font-black uppercase">Demirbaş</span>
            </button>
          </div>
        </section>

        <section>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">TARİH VE TUTAR</label>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerModal value={formData.date} onChange={v => setFormData(prev => ({...prev, date: v}))} />
            <input 
              type="number" 
              placeholder="0.00" 
              value={formData.amount} 
              onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} 
              className="w-full h-[52px] bg-black/40 rounded-xl px-4 text-[20px] font-black text-green-500 border border-white/10 outline-none focus:border-green-500/50 transition-all" 
            />
          </div>
        </section>

        <section className="relative group">
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1.5 block text-center">GELİR KALEMİ</label>
          <button 
            onClick={() => setShowCategoryList(!showCategoryList)}
            className="w-full bg-[#1e293b] rounded-2xl h-14 flex items-center justify-between px-5 border border-white/10 hover:bg-[#203140] transition-all shadow-xl"
          >
            <div className="flex items-center space-x-3 truncate">
              <span className="text-xl shrink-0">{incomeCategories.find(c => c.label === formData.category)?.icon || '💰'}</span>
              <span className={`text-[13px] font-black uppercase tracking-wider truncate transition-colors ${formData.category ? 'text-white' : 'text-white/20 group-hover:text-white/40'}`}>
                {formData.category || 'GELİR TÜRÜ SEÇ...'}
              </span>
            </div>
            <ChevronDown size={20} className={`text-white/30 transition-transform duration-300 ${showCategoryList ? 'rotate-180' : ''}`} />
          </button>
          
          {showCategoryList && (
            <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                {incomeCategories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.label)}
                    className={`w-full py-3 px-4 text-left flex items-center space-x-3 border-b border-white/5 last:border-0 hover:bg-green-500/20 active:bg-white/5 transition-colors group ${formData.category === cat.label ? 'bg-green-500/10' : ''}`}
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <span className={`text-[12px] font-black uppercase tracking-widest flex-1 truncate transition-colors ${formData.category === cat.label ? 'text-green-400' : 'text-white/60 group-hover:text-white'}`}>
                      {cat.label}
                    </span>
                    {formData.category === cat.label && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-slate-800/40 rounded-3xl p-5 border border-white/5 shadow-2xl">
          <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">İŞLEM AÇIKLAMASI</label>
          <input 
            type="text" 
            placeholder="Gelir detayı giriniz..." 
            value={formData.description} 
            onChange={e => setFormData(prev => ({...prev, description: e.target.value}))} 
            className="w-full h-[52px] bg-black/20 rounded-xl px-4 text-[13px] font-black text-white border border-white/5 outline-none focus:border-green-500/30 transition-all" 
          />
        </section>

        <button 
          onClick={handleProcess} 
          disabled={!formData.category || !formData.amount || isSaving} 
          className={`w-full h-16 rounded-[28px] flex items-center justify-center space-x-4 transition-all active:scale-95 ${formData.category && formData.amount ? 'bg-green-600 shadow-[0_15px_30px_rgba(22,197,94,0.3)]' : 'bg-white/5 opacity-20 cursor-not-allowed'}`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={24} /> : (
            <>
              <span className="text-[14px] font-black text-white uppercase tracking-[0.2em]">GELİRİ KAYDET</span>
              <Save size={24} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GelirView;
