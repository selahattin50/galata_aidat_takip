
import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Share2, Loader2, FileDown, Home, Check, Phone, MessageCircle } from 'lucide-react';
import { Unit, BuildingInfo, FileEntry, Transaction } from '../types.ts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';
import UnitDetailView from './UnitDetailView.tsx';

interface UnitsViewProps {
  units: Unit[];
  info: BuildingInfo;
  transactions: Transaction[];
  onClose: () => void;
  onAddUnit: (unit: Omit<Unit, 'id' | 'credit' | 'debt'>) => void;
  onEditUnit: (unit: Unit) => void;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
  onResetFinancials?: () => void;
}

const UnitsView: React.FC<UnitsViewProps> = ({ units, info, transactions, onClose, onAddUnit, onEditUnit, onAddFile, onResetFinancials }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  const [formData, setFormData] = useState({
    no: '',
    ownerName: '',
    tenantName: '',
    phone: '',
    tenantPhone: '',
    status: 'Malik' as 'Malik' | 'Kiracı'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.no || !formData.ownerName) return;
    setIsSaving(true);
    onAddUnit({
      no: formData.no,
      ownerName: toTitleCase(formData.ownerName),
      tenantName: formData.status === 'Kiracı' ? toTitleCase(formData.tenantName) : '',
      phone: formData.phone,
      tenantPhone: formData.status === 'Kiracı' ? formData.tenantPhone : '',
      status: formData.status
    });
    setTimeout(() => {
      setIsSaving(false); setSaveSuccess(true);
      setTimeout(() => { setShowAddModal(false); setSaveSuccess(false); }, 800);
    }, 500);
  };

  const generateUnitsPdf = async (mode: 'download' | 'share') => {
    setIsProcessingPdf(true);
    
    try {
      // PDF için özel HTML oluştur
      const pdfContent = document.createElement('div');
      pdfContent.style.backgroundColor = '#ffffff';
      pdfContent.style.padding = '32px';
      pdfContent.style.width = '210mm';
      
      // Başlık
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '32px';
      header.innerHTML = `<h1 style="font-size: 24px; font-weight: 900; color: #000; text-transform: uppercase; margin-bottom: 8px;">APARTMAN HESAP DURUM ÇİZELGESİ</h1>`;
      pdfContent.appendChild(header);
      
      // Apartman bilgisi
      const infoBox = document.createElement('div');
      infoBox.style.border = '2px solid #000';
      infoBox.style.marginBottom = '16px';
      infoBox.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #000;">
          <div style="padding: 12px; border-right: 2px solid #000;">
            <p style="font-size: 16px; font-weight: 900; color: #000; margin: 0;">${info.name}</p>
          </div>
          <div style="padding: 12px;">
            <p style="font-size: 16px; font-weight: 900; color: #000; margin: 0; text-align: right;">Genel Gider</p>
          </div>
        </div>
      `;
      pdfContent.appendChild(infoBox);
      
      // Tablo
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.border = '2px solid #000';
      table.style.borderCollapse = 'collapse';
      
      // Tablo başlığı
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="border-bottom: 2px solid #000; background: #fff;">
          <th style="border-right: 2px solid #000; padding: 8px; text-align: center; font-weight: 900; color: #000; font-size: 14px;">NO</th>
          <th style="border-right: 2px solid #000; padding: 8px; text-align: left; font-weight: 900; color: #000; font-size: 14px;">İKAMET EDEN</th>
          <th style="border-right: 2px solid #000; padding: 8px; text-align: right; font-weight: 900; color: #000; font-size: 14px;">KREDİ BAKİYESİ</th>
          <th style="padding: 8px; text-align: right; font-weight: 900; color: #000; font-size: 14px;">BORÇ BAKİYESİ</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Tablo içeriği
      const tbody = document.createElement('tbody');
      units.sort((a,b) => parseInt(a.no) - parseInt(b.no)).forEach(unit => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #000';
        row.innerHTML = `
          <td style="border-right: 2px solid #000; padding: 8px; text-align: center; font-weight: 700; color: #000;">${unit.no}</td>
          <td style="border-right: 2px solid #000; padding: 8px; text-align: left; color: #000;">${unit.tenantName || unit.ownerName} (${unit.tenantName ? 'Kiracı' : 'Malik'})</td>
          <td style="border-right: 2px solid #000; padding: 8px; text-align: right; color: #000;">${formatCurrency(unit.credit)} TL</td>
          <td style="padding: 8px; text-align: right; color: #000;">${formatCurrency(unit.debt)} TL</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      pdfContent.appendChild(table);
      
      // Geçici olarak DOM'a ekle
      document.body.appendChild(pdfContent);
      
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // DOM'dan kaldır
      document.body.removeChild(pdfContent);

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Eğer içerik sayfadan büyükse, küçült
      if (imgHeight > pdfHeight) {
        const ratio = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
      }
      
      const fileName = `${info.name.replace(/\s+/g, '_')}_Bagimsiz_Bolumler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
      
      const shouldShare = mode === 'share';
      const savedInfo = await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare);
      
      onAddFile(fileName, 'Diğer', savedInfo.uri, savedInfo.size, savedInfo.fileName);
      
      if (mode === 'download') {
        alert('PDF başarıyla indirildi ve Dosyalar bölümüne eklendi!');
      }
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  if (selectedUnit) {
    return <UnitDetailView 
      unit={selectedUnit} 
      info={info} 
      transactions={transactions} 
      onClose={() => setSelectedUnit(null)} 
      onUpdate={(u) => { onEditUnit(u); setSelectedUnit(u); }}
    />;
  }

  return (
    <div className="relative pt-0 pb-10">
      {/* Sticky Header - PDF'de görünmez */}
      <div className="sticky top-0 z-[100] -mx-4 px-4 pt-5 pb-3 bg-[#030712]/95 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center h-10 w-full relative">
          <button onClick={onClose} className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5 shrink-0">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          
          <div className="flex-1 flex items-center ml-3 overflow-hidden">
            <Home size={16} className="text-zinc-400 mr-2 shrink-0" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-white/90 truncate">BAĞIMSIZ BÖLÜMLER</h4>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button 
              onClick={() => generateUnitsPdf('share')} 
              disabled={isProcessingPdf}
              className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all text-green-400 border border-white/5 disabled:opacity-50"
            >
              <MessageCircle size={20} />
            </button>
            <button onClick={() => setShowAddModal(true)} className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all text-white border border-white/5">
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Ekran görünümü - Normal kart görünümü */}
      <div className="space-y-2.5 mt-2 px-1">
      {/* Ekran görünümü - PDF'de görünmez */}
      <div className="space-y-2.5 mt-2 px-1">
        {units.sort((a,b) => parseInt(a.no) - parseInt(b.no)).map((unit) => (
          <div 
            key={unit.id} 
            onClick={() => setSelectedUnit(unit)}
            className="bg-[#111827]/60 backdrop-blur-2xl rounded-[24px] py-3 px-5 flex items-center justify-between border border-white/5 hover:bg-white/10 active:bg-white/10 transition-all cursor-pointer shadow-xl"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex flex-col items-start justify-center shrink-0">
                <span className="text-2xl font-black text-white leading-none">{unit.no}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white uppercase truncate block leading-tight">
                  {unit.tenantName || unit.ownerName}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${unit.tenantName ? 'text-orange-500' : 'text-blue-500'}`}>
                    {unit.tenantName ? 'KİRACI' : 'MALİK'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Phone size={7} className="text-green-500" />
                    <span className="text-[10px] font-bold tracking-tight text-green-500">
                      {unit.tenantName && unit.tenantPhone 
                        ? unit.tenantPhone 
                        : (unit.phone || <span className="text-white/20 text-[8px] font-black uppercase">TEL YOK</span>)
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-sm font-black text-white leading-none">₺{formatCurrency(unit.credit)}</span>
              <span className="text-sm font-black text-red-500 mt-1 leading-none">₺{formatCurrency(unit.debt)}</span>
            </div>
          </div>
        ))}
      </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-sm rounded-[32px] p-6 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">YENİ DAİRE EKLE</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/40"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase block mb-1">Daire No</label>
                  <input type="text" value={formData.no} onChange={(e) => setFormData({...formData, no: e.target.value})} className="bg-white/5 w-full h-11 rounded-xl px-3 text-sm font-bold text-white outline-none border border-white/10" required />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase block mb-1">Durum</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => setFormData({...formData, status: 'Malik'})} className={`h-11 rounded-xl text-[8px] font-black border ${formData.status === 'Malik' ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/5 text-white/40'}`}>MALİK</button>
                    <button type="button" onClick={() => setFormData({...formData, status: 'Kiracı'})} className={`h-11 rounded-xl text-[8px] font-black border ${formData.status === 'Kiracı' ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/5 text-white/40'}`}>KİRACI</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-white/40 uppercase block mb-1">Malik Adı Soyadı</label>
                <input type="text" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: toTitleCase(e.target.value)})} className="bg-white/5 w-full h-11 rounded-xl px-3 text-sm font-bold text-white outline-none border border-white/10" required />
              </div>
              {formData.status === 'Kiracı' && (
                <>
                  <div>
                    <label className="text-[9px] font-black text-white/40 uppercase block mb-1">Kiracı Adı Soyadı</label>
                    <input type="text" value={formData.tenantName} onChange={(e) => setFormData({...formData, tenantName: toTitleCase(e.target.value)})} className="bg-white/5 w-full h-11 rounded-xl px-3 text-sm font-bold text-white outline-none border border-white/10" />
                  </div>
                </>
              )}
              <button type="submit" disabled={isSaving} className="w-full h-14 bg-blue-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : saveSuccess ? 'BAŞARILI' : 'KAYDET'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsView;
