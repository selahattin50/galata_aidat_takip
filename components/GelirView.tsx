
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, TrendingUp, Wallet, Briefcase, Calendar, ChevronDown, Save, Loader2, X, Database } from 'lucide-react';

interface GelirViewProps {
  onClose: () => void;
  onSave: (amount: number, description: string, vault: 'genel' | 'demirbas', date: string) => void;
}

const GelirView: React.FC<GelirViewProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    kasa: 'genel' as 'genel' | 'demirbas',
    date: new Date().toISOString().split('T')[0]
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
    <div className="animate-in slide-in-from-bottom-6 duration-500 pt-0 pb-4">
      <div className="sticky top-0 z-[100] -mx-4 px-4 py-2.5 mb-3 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button onClick={onClose} className="bg-white/5 p-1.5 rounded-lg active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-[17px] font-black uppercase tracking-[0.2em] text-green-500 text-center">GELİR GİRİŞİ</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-4 px-1">
        <section>
          <label className="text-[9px] font-black tracking-widest text-white/40 uppercase mb-1.5 block ml-1">KASA VE TARİH SEÇİMİ</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button onClick={() => setFormData(prev => ({...prev, kasa: 'genel'}))} className={`h-9 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${formData.kasa === 'genel' ? 'bg-green-500 shadow-lg text-white' : 'text-white/20'}`}>
                <Wallet size={12} /><span className="text-[9px] font-black uppercase">Genel</span>
              </button>
              <button onClick={() => setFormData(prev => ({...prev, kasa: 'demirbas'}))} className={`h-9 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${formData.kasa === 'demirbas' ? 'bg-blue-600 shadow-lg text-white' : 'text-white/20'}`}>
                <Briefcase size={12} /><span className="text-[9px] font-black uppercase">Demirbaş</span>
              </button>
            </div>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData(prev => ({...prev, date: e.target.value}))} 
              className="bg-white/5 w-full h-11 rounded-xl px-3 text-[15px] font-black text-white outline-none border border-white/5" 
            />
          </div>
        </section>

        <section className="relative max-w-[265px] mx-auto group">
          <label className="text-[9px] font-black tracking-widest text-white/40 uppercase mb-1 block text-center">GELİR KALEMİ</label>
          <button 
            onClick={() => setShowCategoryList(!showCategoryList)}
            className="w-full bg-[#1e293b] rounded-lg h-11 flex items-center justify-between px-3 border border-white/10 hover:bg-[#203140] transition-all shadow-lg"
          >
            <div className="flex items-center space-x-2 truncate">
              <span className="text-base shrink-0">{incomeCategories.find(c => c.label === formData.category)?.icon || '💰'}</span>
              <span className={`text-[14px] font-black uppercase tracking-wider truncate ${formData.category ? 'text-white' : 'text-white/20'}`}>
                {formData.category || 'GELİR TÜRÜ SEÇ...'}
              </span>
            </div>
            <ChevronDown size={14} className={`text-white/30 transition-transform ${showCategoryList ? 'rotate-180' : ''}`} />
          </button>
          
          {showCategoryList && (
            <div className="absolute top-full left-0 right-0 z-[110] mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                {incomeCategories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.label)}
                    className={`w-full py-2 px-3 text-left flex items-center space-x-2 border-b border-white/5 last:border-0 hover:bg-green-500/20 transition-colors ${formData.category === cat.label ? 'bg-green-500/10 text-green-400' : 'text-white/60'}`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="text-[13px] font-black uppercase tracking-widest flex-1 truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-slate-800/40 rounded-2xl p-4 space-y-3 border border-white/5 shadow-2xl">
          <div>
            <label className="text-[9px] font-black tracking-widest text-white/20 uppercase mb-1 block ml-1">GELİR TUTARI (₺)</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={formData.amount} 
              onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} 
              className="w-full h-12 bg-black/40 rounded-xl px-4 text-[22px] font-black text-green-500 border border-white/10 outline-none focus:border-green-500/50 transition-all" 
            />
          </div>
          <div>
            <label className="text-[9px] font-black tracking-widest text-white/20 uppercase mb-1 block ml-1">İŞLEM AÇIKLAMASI</label>
            <input 
              type="text" 
              placeholder="Gelir detayı giriniz..." 
              value={formData.description} 
              onChange={e => setFormData(prev => ({...prev, description: e.target.value}))} 
              className="w-full h-10 bg-black/20 rounded-lg px-3 text-[11px] font-bold text-white border border-white/5 outline-none" 
            />
          </div>
        </section>

        <button 
          onClick={handleProcess} 
          disabled={!formData.category || !formData.amount || isSaving} 
          className={`w-full h-14 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 ${formData.category && formData.amount ? 'bg-green-600 shadow-2xl' : 'bg-white/5 opacity-20 cursor-not-allowed'}`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <span className="text-[12px] font-black text-white uppercase tracking-[0.2em]">İŞLEMİ ONAYLA</span>
              <Save size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GelirView;
