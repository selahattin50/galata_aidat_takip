import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ArrowRightLeft, Wallet, Briefcase, Save, Loader2 } from 'lucide-react';
import DatePickerModal from './DatePickerModal';

interface TransferViewProps {
  onClose: () => void;
  onSave: (amount: number, description: string, sourceVault: 'genel' | 'demirbas', date: string) => void;
  currentDate: Date;
}

const TransferView: React.FC<TransferViewProps> = ({ onClose, onSave, currentDate }) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sourceVault, setSourceVault] = useState<'genel' | 'demirbas'>('genel');
  const [selectedDate, setSelectedDate] = useState<string>(currentDate.toISOString().split('T')[0]);
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

    const targetVault = sourceVault === 'genel' ? 'DEMİRBAŞ' : 'GENEL GİDER';
    const sourceVaultName = sourceVault === 'genel' ? 'GENEL GİDER' : 'DEMİRBAŞ';
    const finalDescription = `${description} [${sourceVaultName} -> ${targetVault}]`;

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
        <h2 className="text-4xl font-black uppercase tracking-widest text-indigo-400">TRANSFER BASARILI</h2>
        <p className="text-white/40 text-[18px] font-bold mt-4 uppercase tracking-tight px-10">Kasa bakiyeleri karsilikli olarak guncellendi</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pt-0 pb-16">
      <div className="sticky top-0 z-[100] -mx-4 mb-3 flex items-center justify-between border-b border-white/5 bg-[#030712]/90 px-4 py-3.5 backdrop-blur-xl">
        <button onClick={onClose} className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={24} className="text-zinc-400" />
        </button>
        <h3 className="text-[16px] font-black uppercase tracking-[0.14em] text-green-500 text-center">KASALAR ARASI TRANSFER</h3>
        <div className="w-10" />
      </div>

      <div className="space-y-5 px-1">
        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">KASA SEÇİMİ</label>
          <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setSourceVault('genel')}
              className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                sourceVault === 'genel' ? 'bg-green-500 shadow-lg text-white' : 'text-white/20'
              }`}
            >
              <Wallet size={16} />
              <span className="text-[11px] font-black uppercase">Genel</span>
            </button>
            <button
              onClick={() => setSourceVault('demirbas')}
              className={`h-12 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                sourceVault === 'demirbas' ? 'bg-blue-600 shadow-lg text-white' : 'text-white/20'
              }`}
            >
              <Briefcase size={16} />
              <span className="text-[11px] font-black uppercase">Demirbaş</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/35">YÖN</span>
                <ArrowRightLeft size={14} className="text-white/25" />
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                {sourceVault === 'genel' ? 'GENEL -> DEMİRBAŞ' : 'DEMİRBAŞ -> GENEL'}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">ALICI :</span>
              <div className="mt-1 flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-indigo-300/70" />
                <span className="text-[10px] font-black uppercase tracking-wide text-indigo-200 truncate">
                  {sourceVault === 'genel' ? 'DEMİRBAŞ KASASI' : 'GENEL GİDER'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">TRANSFER DETAYI</label>
          <div className="glass-panel rounded-[24px] p-4 space-y-4 border border-white/10 shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">İŞLEM TARİHİ</label>
                <div className="relative">
                  <DatePickerModal value={selectedDate} onChange={setSelectedDate} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">TUTAR (TL)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-[52px] bg-black/40 rounded-xl px-4 text-[20px] font-black text-indigo-400 border border-white/10 outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black tracking-widest text-white/20 uppercase mb-2 block ml-1">AÇIKLAMA</label>
              <input
                type="text"
                placeholder="Örn: Kasa dengeleme"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-12 bg-black/20 rounded-xl px-4 text-[12px] font-bold text-white border border-white/5 outline-none"
              />
            </div>
          </div>
        </section>

        <button
          onClick={handleProcess}
          disabled={!amount || !description || isSaving}
          className={`w-full h-14 rounded-2xl shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all ${
            amount && description ? 'bg-indigo-600 shadow-indigo-900/30' : 'bg-white/5 grayscale cursor-not-allowed opacity-30'
          }`}
        >
          {isSaving ? (
            <Loader2 className="animate-spin text-white" size={22} />
          ) : saveComplete ? (
            <div className="flex items-center space-x-3">
              <CheckCircle2 size={22} className="text-white" />
              <span className="text-[12px] font-black text-white uppercase tracking-[0.18em]">KAYDEDILDI</span>
            </div>
          ) : (
            <>
              <Save size={20} className="text-white" />
              <span className="text-[12px] font-black text-white uppercase tracking-[0.18em]">TRANSFERI KAYDET</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TransferView;
