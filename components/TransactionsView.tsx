
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Inbox, Calendar, ChevronDown, X, Edit3, Save, Share2, CloudLightning, Trash2 } from 'lucide-react';
import { Transaction, Unit, FileEntry } from '../types.ts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';

interface TransactionsViewProps {
  transactions: Transaction[];
  units: Unit[];
  onClose: () => void;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  currentDate: Date;
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions, units, onClose, onAddFile, onDeleteTransaction, onUpdateTransaction, currentDate }) => {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [txToPrint, setTxToPrint] = useState<Transaction | null>(null);

  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  const getUnitNo = (unitId?: string) => units.find(u => u.id === unitId)?.no || 'GENEL';
  const getUnitName = (unitId?: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return 'BİNA GENEL GİDERİ';
    return unit.tenantName || unit.ownerName;
  };

  const numberToWordsTr = (num: number) => {
    const unitsWords = ["", "BİR", "İKİ", "ÜÇ", "DÖRT", "BEŞ", "ALTI", "YEDİ", "SEKİZ", "DOKUZ"];
    const tensWords = ["", "ON", "YİRMİ", "OTUZ", "KIRK", "ELLİ", "ALTMIŞ", "YETMİŞ", "SEKSEN", "DOKSAN"];
    const scalesWords = ["", "BİN", "MİLYON", "MİLYAR"];
    let str = "";
    let integerPart = Math.floor(num);
    let decimalPart = Math.round((num - integerPart) * 100);
    const convertThreeDigit = (n: number) => {
      let res = "";
      let h = Math.floor(n / 100);
      let t = Math.floor((n % 100) / 10);
      let u = n % 10;
      if (h > 0) { if (h > 1) res += unitsWords[h]; res += "YÜZ"; }
      if (t > 0) res += tensWords[t];
      if (u > 0) res += unitsWords[u];
      return res;
    };
    if (integerPart === 0) str = "SIFIR";
    else {
      let parts = [];
      let temp = integerPart;
      while (temp > 0) { parts.push(temp % 1000); temp = Math.floor(temp / 1000); }
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] === 0) continue;
        let partStr = convertThreeDigit(parts[i]);
        if (i === 1 && parts[i] === 1) str += "BİN";
        else str += partStr + scalesWords[i];
      }
    }
    str += " TÜRK LİRASI";
    if (decimalPart > 0) str += " " + convertThreeDigit(decimalPart) + " KURUŞ";
    return str;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const trToIsoDate = (trDate: string) => {
    const parts = trDate.split('.');
    if (parts.length !== 3) return currentDate.toISOString().split('T')[0];
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  };

  const isoToTrDate = (isoDate: string) => {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(tx => {
        const parts = tx.date.split('.');
        if (parts.length !== 3) return false;
        const txMonth = parseInt(parts[1]) - 1;
        const txYear = parseInt(parts[2]);
        return txMonth === selectedMonth && txYear === selectedYear;
      });
    }
    return filtered.sort((a, b) => {
      const [da, ma, ya] = a.date.split('.').map(Number);
      const [db, mb, yb] = b.date.split('.').map(Number);
      const dateA = new Date(ya, ma - 1, da).getTime();
      const dateB = new Date(yb, mb - 1, db).getTime();
      return dateB - dateA;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const handleUpdate = () => { if (editingTx) { onUpdateTransaction(editingTx); setEditingTx(null); } };
  const handleDelete = () => { if (deletingTx) { onDeleteTransaction(deletingTx.id); setDeletingTx(null); } };

  const generateReceipt = async (tx: Transaction, mode: 'download' | 'share') => {
    setTxToPrint(tx);
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 500));
    try {
      const element = document.getElementById('receipt-print-area');
      if (!element) throw new Error("Yazdırma alanı bulunamadı");
      const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: '#ffffff', width: 842, height: 595, logging: false });
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a5' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 148, undefined, 'FAST');

      const sanitizedUnitNo = getUnitNo(tx.unitId).toString().replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      const fileName = `Daire ${sanitizedUnitNo} ${tx.date} Dekont.pdf`;

      const unit = units.find(u => u.id === tx.unitId);
      let phoneNumber = '';
      if (unit) { phoneNumber = (unit.tenantPhone || unit.phone || '').replace(/\D/g, ''); }

      const shouldShare = mode === 'share';
      const savedInfo = await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare, phoneNumber);
      onAddFile(fileName, 'Diğer', savedInfo.uri, savedInfo.size, savedInfo.fileName);

      if (mode === 'download') { alert('PDF başarıyla indirildi ve Dosyalar bölümüne eklendi!'); }
    } catch (e) { console.error("PDF Hatası:", e); alert("Hata oluştu. Lütfen tekrar deneyin."); }
    finally { setIsProcessing(false); setTxToPrint(null); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#030712] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none">
        {txToPrint && (
          <div id="receipt-print-area" className="bg-white text-slate-900 flex flex-col" style={{ width: '842px', height: '595px', padding: '50px 60px', fontFamily: 'sans-serif' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="font-black text-[42px] tracking-tight text-[#0f172a] leading-none uppercase m-0">GALATA APARTMANI</h2>
                <p className="text-[20px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-7 m-0">{txToPrint.type === 'GİDER' ? 'ÖDEME DEKONTU' : 'TAHSİLAT DEKONTU'}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-black text-slate-400 uppercase mb-1 tracking-widest">BELGE NO</p>
                <p className="text-[18px] font-black text-[#0f172a] leading-none mb-3">#{parseInt(txToPrint.id.split('').map(c => c.charCodeAt(0)).join('').substring(0, 10))}</p>
                <p className="text-[12px] font-black text-slate-400 uppercase mb-1 tracking-widest">TARİH</p>
                <p className="text-[28px] font-black text-[#0f172a] leading-none">{txToPrint.date}</p>
              </div>
            </div>
            <div className="h-[6px] bg-slate-900 w-full mb-6"></div>
            <div className="flex-1 flex flex-col space-y-6">
              <div className="max-w-[100%]">
                <p className="text-[14px] font-black text-slate-400 uppercase mb-1 tracking-widest">DAİRE / KİŞİ</p>
                <p className="text-[30px] font-black text-[#0f172a] leading-none uppercase tracking-tighter">{getUnitNo(txToPrint.unitId) === 'GENEL' ? (txToPrint.type === 'GELİR' ? 'BİNA GELİRİ' : 'BİNA GİDERİ') : `DAİRE NO: ${getUnitNo(txToPrint.unitId)} - ${getUnitName(txToPrint.unitId)}`}</p>
              </div>
              <div>
                <p className="text-[14px] font-black text-slate-400 uppercase mb-1 tracking-widest">AÇIKLAMA</p>
                <p className="text-[26px] font-bold text-slate-700 leading-tight uppercase">
                  {(() => {
                    if (txToPrint.type === 'GİDER') {
                      const expenseDesc = txToPrint.description.split('[')[0].trim()
                        .replace(/^MAKBUZ\s+/i, '')
                        .replace(/\s+(MALİK|KİRACI)\s*$/i, '')
                        .replace(/\b(MALİK|KİRACI)\b/gi, '')
                        .replace(/\bG[İI]DER[İI]?\b/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                      return `${expenseDesc} ÖDEMESİ YAPILMIŞTIR`.toUpperCase();
                    }
                    let desc = txToPrint.description.split('[')[0].trim()
                      .replace(/^MAKBUZ\s+/i, '')
                      .replace(/\s+(MALİK|KİRACI)\s*$/i, '')
                      .replace(/\b(MALİK|KİRACI)\b/gi, '')
                      .replace(/\bSERBEST\s+TAHSİLAT\b/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim();
                    const isExpense = txToPrint.type === 'GİDER';

                    if (desc.includes('(TAHSİLATI)') || desc.includes('TAHSİLATI') || desc.match(/\(EFT[\/\s]*HAVALE\)/i)) {
                      desc = desc.replace(/\(TAHSİLATİ\)/gi, 'EFT/HAVALE')
                        .replace(/\(TAHSİLATI\)/gi, 'EFT/HAVALE')
                        .replace(/TAHSİLATI/gi, 'EFT/HAVALE')
                        .replace(/\(EFT[\/\s]*HAVALE\)/gi, 'EFT/HAVALE') + " İLE TAHSİL EDİLMİŞTİR";
                    } else if (desc.includes('(KREDİ)') || desc.includes('KREDİ BAKİYESİNDEN')) {
                      desc = desc.replace(/\(KREDİ\)/gi, 'KREDİ BAKİYESİNDEN')
                        .replace(/KREDİ BAKİYESİNDEN/gi, 'KREDİ BAKİYESİNDEN') + " TAHSİL EDİLMİŞTİR";
                    } else {
                      desc = desc.replace(/\(ELDEN\)/gi, 'NAKİT').replace(/ELDEN/gi, 'NAKİT');
                      if (!desc.toUpperCase().includes('TAHSİL EDİLMİŞTİR')) desc += " TAHSİL EDİLMİŞTİR";
                    }
                    const finalizedDesc = desc.toUpperCase();
                    return isExpense
                      ? finalizedDesc
                          .replace(/İLE TAHSİL EDİLMİŞTİR/g, 'İLE ÖDEME YAPILMIŞTIR')
                          .replace(/TAHSİL EDİLMİŞTİR/g, 'ÖDEME YAPILMIŞTIR')
                      : finalizedDesc;
                  })()}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto pb-4">
                <div className="flex flex-col justify-center mt-[-40px]">
                  <p className="text-[22px] font-black text-slate-950 uppercase italic tracking-tight mb-5 bg-slate-100/50 p-2"># YALNIZ {numberToWordsTr(txToPrint.amount)} #</p>
                  <p className="text-[14px] font-black text-slate-400 uppercase mb-1 tracking-widest leading-none">İŞLEM TÜRÜ</p>
                  <p className="text-[40px] font-black text-blue-600 uppercase leading-none m-0">{txToPrint.type}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[14px] font-black text-slate-400 uppercase mb-1 tracking-widest -mt-2">TUTAR</p>
                  <div className="flex items-baseline justify-end space-x-2 mb-6 -mt-2">
                    <span className="text-[40px] font-black text-slate-950 leading-none tracking-tight">₺</span>
                    <span className="text-[42px] font-black text-slate-950 leading-none tracking-tight">{formatCurrency(txToPrint.amount)}</span>
                  </div>
                  <div className="relative w-[150px] h-[150px] flex items-center justify-center mt-[8px]">
                    <div className="absolute inset-0 border-[5px] border-green-600 rounded-full"></div>
                    <div className="absolute inset-[10px] border-[2px] border-green-600 rounded-full"></div>
                    <svg viewBox="0 0 150 150" className="absolute inset-0 w-full h-full">
                      <defs><path id="txPathTop" d="M 30,75 A 45,45 0 0,1 120,75" /><path id="txPathBottom" d="M 20,75 A 55,55 0 0,0 130,75" /></defs>
                      <text className="fill-green-600 text-[18px] font-black uppercase tracking-[0.2em]"><textPath xlinkHref="#txPathTop" startOffset="50%" textAnchor="middle">GALATA</textPath></text>
                      <text dy="4" className="fill-green-600 text-[18px] font-black uppercase tracking-[0.05em]"><textPath xlinkHref="#txPathBottom" startOffset="50%" textAnchor="middle">APARTMANI</textPath></text>
                    </svg>
                    <div className="z-10 bg-green-600 text-white px-4 pt-[2px] pb-[13px] rotate-[-2deg] shadow-2xl flex items-center justify-center border border-white/20 min-w-[120px]"><span className="text-[16px] font-black tracking-tighter uppercase whitespace-nowrap leading-none">{txToPrint.type === 'GİDER' ? 'ÖDEME YAPILDI' : 'TAHSİL EDİLDİ'}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center border-t border-slate-100 pt-4"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">BU BELGE SİSTEM TARAFINDAN OTOMATİK OLUŞTURULMUŞTUR</p></div>
          </div>
        )}
      </div>

      <div className="bg-[#030712]/95 backdrop-blur-xl border-b border-white/5 px-4 pt-4 pb-3 flex flex-col items-center shadow-2xl relative z-[210]">
        <button onClick={onClose} className="absolute left-4 top-4 p-2 bg-white/5 rounded-xl text-zinc-400 active:scale-90 transition-all border border-white/5"><ArrowLeft size={20} strokeWidth={2.5} /></button>
        <h3 className="text-[15px] font-black uppercase tracking-[0.1em] text-white leading-none">İŞLEM HAREKETLERİ</h3>
        <div className="mt-5 w-full flex justify-center px-2">
          <div className="relative w-fit">
            <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="bg-blue-600/10 border-2 border-blue-500/30 rounded-2xl h-14 px-3.5 flex items-center space-x-2.5 active:bg-blue-600/20 active:scale-[0.98] transition-all shadow-xl group">
              <div className="flex items-center space-x-2.5"><Calendar size={22} className="text-blue-400 group-hover:scale-110 transition-transform" /><span className="text-[13px] font-black uppercase tracking-[0.1em] text-white whitespace-nowrap">{`${months[selectedMonth as number].toUpperCase()} ${selectedYear}`}</span></div>
              <ChevronDown size={18} className={`text-white/40 transition-transform duration-300 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDatePickerOpen && (
              <div className="absolute top-16 left-0 right-0 z-[230] bg-[#1e293b] border-2 border-blue-500/20 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden py-1 animate-in fade-in slide-in-from-top-4 duration-300 ring-4 ring-black/40 min-w-[200px]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
                  <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1 text-white/60 hover:text-white active:scale-90 transition-all"><ChevronDown size={16} className="rotate-90" /></button>
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">{selectedYear}</span>
                  <button onClick={() => { if (selectedYear < currentDate.getFullYear()) setSelectedYear(selectedYear + 1); }} className="p-1 text-white/60 hover:text-white active:scale-90 transition-all disabled:opacity-30" disabled={selectedYear >= currentDate.getFullYear()}><ChevronDown size={16} className="-rotate-90" /></button>
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                  {months.map((m, idx) => {
                    if (selectedYear === currentDate.getFullYear() && idx > currentDate.getMonth()) return null;
                    return <button key={idx} onClick={() => { setSelectedMonth(idx); setIsDatePickerOpen(false); }} className={`w-full py-2 px-4 text-[11px] font-black uppercase tracking-widest border-b border-white/5 last:border-0 text-center transition-colors ${selectedMonth === idx ? 'text-green-400 bg-green-400/5' : 'text-white/60 hover:bg-white/5'}`}>{m.toUpperCase()} {selectedYear}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-20"><Inbox size={32} className="mb-2" /><p className="text-[8px] font-black uppercase tracking-widest">Kayıt Yok</p></div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="relative bg-[#030712] border-l-[3px] px-4 py-1.5 flex items-center justify-between" style={{ borderLeftColor: tx.type === 'GELİR' ? '#22c55e' : tx.type === 'BORÇLANDIRMA' ? '#f97316' : '#ef4444' }}>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5 mb-0.5 opacity-60"><span className="text-[7px] font-black uppercase tracking-widest">{tx.type}</span><span className="w-0.5 h-0.5 rounded-full bg-white/20" /><span className="text-[7px] font-black uppercase tracking-widest">{tx.date}</span></div>
                  <p className="text-[12px] font-bold text-white uppercase truncate leading-tight mb-1">
                    <span className="text-cyan-400">{getUnitNo(tx.unitId) === 'GENEL' ? (tx.type === 'GİDER' ? 'GİDER' : 'GELİR') : `DAİRE ${getUnitNo(tx.unitId)}`}</span>
                    {' '}{tx.description.split('[')[0].trim()
                      .replace(/^MAKBUZ\s+/i, '')
                      .replace(/\(TAHSİLATI\)/gi, 'TAHSİLATI')
                      .replace(/\(KREDİ\)/gi, 'KREDİ')
                      .replace(/\(KREDİDEN\)/gi, 'KREDİ')
                      .replace(/KREDİDEN/gi, 'KREDİ')
                      .replace(/\s+/g, ' ')
                      .replace(/\bAİDAT\b(?!\s*TAHSİLATI|\s*KREDİ)/gi, 'AİDAT TAHSİLATI')
                      .replace(/\s*\([^)]*\)/g, '')
                      .replace(/\s*\(?MALİK\)?/gi, '')
                      .replace(/\s*\(?KİRACI\)?/gi, '')
                      .trim()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setDeletingTx(tx)} className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 active:scale-90 transition-all"><Trash2 size={14} /></button>
                    <button onClick={() => setEditingTx(tx)} className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 active:scale-90 transition-all"><Edit3 size={14} /></button>
                    <button onClick={() => generateReceipt(tx, 'share')} className="p-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 active:scale-90 transition-all"><Share2 size={14} /></button>
                  </div>
                </div>
                <div className="text-right shrink-0"><span className={`text-[15px] font-black tracking-tighter transition-colors ${tx.type === 'GELİR' ? 'text-green-400' : 'text-red-400'}`}>₺{formatCurrency(tx.amount)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTx && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center px-6">
          <div className="bg-[#1e293b] w-full max-sm rounded-[24px] p-5 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">GÜNCELLE</h3><button onClick={() => setEditingTx(null)} className="text-white/40"><X size={20} /></button></div>
            <div className="space-y-3">
              <div><label className="text-[7px] font-black text-white/30 uppercase block mb-1">TUTAR</label><input type="number" value={editingTx.amount === 0 ? '' : editingTx.amount} onChange={e => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })} className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-lg font-black text-white outline-none focus:border-blue-500" /></div>
              <div><label className="text-[7px] font-black text-white/30 uppercase block mb-1">TARİH</label><input type="date" value={trToIsoDate(editingTx.date)} onChange={e => setEditingTx({ ...editingTx, date: isoToTrDate(e.target.value) })} className="w-full h-[52px] bg-black/40 border border-white/10 rounded-lg px-3 text-[15px] font-bold text-white outline-none focus:border-blue-500" /></div>
              <div><label className="text-[7px] font-black text-white/30 uppercase block mb-1">AÇIKLAMA</label><input type="text" value={editingTx.description} onChange={e => setEditingTx({ ...editingTx, description: e.target.value })} className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-[9px] font-bold text-white outline-none focus:border-blue-500" /></div>
              <button onClick={handleUpdate} className="w-full h-11 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"><Save size={14} /><span>KAYDET</span></button>
            </div>
          </div>
        </div>
      )}

      {deletingTx && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center px-6">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-[24px] p-5 border border-red-500/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="text-[9px] font-black uppercase tracking-widest text-red-400">SİLME ONAYI</h3><button onClick={() => setDeletingTx(null)} className="text-white/40"><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-[11px] font-bold text-white/80 mb-2">Bu işlemi silmek istediğinizden emin misiniz?</p>
                <div className="text-[9px] text-white/60 space-y-1"><p><span className="font-black">Daire:</span> {getUnitNo(deletingTx.unitId)}</p><p><span className="font-black">Açıklama:</span> {deletingTx.description.split('[')[0].trim()}</p><p><span className="font-black">Tutar:</span> ₺{formatCurrency(deletingTx.amount)}</p><p><span className="font-black">Tarih:</span> {deletingTx.date}</p></div>
              </div>
              <div className="flex space-x-2"><button onClick={() => setDeletingTx(null)} className="flex-1 h-11 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 transition-all">VAZGEÇ</button><button onClick={handleDelete} className="flex-1 h-11 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"><Trash2 size={14} /><span>SİL</span></button></div>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-4"><div className="w-16 h-16 rounded-full border-3 border-t-blue-500 border-white/5 animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><CloudLightning size={24} className="text-blue-500 animate-pulse" /></div></div>
          <h3 className="text-sm font-black tracking-widest uppercase text-white">HAZIRLANIYOR</h3>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
