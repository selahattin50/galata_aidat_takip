
import React, { useRef, useState } from 'react';
import { ArrowLeft, Printer, FileDown, Loader2 } from 'lucide-react';
import { Unit, BuildingInfo } from '../types.ts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AccountChartViewProps {
  units: Unit[];
  info: BuildingInfo;
  onClose: () => void;
}

const AccountChartView: React.FC<AccountChartViewProps> = ({ units, info, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val) + " TL";
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsProcessing(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${info.name}_Hesap_Durum_Cizelgesi.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sortedUnits = [...units].sort((a, b) => parseInt(a.no) - parseInt(b.no));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 pb-24 px-1 relative">
      <div className="flex items-center justify-center mb-6 relative px-2">
        <button 
          onClick={onClose}
          className="absolute left-0 bg-white/5 p-3 rounded-xl hover:bg-white/10 active:scale-90 transition-all border border-white/5"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-500 text-center">HESAP ÇİZELGESİ</h3>
        <button 
          onClick={handleDownloadPdf}
          disabled={isProcessing}
          className="absolute right-0 bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
        </button>
      </div>

      <div className="bg-white text-black p-4 md:p-8 rounded-sm shadow-2xl overflow-x-auto min-w-full">
        <div ref={printRef} className="bg-white p-2 min-w-[600px]">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase mb-4 tracking-wider">APARTMAN HESAP DURUM ÇİZELGESİ</h1>
            <div className="border border-black p-2 flex justify-between items-start text-left">
              <div className="space-y-1">
                <p className="font-bold text-sm">{info.name}</p>
                <p className="font-bold text-sm">Galata Apartmanı</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">Genel Gider</p>
              </div>
            </div>
          </div>
          <table className="w-full border-collapse border border-black text-[12px]">
            <thead>
              <tr className="bg-white">
                <th className="border border-black p-1 text-center w-12 font-bold">NO</th>
                <th className="border border-black p-1 text-left font-bold">İKAMET EDEN</th>
                <th className="border border-black p-1 text-right font-bold w-40">KREDİ BAKİYESİ</th>
                <th className="border border-black p-1 text-right font-bold w-40">BORÇ BAKİYESİ</th>
              </tr>
            </thead>
            <tbody>
              {sortedUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border border-black p-1.5 text-center font-bold">{unit.no}</td>
                  <td className="border border-black p-1.5 text-left font-medium">{unit.ownerName}</td>
                  <td className="border border-black p-1.5 text-right font-medium">{formatCurrency(unit.credit)}</td>
                  <td className="border border-black p-1.5 text-right font-medium">{formatCurrency(unit.debt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-8 flex justify-end">
            <div className="text-center w-48">
              <p className="text-[10px] font-bold uppercase border-t border-black pt-1">YÖNETİM ONAYI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountChartView;
