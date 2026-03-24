import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

export interface WhatsAppSharePlugin {
  shareToWhatsApp(options: { phoneNumber: string; filePath: string; mimeType?: string }): Promise<void>;
}

const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>('WhatsAppShare');

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
      // Android 11+ için özel izin kontrolü gerekebilir, ancak Directory.Data 
      // genelde izin gerektirmeden uygulama özel klasörüne yazar.

      // PDF'i kalıcı depolamaya kaydet (Uygulama özel klasörü)
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data, // Directory.Documents yerine Directory.Data kullanmak daha uyumlu
      });

      console.log('PDF kaydedildi:', savedFile.uri);
      console.log('Dosya adı:', fileName);
      console.log('Telefon numarası:', phoneNumber);

      // Sadece paylaşma isteniyorse dialogu aç
      if (shouldShare) {
        // Eğer telefon numarası varsa, WhatsApp'a direkt paylaş
        if (phoneNumber && phoneNumber.length > 0) {
          console.log('WhatsApp ile paylaşım başlatılıyor...');
          console.log('Telefon numarası:', phoneNumber);

          try {
            // Telefon numarasını uluslararası formata çevir
            let formattedPhone = phoneNumber;
            // Eğer 0 ile başlıyorsa, 90 ile değiştir (Türkiye)
            if (formattedPhone.startsWith('0')) {
              formattedPhone = '90' + formattedPhone.substring(1);
            }
            // Eğer + veya 90 ile başlamıyorsa, 90 ekle
            if (!formattedPhone.startsWith('90') && !formattedPhone.startsWith('+')) {
              formattedPhone = '90' + formattedPhone;
            }

            console.log('Formatlanmış telefon:', formattedPhone);

            // Native WhatsApp plugin ile paylaş
            await WhatsAppShare.shareToWhatsApp({
              phoneNumber: formattedPhone,
              filePath: savedFile.uri
            });

            console.log('WhatsApp paylaşımı başarılı');
          } catch (error) {
            console.error('WhatsApp paylaşma hatası:', error);
            // Hata olursa normal paylaşma dialogunu göster
            await Share.share({
              title: 'PDF Paylaş',
              text: fileName,
              url: savedFile.uri,
              dialogTitle: 'PDF dosyasını paylaş',
            });
          }
        } else {
          // Telefon numarası yoksa normal paylaşma
          await Share.share({
            title: 'PDF Paylaş',
            text: fileName,
            url: savedFile.uri,
            dialogTitle: 'PDF dosyasını paylaş',
          });
        }
        console.log('İşlem tamamlandı');
      }

      // Dosya adını ve URI'yi döndür
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
        // "data:application/pdf;base64," kısmını kaldır
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * jsPDF instance'ından direkt kaydet ve paylaş
   * @param pdf - jsPDF instance
   * @param fileName - Dosya adı
   * @param shouldShare - Paylaşma dialogunu aç (varsayılan: true)
   * @param phoneNumber - WhatsApp için telefon numarası (opsiyonel)
   * @returns Kaydedilen dosya bilgileri (uri ve boyut)
   */
  static async saveAndShareFromJsPDF(pdf: any, fileName: string, shouldShare: boolean = true, phoneNumber?: string): Promise<SavedPDFInfo> {
    const blob = pdf.output('blob');
    return await this.saveAndSharePDF(blob, fileName, shouldShare, phoneNumber);
  }

  static async saveAndShareImage(dataUrl: string, fileName: string, phoneNumber?: string): Promise<SavedPDFInfo> {
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
          let formattedPhone = phoneNumber.replace(/\s+/g, '');
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '90' + formattedPhone.substring(1);
          }
          if (!formattedPhone.startsWith('90') && !formattedPhone.startsWith('+')) {
            formattedPhone = '90' + formattedPhone;
          }

          try {
            await WhatsAppShare.shareToWhatsApp({
              phoneNumber: formattedPhone.replace('+', ''),
              filePath: savedFile.uri,
              mimeType,
            });
          } catch (shareError) {
            console.error('WhatsApp görsel paylaşma hatası, genel paylaşıma dönülüyor:', shareError);
            await Share.share({
              title: 'Hatırlatma Kartı',
              text: fileName,
              url: savedFile.uri,
              dialogTitle: 'Kartı paylaş',
            });
          }
        } else {
          await Share.share({
            title: 'Hatırlatma Kartı',
            text: fileName,
            url: savedFile.uri,
            dialogTitle: 'Kartı paylaş',
          });
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

  /**
   * Kaydedilmiş PDF'i aç
   * @param uri - Dosya URI'si
   * @param fileName - Dosya adı (opsiyonel)
   */
  static async openPDF(uri: string, fileName?: string): Promise<void> {
    try {
      if (!uri) {
        throw new Error('Dosya URI bulunamadı');
      }

      if (Capacitor.isNativePlatform()) {
        console.log('PDF açılıyor - URI:', uri);
        console.log('Dosya adı:', fileName);

        // Android'de FileOpener plugin'i yerine Share kullan ama sadece PDF uygulamaları için
        // Bu sayede kullanıcı PDF görüntüleyici seçebilir
        await Share.share({
          title: 'PDF Görüntüle',
          text: fileName || 'PDF Dosyası',
          url: uri,
          dialogTitle: 'PDF ile aç'
        });
      } else {
        // Web tarayıcısında yeni sekmede aç
        window.open(uri, '_blank');
      }
    } catch (error) {
      console.error('PDF açma hatası:', error);
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      // Kullanıcı iptal ettiyse sessizce geç
      if (errorMsg.toLowerCase().includes('cancel')) {
        return;
      }
      throw new Error('PDF açılamadı: ' + errorMsg);
    }
  }
}
