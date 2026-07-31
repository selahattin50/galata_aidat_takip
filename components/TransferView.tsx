import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ArrowRightLeft, Wallet, Briefcase, Save, Loader2 } from 'lucide-react';
import DatePickerModal from './DatePickerModal';
import { toLocalIsoDate } from '../dateUtils';

interface TransferViewProps {
  onClose: () => void;
  onSave: (amount: number, description: string, sourceVault: 'genel' | 'demirbas', date: string) => void;
  currentDate: Date;
}

const TransferView: React.FC<TransferViewProps> = ({ onClose, onSave, currentDate }) => {
  const currentIsoDate = toLocalIsoDate(currentDate);
  const previousDefaultDateRef = useRef(currentIsoDate);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sourceVault, setSourceVault] = useState<'genel' | 'demirbas'>('genel');
  const [selectedDate, setSelectedDate] = useState<string>(currentIsoDate);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  useEffect(() => {
    const previousDefaultDate = previousDefaultDateRef.current;
    setSelectedDate(prev => prev === previousDefaultDate ? currentIsoDate : prev);
    previousDefaultDateRef.current = currentIsoDate;
  }, [currentIsoDate]);

  const handleProcess = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaveComplete(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetVault = sourceVault === 'genel' ? 'DEMİRBAŞ' : 'GENEL GİDER';
    const sourceVaultName = sourceVault === 'genel' ? 'GENEL GİDER' : 'DEMİRBAŞ';
    const desc = description.trim() || 'Kasa Transferi';
    const finalDescription = `${desc} [${sourceVaultName} -> ${targetVault}]`;

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
      <div className="relative px-4 py-6 mb-3 flex items-center justify-center">
        <button onClick={onClose} className="app-back-button absolute left-4">
          <ArrowLeft size={24} />
        </button>
        <h3 className="absolute left-1/2 flex max-w-[calc(100%-96px)] -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap text-[17px] font-black uppercase tracking-[0.04em] text-green-500 text-center">
          <ArrowRightLeft size={20} />
          <span>KASALAR ARASI TRANSFER</span>
        </h3>
        <div className="w-10" />
      </div>

      <div className="space-y-5 px-1">
        <section>
          <label className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-3 block ml-1">KASA SEÇİMİ</label>
          <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
            <button
              onClick={() => setSourceVault('genel')}
              className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${
                sourceVault === 'genel' ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'
              }`}
            >
              <Wallet size={18} />
              <span className="text-[12px] font-black uppercase tracking-widest">Genel Gider</span>
            </button>
            <button
              onClick={() => setSourceVault('demirbas')}
              className={`embossed-cash h-12 rounded-xl flex items-center justify-center space-x-2 border transition-all ${
                sourceVault === 'demirbas' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/45 hover:bg-white/10'
              }`}
            >
              <Briefcase size={18} />
              <span className="text-[12px] font-black uppercase tracking-widest">Demirbaş</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="embossed-cash rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/35">YÖN</span>
                <ArrowRightLeft size={14} className="text-white/25" />
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                {sourceVault === 'genel' ? 'GENEL -> DEMİRBAŞ' : 'DEMİRBAŞ -> GENEL'}
              </div>
            </div>

            <div className="embossed-cash rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-3 py-2">
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
          <div className="glass-panel rounded-[24px] p-3 space-y-3 border border-white/10 shadow-xl">
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
                  className="w-full h-[46px] bg-black/40 rounded-xl px-3 text-[22px] font-black text-indigo-400 border border-white/10 outline-none focus:border-indigo-500/40 transition-all shadow-inner"
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
                className="w-full h-[46px] bg-black/20 rounded-xl px-3 text-[15px] font-bold text-white border border-white/5 outline-none"
              />
            </div>
          </div>
        </section>

        <button
          onClick={handleProcess}
          disabled={!amount || isSaving}
          className={`embossed-cash w-full h-14 rounded-2xl shadow-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all ${
            amount ? 'bg-indigo-600 shadow-indigo-900/30' : 'bg-white/5 grayscale cursor-not-allowed opacity-30'
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
