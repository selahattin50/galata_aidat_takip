
import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, ArrowLeft, FileText, Share2, Loader2, FileDown, Check, Wallet, Calendar, MessageCircle, Building, Inbox, X, Lock } from 'lucide-react';
import { Transaction, Unit, FileEntry } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';

interface YearlyReportViewProps {
  transactions: Transaction[];
  units: Unit[];
  onClose: () => void;
  buildingName: string;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
}

const YearlyReportView: React.FC<YearlyReportViewProps> = ({ transactions, units, onClose, buildingName, onAddFile }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedVault, setSelectedVault] = useState<'genel' | 'demirbas'>('genel');
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  const years = [2024, 2025, 2026];

  // Global Alacak/Kredi Bakiyesi hesaplama
  const { totalDebt, totalCredit } = useMemo(() => {
    return units.reduce((acc, u) => ({
      totalDebt: acc.totalDebt + (u.debt || 0),
      totalCredit: acc.totalCredit + (u.credit || 0)
    }), { totalDebt: 0, totalCredit: 0 });
  }, [units]);

  // Kullanıcı "girmedim" dediği için başlangıç bakiyesini (initialOpeningBalance) 0 alıyoruz.
  const initialOpeningBalance = 0;

  const previousDevir = useMemo(() => {
    const transactionsSum = transactions.reduce((sum, tx) => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return sum;
      const txYear = parseInt(parts[2]);

      // Seçili yıldan önceki tüm işlemleri topla
      if (txYear < selectedYear) {
        const isDemirbasTx = tx.description.toLowerCase().includes('demirbaş');
        const txVaultType = isDemirbasTx ? 'demirbas' : 'genel';

        if (txVaultType === selectedVault) {
          if (tx.type === 'GELİR') return sum + tx.amount;
          if (tx.type === 'GİDER') return sum - tx.amount;
        }
      }
      return sum;
    }, 0);

    return initialOpeningBalance + transactionsSum;
  }, [transactions, selectedYear, selectedVault]);

  const yearlyTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return false;
      const txYear = parseInt(parts[2]);

      const isDemirbasTx = tx.description.toLowerCase().includes('demirbaş');
      const txVaultType = isDemirbasTx ? 'demirbas' : 'genel';

      return txYear === selectedYear && txVaultType === selectedVault;
    });
  }, [transactions, selectedYear, selectedVault]);

  const reportData = useMemo(() => {
    const incomeGroups: Record<string, number> = {};
    const expenseGroups: Record<string, number> = {};

    yearlyTransactions.forEach(tx => {
      let label = tx.description.split('[')[0].trim().toUpperCase();

      if (tx.type === 'GELİR') {
        incomeGroups[label] = (incomeGroups[label] || 0) + tx.amount;
      } else if (tx.type === 'GİDER') {
        expenseGroups[label] = (expenseGroups[label] || 0) + tx.amount;
      }
    });

    const incomes = Object.entries(incomeGroups).map(([label, total]) => ({
      label, total
    })).sort((a, b) => b.total - a.total);

    // Sadece devir 0'dan farklıysa ekle
    if (previousDevir !== 0) {
      incomes.unshift({
        label: "ÖNCEKİ DÖNEMDEN DEVİR",
        total: previousDevir
      });
    }

    return {
      incomes,
      expenses: Object.entries(expenseGroups).map(([label, total]) => ({
        label, total
      })).sort((a, b) => b.total - a.total)
    };
  }, [yearlyTransactions, previousDevir]);

  const totalIncome = yearlyTransactions.filter(tx => tx.type === 'GELİR').reduce((sum, tx) => sum + tx.amount, 0) + previousDevir;
  const totalExpense = yearlyTransactions.filter(tx => tx.type === 'GİDER').reduce((sum, tx) => sum + tx.amount, 0);
  const cashTotal = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return "₺" + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const handleCreateAndSharePdf = async (mode: 'share' | 'download') => {
    if (!reportRef.current) return;
    setIsProcessing(true);
    try {
      // PDF için gizli olan beyaz tasarımı kullanacağız.
      const canvas = await html2canvas(reportRef.current!, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowHeight: reportRef.current?.scrollHeight
      });

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth; // Tam genişlik
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Sadece yükseklik fazlaysa küçült, genişlik her zaman tam
      if (imgHeight > pdfHeight) {
        // Yüksekliği A4'e sığdır
        const scaledHeight = pdfHeight;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, scaledHeight);
      } else {
        // Normal boyutta ekle
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      const sanitizedBuildingName = buildingName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedBuildingName}_Yillik_Bilanco_${selectedYear}.pdf`;

      // İndir modunda paylaşma dialogu açma
      const shouldShare = mode === 'share';
      const savedInfo = await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare);

      // Her zaman dosyalar bölümüne ekle (URI, boyut ve dosya adı ile)
      onAddFile(fileName, 'Karar', savedInfo.uri, savedInfo.size, savedInfo.fileName);

      if (mode === 'download') {
        alert('PDF başarıyla indirildi ve Dosyalar bölümüne eklendi!');
      }
    } catch (error) {
      console.error(error);
      alert('PDF oluşturulurken hata oluştu: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#030712] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
            <Building className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-white uppercase tracking-wider leading-none">YILLIK BİLANÇO</h2>
            <p className="text-[10px] text-white/40 italic mt-1">Yönetime ait yıllık bilançoları görüntüleyin.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={onClose} className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center border border-red-500/50 active:scale-95 shadow-lg">
            <X className="text-white" size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
        {/* Action Buttons - 2 Column matched to screenshot */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleCreateAndSharePdf('download')}
            disabled={isProcessing}
            className="h-12 bg-[#1e293b] rounded-xl border border-white/5 flex items-center p-2 space-x-3 active:bg-white/10 transition-all shadow-lg"
          >
            <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center border border-red-600/30">
              <div className="flex flex-col items-center">
                <span className="text-[5px] font-black text-red-500 leading-none mb-0.5">PDF</span>
                <FileDown size={14} className="text-red-500" />
              </div>
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">İndir</span>
          </button>

          <button
            onClick={() => handleCreateAndSharePdf('share')}
            disabled={isProcessing}
            className="h-12 bg-[#1e293b] rounded-xl border border-white/5 flex items-center p-2 space-x-3 active:bg-white/10 transition-all shadow-lg"
          >
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-600/30">
              <Share2 size={18} className="text-white fill-white/20" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Paylaş</span>
          </button>
        </div>

        {/* Filters - Tighter spacing */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setShowVaultPicker(!showVaultPicker)}
            className="bg-[#1e293b] h-9 rounded-lg px-3 flex items-center justify-between border border-white/5 shadow-inner"
          >
            <span className="text-[10px] font-bold text-white/70 uppercase truncate">{selectedVault === 'genel' ? 'Genel Gider' : 'Demirbaş'}</span>
            <ChevronDown size={12} className="text-white/20" />
          </button>

          <button
            onClick={() => setIsYearPickerOpen(true)}
            className="bg-[#1e293b] h-9 rounded-lg px-3 flex items-center justify-between border border-white/5 shadow-inner"
          >
            <span className="text-[10px] font-bold text-white/70 uppercase">{selectedYear}</span>
            <ChevronDown size={12} className="text-white/20" />
          </button>
        </div>

        {/* Pickers Logic */}
        {showVaultPicker && (
          <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-8" onClick={() => setShowVaultPicker(false)}>
            <div className="bg-[#1e293b] w-full rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSelectedVault('genel'); setShowVaultPicker(false); }} className="w-full py-4 text-white text-[11px] font-black uppercase border-b border-white/5 active:bg-white/5">Genel Kasa</button>
              <button onClick={() => { setSelectedVault('demirbas'); setShowVaultPicker(false); }} className="w-full py-4 text-white text-[11px] font-black uppercase active:bg-white/5">Demirbaş Kasası</button>
            </div>
          </div>
        )}

        {isYearPickerOpen && (
          <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-8" onClick={() => setIsYearPickerOpen(false)}>
            <div className="bg-[#1e293b] w-full max-h-[70vh] rounded-2xl overflow-hidden border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 bg-black/20 text-center">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">YIL SEÇİN</span>
              </div>
              <div className="overflow-y-auto no-scrollbar">
                {years.filter(y => y <= currentYear).map(y => (
                  <button key={y} onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); }} className={`w-full py-3.5 text-[11px] font-black uppercase border-b border-white/5 last:border-0 ${selectedYear === y ? 'text-blue-400 bg-blue-500/5' : 'text-white'}`}>{y}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Balance Summaries - Tighter spacing */}
        <div className="flex space-x-2 mb-4">
          <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-3 flex items-center justify-between shadow-inner">
            <span className="text-[9px] font-black text-white uppercase tracking-wider">ALACAK BAKİYESİ</span>
            <span className="text-[12px] font-black text-red-500 tracking-tight">{formatCurrency(totalDebt).replace('₺', '')}</span>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-3 flex items-center justify-between shadow-inner">
            <span className="text-[9px] font-black text-white uppercase tracking-wider">KREDİ BAKİYESİ</span>
            <span className="text-[12px] font-black text-white tracking-tight">{formatCurrency(totalCredit).replace('₺', '')}</span>
          </div>
        </div>

        {/* Main List Box - Maximized space for text */}
        <div className="bg-[#1e293b]/40 rounded-[32px] border border-white/5 px-2 py-6 mb-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
          <div className="grid grid-cols-2 gap-3 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10" />

            {/* Giderler Column */}
            <div>
              <h3 className="text-[13px] font-black text-white mb-2 pb-1 border-b border-white/20 tracking-wide uppercase">Gider Kalemleri</h3>
              <div className="space-y-3 min-h-[200px]">
                {reportData.expenses.length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-20 py-10">
                    <span className="text-[8px] font-black uppercase italic">Kayıt Yok</span>
                  </div>
                ) : (
                  reportData.expenses.map((ex, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-white/60 italic lowercase pr-1 leading-tight">{ex.label}</span>
                      <span className="text-[11px] font-black text-white shrink-0">{formatCurrency(ex.total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 text-right">
                <span className="text-[16px] font-black text-white tracking-tighter">{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            {/* Gelirler Column */}
            <div>
              <h3 className="text-[13px] font-black text-white mb-2 pb-1 border-b border-white/20 tracking-wide uppercase">Gelir Kalemleri</h3>
              <div className="space-y-3 min-h-[200px]">
                {reportData.incomes.filter(inc => !inc.label.includes('DEVİR')).length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-20 py-10">
                    <span className="text-[8px] font-black uppercase italic">Kayıt Yok</span>
                  </div>
                ) : (
                  reportData.incomes.filter(inc => !inc.label.includes('DEVİR')).map((inc, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-white/60 italic lowercase pr-1 leading-tight">{inc.label}</span>
                      <span className="text-[11px] font-black text-white shrink-0">{formatCurrency(inc.total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 text-right">
                <span className="text-[16px] font-black text-white tracking-tighter">{formatCurrency(totalIncome - previousDevir)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary Bars - Tighter spacing */}
        <div className="space-y-2 px-1">
          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">ÖNCEKİ YILDAN DEVİR</span>
            <span className="text-[12px] font-black text-white">{formatCurrency(previousDevir).replace('₺', '')}</span>
          </div>

          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">YILLIK GELİR TOPLAMI</span>
            <span className="text-[12px] font-black text-white">{formatCurrency(totalIncome).replace('₺', '')}</span>
          </div>

          <div className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center justify-between border border-white/5 shadow-md">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">YILLIK GİDER TOPLAMI</span>
            <span className="text-[12px] font-black text-white">{formatCurrency(totalExpense).replace('₺', '')}</span>
          </div>

          <div className="bg-blue-900/40 rounded-xl h-12 px-5 flex items-center justify-between border border-blue-500/20 shadow-xl mt-4">
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">KASA TOPLAMI</span>
            <span className={`text-[16px] font-black tracking-tighter ${cashTotal >= 0 ? 'text-white' : 'text-red-500'}`}>
              {formatCurrency(cashTotal).replace('₺', '')}
            </span>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-t-white border-white/10 rounded-full animate-spin" />
            <Building className="absolute inset-0 m-auto text-white animate-pulse" size={32} />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">DOSYA HAZIRLANIYOR</h3>
        </div>
      )}

      {/* HIDDEN WHITE PDF VERSION */}
      <div className="fixed top-[-10000px] left-[-10000px] pointer-events-none">
        <div id="pdf-report-content" ref={reportRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#000', margin: '0' }}>{buildingName.toUpperCase()}</h1>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#666', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '5px', marginTop: '10px' }}>
              {selectedYear} YILLIK BİLANÇO RAPORU
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', backgroundColor: '#000', border: '2px solid #000' }}>
            <div style={{ backgroundColor: '#fff', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', borderBottom: '2px solid #ef4444', marginBottom: '15px', paddingBottom: '5px' }}>GİDERLER</h3>
              {reportData.expenses.map((ex, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>{ex.label}</span>
                  <span style={{ fontWeight: '900' }}>{formatCurrency(ex.total)}</span>
                </div>
              ))}
              <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#ef4444' }}>{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', borderBottom: '2px solid #22c55e', marginBottom: '15px', paddingBottom: '5px' }}>GELİRLER</h3>
              {reportData.incomes.map((inc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: inc.label.includes('DEVİR') ? '#2563eb' : '#000' }}>{inc.label}</span>
                  <span style={{ fontWeight: '900', color: inc.label.includes('DEVİR') ? '#2563eb' : '#000' }}>{formatCurrency(inc.total)}</span>
                </div>
              ))}
              <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e' }}>{formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0', fontSize: '10px', fontWeight: '900', color: '#64748b' }}>YILLIK KASA DURUMU</p>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: '900' }}>{selectedYear} SONU</p>
            </div>
            <span style={{ fontSize: '28px', fontWeight: '900', color: cashTotal >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(cashTotal)}</span>
          </div>

          <div style={{ marginTop: '50px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '4px' }}>GALATA DİJİTAL YÖNETİM SİSTEMİ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyReportView;
