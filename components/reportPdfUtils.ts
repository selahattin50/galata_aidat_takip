import { jsPDF } from 'jspdf';

export type ReportPdfTone = 'default' | 'info' | 'danger';

export interface ReportPdfItem {
  label: string;
  total: number;
  tone?: ReportPdfTone;
}

interface FinancialReportPdfOptions {
  buildingName: string;
  reportTitle: string;
  leftTitle: string;
  rightTitle: string;
  leftItems: ReportPdfItem[];
  rightItems: ReportPdfItem[];
  leftTotal: number;
  cashLabel: string;
  cashPeriodLabel: string;
  cashTotal: number;
  footerNote?: string;
}

const toneColors: Record<ReportPdfTone, [number, number, number]> = {
  default: [17, 24, 39],
  info: [37, 99, 235],
  danger: [239, 68, 68],
};

const PDF_FONT_FAMILY = 'ArialCustom';
const PDF_FONT_NORMAL_FILE = 'arial.ttf';
const PDF_FONT_BOLD_FILE = 'arialbd.ttf';

let pdfFontDataPromise: Promise<{ normal: string; bold: string }> | null = null;

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const loadPdfFontData = async () => {
  if (!pdfFontDataPromise) {
    const basePath = import.meta.env.BASE_URL || '/';
    const fontUrl = (fileName: string) => new URL(`fonts/${fileName}`, window.location.origin + basePath).toString();

    pdfFontDataPromise = Promise.all([
      fetch(fontUrl(PDF_FONT_NORMAL_FILE)).then((response) => {
        if (!response.ok) {
          throw new Error(`PDF font could not be loaded: ${PDF_FONT_NORMAL_FILE}`);
        }
        return response.arrayBuffer();
      }),
      fetch(fontUrl(PDF_FONT_BOLD_FILE)).then((response) => {
        if (!response.ok) {
          throw new Error(`PDF font could not be loaded: ${PDF_FONT_BOLD_FILE}`);
        }
        return response.arrayBuffer();
      }),
    ]).then(([normalBuffer, boldBuffer]) => ({
      normal: bufferToBase64(normalBuffer),
      bold: bufferToBase64(boldBuffer),
    }));
  }

  return pdfFontDataPromise;
};

const registerPdfFonts = async (pdf: jsPDF) => {
  const fontData = await loadPdfFontData();

  pdf.addFileToVFS(PDF_FONT_NORMAL_FILE, fontData.normal);
  pdf.addFont(PDF_FONT_NORMAL_FILE, PDF_FONT_FAMILY, 'normal');
  pdf.addFileToVFS(PDF_FONT_BOLD_FILE, fontData.bold);
  pdf.addFont(PDF_FONT_BOLD_FILE, PDF_FONT_FAMILY, 'bold');
};

const normalizePdfText = (value: string) => {
  if (!/[ÃÄÅâ]/.test(value)) {
    return value;
  }

  try {
    const latinBytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8').decode(latinBytes);
  } catch {
    return value;
  }
};

