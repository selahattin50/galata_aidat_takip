import React, { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { App as CapacitorApp } from '@capacitor/app';
import { ArrowLeft, Phone, MessageCircle, Inbox, AlertCircle, Loader2, Eye, X, CheckSquare, Square, Send, Eraser, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { BuildingInfo, Unit } from '../types.ts';
import { PDFService } from '../pdfService.ts';
import { markExternalIntent } from '../externalIntentGuard';
import buildingLogo from '../src/assets/logo.png';

interface ReceivablesViewProps {
  units: Unit[];
  info: BuildingInfo;
  onClose: () => void;
  currentDate: Date;
}

type ReceivableCardMode = 'info' | 'reminder';

const ReceivablesView: React.FC<ReceivablesViewProps> = ({ units, info, onClose, currentDate }) => {
  const [sharingUnitId, setSharingUnitId] = useState<string | null>(null);
  const [isBulkSharing, setIsBulkSharing] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSuccessIds, setBulkSuccessIds] = useState<string[]>([]);
  const [bulkFailedIds, setBulkFailedIds] = useState<string[]>([]);
  const [bulkQueueIds, setBulkQueueIds] = useState<string[]>([]);
  const [bulkQueueIndex, setBulkQueueIndex] = useState(0);
  const [bulkWaitingReturn, setBulkWaitingReturn] = useState(false);
  const [bulkSkippedCount, setBulkSkippedCount] = useState(0);
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

  useEffect(() => {
    const selectableIds = sortedDebtors.filter((unit) => !!getUnitPhone(unit)).map((unit) => unit.id);
    setSelectedUnitIds((prev) => (prev.length === 0 ? selectableIds : prev.filter((id) => selectableIds.includes(id))));
  }, [units]);

  useEffect(() => {
    const listener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive || !isBulkSharing || !bulkWaitingReturn || bulkQueueIds.length === 0) {
        return;
      }

      const nextIndex = bulkQueueIndex;
      if (nextIndex >= bulkQueueIds.length) {
        finishBulkShare(bulkSuccessIds, bulkFailedIds, bulkSkippedCount);
        return;
      }

      setBulkWaitingReturn(false);
      await runBulkShareStep(bulkQueueIds, nextIndex, getCardMode(), bulkSkippedCount, bulkSuccessIds, bulkFailedIds);
    });

    return () => {
      listener.then((handle) => handle.remove());
    };
  }, [isBulkSharing, bulkWaitingReturn, bulkQueueIds, bulkQueueIndex, bulkSuccessIds, bulkFailedIds, bulkSkippedCount, info, units]);

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

  const activeCardMode = getCardMode();
  const activeCardModeLabel = activeCardMode === 'reminder' ? 'M2 AIDAT HATIRLATMA' : 'M1 AIDAT OLUSTURULDU';
  const activeCardModeDescription =
    activeCardMode === 'reminder'
      ? 'Bugun odeme yapilmadi karti gonderilir.'
      : 'Bugun aidat olusturuldu karti gonderilir.';
  const currencySymbol = '\u20BA';
  const uiText = {
    title: 'ALACAK L\u0130STES\u0130',
    preview: 'Kart \u00d6nizleme',
    panelTitle: 'KART G\u00d6NDER\u0130M\u0130',
    selectedPrefix: 'Se\u00e7ilen',
    selectedSuffix: 'bor\u00e7luya kendi kart\u0131 g\u00f6nderilsin',
    sending: 'G\u00d6NDER\u0130L\u0130YOR',
    send: 'G\u00d6NDER',
    selectAll: 'T\u00dcM\u00dcN\u00dc SE\u00c7',
    clear: 'TEM\u0130ZLE',
    success: 'BA\u015eARILI',
    remaining: 'KALANLARI G\u00d6NDER',
  };

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      alert('Telefon numarasi kayitli degil.');
      return;
    }
    markExternalIntent();
    window.open(`tel:${phoneNumber.replace(/\s/g, '')}`);
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = sortedDebtors.filter((unit) => !!getUnitPhone(unit)).map((unit) => unit.id);
    setSelectedUnitIds(selectableIds);
  };

  const handleClearSelection = () => {
    setSelectedUnitIds([]);
  };

  const handleRetryFailed = async () => {
    if (bulkFailedIds.length === 0) {
      alert('Tekrar denenecek hatali gonderim yok.');
      return;
    }

    setSelectedUnitIds(bulkFailedIds);
    await handleBulkWhatsApp(bulkFailedIds);
  };

  const finishBulkShare = (successIds: string[], failedIds: string[], skippedCount: number) => {
    setSelectedUnitIds([...failedIds]);
    setBulkFailedIds(failedIds);
    setSharingUnitId(null);
    setIsBulkSharing(false);
    setBulkProgress(null);
    setBulkQueueIds([]);
    setBulkQueueIndex(0);
    setBulkWaitingReturn(false);
    setBulkSkippedCount(0);
    alert(`Toplu kart gonderimi tamamlandi.\nBasarili: ${successIds.length}\nTelefonu olmayan: ${skippedCount}\nHatali: ${failedIds.length}`);
  };

  const runBulkShareStep = async (
    queueIds: string[],
    index: number,
    mode: ReceivableCardMode,
    skippedCount: number,
    currentSuccessIds: string[],
    currentFailedIds: string[]
  ) => {
    if (index >= queueIds.length) {
      finishBulkShare(currentSuccessIds, currentFailedIds, skippedCount);
      return;
    }

    const unit = sortedDebtors.find((item) => item.id === queueIds[index]);

    if (!unit) {
      const nextFailedIds = currentFailedIds.includes(queueIds[index])
        ? currentFailedIds
        : [...currentFailedIds, queueIds[index]];
      setBulkFailedIds(nextFailedIds);
      const nextIndex = index + 1;
      setBulkQueueIndex(nextIndex);
      if (nextIndex >= queueIds.length) {
        finishBulkShare(currentSuccessIds, nextFailedIds, skippedCount);
      }
      return;
    }

    setBulkProgress({ current: index + 1, total: queueIds.length });
    setSharingUnitId(unit.id);

    try {
      await shareCardToUnit(unit, mode);
      const nextSuccessIds = currentSuccessIds.includes(unit.id)
        ? currentSuccessIds
        : [...currentSuccessIds, unit.id];
      setBulkSuccessIds(nextSuccessIds);
      setBulkFailedIds((prev) => prev.filter((id) => id !== unit.id));
      setBulkQueueIndex(index + 1);
      setBulkWaitingReturn(true);
    } catch (error) {
      console.error('Toplu hatirlatma karti paylasma hatasi:', error);
      const nextFailedIds = currentFailedIds.includes(unit.id)
        ? currentFailedIds
        : [...currentFailedIds, unit.id];
      setBulkFailedIds(nextFailedIds);
      const nextIndex = index + 1;
      setBulkQueueIndex(nextIndex);
      if (nextIndex >= queueIds.length) {
        finishBulkShare(currentSuccessIds, nextFailedIds, skippedCount);
        return;
      }
      await runBulkShareStep(queueIds, nextIndex, mode, skippedCount, currentSuccessIds, nextFailedIds);
    }
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
    const cardTitle = isReminder ? 'Aidat Hat\u0131rlatma' : 'Aidat Bilgilendirme';
    const statusTitle = isReminder ? 'Durum' : 'Bilgilendirme';
    const statusText = isReminder
      ? '\u00D6demenizi hen\u00FCz yapmad\u0131\u011F\u0131n\u0131z g\u00F6r\u00FClmektedir.'
      : 'Bu aya ait aidat borcunuz olu\u015Fturulmu\u015Ftur.';

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
              <div style="width:132px;height:132px;border-radius:28px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                <img src="${buildingLogo}" alt="Galata Logo" style="width:112px;height:112px;object-fit:contain;display:block;" />
              </div>
              <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;flex:1;">
                <div style="width:100%;font-size:24px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;opacity:0.88;text-align:center;">Galata Apartman&#305;</div>
                <div style="width:100%;margin-top:12px;font-size:50px;line-height:1.06;font-weight:900;text-align:center;">${cardTitle}</div>
              </div>
            </div>
            <div style="min-width:170px;padding:14px 18px;border-radius:18px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.14);text-align:right;">
              <div style="font-size:18px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;opacity:0.88;">Daire No</div>
              <div style="margin-top:8px;font-size:36px;font-weight:900;">${unitNo}</div>
            </div>
          </div>
        </div>

        <div style="padding:34px 40px 38px 40px;">
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 370px;grid-template-areas:'name summary' 'due summary';gap:22px;align-items:stretch;">
            <div style="grid-area:name;min-height:168px;background:#f8fafc;border:1px solid #dde5ee;border-radius:22px;padding:26px 28px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">&#304;sim</div>
              <div style="margin-top:14px;font-size:50px;line-height:1.1;font-weight:900;color:#0f172a;">${name}</div>
            </div>

            <div style="grid-area:summary;min-height:328px;background:#fff8f8;border:1px solid #f2d4d4;border-radius:22px;padding:22px 24px;box-sizing:border-box;display:grid;grid-template-rows:1fr 1fr 1fr 1fr;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#dc2626;white-space:nowrap;">Aidat</div>
                <div style="font-size:40px;line-height:1;font-weight:900;color:#dc2626;white-space:nowrap;">&#8378;${formatCurrency(duesAmount)}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;white-space:nowrap;">Ge&#231;mi&#351;</div>
                <div style="font-size:40px;line-height:1;font-weight:900;color:#7c3aed;white-space:nowrap;">${formatCurrency(previousDebt)}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f2d4d4;">
                <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#b45309;white-space:nowrap;">Kredi</div>
                <div style="font-size:40px;line-height:1;font-weight:900;color:#b45309;white-space:nowrap;">${formatCurrency(credit)}</div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                <div style="font-size:45px;line-height:1;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#b91c1c;white-space:nowrap;">Bor&#231;</div>
                <div style="font-size:45px;line-height:1;font-weight:950;color:#dc2626;white-space:nowrap;">${formatCurrency(totalDebt)}</div>
              </div>
            </div>

            <div style="grid-area:due;min-height:140px;background:#fffdf7;border:1px solid #ece1bc;border-radius:22px;padding:26px 28px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#7c5c10;">Son &#214;deme Tarihi</div>
              <div style="margin-top:12px;font-size:40px;font-weight:900;color:#111827;">Ay&#305;n 20'si</div>
            </div>
          </div>

          <div style="margin-top:20px;background:${isReminder ? '#fff7ed' : '#f7fafc'};border:1px solid ${isReminder ? '#fed7aa' : '#dde5ee'};border-radius:22px;padding:26px 12px;zoom:1.1;">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${isReminder ? '#9a3412' : '#475569'};">${statusTitle}</div>
            <div style="margin-top:14px;font-size:39px;line-height:1.18;font-weight:900;color:${isReminder ? '#9a3412' : '#1e293b'};white-space:nowrap;">${statusText}</div>
          </div>

          <div style="margin-top:20px;background:#f8fafc;border:1px solid #dde5ee;border-radius:22px;padding:28px 10px;zoom:1.14;">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#475569;">&#214;deme Bilgileri</div>
            <div style="margin-top:16px;font-size:36px;line-height:1.15;font-weight:900;color:#0f172a;white-space:nowrap;">IBAN: TR74 0021 0000 0007 9239 7000 01</div>
            <div style="margin-top:14px;font-size:31px;font-weight:800;color:#1f2937;">ALICI : GALATA APARTMAN Y&#214;NET&#304;M&#304;</div>
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
    const phoneNumber = getUnitPhone(unit);

    if (!phoneNumber) {
      throw new Error('Telefon numarasi kayitli degil.');
    }

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
    const fileName = `${mode === 'reminder' ? 'Aidat Hatirlatma' : 'Aidat Olusturuldu'}.png`;
    await PDFService.saveAndShareImage(imageDataUrl, fileName, phoneNumber);
  };

  const handleWhatsApp = async (unit: Unit, name: string) => {
    const phoneNumber = getUnitPhone(unit);

    if (!phoneNumber) {
      alert('Telefon numarasi kayitli degil.');
      return;
    }

    setSharingUnitId(unit.id);

    try {
      const mode = getCardMode();
      await shareCardToUnit(unit, mode);
    } catch (error) {
      console.error('Hatirlatma karti paylasma hatasi:', error);
      alert('Hatirlatma karti paylasilirken bir hata olustu.');
    } finally {
      setSharingUnitId(null);
    }
  };

  const handleBulkWhatsApp = async (targetUnitIds?: string[]) => {
    const idsToSend = Array.isArray(targetUnitIds) ? targetUnitIds : selectedUnitIds;
    const selectedUnits = sortedDebtors.filter((unit) => idsToSend.includes(unit.id));

    if (selectedUnits.length === 0) {
      alert('Lutfen once kart gonderilecek borclulari secin.');
      return;
    }

    const unitsWithPhone = selectedUnits.filter((unit) => !!getUnitPhone(unit));

    if (unitsWithPhone.length === 0) {
      alert('Secilen borclularin hicbirinde telefon numarasi yok.');
      return;
    }

    const queueIds = unitsWithPhone.map((unit) => unit.id);
    const skippedCount = selectedUnits.length - unitsWithPhone.length;

    setIsBulkSharing(true);
    setBulkProgress({ current: 0, total: queueIds.length });
    setBulkSuccessIds([]);
    setBulkFailedIds([]);
    setBulkQueueIds(queueIds);
    setBulkQueueIndex(0);
    setBulkWaitingReturn(false);
    setBulkSkippedCount(skippedCount);

    alert('Toplu kart gonderimi baslatildi. Her paylasimdan sonra uygulamaya geri donersen siradaki kisi otomatik acilir.');
    await runBulkShareStep(queueIds, 0, getCardMode(), skippedCount, [], []);
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
    <div className="relative pt-0 pb-24">
      <div className="sticky top-0 z-[100] -mx-4 mb-3 flex items-center justify-between border-b border-white/5 bg-[#030712]/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/5 bg-white/5 p-2 transition-all active:scale-90"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-center text-[12px] font-black uppercase tracking-[0.2em] text-green-500">
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

      <div className="animate-in slide-in-from-bottom-6 px-1 duration-500">
        <div className="glass-panel mb-3 flex items-center justify-between rounded-[24px] border border-red-500/10 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 shadow-lg shadow-red-900/10">
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <div>
              <p className="mb-1.5 text-[9px] font-black uppercase leading-none tracking-[0.2em] text-white/30">
                TOPLAM ALACAK
              </p>
              <p className="text-[26px] font-black leading-none tracking-tighter text-red-500">
                {currencySymbol} {formatCurrency(totalReceivable)}
              </p>
            </div>
          </div>
        </div>

        {debtors.length > 0 && (
          <div className="glass-panel mb-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  {uiText.panelTitle}
                </p>
                <p className="mt-1 text-[12px] font-bold text-white/80">
                  {uiText.selectedPrefix} {selectedUnitIds.length} {uiText.selectedSuffix}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-300/80">
                  {activeCardModeLabel}
                </p>
                <p className="mt-1 text-[10px] font-bold text-white/35">
                  {activeCardModeDescription}
                </p>
              </div>
              {bulkProgress && (
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-green-400">
                    {uiText.sending} {bulkProgress.current}/{bulkProgress.total}
                  </p>
                </div>
              )}
              <button
                onClick={() => handleBulkWhatsApp()}
                disabled={isBulkSharing || selectedUnitIds.length === 0}
                className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 px-4 text-[12px] font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBulkSharing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {uiText.send}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSelectAll}
                disabled={isBulkSharing}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/80 transition-all active:scale-95 disabled:opacity-40"
              >
                <CheckSquare size={14} />
                {uiText.selectAll}
              </button>
              <button
                onClick={handleClearSelection}
                disabled={isBulkSharing || selectedUnitIds.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60 transition-all active:scale-95 disabled:opacity-40"
              >
                <Eraser size={14} />
                {uiText.clear}
              </button>
            </div>
            {(bulkSuccessIds.length > 0 || bulkFailedIds.length > 0) && (
              <div className="mt-3 flex gap-2">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
                  <Check size={14} />
                  {uiText.success} {bulkSuccessIds.length}
                </div>
                <button
                  onClick={handleRetryFailed}
                  disabled={isBulkSharing || bulkFailedIds.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-200 transition-all active:scale-95 disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                  {uiText.remaining} {bulkFailedIds.length}
                </button>
              </div>
            )}
          </div>
        )}

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
                const isSelected = selectedUnitIds.includes(unit.id);
                const hasPhone = !!getUnitPhone(unit);
                const isBulkSuccess = bulkSuccessIds.includes(unit.id);
                const isBulkFailed = bulkFailedIds.includes(unit.id);

                return (
                  <div
                    key={unit.id}
                    className={`glass-panel group flex min-h-[58px] items-center rounded-[16px] border px-3 py-1.5 transition-all hover:bg-white/10 ${isBulkSuccess ? 'border-emerald-500/40 bg-emerald-500/[0.08]' : isBulkFailed ? 'border-amber-500/40 bg-amber-500/[0.08]' : isSelected ? 'border-green-500/40 bg-green-500/[0.06]' : 'border-white/5'}`}
                  >
                    <button
                      onClick={() => toggleUnitSelection(unit.id)}
                      disabled={isBulkSharing}
                      className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all active:scale-90 disabled:opacity-40"
                      title={isSelected ? 'Secimi kaldir' : 'Borcluyu sec'}
                    >
                      {isSelected ? <CheckSquare size={16} className="text-green-400" /> : <Square size={16} />}
                    </button>

                    <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner">
                      <span className="text-[20px] font-black leading-none text-white">{unit.no}</span>
                    </div>

                    {(isBulkSuccess || isBulkFailed) && (
                      <div className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isBulkSuccess ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-amber-500/30 bg-amber-500/15 text-amber-200'}`}>
                        {isBulkSuccess ? <Check size={15} /> : <AlertTriangle size={15} />}
                      </div>
                    )}

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
                          <Phone size={8} className="text-green-500" />
                        </div>
                      </div>
                    </div>

                    <div className="ml-2 flex items-center space-x-2">
                       <div className="flex flex-col items-end text-right">
                        <span className="text-[15px] font-black leading-none tracking-tighter text-red-500">
                          {currencySymbol}{formatCurrency(unit.debt)}
                        </span>
                        <span className="mt-0.5 whitespace-nowrap text-[7px] font-black uppercase tracking-widest text-white/10">
                          TOPLAM BORC
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 border-l border-white/5 pl-2.5">
                        <button
                          onClick={() => handleWhatsApp(unit, activeName)}
                          disabled={isSharing || isBulkSharing || !hasPhone}
                          className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-1 text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-green-500/40 active:scale-90 disabled:cursor-wait disabled:opacity-70"
                        >
                          {isSharing ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                        </button>
                        <button
                          onClick={() => handleCall(unit.tenantPhone || unit.phone)}
                          className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-1 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 active:scale-90"
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
