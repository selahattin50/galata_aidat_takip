import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { ArrowLeft, Phone, MessageCircle, Inbox, Loader2, Eye, X } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { PDFService } from '../pdfService.ts';
import { markExternalIntent } from '../externalIntentGuard';
import buildingLogo from '../src/assets/logo-transparent.png';

interface ReceivablesViewProps {
  units: Unit[];
  info: BuildingInfo;
  onClose: () => void;
  currentDate: Date;
}

type ReceivableCardMode = 'info' | 'reminder';

const ReceivablesView: React.FC<ReceivablesViewProps> = ({ units, info, onClose, currentDate }) => {
  const [sharingUnitId, setSharingUnitId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const debtors = units.filter((u) => u.debt > 0);
  const sortedDebtors = [...debtors].sort((a, b) => b.debt - a.debt);
  const totalReceivable = debtors.reduce((sum, u) => sum + u.debt, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLocaleLowerCase('tr-TR')
      .split(' ')
      .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
      .join(' ');
  };

  const sanitizeFileName = (value: string) =>
    value
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

  const getUnitPhone = (unit: Unit) => unit.tenantPhone || unit.phone;

  const getCardMode = (): ReceivableCardMode => {
    const isBulkMessageEnabled = info?.isBulkMessageEnabled !== false;
    const bulkMessageInfoDay = Math.min(28, Math.max(1, Number(info?.bulkMessageInfoDay) || 1));
    const bulkMessageReminderDay = Math.max(
      bulkMessageInfoDay,
      Math.min(28, Math.max(1, Number(info?.bulkMessageReminderDay ?? info?.bulkMessageStartDay) || 19))
    );

    if (!isBulkMessageEnabled) {
      return 'info';
    }

    return currentDate.getDate() >= bulkMessageReminderDay ? 'reminder' : 'info';
  };

  const getMonthAidatTitle = () => {
    const monthName = currentDate.toLocaleDateString('tr-TR', { month: 'long' });
    return `${toTitleCase(monthName)} Ayı Aidatı Oluşturuldu`;
  };

  const getMonthName = () => {
    const monthName = currentDate.toLocaleDateString('tr-TR', { month: 'long' });
    return toTitleCase(monthName);
  };

  const getCreatedAidatTitle = () => {
    return `${getMonthName()} Ay\u0131 Aidat Olu\u015Fturuldu`;
  };

  const getBuildingShareName = () => {
    return sanitizeFileName(info?.name || 'YONETIM') || 'YONETIM';
  };

  const currencySymbol = '\u20BA';
  const uiText = {
    title: 'ALACAK L\u0130STES\u0130',
    preview: 'Kart \u00d6nizleme',
  };

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      alert('Telefon numarasi kayitli degil.');
      return;
    }
    markExternalIntent();
    window.open(`tel:${phoneNumber.replace(/\s/g, '')}`);
  };


  const createReminderCard = async (
    name: string,
    totalDebt: number,
    previousDebt: number,
    credit: number,
    duesAmount: number,
    unitNo: string,
    mode: ReceivableCardMode
  ) => {
    const isReminder = mode === 'reminder';
    const cardTitleHtml = isReminder
      ? 'Aidat Hat\u0131rlatma'
      : `<span style="display:block;font-size:44px;line-height:1.04;">${getMonthName()} Ay\u0131</span><span style="display:block;margin-top:6px;font-size:44px;line-height:1.04;">Aidat Olu\u015Fturuldu</span>`;
    const statusTitle = isReminder ? 'Durum' : 'Bilgilendirme';
    const statusText = isReminder
      ? '\u00D6demenizi hen\u00FCz yapmad\u0131\u011F\u0131n\u0131z g\u00F6r\u00FClmektedir.'
      : `${getMonthName()} Ay\u0131 Aidat Borcunuz Olu\u015Fturulmu\u015Ftur.`;
    const duesAmountText = `${currencySymbol}${formatCurrency(duesAmount)}`;
    const previousDebtText = formatCurrency(previousDebt);
    const creditText = formatCurrency(credit);
    const totalDebtText = formatCurrency(totalDebt);
    const getSummaryAmountFontSize = (value: string, featured = false) => {
      const length = value.length;
      if (length >= 12) return featured ? 33 : 31;
      if (length >= 10) return featured ? 37 : 35;
      if (length >= 9) return featured ? 40 : 37;
      return featured ? 45 : 40;
    };
    const duesAmountFontSize = getSummaryAmountFontSize(duesAmountText);
    const previousDebtFontSize = getSummaryAmountFontSize(previousDebtText);
    const creditFontSize = getSummaryAmountFontSize(creditText);
    const totalDebtFontSize = getSummaryAmountFontSize(totalDebtText, true);

    const card = document.createElement('div');
    card.style.width = '1080px';
    card.style.padding = '52px';
    card.style.background = '#edf1f5';
    card.style.color = '#0f172a';
    card.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    card.style.boxSizing = 'border-box';

    card.innerHTML = `
      <div style="background:#ffffff;border:1px solid #d7dee7;border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.10);">
        <div style="background:#1f3b4d;color:#ffffff;padding:34px 40px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;">
            <div style="display:flex;align-items:center;gap:24px;flex:1;">
              <div style="width:132px;height:132px;border-radius:28px;background:transparent;border:0;display:flex;align-items:center;justify-content:center;overflow:visible;flex-shrink:0;">
                <img src="${buildingLogo}" alt="Galata Logo" style="width:132px;height:132px;object-fit:contain;display:block;filter:drop-shadow(0 8px 14px rgba(0,0,0,0.28));" />
              </div>
              <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;flex:1;">
                <div style="width:100%;font-size:24px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;opacity:0.88;text-align:center;">${info?.name || 'YÖNETİM'}</div>
                <div style="width:100%;margin-top:12px;font-size:50px;line-height:1.06;font-weight:900;text-align:center;">${cardTitleHtml}</div>
              </div>
            </div>
            <svg width="168" height="132" viewBox="0 0 168 132" style="display:block;flex-shrink:0;filter:drop-shadow(0 10px 24px rgba(0,0,0,0.12));" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="unitBadgeBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.20)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0.07)" />
                </linearGradient>
                <linearGradient id="unitBadgeStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="rgba(255,255,255,0.42)" />
                  <stop offset="100%" stop-color="rgba(255,255,255,0.14)" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="166" height="130" rx="25" fill="url(#unitBadgeBg)" stroke="url(#unitBadgeStroke)" stroke-width="1.5" />
              <rect x="8" y="8" width="152" height="116" rx="21" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1" />
              <path d="M25 16 H143" stroke="rgba(255,255,255,0.28)" stroke-width="2" stroke-linecap="round" opacity="0.55" />
              <rect x="18" y="54" width="132" height="56" rx="17" fill="rgba(15,23,42,0.18)" stroke="rgba(255,255,255,0.10)" />
              <text x="84" y="39" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="1.2" fill="rgba(255,255,255,0.92)">DAİRE NO</text>
              <text x="84" y="84" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="900" fill="#ffffff">${unitNo}</text>
            </svg>
          </div>
        </div>

        <div style="padding:34px 40px 38px 40px;">
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 370px;grid-template-areas:'name summary' 'due summary';gap:22px;align-items:stretch;">
            <div style="grid-area:name;min-height:168px;background:#f8fafc;border:1px solid #dde5ee;border-radius:22px;padding:26px 28px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">İsim</div>
              <div style="margin-top:14px;font-size:50px;line-height:1.1;font-weight:900;color:#0f172a;">${name}</div>
            </div>

            <div style="grid-area:summary;min-height:328px;background:#fff8f8;border:1px solid #f2d4d4;border-radius:22px;padding:22px 24px;box-sizing:border-box;display:grid;grid-template-rows:1fr 1fr 1fr 1fr;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#dc2626;white-space:nowrap;">AİDAT</div>
                <div style="font-size:${duesAmountFontSize}px;line-height:1;font-weight:900;color:#dc2626;white-space:nowrap;">${duesAmountText}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;white-space:nowrap;">Geçmiş</div>
                <div style="font-size:${previousDebtFontSize}px;line-height:1;font-weight:900;color:#7c3aed;white-space:nowrap;">${previousDebtText}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#b45309;white-space:nowrap;">KREDİ</div>
                <div style="font-size:${creditFontSize}px;line-height:1;font-weight:900;color:#b45309;white-space:nowrap;">${creditText}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                <div style="font-size:45px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#b91c1c;white-space:nowrap;">Borç</div>
                <div style="font-size:${totalDebtFontSize}px;line-height:1;font-weight:950;color:#dc2626;white-space:nowrap;">${totalDebtText}</div>
              </div>
            </div>

            <div style="grid-area:due;min-height:140px;background:#fffdf7;border:1px solid #ece1bc;border-radius:22px;padding:26px 28px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#7c5c10;">Son Ödeme Tarihi</div>
              <div style="margin-top:12px;font-size:40px;font-weight:900;color:#111827;">Ayın 20'si</div>
            </div>
          </div>

          <div style="margin-top:20px;background:${isReminder ? '#fff7ed' : '#f7fafc'};border:1px solid ${isReminder ? '#fed7aa' : '#dde5ee'};border-radius:22px;padding:26px 12px;zoom:1.1;">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${isReminder ? '#9a3412' : '#475569'};">${statusTitle}</div>
            <div style="margin-top:14px;font-size:39px;line-height:1.18;font-weight:900;color:${isReminder ? '#9a3412' : '#1e293b'};white-space:nowrap;">${statusText}</div>
          </div>

          <div style="margin-top:20px;background:#f8fafc;border:1px solid #dde5ee;border-radius:22px;padding:28px 10px;zoom:1.14;">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#475569;">Ödeme Bilgileri</div>
            <div style="margin-top:16px;font-size:36px;line-height:1.15;font-weight:900;color:#0f172a;white-space:nowrap;">IBAN: ${info?.iban || 'Belirtilmedi'}</div>
            <div style="margin-top:14px;font-size:31px;font-weight:800;color:#1f2937;">Alıcı : ${info?.ibanReceiver || 'Belirtilmedi'}</div>
          </div>

          <div style="margin-top:18px;text-align:center;">
            <p style="margin:0;font-size:16px;font-weight:800;color:#334155;">Galata Aidat Takip Sistemi Tarafından Oluşturmuştur</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(card);

    try {
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#edf1f5',
        logging: false,
      });
      return canvas.toDataURL('image/png', 1);
    } finally {
      document.body.removeChild(card);
    }
  };

  const shareCardToUnit = async (unit: Unit, mode: ReceivableCardMode) => {
    const activeName = toTitleCase(unit.tenantName || unit.ownerName);
    const duesAmt = info?.duesAmount || 0;
    const netDebt = Math.max(0, unit.debt - unit.credit);
    const previousDebt = Math.max(0, unit.debt - duesAmt - unit.credit);
    const imageDataUrl = await createReminderCard(
      activeName,
      netDebt,
      previousDebt,
      unit.credit,
      duesAmt,
      unit.no,
      mode
    );
    const safeName = sanitizeFileName(activeName) || 'Daire';
    const cardTitle = mode === 'reminder' ? 'Aidat Hatirlatma' : getCreatedAidatTitle();
    const shareTitle = `${getBuildingShareName()}_${sanitizeFileName(cardTitle)}`;
    const fileName = `${shareTitle}_${unit.no}_${safeName}.png`;
    await PDFService.saveAndShareImage(imageDataUrl, fileName);
  };

  const handleWhatsApp = async (unit: Unit) => {
    setSharingUnitId(unit.id);

    try {
      const mode = getCardMode();
      await shareCardToUnit(unit, mode);
    } catch (error) {
      console.error('Hatirlatma karti paylasma hatasi:', error);
      alert('Kart paylasim ekrani acilamadi. Lutfen tekrar deneyin.');
    } finally {
      setSharingUnitId(null);
    }
  };

  const handlePreviewCard = async () => {
    const previewUnit = debtors[0];

    if (!previewUnit) {
      alert('Onizlenecek borclu kayit bulunamadi.');
      return;
    }

    setIsPreviewLoading(true);

    try {
      const previewName = toTitleCase(previewUnit.tenantName || previewUnit.ownerName);
      const previewDuesAmt = info?.duesAmount || 0;
      const previewNetDebt = Math.max(0, previewUnit.debt - previewUnit.credit);
      const previewPreviousDebt = Math.max(0, previewUnit.debt - previewDuesAmt - previewUnit.credit);
      const imageDataUrl = await createReminderCard(
        previewName,
        previewNetDebt,
        previewPreviousDebt,
        previewUnit.credit,
        previewDuesAmt,
        previewUnit.no,
        getCardMode()
      );
      setPreviewImageUrl(imageDataUrl);
    } catch (error) {
      console.error('Kart onizleme hatasi:', error);
      alert('Kart onizlenirken bir hata olustu.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="relative pt-0 pb-8">
      <div className="mb-3 flex items-center justify-between px-4 py-4">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/5 bg-white/5 p-2 transition-all active:scale-90"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-center text-[12px] font-black uppercase tracking-[0.2em] text-[#ff3b3b]">
          {uiText.title}
        </h3>
        <button
          onClick={handlePreviewCard}
          disabled={isPreviewLoading || debtors.length === 0}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
          title={uiText.preview}
        >
          {isPreviewLoading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        </button>
      </div>

      <div className="animate-in slide-in-from-bottom-6 px-0 duration-500">
        <div className="glass-panel mb-3 flex justify-center rounded-[24px] border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent px-4 py-3">
          <p className="flex w-full items-center justify-center overflow-hidden whitespace-nowrap text-center text-[16px] font-black leading-none tracking-tight text-[#ff3b3b]">
            <span className="mr-2 text-white/75">TOPLAM ALACAK</span>
            <span>
              {currencySymbol}
              {formatCurrency(totalReceivable)}
            </span>
          </p>
        </div>


        <div className="space-y-2">
          {debtors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Inbox size={48} className="mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">HIC BORCLU KAYDI YOK</p>
            </div>
          ) : (
            sortedDebtors.map((unit) => {
                const activeName = toTitleCase(unit.tenantName || unit.ownerName);
                const isSharing = sharingUnitId === unit.id;

                return (
                    <div
                      key={unit.id}
                      className="glass-panel group flex min-h-[58px] items-center rounded-[16px] border border-red-500/25 bg-red-500/[0.03] px-2.5 py-1.5 transition-all active:scale-[0.98]"
                    >
                      <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner">
                        <span className="text-[20px] font-black leading-none text-white">{unit.no}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold uppercase leading-tight tracking-tight text-white/90">
                          {activeName}
                        </span>
                        <div className="mt-0.5 flex items-center space-x-2 overflow-hidden whitespace-nowrap">
                          <span
                            className={`shrink-0 text-[7px] font-black uppercase leading-none tracking-tighter ${unit.tenantName ? 'text-orange-500' : 'text-blue-500'}`}
                          >
                            {unit.tenantName ? 'KIRACI' : 'MALIK'}
                          </span>
                          <div className="flex shrink-0 items-center space-x-1">
                            <span className="text-[11px] font-bold tracking-tight text-green-500">
                              {unit.tenantName && unit.tenantPhone ? (
                                unit.tenantPhone
                              ) : unit.phone ? (
                                unit.phone
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-wider text-white/20">
                                  TEL YOK
                                </span>
                              )}
                            </span>
                            <Phone size={8} className="shrink-0 text-green-500" />
                          </div>
                        </div>
                      </div>

                      <div className="ml-1.5 flex items-center space-x-1.5">
                        <div className="text-right">
                          <span className="text-[15px] font-black leading-none tracking-tighter text-[#ff3b3b]">
                            {currencySymbol}{formatCurrency(unit.debt)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 border-l border-white/5 pl-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWhatsApp(unit); }}
                            disabled={isSharing}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-green-500/40 active:scale-90 disabled:cursor-wait disabled:opacity-70"
                          >
                            {isSharing ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCall(unit.tenantPhone || unit.phone); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 active:scale-90"
                          >
                            <Phone size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

      {previewImageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1220] shadow-2xl">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition-all active:scale-90"
            >
              <X size={18} />
            </button>
            <div className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
              {uiText.preview}
            </div>
            <div className="max-h-[calc(92vh-56px)] overflow-auto bg-[#111827] p-3">
              <img
                src={previewImageUrl}
                alt="Aidat karti onizleme"
                className="w-full rounded-[18px] bg-white shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivablesView;
