import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Wallet, Briefcase, ChevronDown, Save, Loader2, CheckCircle2, Database, Zap, Droplets, ArrowUpDown, Wrench, ClipboardList, Award, Flower2, MoreHorizontal, Flame, Wifi, Shield, Car, TreePine, Package } from 'lucide-react';
import { BuildingInfo } from '../types.ts';
import DatePickerModal from './DatePickerModal';
import { fixCommonTurkishText, upperTr } from '../textUtils';
import { formatLocalIsoDateTr, toLocalIsoDate } from '../dateUtils';

const BroomIcon = () => (
  <img
    src="/icons/supurge.svg"
    alt=""
    aria-hidden="true"
    className="h-[24px] w-[24px] shrink-0 object-contain"
  />
);

const getCategoryIcon = (cat: string) => {
  const c = cat.toLocaleLowerCase('tr-TR');
  if (c.includes('elektrik') || c.includes('elektirik') || c.includes('elekt'))   return <Zap size={18} className="text-yellow-400 shrink-0" />;
  if (c.includes('su'))         return <Droplets size={18} className="text-blue-400 shrink-0" />;
  if (c.includes('asansör') || c.includes('asansor')) return <ArrowUpDown size={18} className="text-purple-400 shrink-0" />;
  if (c.includes('temizlik') || c.includes('çöp') || c.includes('cop')) return <BroomIcon />;
  if (c.includes('tamirat') || c.includes('onarım') || c.includes('onarim') || c.includes('bakım') || c.includes('bakim')) return <Wrench size={18} className="text-orange-400 shrink-0" />;
  if (c.includes('yönetim') || c.includes('yonetim')) return <ClipboardList size={18} className="text-cyan-400 shrink-0" />;
  if (c.includes('huzur'))      return <Award size={18} className="text-amber-400 shrink-0" />;
  if (c.includes('bahçe') || c.includes('bahce')) return <Flower2 size={18} className="text-lime-400 shrink-0" />;
  if (c.includes('doğalgaz') || c.includes('dogalgaz') || c.includes('gaz')) return <Flame size={18} className="text-red-400 shrink-0" />;
  if (c.includes('internet') || c.includes('wifi')) return <Wifi size={18} className="text-sky-400 shrink-0" />;
  if (c.includes('sigorta') || c.includes('güvenlik') || c.includes('guvenlik')) return <Shield size={18} className="text-indigo-400 shrink-0" />;
  if (c.includes('otopark') || c.includes('araç') || c.includes('arac')) return <Car size={18} className="text-slate-400 shrink-0" />;
  if (c.includes('peyzaj') || c.includes('ağaç') || c.includes('agac')) return <TreePine size={18} className="text-emerald-400 shrink-0" />;
  if (c.includes('malzeme') || c.includes('sarf')) return <Package size={18} className="text-rose-400 shrink-0" />;
  if (c.includes('diğer') || c.includes('diger')) return <MoreHorizontal size={18} className="text-white/40 shrink-0" />;
  return <Package size={18} className="text-white/40 shrink-0" />;
};

const getMonthLabel = (date: Date) => {
  const month = date.toLocaleDateString('tr-TR', { month: 'long' });
  return month.charAt(0).toLocaleUpperCase('tr-TR') + month.slice(1);
};

const getExpenseDescription = (catLabel: string, currentDate: Date) => {
  const normalizedCategory = catLabel.toLocaleLowerCase('tr-TR');
  const currentMonth = getMonthLabel(currentDate);
  const previousMonth = getMonthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  if (normalizedCategory.includes('elektrik') || normalizedCategory.includes('elektirik')) {
    return upperTr(`${previousMonth} Ayı Elektrik Faturası`);
  }

  if (normalizedCategory.includes('temizlik')) {
    return upperTr(`${currentMonth} Ayı Temizlik Ve Çöp Alımı`);
  }

  if (normalizedCategory.includes('asansör') || normalizedCategory.includes('asansor')) {
    return upperTr(`${currentMonth} Ayı Asansör Bakımı`);
  }

  return upperTr(catLabel);
};

