
import React, { useState, useMemo } from 'react';
import { Users, FileDown, Plus, Search, Home, Phone, User, Trash2, Edit3, Check, X, Building, ArrowLeft, Loader2, Share2, MessageCircle } from 'lucide-react';
import { Unit, Transaction, BuildingInfo, FileEntry } from '../types';
import UnitDetailView from './UnitDetailView';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFService } from '../pdfService';
import { useAndroidBackHandler } from '../appBackButton';

interface UnitsViewProps {
  units: Unit[];
  transactions: Transaction[];
  info: BuildingInfo;
  onAddUnit: (unit: Omit<Unit, 'id' | 'debt' | 'credit'>) => void;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (id: string) => void;
  onAddFile: (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => void;
}

const UnitsView: React.FC<UnitsViewProps> = ({ units, transactions, info, onAddUnit, onEditUnit, onDeleteUnit, onAddFile }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  useAndroidBackHandler(() => {
    if (showAddModal) {
      setShowAddModal(false);
      return true;
    }

    if (selectedUnit) {
      setSelectedUnit(null);
      return true;
    }

    return false;
  });

  const [formData, setFormData] = useState({
    no: '',
    ownerName: '',
    tenantName: '',
    phone: '',
    tenantPhone: '',
    status: 'Malik' as 'Malik' | 'Kiracı'
  });

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

  const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const normalizeUnitNo = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d+$/.test(trimmed)) {
      return trimmed.replace(/^0+/, '');
    }
    return trimmed;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNo = normalizeUnitNo(formData.no);
    if (!normalizedNo || !formData.ownerName) return;
    setIsSaving(true);
    onAddUnit({
      no: normalizedNo,
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
      const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
      const currentMonthName = months[new Date().getMonth()];

      const pdfContent = document.createElement('div');
      pdfContent.style.backgroundColor = '#ffffff';
      pdfContent.style.padding = '20px';
      pdfContent.style.width = '1200px';
      pdfContent.style.fontFamily = 'sans-serif';
      pdfContent.style.color = '#000';

      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '30px';
      header.innerHTML = `
        <h1 style="font-size: 48px; font-weight: 900; color: #000; text-transform: uppercase; margin-bottom: 20px; white-space: nowrap;">
          ${currentMonthName} AYI APARTMAN HESAP DURUM ÇİZELGESİ
        </h1>
        
        <div style="border: 4px solid #000; padding: 20px; margin-bottom: 20px; background-color: #fff;">
          <div style="text-align: center; white-space: nowrap;">
            <p style="font-size: 32px; font-weight: 900; margin: 0; color: #000;">${info.name.toUpperCase()} YÖNETİMİ</p>
          </div>
        </div>
      `;
      pdfContent.appendChild(header);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.border = '4px solid #000';
      table.style.borderCollapse = 'collapse';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="border-bottom: 3px solid #000; background-color: #f8f8f8;">
          <th style="border-right: 1px solid #000; padding: 15px; text-align: center; width: 80px; font-size: 26px; font-weight: 900; color: #000; white-space: nowrap;">NO</th>
          <th style="border-right: 1px solid #000; padding: 15px; text-align: left; font-size: 26px; font-weight: 900; color: #000; white-space: nowrap;">İKAMET EDEN</th>
          <th style="border-right: 1px solid #000; padding: 15px; text-align: right; width: 300px; font-size: 26px; font-weight: 900; color: #000; white-space: nowrap;">KREDİ BAKİYESİ</th>
          <th style="padding: 15px; text-align: right; width: 300px; font-size: 26px; font-weight: 900; color: #000; white-space: nowrap;">BORÇ BAKİYESİ</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      units.sort((a, b) => {
        const aNo = parseInt(a.no);
        const bNo = parseInt(b.no);
        return (isNaN(aNo) || isNaN(bNo)) ? a.no.localeCompare(b.no) : aNo - bNo;
      }).forEach((unit, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #ccc';
        row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f2f3ff';
        row.innerHTML = `
          <td style="border-right: 1px solid #000; padding: 10px; text-align: center; font-size: 22px; font-weight: bold; color: #000; white-space: nowrap;">${unit.no}</td>
          <td style="border-right: 1px solid #000; padding: 10px; text-align: left; font-size: 22px; font-weight: bold; color: #000; white-space: nowrap;">
            ${unit.tenantName || unit.ownerName} 
            <span style="font-size: 16px; font-weight: normal; color: #666;">(${unit.tenantName ? 'Kiracı' : 'Malik'})</span>
          </td>
          <td style="border-right: 1px solid #000; padding: 10px; text-align: right; font-size: 22px; font-weight: bold; color: #000; white-space: nowrap;">${formatCurrency(unit.credit)}</td>
          <td style="padding: 10px; text-align: right; font-size: 22px; font-weight: bold; color: #000; white-space: nowrap;">${formatCurrency(unit.debt)}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      pdfContent.appendChild(table);

      const footer = document.createElement('div');
      footer.style.marginTop = '60px';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.innerHTML = `
        <div style="text-align: center; width: 350px;">
          <div style="border-top: 4px solid #000; padding-top: 20px;">
            <p style="font-size: 24px; font-weight: 900; margin: 0; color: #000;">YÖNETİM ONAYI</p>
            <p style="font-size: 16px; margin: 0; font-style: italic; color: #000;">Kaşe / İmza</p>
          </div>
        </div>
      `;
      pdfContent.appendChild(footer);

      document.body.appendChild(pdfContent);
      const canvas = await html2canvas(pdfContent, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      document.body.removeChild(pdfContent);

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pdfHeight) {
        const ratio = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      const sanitizedBuildingName = info.name.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      const trMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
      const currentMonthTr = trMonths[new Date().getMonth()];
      const fileName = `${sanitizedBuildingName} ${currentMonthTr} Ayi Aidat Cizelgesi.pdf`;

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
      <div className="sticky top-0 z-10 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 px-4 pt-1 pb-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
              <Users className="text-white" size={24} />
            </div>
            <h1 className="text-[15px] font-black text-white uppercase tracking-[0.1em] leading-none">BAĞIMSIZ BÖLÜMLER</h1>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => generateUnitsPdf('share')}
              disabled={isProcessingPdf}
              className="w-10 h-10 bg-white/5 text-zinc-400 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-white/10 shadow-lg hover:bg-white/10"
              title="Paylaş"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              title="Yeni Ekle"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div className="grid grid-cols-1 gap-2">
          {filteredUnits.map((unit, index) => (
            <div
              key={unit.id}
              onClick={() => setSelectedUnit(unit)}
              className="group bg-[#1e293b]/40 border border-white/5 rounded-[22px] py-1.5 px-2 active:scale-[0.98] transition-all relative overflow-hidden ring-1 ring-white/5 hover:bg-[#1e293b]/60 shadow-xl animate-card-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-60" />
              <div className="flex items-center relative z-10 pl-1.5">
                <div className="flex items-center space-x-2 min-w-0 flex-1 pr-1">
                  <div className="w-12 h-12 bg-[#030712] rounded-[16px] flex-shrink-0 flex items-center justify-center border border-white/5 shadow-inner">
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
                      <span className="text-[12px] text-green-500 font-bold font-mono tracking-tighter">{unit.tenantPhone || unit.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-2 min-w-[74px]">
                  <div className="flex flex-col items-end gap-1.5 leading-none">
                    <div>
                      <div className="text-[14px] font-black tracking-tighter text-green-500">
                        ₺{formatCurrency(unit.credit).replace('₺', '')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[14px] font-black tracking-tighter text-red-400">
                        ₺{formatCurrency(unit.debt).replace('₺', '')}
                      </div>
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
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl px-4 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-600/20">
                  <Plus className="text-blue-500" size={24} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-white uppercase tracking-widest leading-none">YENİ DAİRE</h3>
                  <p className="text-[9px] text-zinc-500 font-bold mt-1.5 uppercase tracking-[0.2em]">Kayıt oluşturun</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-zinc-400 active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block px-1">DAİRE NO</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="No"
                      value={formData.no}
                      onChange={(e) => setFormData({ ...formData, no: normalizeUnitNo(e.target.value) })}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-[14px] font-black focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block px-1">DURUM</label>
                  <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 h-14">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'Malik' })}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.status === 'Malik' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}
                    >
                      Malik
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'Kiracı' })}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.status === 'Kiracı' ? 'bg-amber-500 text-white shadow-lg' : 'text-zinc-500'}`}
                    >
                      Kiracı
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block px-1">MALİK ADI SOYADI</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Tam İsim..."
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-[13px] font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block px-1">MALİK TELEFON</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    type="tel"
                    placeholder="05..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-[13px] font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {formData.status === 'Kiracı' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-2 block px-1">KİRACI ADI SOYADI</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/30" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Kiracı İsmi..."
                        value={formData.tenantName}
                        onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                        className="w-full h-14 bg-amber-500/5 border border-amber-500/10 rounded-2xl pl-12 pr-4 text-white text-[13px] font-bold focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-amber-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-2 block px-1">KİRACI TELEFON</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/30" size={18} />
                      <input
                        type="tel"
                        placeholder="05..."
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                        className="w-full h-14 bg-amber-500/5 border border-amber-500/10 rounded-2xl pl-12 pr-4 text-white text-[13px] font-bold focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-amber-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className={`w-full h-14 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-2xl mt-8 ${saveSuccess ? 'bg-green-600' : 'bg-blue-600'}`}
              >
                {isSaving ? (
                  <Loader2 className="animate-spin text-white" size={24} />
                ) : saveSuccess ? (
                  <>
                    <Check className="text-white" size={24} />
                    <span className="text-white text-[12px] font-black uppercase tracking-[0.2em]">BAŞARILI</span>
                  </>
                ) : (
                  <>
                    <Plus className="text-white" size={24} />
                    <span className="text-white text-[12px] font-black uppercase tracking-[0.2em]">KAYDET VE EKLE</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsView;
