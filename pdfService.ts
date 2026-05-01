import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import { markExternalIntent } from './externalIntentGuard';

export interface WhatsAppSharePlugin {
  shareToWhatsApp(options: { phoneNumber: string; filePath: string; mimeType?: string; text?: string }): Promise<void>;
}

const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>('WhatsAppShare');

const formatPhoneForWhatsApp = (phoneNumber: string) => {
  let digits = phoneNumber.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  if (digits.startsWith('0')) {
    digits = `90${digits.substring(1)}`;
  }

  if (digits.length === 10) {
    digits = `90${digits}`;
  }

  if (!digits.startsWith('90') && digits.length > 0) {
    digits = `90${digits}`;
  }

  return digits;
};

export interface SavedPDFInfo {
  uri: string;
  size: number;
  fileName?: string;
}

export class PDFService {
  /**
   * PDF'i telefona kaydet ve paylaş
   * @param pdfBlob - jsPDF'den oluşturulan blob
   * @param fileName - Dosya adı (örn: "aidat-cizelge.pdf")
   * @param shouldShare - Paylaşma dialogunu aç (varsayılan: true)
   * @param phoneNumber - WhatsApp için telefon numarası (opsiyonel)
   * @returns Kaydedilen dosya bilgileri (uri ve boyut)
   */
  static async saveAndSharePDF(pdfBlob: Blob, fileName: string, shouldShare: boolean = true, phoneNumber?: string): Promise<SavedPDFInfo> {
    try {
      // Blob'u base64'e çevir
      const base64Data = await this.blobToBase64(pdfBlob);

      if (Capacitor.isNativePlatform()) {
        // Mobil cihazda (Android/iOS)
        return await this.saveAndShareNative(base64Data, fileName, pdfBlob.size, shouldShare, phoneNumber);
      } else {
        // Web tarayıcısında
        this.downloadInBrowser(pdfBlob, fileName);
        return { uri: '', size: pdfBlob.size };
      }
    } catch (error) {
      console.error('PDF kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Mobil cihazda PDF'i kaydet ve isteğe bağlı paylaş
   */
  private static async saveAndShareNative(base64Data: string, fileName: string, fileSize: number, shouldShare: boolean, phoneNumber?: string): Promise<SavedPDFInfo> {
    try {
      // PDF'i kalıcı depolamaya kaydet (Uygulama özel klasörü)
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });

      console.log('PDF kaydedildi:', savedFile.uri);

      // Sadece paylaşma isteniyorse dialogu aç
      if (shouldShare) {
        if (phoneNumber && phoneNumber.length > 0) {
          try {
            const formattedPhone = formatPhoneForWhatsApp(phoneNumber);

            markExternalIntent();
            await WhatsAppShare.shareToWhatsApp({
              phoneNumber: formattedPhone,
              filePath: savedFile.uri
            });
          } catch (error) {
            console.error('WhatsApp paylaşma hatası:', error);
            markExternalIntent();
            await Share.share({
              title: 'PDF Paylaş',
              url: savedFile.uri,
              dialogTitle: 'PDF dosyasını paylaş',
            });
          }
        } else {
          markExternalIntent();
          await Share.share({
            title: 'PDF Paylaş',
            url: savedFile.uri,
            dialogTitle: 'PDF dosyasını paylaş',
          });
        }
      }

      return { uri: savedFile.uri, size: fileSize, fileName: fileName };
    } catch (error) {
      console.error('Native PDF kaydetme hatası:', error);
      throw new Error('PDF kaydedilemedi. Lütfen depolama izinlerini kontrol edin.');
    }
  }

  /**
   * Web tarayıcısında PDF'i indir
   */
  private static downloadInBrowser(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Blob'u Base64'e çevir
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static async saveAndShareFromJsPDF(pdf: any, fileName: string, shouldShare: boolean = true, phoneNumber?: string): Promise<SavedPDFInfo> {
    const blob = pdf.output('blob');
    return await this.saveAndSharePDF(blob, fileName, shouldShare, phoneNumber);
  }

  static async saveAndShareImage(dataUrl: string, fileName: string, phoneNumber?: string, text?: string): Promise<SavedPDFInfo> {
    try {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = dataUrl.match(/^data:(.*?);base64,/)?.[1] || 'image/png';
      const approximateSize = Math.round((base64Data.length * 3) / 4);

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data,
        });

        if (phoneNumber && phoneNumber.length > 0) {
          const formattedPhone = formatPhoneForWhatsApp(phoneNumber);

          try {
            markExternalIntent();
            const shareOptions: { phoneNumber: string; filePath: string; mimeType: string; text?: string } = {
              phoneNumber: formattedPhone,
              filePath: savedFile.uri,
              mimeType
            };
            if (text) shareOptions.text = text;
            await WhatsAppShare.shareToWhatsApp(shareOptions);
          } catch (shareError) {
            console.error('WhatsApp görsel paylaşma hatası:', shareError);
            throw shareError;
          }
        } else {
          markExternalIntent();
          const shareOptions: { title: string; url: string; dialogTitle: string; text?: string } = {
            title: 'Hatırlatma Kartı',
            url: savedFile.uri,
            dialogTitle: 'Kartı paylaş',
          };
          if (text) shareOptions.text = text;
          await Share.share(shareOptions);
        }

        return { uri: savedFile.uri, size: approximateSize, fileName };
      }

      const blob = await fetch(dataUrl).then(response => response.blob());
      this.downloadInBrowser(blob, fileName);
      return { uri: '', size: approximateSize, fileName };
    } catch (error) {
      console.error('Görsel kaydetme/paylaşma hatası:', error);
      throw error;
    }
  }

  static async openPDF(uri: string, fileName?: string): Promise<void> {
    try {
      if (!uri) {
        throw new Error('Dosya URI bulunamadı');
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const { FileOpener } = await import('@capacitor-community/file-opener');
          markExternalIntent();
          await FileOpener.open({
            filePath: uri,
            contentType: 'application/pdf'
          });
        } catch (error) {
          console.error('FileOpener hatası, Share API kullanılıyor:', error);
          markExternalIntent();
          await Share.share({
            title: 'PDF Görüntüle',
            text: fileName || 'PDF Dosyası',
            url: uri,
            dialogTitle: 'PDF ile aç'
          });
        }
      } else {
        window.open(uri, '_blank');
      }
    } catch (error) {
      console.error('PDF açma hatası:', error);
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (errorMsg.toLowerCase().includes('cancel')) {
        return;
      }
      throw new Error('PDF açılamadı: ' + errorMsg);
    }
  }
}
