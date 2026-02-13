
import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronDown, X, FileDown, Calendar, MessageCircle, Building, Check, Wallet, Inbox } from 'lucide-react';
import { Transaction, Unit, FileEntry } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';

interface MonthlyReportViewProps {
  transactions: Transaction[];
  units: Unit[];
  onClose: () => void;
  buildingName: string;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
}

const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ transactions, units, onClose, buildingName, onAddFile }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); 
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedVault, setSelectedVault] = useState<'genel' | 'demirbas'>('genel');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const years = [2024, 2025, 2026];

  // Önemli: Kullanıcı "girmedim" dediği için başlangıç bakiyesini (initialOpeningBalance) 0 alıyoruz.
  // Devir sadece önceki aylarda girilmiş olan "Transaction" kayıtlarından hesaplanacak.
  const previousDevir = useMemo(() => {
    const transactionsSum = transactions.reduce((sum, tx) => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return sum;
      const txMonth = parseInt(parts[1]) - 1;
      const txYear = parseInt(parts[2]);

      // Seçili aydan önceki tüm işlemleri topla
      if (txYear < selectedYear || (txYear === selectedYear && txMonth < selectedMonth)) {
        const isDemirbasTx = tx.description.toLowerCase().includes('demirbaş');
        const txVaultType = isDemirbasTx ? 'demirbas' : 'genel';
        
        if (txVaultType === selectedVault) {
          if (tx.type === 'GELİR') return sum + tx.amount;
          if (tx.type === 'GİDER') return sum - tx.amount;
        }
      }
      return sum;
    }, 0);

    return transactionsSum; // Artık units.credit/debt buraya dahil değil.
  }, [transactions, selectedMonth, selectedYear, selectedVault]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const parts = tx.date.split('.');
      if (parts.length !== 3) return false;
      const txMonth = parseInt(parts[1]) - 1;
      const txYear = parseInt(parts[2]);
      
      const isDemirbasTx = tx.description.toLowerCase().includes('demirbaş');
      const txVaultType = isDemirbasTx ? 'demirbas' : 'genel';
      
      return txMonth === selectedMonth && txYear === selectedYear && txVaultType === selectedVault;
    });
  }, [transactions, selectedMonth, selectedYear, selectedVault]);

  const reportData = useMemo(() => {
    const incomeGroups: Record<string, { total: number, count: number }> = {};
    const expenseGroups: Record<string, { total: number, count: number }> = {};

    filteredTransactions.forEach(tx => {
      let label = tx.description;
      
      // (MALİK) ve (KİRACI) etiketlerini temizle
      label = label.replace(/\s*\(MALİK\)/gi, '').replace(/\s*\(KİRACI\)/gi, '');
      
      if (label.toLowerCase().includes('aidat')) {
        label = "AİDAT GELİRLERİ";
      } else {
        label = label.split('[')[0].trim().toUpperCase();
      }

      if (tx.type === 'GELİR') {
        if (!incomeGroups[label]) incomeGroups[label] = { total: 0, count: 0 };
        incomeGroups[label].total += tx.amount;
        incomeGroups[label].count += 1;
      } else if (tx.type === 'GİDER') {
        if (!expenseGroups[label]) expenseGroups[label] = { total: 0, count: 0 };
        expenseGroups[label].total += tx.amount;
        expenseGroups[label].count += 1;
      }
    });

    const incomes = Object.entries(incomeGroups).map(([label, data]) => ({
      label: label === "AİDAT GELİRLERİ" ? `${label} (${data.count})` : label,
      total: data.total
    })).sort((a, b) => b.total - a.total);

    // Sadece devir 0'dan farklıysa ekle (Kullanıcı verisi yoksa görünmez)
    if (previousDevir !== 0) {
      incomes.unshift({
        label: "ÖNCEKİ DÖNEMDEN DEVİR",
        total: previousDevir
      });
    }

    return {
      incomes,
      expenses: Object.entries(expenseGroups).map(([label, data]) => ({
        label: label,
        total: data.total
      })).sort((a, b) => b.total - a.total)
    };
  }, [filteredTransactions, previousDevir]);

  const monthActualIncome = filteredTransactions.filter(tx => tx.type === 'GELİR').reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncomeWithDevir = monthActualIncome + previousDevir;
  const totalExpense = filteredTransactions.filter(tx => tx.type === 'GİDER').reduce((sum, tx) => sum + tx.amount, 0);
  const cashTotal = totalIncomeWithDevir - totalExpense;

  const formatCurrency = (val: number) => {
    return "₺" + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const generateAndHandlePdf = async (mode: 'share' | 'download') => {
    if (!reportRef.current) return;
    setIsProcessing(true);
    try {
      // Dinamik ölçeklendirme - içerik yoğunluğuna göre
      const itemCount = reportData.incomes.length + reportData.expenses.length;
      let scaleFactor = 1;
      
      if (itemCount > 20) {
        scaleFactor = 0.65; // Çok fazla içerik varsa daha fazla küçült
      } else if (itemCount > 15) {
        scaleFactor = 0.75;
      } else if (itemCount > 10) {
        scaleFactor = 0.85;
      }
      
      // Transform ile tüm içeriği (yazılar ve rakamlar) küçült
      if (reportRef.current) {
        reportRef.current.style.transform = `scale(${scaleFactor})`;
        reportRef.current.style.transformOrigin = 'top center';
        reportRef.current.style.width = `${100 / scaleFactor}%`;
      }

      const canvas = await html2canvas(reportRef.current, {
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowHeight: reportRef.current.scrollHeight
      });

      // Stilleri geri al
      if (reportRef.current) {
        reportRef.current.style.transform = '';
        reportRef.current.style.transformOrigin = '';
        reportRef.current.style.width = '';
      }

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
      
      const fileName = `${buildingName.replace(/\s+/g, '_')}_Bilanco_${months[selectedMonth]}_${selectedYear}.pdf`;
      
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-0 pb-32">
      {/* Header & Filter Section */}
      <div className="sticky top-0 z-[100] -mx-4 px-4 pt-4 pb-4 bg-[#030712]/95 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => generateAndHandlePdf('share')} 
              disabled={isProcessing} 
              className="bg-[#1e293b] rounded-xl h-10 px-4 flex items-center space-x-2 border border-white/5 active:bg-[#25D366] transition-all text-white shadow-lg"
            >
              <MessageCircle size={16} className="text-[#25D366]" />
              <span className="text-[10px] font-black uppercase tracking-widest">PAYLAŞ</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Vault Picker */}
          <div className="relative">
            <button 
              onClick={() => { setShowVaultPicker(!showVaultPicker); setShowDatePicker(false); }} 
              className="w-full bg-[#1e293b] rounded-xl h-12 flex items-center justify-between px-4 border border-white/5"
            >
              <span className="text-[11px] font-black text-white uppercase truncate">{selectedVault === 'genel' ? 'GENEL KASA' : 'DEMİRBAŞ'}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform ${showVaultPicker ? 'rotate-180' : ''}`} />
            </button>
            {showVaultPicker && (
              <div className="absolute top-full left-0 z-[150] mt-1 w-full bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in">
                <button onClick={() => { setSelectedVault('genel'); setShowVaultPicker(false); }} className={`w-full py-3 px-4 text-left flex items-center justify-between border-b border-white/5 ${selectedVault === 'genel' ? 'text-green-400' : 'text-white/60'}`}>
                  <span className="text-[10px] font-black uppercase">GENEL KASA</span>
                  {selectedVault === 'genel' && <Check size={12} />}
                </button>
                <button onClick={() => { setSelectedVault('demirbas'); setShowVaultPicker(false); }} className={`w-full py-3 px-4 text-left flex items-center justify-between ${selectedVault === 'demirbas' ? 'text-green-400' : 'text-white/60'}`}>
                  <span className="text-[10px] font-black uppercase">DEMİRBAŞ</span>
                  {selectedVault === 'demirbas' && <Check size={12} />}
                </button>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="relative">
            <button 
              onClick={() => { setShowDatePicker(!showDatePicker); setShowVaultPicker(false); }} 
              className="w-full bg-[#1e293b] rounded-xl h-12 flex items-center justify-between px-4 border border-white/5"
            >
              <span className="text-[11px] font-black text-white uppercase">{months[selectedMonth].toUpperCase()} {selectedYear}</span>
              <Calendar size={14} className="text-zinc-400" />
            </button>
            {showDatePicker && (
              <div className="absolute top-full right-0 z-[150] mt-1 w-48 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in flex">
                <div className="w-[40%] border-r border-white/5 flex flex-col bg-black/30">
                  {years.map(y => (
                    <button key={y} onClick={() => setSelectedYear(y)} className={`py-2.5 text-[10px] font-black ${selectedYear === y ? 'text-green-400 bg-white/5' : 'text-white/40'}`}>{y}</button>
                  ))}
                </div>
                <div className="w-[60%] flex flex-col max-h-[280px] overflow-y-auto no-scrollbar">
                  {months.map((m, idx) => (
                    <button key={m} onClick={() => { setSelectedMonth(idx); setShowDatePicker(false); }} className={`py-2 px-4 text-left text-[10px] font-black uppercase border-b border-white/5 last:border-0 ${selectedMonth === idx ? 'text-green-400 bg-white/5' : 'text-white/60'}`}>{m}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="mt-6 px-1" id="pdf-report-content" ref={reportRef}>
        <div className="bg-white rounded-[32px] border border-gray-300 overflow-hidden shadow-2xl">
          {/* Headers */}
          <div className="grid grid-cols-2 bg-gray-100 border-b-2 border-gray-300">
            <div className="py-4 border-r-2 border-gray-300 flex items-center justify-center">
              <h4 className="text-[15px] font-black text-red-600 uppercase tracking-[0.2em]">GİDERLER</h4>
            </div>
            <div className="py-4 flex items-center justify-center">
              <h4 className="text-[15px] font-black text-green-600 uppercase tracking-[0.2em]">GELİRLER</h4>
            </div>
          </div>
          
          {/* Data Grid */}
          <div className="grid grid-cols-2 min-h-[500px] relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gray-300" />
            
            {/* Left Column: Expenses */}
            <div className="p-4 flex flex-col space-y-4">
              {reportData.expenses.length === 0 ? (
                <div className="flex-1 flex items-center justify-center opacity-40">
                   <p className="text-[11px] font-black italic uppercase text-gray-400">KAYIT YOK</p>
                </div>
              ) : (
                reportData.expenses.map((item, i) => (
                  <div key={i} className="flex justify-between items-start border-b border-gray-200 pb-3 last:border-0">
                    <span className="text-[10px] text-black font-black uppercase tracking-tight leading-tight flex-1 pr-2">{item.label}</span>
                    <span className="text-[11px] text-black font-black whitespace-nowrap">{formatCurrency(item.total)}</span>
                  </div>
                ))
              )}
              <div className="mt-auto pt-6 text-right border-t-2 border-gray-300">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TOPLAM</p>
                <span className="text-[18px] font-black text-red-600 tracking-tighter">{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            {/* Right Column: Incomes */}
            <div className="p-4 flex flex-col space-y-4">
              {reportData.incomes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center opacity-40">
                   <p className="text-[11px] font-black italic uppercase text-gray-400">KAYIT YOK</p>
                </div>
              ) : (
                reportData.incomes.map((item, i) => (
                  <div key={i} className="flex justify-between items-start border-b border-gray-200 pb-3 last:border-0">
                    <span className={`text-[10px] font-black uppercase tracking-tight leading-tight flex-1 pr-2 ${item.label.includes('DEVİR') ? 'text-blue-600' : 'text-black'}`}>{item.label}</span>
                    <span className={`text-[11px] font-black whitespace-nowrap ${item.label.includes('DEVİR') ? 'text-blue-600' : 'text-black'}`}>{formatCurrency(item.total)}</span>
                  </div>
                ))
              )}
              <div className="mt-auto pt-6 text-right border-t-2 border-gray-300">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TOPLAM</p>
                <span className="text-[18px] font-black text-green-600 tracking-tighter">{formatCurrency(totalIncomeWithDevir)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Summary Box */}
        <div className="mt-8 space-y-3 px-2">
           <div className="flex justify-between items-center py-4 px-6 bg-gray-100 rounded-2xl border-2 border-gray-300 shadow-xl">
             <div className="flex flex-col">
                <span className="text-[14px] font-black text-black uppercase tracking-widest">KASA DURUMU</span>
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{months[selectedMonth].toUpperCase()} {selectedYear} SONU</span>
             </div>
             <span className={`text-[22px] font-black tracking-tighter ${cashTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
               {formatCurrency(cashTotal)}
             </span>
           </div>
           <p className="text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.4em] py-4">GALATA DİJİTAL YÖNETİM SİSTEMİ</p>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Building size={32} className="text-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-black text-white uppercase tracking-widest">RAPOR HAZIRLANIYOR</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">LÜTFEN BEKLEYİNİZ</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReportView;
