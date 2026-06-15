
import React, { useState, useMemo } from 'react';
import { Users, FileDown, Plus, Search, Home, Phone, User, Trash2, Edit3, Check, X, Building, ArrowLeft, Loader2, Share2, MessageCircle } from 'lucide-react';
import { Unit, Transaction, BuildingInfo, FileEntry } from '../types';
import UnitDetailView from './UnitDetailView';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';
import { useAndroidBackHandler } from '../appBackButton';
import { useScrollReveal } from './useScrollReveal';

interface UnitsViewProps {
  units: Unit[];
  transactions: Transaction[];
  info: BuildingInfo;
  onAddUnit: (unit: Omit<Unit, 'id' | 'debt' | 'credit'>) => void;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (id: string) => boolean | Promise<boolean>;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
  onClose: () => void;
  currentDate: Date;
}

const INITIAL_FORM_DATA = {
  no: '',
  ownerName: '',
  tenantName: '',
  phone: '',
  tenantPhone: '',
  status: 'Malik' as 'Malik' | 'Kiracı'
};

const UnitsView: React.FC<UnitsViewProps> = ({ units, transactions, info, onAddUnit, onEditUnit, onDeleteUnit, onAddFile, onClose, currentDate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const unitReveal = useScrollReveal<HTMLDivElement>();

  useAndroidBackHandler(() => {
    if (showAddModal) {
      handleCloseAddModal();
      return true;
    }
    if (selectedUnit) {
      setSelectedUnit(null);
      return true;
    }
    return false;
  });

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const filteredUnits = useMemo(() => {
    return units.filter(unit =>
      unit.no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.tenantName && unit.tenantName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const aNo = parseInt(a.no);
      const bNo = parseInt(b.no);
      if (isNaN(aNo) || isNaN(bNo)) return a.no.localeCompare(b.no);
      return aNo - bNo;
    });
  }, [units, searchTerm]);

  const toTitleCase = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());

  const normalizeUnitNo = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d+$/.test(trimmed)) return trimmed.replace(/^0+/, '');
    return trimmed;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const resetAddForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
    setIsSaving(false);
    setSaveSuccess(false);
  };

  const handleOpenAddModal = () => { resetAddForm(); setShowAddModal(true); };
  const handleCloseAddModal = () => { setShowAddModal(false); resetAddForm(); };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNo = normalizeUnitNo(formData.no);
    if (!normalizedNo || !formData.ownerName) return;
    const today = currentDate.toISOString().split('T')[0];
    const ownerName = toTitleCase(formData.ownerName);
    const tenantName = formData.status === 'Kiracı' ? toTitleCase(formData.tenantName) : '';
    setIsSaving(true);
    onAddUnit({
      no: normalizedNo,
      ownerName,
      tenantName,
      phone: formData.phone,
      tenantPhone: formData.status === 'Kiracı' ? formData.tenantPhone : '',
      status: formData.status,
      ownerHistory: [{
        id: `${Date.now()}-owner`,
        name: ownerName,
        phone: formData.phone,
        startDate: today,
        isCurrent: true
      }],
      tenantHistory: tenantName ? [{
        id: `${Date.now()}-tenant`,
        name: tenantName,
        phone: formData.tenantPhone,
        startDate: today,
        isCurrent: true
      }] : []
    });
    setTimeout(() => {
      setIsSaving(false); setSaveSuccess(true);
      setTimeout(() => { handleCloseAddModal(); }, 800);
    }, 500);
  };

  const generateUnitsPdf = async (mode: 'download' | 'share') => {
    setIsProcessingPdf(true);
    try {
      const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
      const currentMonthName = months[currentDate.getMonth()];
      const sortedUnits = [...units].sort((a, b) => {
        const aNo = parseInt(a.no);
        const bNo = parseInt(b.no);
        return (isNaN(aNo) || isNaN(bNo)) ? a.no.localeCompare(b.no) : aNo - bNo;
      });
      const rowHeight = Math.max(24, Math.min(34, Math.floor(575 / Math.max(sortedUnits.length, 1))));
      const rowFontSize = Math.max(16, Math.min(22, rowHeight - 5));
      const headerFontSize = Math.max(13, Math.min(17, rowFontSize - 1));
      const pdfContent = document.createElement('div');
      pdfContent.style.backgroundColor = '#ffffff';
      pdfContent.style.boxSizing = 'border-box';
      pdfContent.style.padding = '14px 16px';
      pdfContent.style.width = '794px';
      pdfContent.style.minHeight = '1123px';
      pdfContent.style.fontFamily = 'sans-serif';
      pdfContent.style.color = '#000';
      pdfContent.style.display = 'flex';
      pdfContent.style.flexDirection = 'column';

      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '10px';
      header.style.flex = '0 0 auto';
      header.innerHTML = `
        <h1 style="font-size: 23px; font-weight: 900; color: #000; text-transform: uppercase; margin: 0 0 8px; white-space: nowrap;">
          ${currentMonthName} AYI APARTMAN HESAP DURUM ÇİZELGESİ
        </h1>
        <div style="border: 3px solid #000; background-color: #fff; display: flex; align-items: center; justify-content: center; padding: 7px 0;">
          <div style="text-align: center; white-space: nowrap;">
            <p style="font-size: 23px; font-weight: 900; margin: 0; color: #000; line-height: 1;">${info.name.toUpperCase()} YÖNETİMİ</p>
          </div>
        </div>
      `;
      pdfContent.appendChild(header);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.border = '3px solid #000';
      table.style.borderCollapse = 'collapse';
      table.style.tableLayout = 'fixed';
      table.style.flex = '1 1 auto';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="border-bottom: 2px solid #000; background-color: #f8f8f8;">
          <th style="border-right: 1px solid #000; padding: 6px 5px; text-align: center; width: 44px; font-size: ${headerFontSize}px; font-weight: 900; color: #000; white-space: nowrap;">NO</th>
          <th style="border-right: 1px solid #000; padding: 6px 7px; text-align: left; font-size: ${headerFontSize}px; font-weight: 900; color: #000; white-space: nowrap;">İKAMET EDEN</th>
          <th style="border-right: 1px solid #000; padding: 6px 5px; text-align: center; width: 170px; font-size: ${headerFontSize}px; font-weight: 900; color: #22c55e; white-space: nowrap;">KREDİ BAKİYESİ</th>
          <th style="padding: 6px 5px; text-align: center; width: 170px; font-size: ${headerFontSize}px; font-weight: 900; color: #ef4444; white-space: nowrap;">BORÇ BAKİYESİ</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      sortedUnits.forEach((unit, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #ccc';
        row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f2f3ff';
        row.style.height = `${rowHeight}px`;
        row.innerHTML = `
          <td style="border-right: 1px solid #000; padding: 3px 6px; text-align: center; font-size: ${rowFontSize}px; font-weight: bold; color: #000; white-space: nowrap; line-height: 1;">${unit.no}</td>
          <td style="border-right: 1px solid #000; padding: 3px 8px; text-align: left; font-size: ${rowFontSize}px; font-weight: bold; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1;">
            ${unit.tenantName || unit.ownerName} 
          </td>
          <td style="border-right: 1px solid #000; padding: 3px 7px; text-align: right; font-size: ${rowFontSize}px; font-weight: bold; color: #22c55e; white-space: nowrap; line-height: 1;">${unit.credit > 0 ? formatCurrency(unit.credit) : ''}</td>
          <td style="padding: 3px 7px; text-align: right; font-size: ${rowFontSize}px; font-weight: bold; color: #ef4444; white-space: nowrap; line-height: 1;">${unit.debt > 0 ? formatCurrency(unit.debt) : ''}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      pdfContent.appendChild(table);

      const footer = document.createElement('div');
      footer.style.marginTop = '8px';
      footer.style.flex = '0 0 auto';
      footer.innerHTML = `
        <div style="display: flex; justify-content: flex-end;">
          <div style="text-align: center; width: 190px;">
            <div style="padding-top: 2px;">
              <p style="font-size: 14px; font-weight: 900; margin: 0; color: #000;">YÖNETİM ONAYI</p>
              <p style="font-size: 10px; margin: 0; font-style: italic; color: #000;">Kaşe / İmza</p>
            </div>
          </div>
        </div>
        <p style="font-size: 9px; font-weight: 700; margin: 6px 0 0; color: #334155; text-align: center;">Galata Aidat Takip Sistemi Tarafından Oluşturmuştur</p>
      `;
      pdfContent.appendChild(footer);

      pdfContent.style.position = 'fixed';
      pdfContent.style.left = '-10000px';
      pdfContent.style.top = '0';
      document.body.appendChild(pdfContent);
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: pdfContent.scrollWidth,
        windowHeight: pdfContent.scrollHeight
      });
      document.body.removeChild(pdfContent);

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 8;
      const usableWidth = pdfWidth - pageMargin * 2;
      const usableHeight = pdfHeight - pageMargin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imageWidth = imgHeight > usableHeight ? (usableWidth * usableHeight) / imgHeight : usableWidth;
      const imageHeight = imgHeight > usableHeight ? usableHeight : imgHeight;
      const xOffset = (pdfWidth - imageWidth) / 2;
      const yOffset = (pdfHeight - imageHeight) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imageWidth, imageHeight);

      const fileName = `Aidat Cizelgesi.pdf`;
      const shouldShare = mode === 'share';
      const savedInfo = await PDFService.saveAndShareFromJsPDF(pdf, fileName, shouldShare);
      onAddFile(fileName, 'Diğer', savedInfo.uri, savedInfo.size, savedInfo.fileName);

      if (mode === 'download') alert('PDF başarıyla indirildi!');
    } catch (error) {
      console.error('PDF hatası:', error);
      alert('PDF hatası oluştu');
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
      onDelete={async (id) => {
        const deleted = await onDeleteUnit(id);
        if (deleted) setSelectedUnit(null);
        return deleted;
      }}
      currentDate={currentDate}
    />;
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden pt-0 touch-pan-y">
      <div className="z-30 flex-shrink-0 px-4 pt-4 pb-2 bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] border-b border-white/5 shadow-[0_14px_24px_rgba(15,23,42,0.55)]">
        <div className="relative mb-4 mt-2 flex h-10 items-center justify-center">
          <div className="absolute left-0 top-0 flex items-center space-x-3">
            <button onClick={onClose} className="app-back-button">
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
          </div>
          <h1 className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-center text-[17px] font-black text-white uppercase tracking-[0.1em] leading-none">
            <Users className="text-white" size={22} />
            <span>DAİRELER</span>
          </h1>
          <div className="absolute right-0 top-0 flex items-center space-x-2">
            <button
              onClick={() => generateUnitsPdf('share')}
              disabled={isProcessingPdf}
              className="w-10 h-10 bg-blue-600/25 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all border border-blue-500/40 shadow-[0_0_18px_rgba(37,99,235,0.24)] hover:bg-blue-600/35 disabled:opacity-50"
            >
              <Share2 size={20} strokeWidth={2.7} />
            </button>
            <button
              onClick={handleOpenAddModal}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2 pb-10 no-scrollbar touch-pan-y">
        <div className="grid w-full max-w-full grid-cols-1 gap-2 overflow-x-hidden">
          {filteredUnits.map((unit, index) => (
            <div
              key={unit.id}
              ref={unitReveal.observe(unit.id)}
              onClick={() => setSelectedUnit(unit)}
              className={`group w-full max-w-full bg-[#1e293b]/60 border border-white/5 rounded-[22px] py-1.5 px-2 active:scale-[0.98] transition-all relative overflow-hidden ring-1 ring-white/5 hover:bg-[#1e293b]/70 shadow-xl scroll-reveal-from-top-right ${unitReveal.isVisible(unit.id) ? 'is-visible' : ''}`}
              style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
            >
              {/* Sol ve Sağ Mavi Çizgiler */}
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-40" />
              <div className="absolute top-0 right-0 w-1 h-full bg-blue-600 opacity-40" />
              
              <div className="flex items-center relative z-10 pl-1.5">
                <div className="flex items-center space-x-2 min-w-0 flex-1 pr-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-[16px] flex-shrink-0 flex items-center justify-center border border-white/5 shadow-inner">
                    <span className="text-[18px] font-black text-white">{unit.no}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors leading-tight mb-0.5 truncate whitespace-nowrap">
                      {unit.tenantName || unit.ownerName}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0 ${unit.tenantName ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                        {unit.tenantName ? 'Kiracı' : 'Malik'}
                      </span>
                      <span className="text-[12px] text-green-500 font-bold font-mono tracking-tighter">
                        {unit.tenantName ? (unit.tenantPhone || 'TELEFON YOK') : (unit.phone || 'TELEFON YOK')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-2 min-w-[74px]">
                  <div className="flex flex-col items-end gap-1.5 leading-none">
                    <div className={`text-[14px] font-black tracking-tighter ${unit.credit > 0 ? 'text-green-500' : 'text-white'}`}>
                      ₺{formatCurrency(unit.credit).replace('₺', '')}
                    </div>
                    <div className="text-[14px] font-black tracking-tighter text-[#ff3b3b]">
                      ₺{formatCurrency(unit.debt).replace('₺', '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUnits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Users size={48} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sonuç Bulunamadı</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-gradient-to-br from-slate-700/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl px-4 flex items-start justify-center pt-16 animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-600/20">
                  <Plus className="text-blue-500" size={24} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-white uppercase tracking-widest leading-none">YENİ DAİRE</h3>
                  <p className="text-[9px] text-white/55 font-bold mt-1.5 uppercase tracking-[0.2em]">Kayıt oluşturun</p>
                </div>
              </div>
              <button onClick={handleCloseAddModal} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-zinc-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <label className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2 block px-1">DAİRE NO</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                    <input type="text" required placeholder="No" value={formData.no} onChange={(e) => setFormData({ ...formData, no: normalizeUnitNo(e.target.value) })} className="w-full h-11 bg-slate-900/35 border border-white/10 rounded-2xl pl-9 pr-3 text-white placeholder:text-white/65 text-[15px] font-black shadow-inner focus:outline-none focus:border-blue-400/50 transition-all" />
                  </div>
                </div>
                <div className="col-span-2 min-w-0">
                  <label className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2 block px-1">DURUM</label>
                  <div className="grid grid-cols-2 w-full gap-2 h-11">
                    <button type="button" onClick={() => setFormData({ ...formData, status: 'Malik' })} className={`embossed-cash w-full rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${formData.status === 'Malik' ? 'bg-blue-500/10 border-blue-400/60 text-blue-100 shadow-lg' : 'bg-slate-900/25 border-white/10 text-white/60'}`}>Malik</button>
                    <button type="button" onClick={() => setFormData({ ...formData, status: 'Kiracı' })} className={`embossed-cash w-full rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${formData.status === 'Kiracı' ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-100 shadow-lg' : 'bg-slate-900/25 border-white/10 text-white/60'}`}>Kiracı</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2 block px-1">MALİK ADI SOYADI</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                  <input type="text" required placeholder="Tam İsim..." value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="w-full h-11 bg-slate-900/35 border border-white/10 rounded-2xl pl-11 pr-4 text-white placeholder:text-white/65 text-[15px] font-bold shadow-inner focus:outline-none focus:border-blue-400/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2 block px-1">MALİK TELEFON</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                  <input type="tel" placeholder="05..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full h-11 bg-slate-900/35 border border-white/10 rounded-2xl pl-11 pr-4 text-white placeholder:text-white/65 text-[15px] font-bold shadow-inner focus:outline-none focus:border-blue-400/50 transition-all" />
                </div>
              </div>
              {formData.status === 'Kiracı' && (
                <div className="space-y-3">
                  <input type="text" required placeholder="Kiracı İsmi..." value={formData.tenantName} onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })} className="w-full h-11 bg-slate-900/35 border border-amber-300/15 rounded-2xl px-4 text-white placeholder:text-white/65 text-[15px] font-bold shadow-inner focus:outline-none focus:border-amber-300/45 transition-all" />
                  <input type="tel" placeholder="Kiracı Tel..." value={formData.tenantPhone} onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })} className="w-full h-11 bg-slate-900/35 border border-amber-300/15 rounded-2xl px-4 text-white placeholder:text-white/65 text-[15px] font-bold shadow-inner focus:outline-none focus:border-amber-300/45 transition-all" />
                </div>
              )}
              <button type="submit" disabled={isSaving} className={`embossed-cash w-full h-11 rounded-2xl border flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-xl mt-5 ${saveSuccess ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-100' : 'bg-blue-500/10 border-blue-400/60 text-blue-100'}`}>
                {isSaving ? <Loader2 className="animate-spin text-current" size={24} /> : saveSuccess ? <Check className="text-current" size={24} /> : <Plus className="text-current" size={24} />}
                <span className="text-current text-[12px] font-black uppercase tracking-[0.2em]">{saveSuccess ? 'BAŞARILI' : 'KAYDET'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsView;