const fitText = (pdf: jsPDF, value: string, maxWidth: number) => {
  const safeValue = normalizePdfText(value);
  if (pdf.getTextWidth(safeValue) <= maxWidth) {
    return safeValue;
  }

  const ellipsis = '...';
  let trimmed = safeValue;
  while (trimmed.length > 0 && pdf.getTextWidth(trimmed + ellipsis) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}${ellipsis}`;
};

const formatAmount = (value: number) =>
  `TL ${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const drawCenteredText = (pdf: jsPDF, text: string, x: number, y: number) => {
  pdf.text(normalizePdfText(text), x, y, { align: 'center' });
};

export const createFinancialReportPdf = async ({
  buildingName,
  reportTitle,
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
  leftTotal,
  cashLabel,
  cashPeriodLabel,
  cashTotal,
  footerNote = 'Galata Aidat Takip Sistemi Tarafından Oluşturmuştur',
}: FinancialReportPdfOptions) => {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  await registerPdfFonts(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const tableX = margin;
  const tableY = 34;
  const tableWidth = pageWidth - margin * 2;
  const tableHeight = 155;
  const columnWidth = tableWidth / 2;
  const columnGap = 3.5;
  const sectionHeaderY = tableY + 9;
  const itemsTop = tableY + 18;
  const totalY = tableY + tableHeight - 6;
  const itemsBottom = totalY - 10;
  const rowCount = Math.max(leftItems.length, rightItems.length, 1);
  const rowHeight = Math.max(5.8, Math.min(8.0, (itemsBottom - itemsTop) / rowCount));
  const fontSize = rowHeight <= 6.5 ? 7.6 : rowHeight <= 7.5 ? 8.2 : 8.8;
  const amountWidth = 22;

  const drawColumn = (columnX: number, items: ReportPdfItem[]) => {
    const labelX = columnX + columnGap;
    const amountX = columnX + columnWidth - columnGap;
    const labelWidth = columnWidth - amountWidth - columnGap * 2;

    items.forEach((item, index) => {
      const rowTop = itemsTop + index * rowHeight;
      const textY = rowTop + 1.45;
      const color = toneColors[item.tone || 'default'];

      pdf.setDrawColor(235, 238, 242);
      pdf.setLineWidth(0.2);
      pdf.line(columnX + 2.5, rowTop + rowHeight - 0.45, columnX + columnWidth - 2.5, rowTop + rowHeight - 0.45);

      pdf.setFont(PDF_FONT_FAMILY, 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(fitText(pdf, item.label, labelWidth), labelX, textY, { baseline: 'top' });

      pdf.setFont(PDF_FONT_FAMILY, 'bold');
      pdf.setFontSize(fontSize);
      pdf.text(formatAmount(item.total), amountX, textY, { align: 'right', baseline: 'top' });
    });
  };

  pdf.setFont(PDF_FONT_FAMILY, 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(15);
  drawCenteredText(pdf, buildingName.toUpperCase(), pageWidth / 2, 19);

  pdf.setFontSize(9.6);
  drawCenteredText(pdf, reportTitle.toUpperCase(), pageWidth / 2, 27.5);
  pdf.setDrawColor(17, 24, 39);
  pdf.setLineWidth(0.4);
  pdf.line(56, 29.5, pageWidth - 56, 29.5);

  pdf.setDrawColor(51, 65, 85);
  pdf.setLineWidth(0.35);
  pdf.rect(tableX, tableY, tableWidth, tableHeight);
  pdf.line(tableX + columnWidth, tableY, tableX + columnWidth, tableY + tableHeight);

  pdf.setFontSize(10);
  pdf.setTextColor(239, 68, 68);
  pdf.text(normalizePdfText(leftTitle), tableX + columnGap, sectionHeaderY);
  pdf.setDrawColor(239, 68, 68);
  pdf.line(tableX + columnGap, sectionHeaderY + 1.4, tableX + columnWidth - columnGap, sectionHeaderY + 1.4);

  pdf.setTextColor(34, 197, 94);
  pdf.text(normalizePdfText(rightTitle), tableX + columnWidth + columnGap, sectionHeaderY);
  pdf.setDrawColor(34, 197, 94);
  pdf.line(tableX + columnWidth + columnGap, sectionHeaderY + 1.4, tableX + tableWidth - columnGap, sectionHeaderY + 1.4);

  drawColumn(tableX, leftItems);
  drawColumn(tableX + columnWidth, rightItems);

  pdf.setFont(PDF_FONT_FAMILY, 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(239, 68, 68);
  pdf.text(formatAmount(leftTotal), tableX + columnWidth - columnGap, totalY, { align: 'right' });

  const cashBoxWidth = 72;
  const cashBoxHeight = 22;
  const cashBoxX = pageWidth - margin - cashBoxWidth;
  const cashBoxY = tableY + tableHeight + 13;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(cashBoxX, cashBoxY, cashBoxWidth, cashBoxHeight, 3, 3, 'FD');

  pdf.setFont(PDF_FONT_FAMILY, 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8.5);
  pdf.text(normalizePdfText(cashLabel), cashBoxX + cashBoxWidth - 4, cashBoxY + 6, { align: 'right' });

  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(12);
  pdf.text(normalizePdfText(cashPeriodLabel), cashBoxX + cashBoxWidth - 4, cashBoxY + 12.2, { align: 'right' });

  pdf.setFontSize(16);
  const cashColor = cashTotal >= 0 ? [34, 197, 94] : [239, 68, 68];
  pdf.setTextColor(cashColor[0], cashColor[1], cashColor[2]);
  pdf.text(formatAmount(cashTotal), cashBoxX + cashBoxWidth - 4, cashBoxY + 19, { align: 'right' });

  pdf.setFont(PDF_FONT_FAMILY, 'normal');
  pdf.setFontSize(6.2);
  pdf.setTextColor(148, 163, 184);
  drawCenteredText(pdf, footerNote, pageWidth / 2, pageHeight - 9);

  return pdf;
};

