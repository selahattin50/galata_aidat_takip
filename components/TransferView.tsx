import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ArrowRightLeft, Wallet, Briefcase, Calendar, Info, Save, Loader2, X } from 'lucide-react';

interface TransferViewProps {
  onClose: () => void;
  onSave: (amount: number, description: string, sourceVault: 'genel' | 'demirbas', date: string) => void;
}

const TransferView: React.FC<TransferViewProps> = ({ onClose, onSave }) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sourceVault, setSourceVault] = useState<'genel' | 'demirbas'>('genel');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  const handleProcess = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || !description) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaveComplete(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetVault = sourceVault === 'genel' ? 'Demirbaş' : 'Genel Gider';
    const sourceVaultName = sourceVault === 'genel' ? 'Genel Gider' : 'Demirbaş';
    const finalDescription = `${description} [${sourceVaultName} ➔ ${targetVault}]`;

    setIsSuccess(true);
    setTimeout(() => {
      onSave(numAmount, finalDescription, sourceVault, selectedDate);
    }, 500);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500 text-center">
        <div className="bg-indigo-500/20 p-10 rounded-full mb-8 border border-indigo-500/20">
          <ArrowRightLeft size={100} className="text-indigo-400" />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-widest text-indigo-400">TRANSFER BAŞARILI</h2>
        <p className="text-white/40 text-[18px] font-bold mt-4 uppercase tracking-tight px-10">Kasa bakiyeleri karşılıklı olarak güncellendi</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pt-0 pb-20">
      <div className="sticky top-0 z-[100] -mx-4 px-4 py-6 mb-6 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button onClick={onClose} className="bg-white/5 p-3 rounded-2xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={28} className="text-zinc-400" />
        </button>
        <h3 className="text-[13px] font-black uppercase tracking-[0.1em] text-green-500 text-center">KASALAR ARASI TRANSFER</h3>
        <div className="w-12" />
      </div>

      <div className="space-y-8 px-1">
        <section>
          <label className="text-[14px] font-black tracking-widest text-white/40 uppercase mb-4 block ml-1">1. KAYNAK KASA (NEREDEN?)</label>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setSourceVault('genel')} className={`h-20 rounded-[24px] flex flex-col items-center justify-center border transition-all ${sourceVault === 'genel' ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/20 hover:bg-white/10'}`}>
              <Wallet size={24} className="mb-1" />
              <span className="text-[14px] font-black uppercase tracking-widest">Genel Gider</span>
              <span className="text-[10px] font-bold uppercase opacity-40">➔ DEMİRBAŞ</span>
            </button>
            <button onClick={() => setSourceVault('demirbas')} className={`h-20 rounded-[24px] flex flex-col items-center justify-center border transition-all ${sourceVault === 'demirbas' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/20 hover:bg-white/10'}`}>
              <Briefcase size={24} className="mb-1" />
              <span className="text-[14px] font-black uppercase tracking-widest">Demirbaş</span>
              <span className="text-[10px] font-bold uppercase opacity-40">➔ GENEL</span>
            </button>
          </div>
        </section>

        <section>
          <label className="text-[14px] font-black tracking-widest text-white/40 uppercase mb-4 block ml-1">2. İŞLEM DETAYLARI</label>
          <div className="glass-panel rounded-[32px] p-6 space-y-6 border border-white/10 shadow-xl">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-[13px] font-bold text-white/30 uppercase tracking-widest block mb-3 ml-1">Transfer Tarihi</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-black/20 w-full h-[52px] rounded-2xl px-3 text-[15px] font-bold text-white outline-none border border-white/5" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-white/30 uppercase tracking-widest block mb-3 ml-1">Miktar (₺)</label>
                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-black/20 w-full h-14 rounded-2xl px-5 text-2xl font-black text-indigo-400 outline-none border border-white/5" />
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-white/30 uppercase tracking-widest block mb-3 ml-1">Açıklama</label>
              <input type="text" placeholder="Örn: Nakit İhtiyacı İçin Aktarım" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-black/20 w-full h-14 rounded-2xl px-5 text-[15px] font-bold text-white outline-none border border-white/5" />
            </div>
          </div>
        </section>

        <button onClick={handleProcess} disabled={!amount || !description || isSaving} className={`w-full h-20 rounded-[32px] shadow-2xl flex items-center justify-center space-x-5 active:scale-95 transition-all ${amount && description ? 'bg-indigo-600 shadow-indigo-900/30' : 'bg-white/5 grayscale cursor-not-allowed opacity-30'}`}>
          {isSaving ? <Loader2 className="animate-spin text-white" size={32} /> : saveComplete ? <div className="flex items-center space-x-4"><CheckCircle2 size={32} className="text-white" /><span className="text-[18px] font-black text-white uppercase tracking-[0.2em]">KAYDEDİLDİ</span></div> : <><Save size={32} className="text-white" /><span className="text-[18px] font-black text-white uppercase tracking-[0.2em]">TRANSFERİ KAYDET</span></>}
        </button>
      </div>
    </div>
  );
};

export default TransferView;