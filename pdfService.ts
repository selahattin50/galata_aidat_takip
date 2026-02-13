import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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
   * @returns Kaydedilen dosya bilgileri (uri ve boyut)
   */
  static async saveAndSharePDF(pdfBlob: Blob, fileName: string, shouldShare: boolean = true): Promise<SavedPDFInfo> {
    try {
      // Blob'u base64'e çevir
      const base64Data = await this.blobToBase64(pdfBlob);
      
      if (Capacitor.isNativePlatform()) {
        // Mobil cihazda (Android/iOS)
        return await this.saveAndShareNative(base64Data, fileName, pdfBlob.size, shouldShare);
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
  private static async saveAndShareNative(base64Data: string, fileName: string, fileSize: number, shouldShare: boolean): Promise<SavedPDFInfo> {
    try {
      // PDF'i kalıcı depolamaya kaydet (Documents klasörü)
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });

      console.log('PDF kaydedildi:', savedFile.uri);
      console.log('Dosya adı:', fileName);

      // Sadece paylaşma isteniyorsa dialogu aç
      if (shouldShare) {
        await Share.share({
          title: 'PDF Paylaş',
          text: fileName,
          url: savedFile.uri,
          dialogTitle: 'PDF dosyasını paylaş',
        });
        console.log('PDF paylaşıldı');
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
   * @returns Kaydedilen dosya bilgileri (uri ve boyut)
   */
  static async saveAndShareFromJsPDF(pdf: any, fileName: string, shouldShare: boolean = true): Promise<SavedPDFInfo> {
    const blob = pdf.output('blob');
    return await this.saveAndSharePDF(blob, fileName, shouldShare);
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
        // Dosya adını belirle
        let pdfFileName = fileName;
        if (!pdfFileName) {
          // URI'den dosya adını çıkar
          const uriParts = uri.split('/');
          pdfFileName = uriParts[uriParts.length - 1];
          // Eğer URI'de dosya adı yoksa, varsayılan kullan
          if (!pdfFileName || !pdfFileName.includes('.pdf')) {
            pdfFileName = 'document.pdf';
          }
        }
        
        console.log('PDF açılıyor - Dosya adı:', pdfFileName);
        
        try {
          // Dosyayı oku
          const fileData = await Filesystem.readFile({
            path: pdfFileName,
            directory: Directory.Documents
          });

          console.log('Dosya okundu, paylaşılıyor...');

          // Base64 data ile paylaş
          await Share.share({
            title: 'PDF Görüntüle',
            text: pdfFileName,
            url: `data:application/pdf;base64,${fileData.data}`,
            dialogTitle: 'PDF ile aç'
          });
        } catch (readError) {
          console.error('Dosya okuma hatası:', readError);
          // Alternatif: Direkt URI ile dene
          await Share.share({
            title: 'PDF Görüntüle',
            files: [uri],
            dialogTitle: 'PDF ile aç'
          });
        }
      } else {
        // Web tarayıcısında yeni sekmede aç
        window.open(uri, '_blank');
      }
    } catch (error) {
      console.error('PDF açma hatası:', error);
      // Hata mesajını daha anlaşılır yap
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (errorMsg.includes('canceled')) {
        // Kullanıcı iptal etti, sessizce geç
        return;
      }
      throw new Error('PDF açılamadı: ' + errorMsg);
    }
  }
}
