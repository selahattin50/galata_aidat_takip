
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
        scale: 3,
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
  const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
  const currentMonthName = months[new Date().getMonth()];

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
        {/* BU BÖLÜM PDF OLARAK KAYDEDİLEN ALANDIR - HTML2CANVAS İÇİN INLINE STYLE ŞARTTIR */}
        <div ref={printRef} style={{ backgroundColor: '#ffffff', padding: '20px', minWidth: '1200px', color: '#000', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#000', margin: '0', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {currentMonthName} AYI APARTMAN HESAP DURUM ÇİZELGESİ
            </h1>
            <div style={{ marginTop: '20px', border: '4px solid #000', padding: '20px', backgroundColor: '#fff' }}>
              <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                <p style={{ fontSize: '32px', fontWeight: '900', margin: '0', color: '#000' }}>{info.name.toUpperCase()} YÖNETİMİ</p>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '4px solid #000' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '3px solid #000' }}>
                <th style={{ borderRight: '1px solid #000', padding: '15px', textAlign: 'center', width: '80px', fontSize: '26px', fontWeight: '900', color: '#000', whiteSpace: 'nowrap' }}>NO</th>
                <th style={{ borderRight: '1px solid #000', padding: '15px', textAlign: 'left', fontSize: '26px', fontWeight: '900', color: '#000', whiteSpace: 'nowrap' }}>İKAMET EDEN</th>
                <th style={{ borderRight: '1px solid #000', padding: '15px', textAlign: 'right', width: '300px', fontSize: '26px', fontWeight: '900', color: '#000', whiteSpace: 'nowrap' }}>KREDİ BAKİYESİ</th>
                <th style={{ padding: '15px', textAlign: 'right', width: '300px', fontSize: '26px', fontWeight: '900', color: '#000', whiteSpace: 'nowrap' }}>BORÇ BAKİYESİ</th>
              </tr>
            </thead>
            <tbody>
              {sortedUnits.map((unit, index) => (
                <tr key={unit.id} style={{
                  borderBottom: '1px solid #ccc',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f2f3ff'
                }}>
                  <td style={{ borderRight: '1px solid #000', padding: '10px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>{unit.no}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '10px', textAlign: 'left', fontSize: '24px', fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>
                    {unit.ownerName} <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666' }}>({unit.status || 'Malik'})</span>
                  </td>
                  <td style={{ borderRight: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '24px', fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>
                    {formatCurrency(unit.credit)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '24px', fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>
                    {formatCurrency(unit.debt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', width: '400px' }}>
              <div style={{ borderTop: '5px solid #000', paddingTop: '20px' }}>
                <p style={{ fontSize: '26px', fontWeight: '900', margin: '0', color: '#000' }}>YÖNETİM ONAYI</p>
                <p style={{ fontSize: '18px', margin: '0', fontStyle: 'italic', color: '#000' }}>Kaşe / İmza</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountChartView;
