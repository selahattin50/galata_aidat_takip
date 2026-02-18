
import React, { useRef, useState } from 'react';
import { ArrowLeft, Edit3, X, Save, Phone, Info, UserCheck, User, Home } from 'lucide-react';
import { Unit, BuildingInfo, Transaction } from '../types.ts';

interface UnitDetailViewProps {
  unit: Unit;
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onUpdate: (unit: Unit) => void;
}

const UnitDetailView: React.FC<UnitDetailViewProps> = ({ unit, info, transactions, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...unit });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const currentYear = new Date().getFullYear();

  const toTitleCase = (str: string) => {
    if (!str) return '';
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const getMonthStatus = (mIdx: number) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Gelecek aylar
    if (mIdx > currentMonth) {
      return 'future';
    }

    // Yönetici muafiyeti kontrolü
    if (unit.id === info.managerUnitId && info.isManagerExempt) {
      return 'exempt';
    }

    // Toplam gelir ve borçlandırmaları hesapla
    const totalIncome = transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'GELİR')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalManualDebt = transactions
      .filter(tx => tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    let runningCredit = totalIncome - totalManualDebt;
    const duesValue = info.duesAmount || 750;

    // Her ay için sırayla kontrol et
    for (let m = 0; m <= 11; m++) {
      const hasManualForThisMonth = transactions.some(tx => 
        tx.unitId === unit.id && 
        tx.type === 'BORÇLANDIRMA' && 
        tx.periodMonth === m && 
        tx.periodYear === currentYear
      );
      
      let isPaidThisMonth = false;
      if (!hasManualForThisMonth) {
        if (runningCredit >= duesValue) {
          runningCredit -= duesValue;
          isPaidThisMonth = true;
        }
      }

      if (m === mIdx) {
        return isPaidThisMonth ? 'paid' : 'unpaid';
      }
    }

    return 'unpaid';
  };

  const handleQuickUpdate = () => {
    const updatedForm = {
        ...editForm,
        status: editForm.tenantName ? 'Kiracı' : 'Malik'
    };
    onUpdate(updatedForm);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#030712] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl shrink-0 shadow-xl">
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsEditing(false)} className="bg-white/5 p-2 rounded-xl text-zinc-400 border border-white/5">
                <X size={20} />
              </button>
              <button onClick={handleQuickUpdate} className="bg-green-600 px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center space-x-2 shadow-lg">
                <Save size={18} />
                <span>KAYDET</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-white/5 p-2 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5">
              <Edit3 size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3" ref={cardRef}>
        
        {/* ANA BİLGİ VE DÜZENLEME ALANI */}
        <section className="space-y-3">
          {isEditing ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              {/* Malik Giriş Alanı */}
              <div className="bg-[#1e293b]/60 backdrop-blur-xl rounded-[24px] p-4 border border-blue-500/20 shadow-xl">
                <div className="flex items-center space-x-2 mb-3">
                    <User size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">MALİK BİLGİLERİ</span>
                </div>
                <div className="space-y-2.5">
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Ad Soyad</label>
                        <input 
                            className="bg-transparent text-sm font-black text-white w-full outline-none"
                            value={editForm.ownerName}
                            placeholder="Malik Adı Soyadı"
                            onChange={(e) => setEditForm({...editForm, ownerName: toTitleCase(e.target.value)})}
                        />
                    </div>
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Telefon</label>
                        <input 
                            className="bg-transparent text-sm font-bold text-green-400 w-full outline-none"
                            value={editForm.phone}
                            placeholder="Telefon (05xx...)"
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        />
                    </div>
                </div>
              </div>

              {/* Kiracı Giriş Alanı */}
              <div className="bg-[#1e293b]/40 backdrop-blur-xl rounded-[24px] p-4 border border-orange-500/20 shadow-xl">
                <div className="flex items-center space-x-2 mb-3">
                    <UserCheck size={14} className="text-orange-400" />
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">KİRACI BİLGİLERİ</span>
                </div>
                <div className="space-y-2.5">
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Ad Soyad</label>
                        <input 
                            className="bg-transparent text-sm font-black text-white w-full outline-none"
                            value={editForm.tenantName || ''}
                            placeholder="Boş bırakılırsa Kiracı Yok sayılır"
                            onChange={(e) => setEditForm({...editForm, tenantName: toTitleCase(e.target.value)})}
                        />
                    </div>
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Telefon</label>
                        <input 
                            className="bg-transparent text-sm font-bold text-green-400 w-full outline-none"
                            value={editForm.tenantPhone || ''}
                            placeholder="Kiracı Telefonu"
                            onChange={(e) => setEditForm({...editForm, tenantPhone: e.target.value})}
                        />
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* MALİK KARTI */}
              <div className="bg-[#1e293b]/60 backdrop-blur-xl rounded-[24px] p-4 border border-blue-500/20 shadow-2xl relative overflow-hidden">
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 border border-blue-400/30 flex flex-col items-center justify-center shadow-lg shrink-0">
                    <span className="text-[7px] font-black text-white/50 uppercase leading-none mb-0.5">NO</span>
                    <span className="text-lg font-black text-white leading-none">{unit.no}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5 block">MALİK BİLGİLERİ</span>
                    <h2 className="text-[16px] font-black text-white uppercase leading-tight tracking-tight break-words">
                      {unit.ownerName || 'İSİM BELİRTİLMEDİ'}
                    </h2>
                    <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                      <Phone size={10} className="text-green-500" />
                      <span className="text-[12px] font-bold text-green-400 tracking-wide">
                        {unit.phone || 'TELEFON YOK'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KİRACI KARTI (Varsa) */}
              {unit.tenantName && (
                <div className="bg-[#1e293b]/40 backdrop-blur-xl rounded-[24px] p-4 border border-orange-500/20 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                      <UserCheck size={22} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em] mb-0.5 block">KİRACI BİLGİLERİ</span>
                      <h2 className="text-[16px] font-black text-white uppercase leading-tight tracking-tight break-words">
                        {unit.tenantName}
                      </h2>
                      <div className="flex items-center space-x-1.5 mt-1 bg-black/20 w-fit px-2.5 py-0.5 rounded-full border border-white/5">
                        <Phone size={10} className="text-green-500" />
                        <span className="text-[12px] font-bold text-green-400 tracking-wide">
                          {unit.tenantPhone || 'TELEFON YOK'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Borçlandırma Özeti */}
        <section className="bg-blue-600/10 rounded-[20px] p-4 border border-blue-500/30 shadow-2xl flex items-center space-x-4">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><Info size={22} /></div>
          <div>
            <h3 className="text-[10px] font-black text-white/40 tracking-[0.15em] uppercase mb-0.5">BORÇLANDIRMA ÖZETİ</h3>
            <p className="text-[14px] font-black leading-none">
              Toplam <span className={unit.debt > 0 ? 'text-red-500' : 'text-green-500'}>₺{formatCurrency(unit.debt)}</span> borç fişi mevcut.
            </p>
          </div>
        </section>

        {/* Hesap Özeti - Tablo */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">MALİ DURUM</h3>
            <div className="flex space-x-4">
              <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">KREDİ</span>
              <span className="text-[9px] font-black text-red-500/40 tracking-widest uppercase">BORÇ</span>
            </div>
          </div>
          <div className="bg-[#111827] rounded-[24px] p-3 border border-white/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/10">
                {[{ label: 'GENEL GİDER', credit: unit.credit, debt: unit.debt }, { label: 'DEMİRBAŞ', credit: 0, debt: 0 }].map((row, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-2 text-[10px] font-black text-white/40 uppercase tracking-widest">{row.label}</td>
                    <td className="py-2.5 px-2 text-right text-[14px] font-black text-white">₺{formatCurrency(row.credit)}</td>
                    <td className="py-2.5 px-2 text-right text-[14px] font-black text-red-500">₺{formatCurrency(row.debt)}</td>
                  </tr>
                ))}
                <tr className="bg-white/[0.03]">
                  <td className="py-3 px-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">TOPLAM</td>
                  <td className="py-3 px-2 text-right text-[16px] font-black text-white">₺{formatCurrency(unit.credit)}</td>
                  <td className="py-3 px-2 text-right text-[16px] font-black text-red-500">₺{formatCurrency(unit.debt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Aidat Özeti - Grid */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">AİDAT ÇİZELGESİ</h3>
            <span className="text-[10px] font-black text-white/10">{currentYear}</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {months.map((m, idx) => {
              const status = getMonthStatus(idx);
              let bgColor = 'bg-[#1e293b] border-white/5 opacity-40';
              
              if (status === 'paid') {
                bgColor = 'bg-green-700/60 border-green-500/40';
              } else if (status === 'unpaid') {
                bgColor = 'bg-rose-800/60 border-rose-500/40';
              } else if (status === 'exempt') {
                bgColor = 'bg-blue-600/40 border-blue-400/20';
              }
              
              return (
                <div key={m} className={`h-8 flex items-center justify-center rounded-[6px] border transition-all ${bgColor}`}>
                  <span className="text-[9px] font-black text-white leading-none">{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UnitDetailView;
