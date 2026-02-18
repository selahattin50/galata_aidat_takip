import React, { useState } from 'react';
import { ArrowLeft, Wallet, Briefcase, ChevronDown, Save, Loader2, CheckCircle2, Database } from 'lucide-react';

const GiderView: React.FC<{ onClose: () => void; onSave: (a: number, d: string, v: any, dt: string) => Promise<void>; }> = ({ onClose, onSave }) => {
  const [st, setSt] = useState({ cat: '', amt: '', desc: '', v: 'genel', dt: new Date().toISOString().split('T')[0] });
  const [showCatList, setShowCatList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const expenseCategories = [
    { id: 'elektrik', label: 'Elektrik Gideri', icon: '⚡' },
    { id: 'su', label: 'Su Gideri', icon: '💧' },
    { id: 'temizlik', label: 'Temizlik ve Çöp Alımı', icon: '🧹' },
    { id: 'asansor', label: 'Asansör Bakım', icon: '🛗' },
    { id: 'onarim', label: 'Tadilat', icon: '🔧' },
    { id: 'bahce', label: 'Bahçe Bakımı', icon: '🌱' },
    { id: 'personel', label: 'Personel Maaşı', icon: '👤' },
    { id: 'sigorta', label: 'Bina Sigortası', icon: '🛡️' },
    { id: 'diger', label: 'Diğer Giderler', icon: '📦' },
  ];

  const handleCategorySelect = (catLabel: string) => {
    const newDesc = `${catLabel.toUpperCase()}`;
    
    setSt(prev => ({ 
      ...prev, 
      cat: catLabel,
      desc: newDesc 
    }));
    setShowCatList(false);
  };

  const handleProcess = async () => {
    const a = parseFloat(st.amt); 
    console.log('🔴 GiderView handleProcess başladı:', { cat: st.cat, amount: a, desc: st.desc, vault: st.v, date: st.dt });
    
    if (!a || a <= 0) {
      console.log('🔴 GiderView: Tutar geçersiz');
      alert("Lütfen geçerli bir tutar giriniz.");
      return;
    }
    
    if (!st.cat) {
      console.log('🔴 GiderView: Kategori seçilmedi');
      alert("Lütfen gider kalemi seçiniz.");
      return;
    }
    
    setLoading(true); 
    console.log('🔴 GiderView: setLoading(true)');
    
    try {
      console.log('🔴 GiderView: onSave çağrılıyor...');
      await onSave(a, st.desc, st.v as any, st.dt);
      
      console.log('🔴 GiderView: onSave tamamlandı, success ekranı gösterilecek');
      
      setReceiptData({
        amount: a,
        description: st.desc,
        vault: st.v,
        date: new Date(st.dt).toLocaleDateString('tr-TR')
      });
      
      setLoading(false);
      setIsSuccess(true);
      console.log('🔴 GiderView: Success state set edildi');
      
    } catch (error) {
      console.error('🔴 GiderView: HATA OLUŞTU:', error);
      setLoading(false);
      alert('Kaydetme hatası: ' + (error as Error).message);
    }
  };

  if (isSuccess && receiptData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500 text-center px-6">
        <div className="bg-red-500/20 p-8 rounded-full mb-6 border border-red-500/30">
          <CheckCircle2 size={64} className="text-red-500" />
        </div>
        <h2 className="text-[24px] font-black uppercase tracking-tighter text-white">İŞLEM ONAYLANDI</h2>
        <div className="w-full bg-[#1e293b] rounded-3xl p-6 border border-white/5 space-y-4 mb-8 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[11px] font-black text-white/30 uppercase">TUTAR</span>
                <span className="text-[20px] font-black text-red-500">₺{new Intl.NumberFormat('tr-TR').format(receiptData.amount)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[11px] font-black text-white/30 uppercase">AÇIKLAMA</span>
                <span className="text-[13px] font-black text-white">{receiptData.description}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white/30 uppercase">TARİH & KASA</span>
                <span className="text-[13px] font-black text-white">{receiptData.date} ({receiptData.vault})</span>
            </div>
        </div>
        <button 
            onClick={() => {
              console.log('🔴 GiderView success button tıklandı, kaydedilmiş data:', receiptData);
              onClose();
            }}
            className="w-full h-16 bg-red-600 text-white rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3"
        >
            <Database size={20} />
            <span>UYGULAMAYA KAYDET</span>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pt-0 pb-16">
      <div className="sticky top-0 z-[100] -mx-4 px-4 py-3.5 mb-3 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button onClick={onClose} className="bg-white/5 p-2 rounded-xl border border-white/5 active:scale-90 transition-all"><ArrowLeft size={24} className="text-zinc-400" /></button>
        <h3 className="text-[18px] font-black uppercase tracking-[0.2em] text-red-500 text-center">GİDER KAYDI</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-6 px-1">
        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">KASA VE TARİH</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setSt({ ...st, v: 'genel' })} className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${st.v === 'genel' ? 'bg-green-500 shadow-lg text-white' : 'text-white/20'}`}>
                <Wallet size={16} /><span className="text-[11px] font-black uppercase">Genel</span>
              </button>
              <button onClick={() => setSt({ ...st, v: 'demirbas' })} className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${st.v === 'demirbas' ? 'bg-blue-600 shadow-lg text-white' : 'text-white/20'}`}>
                <Briefcase size={16} /><span className="text-[11px] font-black uppercase">Demirbaş</span>
              </button>
            </div>
            <input 
              type="date" 
              value={st.dt} 
              onChange={e => setSt({ ...st, dt: e.target.value })} 
              className="bg-white/5 w-full h-[52px] rounded-2xl px-4 text-[15px] font-black text-white outline-none border border-white/5" 
            />
          </div>
        </section>

        <section className="relative group">
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block text-center">GİDER KALEMİ</label>
          <button 
            onClick={() => setShowCatList(!showCatList)}
            className="w-full bg-[#1e293b] rounded-2xl h-14 flex items-center justify-between px-5 border border-white/10 hover:bg-[#2d3a4f] hover:border-red-500/50 active:bg-white/5 transition-all shadow-xl"
          >
            <div className="flex items-center space-x-3 truncate">
              <span className="text-xl shrink-0">{expenseCategories.find(c => c.label === st.cat)?.icon || '📂'}</span>
              <span className={`text-[13px] font-black uppercase tracking-wider truncate transition-colors ${st.cat ? 'text-white' : 'text-white/20 group-hover:text-white/40'}`}>
                {st.cat || 'TÜR SEÇ...'}
              </span>
            </div>
            <ChevronDown size={20} className={`text-white/30 shrink-0 transition-transform duration-300 ${showCatList ? 'rotate-180' : ''}`} />
          </button>
          
          {showCatList && (
            <div className="absolute top-full left-0 right-0 z-[110] mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                {expenseCategories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.label)}
                    className={`w-full py-3.5 px-4 text-left flex items-center space-x-3 border-b border-white/5 last:border-0 hover:bg-red-500/20 active:bg-white/5 transition-colors group ${st.cat === cat.label ? 'bg-red-500/10' : ''}`}
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <span className={`text-[12px] font-black uppercase tracking-widest flex-1 truncate transition-colors ${st.cat === cat.label ? 'text-red-400' : 'text-white/60 group-hover:text-white'}`}>
                      {cat.label}
                    </span>
                    {st.cat === cat.label && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-slate-800/40 rounded-[24px] p-5 space-y-4 border border-white/5 shadow-2xl">
          <div>
            <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">TUTAR (₺)</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={st.amt} 
              onChange={e => setSt({ ...st, amt: e.target.value })} 
              className="w-full h-12 bg-black/40 rounded-xl px-4 text-2xl font-black text-red-500 border border-white/10 outline-none focus:border-red-500/50 transition-all" 
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">AÇIKLAMA</label>
            <input 
              type="text" 
              placeholder="Açıklama giriniz..." 
              value={st.desc} 
              onChange={e => setSt({ ...st, desc: e.target.value })} 
              className="w-full h-12 bg-black/20 rounded-xl px-4 text-[11px] font-bold text-white border border-white/5 outline-none" 
            />
          </div>
        </section>

        <button 
          onClick={handleProcess} 
          disabled={!st.amt || loading} 
          className={`w-full h-16 rounded-[28px] flex items-center justify-center space-x-4 transition-all shadow-xl active:scale-95 ${st.amt ? 'bg-red-600 shadow-[0_15px_30px_rgba(220,38,38,0.3)]' : 'bg-white/5 opacity-20 cursor-not-allowed'}`}
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : (
            <>
              <span className="text-[14px] font-black text-white uppercase tracking-[0.2em]">GİDER KAYDET</span>
              <Save size={24} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default GiderView;