const GiderView: React.FC<{ onClose: () => void; onSave: (a: number, d: string, v: any, dt: string) => Promise<void>; currentDate: Date; info: BuildingInfo; }> = ({ onClose, onSave, currentDate, info }) => {
  const currentIsoDate = toLocalIsoDate(currentDate);
  const previousDefaultDateRef = useRef(currentIsoDate);
  const [st, setSt] = useState({ cat: '', amt: '', desc: '', v: 'genel', dt: currentIsoDate });
  const [showCatList, setShowCatList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const expenseCategories = info.expenseCategories || ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Tamirat', 'Yönetim Gideri', 'Huzur Hakkı', 'Bahçe Bakımı', 'Diğer'];

  useEffect(() => {
    const previousDefaultDate = previousDefaultDateRef.current;
    setSt(prev => prev.dt === previousDefaultDate ? { ...prev, dt: currentIsoDate } : prev);
    previousDefaultDateRef.current = currentIsoDate;
  }, [currentIsoDate]);

  const handleCategorySelect = (catLabel: string) => {
    const newDesc = getExpenseDescription(catLabel, currentDate);

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
      await onSave(a, fixCommonTurkishText(st.desc), st.v as any, st.dt);

      console.log('🔴 GiderView: onSave tamamlandı, success ekranı gösterilecek');

      setReceiptData({
        amount: a,
        description: fixCommonTurkishText(st.desc),
        vault: st.v,
        date: formatLocalIsoDateTr(st.dt)
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
    <div className="scroll-stable-form h-full overflow-hidden pt-0 pb-4">
      <div className="relative px-4 py-6 mb-3 flex items-center justify-center">
        <button onClick={onClose} className="app-back-button absolute left-4"><ArrowLeft size={24} /></button>
        <h3 className="absolute left-1/2 flex max-w-[calc(100%-96px)] -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap text-[17px] font-black uppercase tracking-[0.08em] text-red-500 text-center">
          <Wallet size={20} />
          <span>GİDER KAYDI</span>
        </h3>
        <div className="w-10" />
      </div>

      <div className="space-y-6 px-1">
        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">KASA SEÇİMİ</label>
          <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
            <button onClick={() => setSt({ ...st, v: 'genel' })} className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${st.v === 'genel' ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'}`}>
              <Wallet size={18} /><span className="text-[12px] font-black uppercase tracking-widest">Genel Gider</span>
            </button>
            <button onClick={() => setSt({ ...st, v: 'demirbas' })} className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${st.v === 'demirbas' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'}`}>
              <Briefcase size={18} /><span className="text-[12px] font-black uppercase tracking-widest">Demirbaş</span>
            </button>
          </div>
        </section>

        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">TARİH VE TUTAR</label>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerModal value={st.dt} onChange={v => setSt({ ...st, dt: v })} />
            <input
              type="number"
              placeholder="0.00"
              value={st.amt}
              onChange={e => setSt({ ...st, amt: e.target.value })}
              className="bg-black/40 w-full h-[46px] rounded-xl px-3 text-[22px] font-black text-red-500 border border-white/10 outline-none focus:border-red-500/50 transition-all"
            />
          </div>
        </section>

        <section className="relative group">
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block text-center">GİDER KALEMİ</label>
          <button
            onClick={() => setShowCatList(!showCatList)}
            className="embossed-cash w-full bg-[#1e293b] rounded-2xl h-[50px] flex items-center justify-between px-4 border border-white/10 transition-colors shadow-xl"
          >
            <div className="flex items-center space-x-3 truncate">
              {st.cat ? getCategoryIcon(st.cat) : <Package size={18} className="text-white/20 shrink-0" />}
              <span className={`text-[15px] font-black uppercase tracking-wider truncate transition-colors ${st.cat ? 'text-white' : 'text-white/20 group-hover:text-white/40'}`}>
                {st.cat || 'TÜR SEÇ...'}
              </span>
            </div>
            <ChevronDown size={20} className={`text-white/30 shrink-0 transition-transform duration-300 ${showCatList ? 'rotate-180' : ''}`} />
          </button>

          {showCatList && (
            <div className="absolute top-full left-0 right-0 z-[110] mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                {expenseCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCategorySelect(cat)}
                    className={`embossed-cash w-full py-3.5 px-4 text-left flex items-center space-x-3 border-b border-white/5 last:border-0 hover:bg-red-500/20 active:bg-white/5 transition-colors group ${st.cat === cat ? 'bg-red-500/10' : ''}`}
                  >
                    {getCategoryIcon(cat)}
                    <span className={`text-[12px] font-black uppercase tracking-widest flex-1 truncate transition-colors ${st.cat === cat ? 'text-red-400' : 'text-white/60 group-hover:text-white'}`}>
                      {cat}
                    </span>
                    {st.cat === cat && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-slate-800/40 rounded-[24px] p-3 border border-white/5 shadow-2xl">
          <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">AÇIKLAMA</label>
          <input
            type="text"
            placeholder="Açıklama giriniz..."
            value={st.desc}
            onChange={e => setSt({ ...st, desc: e.target.value })}
            className="w-full h-[46px] bg-black/20 rounded-xl px-3 text-[15px] font-black text-white border border-white/5 outline-none"
          />
        </section>

        <button
          onClick={handleProcess}
          disabled={!st.amt || loading}
          className={`embossed-cash w-full h-16 rounded-[28px] flex items-center justify-center space-x-4 transition-colors shadow-xl ${st.amt ? 'bg-red-600 shadow-[0_15px_30px_rgba(220,38,38,0.3)]' : 'bg-white/5 opacity-20 cursor-not-allowed'}`}
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
