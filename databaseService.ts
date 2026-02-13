import { ref, set, get, update, remove, onValue, off } from 'firebase/database';
import { database } from './firebaseConfig';
import { BuildingInfo, Unit, Transaction, BoardMember, FileEntry, Session } from './types';

class DatabaseService {
  private currentSessionId: string = 'galata_v16'; // Varsayılan oturum

  // Aktif oturumu ayarla
  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    console.log('📌 Aktif oturum değiştirildi:', sessionId);
  }

  // Aktif oturumu al
  getCurrentSession(): string {
    return this.currentSessionId;
  }

  // Tüm oturumları al
  async getAllSessions(): Promise<Session[]> {
    try {
      const sessionsRef = ref(database, '_sessions');
      const snapshot = await get(sessionsRef);
      if (!snapshot.exists()) return [];
      
      const sessionsObj = snapshot.val();
      return Object.values(sessionsObj).filter(s => s !== null);
    } catch (error) {
      console.error('Oturumlar alınamadı:', error);
      return [];
    }
  }

  // Yeni oturum oluştur
  async createSession(name: string): Promise<string> {
    try {
      // Mevcut oturumları al
      const sessions = await this.getAllSessions();
      
      // Yeni ID oluştur (00001, 00002, vb.)
      let newId = 1;
      if (sessions.length > 0) {
        const maxId = Math.max(...sessions.map(s => parseInt(s.id)));
        newId = maxId + 1;
      }
      
      const sessionId = newId.toString().padStart(5, '0');
      const now = new Date().toISOString();
      
      const newSession: Session = {
        id: sessionId,
        name: name,
        createdAt: now,
        lastAccessed: now
      };
      
      // Oturumu kaydet
      await set(ref(database, `_sessions/${sessionId}`), newSession);
      
      console.log('✓ Yeni oturum oluşturuldu:', sessionId, name);
      return sessionId;
    } catch (error) {
      console.error('Oturum oluşturulamadı:', error);
      throw error;
    }
  }

  // Oturum son erişim zamanını güncelle
  async updateSessionAccess(sessionId: string): Promise<void> {
    try {
      await update(ref(database, `_sessions/${sessionId}`), {
        lastAccessed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Oturum erişim zamanı güncellenemedi:', error);
    }
  }

  // Veri kaydetme
  async saveData(key: string, data: any): Promise<void> {
    try {
      const dataRef = ref(database, `${this.currentSessionId}/${key}`);
      await set(dataRef, data);
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }

  // Veri okuma
  async getData(key: string): Promise<any> {
    try {
      const dataRef = ref(database, `${this.currentSessionId}/${key}`);
      const snapshot = await get(dataRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  // Veri güncelleme
  async updateData(key: string, updates: any): Promise<void> {
    try {
      const dataRef = ref(database, `${this.currentSessionId}/${key}`);
      await update(dataRef, updates);
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // Veri silme
  async deleteData(key: string): Promise<void> {
    try {
      const dataRef = ref(database, `${this.currentSessionId}/${key}`);
      await remove(dataRef);
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }

  // Gerçek zamanlı dinleme
  subscribeToData(key: string, callback: (data: any) => void): () => void {
    const dataRef = ref(database, `${this.currentSessionId}/${key}`);
    
    onValue(dataRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      callback(data);
    });

    // Dinlemeyi durdurmak için fonksiyon döndür
    return () => off(dataRef);
  }

  // Bina bilgilerini kaydet
  async saveBuildingInfo(info: BuildingInfo): Promise<void> {
    await this.saveData('building_info', info);
  }

  // Bina bilgilerini al
  async getBuildingInfo(): Promise<BuildingInfo | null> {
    return await this.getData('building_info');
  }

  // Bağımsız bölümleri kaydet
  async saveUnits(units: Unit[]): Promise<void> {
    await this.saveData('units', units);
  }

  // Bağımsız bölümleri al
  async getUnits(): Promise<Unit[]> {
    const data = await this.getData('units');
    if (!data) return [];
    
    // Firebase array'leri object olarak saklar, array'e çevir
    if (Array.isArray(data)) {
      return data.filter(item => item !== null && item !== undefined);
    }
    
    // Object ise array'e çevir
    return Object.values(data).filter(item => item !== null && item !== undefined);
  }

  // İşlemleri kaydet
  async saveTransactions(transactions: Transaction[]): Promise<void> {
    console.log('💾 saveTransactions çağrıldı:', transactions.length, 'adet');
    
    // Array'i object'e çevir (ID'ye göre) ve undefined değerleri temizle
    const transactionsObj: Record<string, any> = {};
    transactions.forEach(tx => {
      if (tx && tx.id) {
        // Undefined değerleri temizle
        const cleanTx: any = {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: tx.date
        };
        
        // Sadece tanımlı değerleri ekle
        if (tx.unitId !== undefined) cleanTx.unitId = tx.unitId;
        if (tx.periodMonth !== undefined) cleanTx.periodMonth = tx.periodMonth;
        if (tx.periodYear !== undefined) cleanTx.periodYear = tx.periodYear;
        
        transactionsObj[tx.id] = cleanTx;
        console.log('💾 Transaction eklendi:', { id: cleanTx.id, type: cleanTx.type, amount: cleanTx.amount, desc: cleanTx.description?.substring(0, 30) });
      }
    });
    
    console.log('💾 Firebase\'e kaydedilecek transaction sayısı:', Object.keys(transactionsObj).length);
    console.log('💾 Transaction tipleri:', Object.values(transactionsObj).map((t: any) => t.type));
    
    await this.saveData('transactions', transactionsObj);
    console.log('✓ Transactions Firebase\'e kaydedildi');
  }

  // Tek bir transaction'ı sil
  async deleteTransaction(id: string): Promise<void> {
    if (!id) return;
    try {
      await this.deleteData('transactions/' + id);
      console.log('✓ Transaction silindi:', id);
    } catch (error) {
      console.error('✗ Transaction silme hatası:', error, id);
      throw error;
    }
  }

  // İşlemleri al
  async getTransactions(): Promise<Transaction[]> {
    console.log('📥 getTransactions çağrıldı');
    const data = await this.getData('transactions');
    
    if (!data) {
      console.log('📥 Firebase\'de transaction yok');
      return [];
    }
    
    console.log('📥 Firebase\'den alınan data tipi:', typeof data, 'keys:', Object.keys(data).length);
    
    // Object'i array'e çevir
    const transactions = Object.values(data).filter(item => item !== null && item !== undefined);
    
    console.log('📥 Yüklenen transaction sayısı:', transactions.length);
    console.log('📥 Transaction tipleri:', transactions.map((t: any) => t.type));
    console.log('📥 GİDER sayısı:', transactions.filter((t: any) => t.type === 'GİDER').length);
    console.log('📥 GELİR sayısı:', transactions.filter((t: any) => t.type === 'GELİR').length);
    
    // Tarihe göre sırala (en yeni en üstte)
    return transactions.sort((a: any, b: any) => {
      const dateA = a.date ? a.date.split('.').reverse().join('') : '0';
      const dateB = b.date ? b.date.split('.').reverse().join('') : '0';
      return dateB.localeCompare(dateA);
    });
  }

  // Yönetim kurulu üyelerini kaydet
  async saveBoardMembers(members: BoardMember[]): Promise<void> {
    await this.saveData('board_members', members);
  }

  // Yönetim kurulu üyelerini al
  async getBoardMembers(): Promise<BoardMember[]> {
    const data = await this.getData('board_members');
    return data || [];
  }

  // Dosyaları kaydet
  async saveFiles(files: FileEntry[]): Promise<void> {
    await this.saveData('files', files);
  }

  // Dosyaları al
  async getFiles(): Promise<FileEntry[]> {
    const data = await this.getData('files');
    return data || [];
  }

  // Test fonksiyonu - Firebase bağlantısını test et
  async testConnection(): Promise<boolean> {
    try {
      console.log('Firebase bağlantısı test ediliyor...');
      await this.saveData('test', { message: 'Test başarılı', timestamp: Date.now() });
      const result = await this.getData('test');
      console.log('Test sonucu:', result);
      return result !== null;
    } catch (error) {
      console.error('Firebase test hatası:', error);
      return false;
    }
  }

  // GİDER test fonksiyonu - Direkt Firebase'e GİDER yaz
  async testGiderWrite(): Promise<boolean> {
    try {
      console.log('🧪 GİDER test yazma başlıyor...');
      
      const testGider = {
        id: 'test_gider_' + Date.now(),
        type: 'GİDER',
        amount: 9999,
        description: 'TEST GİDER [genel]',
        date: new Date().toLocaleDateString('tr-TR')
      };
      
      console.log('🧪 Test GİDER:', testGider);
      
      // Direkt transactions altına yaz
      await this.saveData('transactions/' + testGider.id, testGider);
      console.log('✓ Test GİDER Firebase\'e yazıldı');
      
      // Oku
      const result = await this.getData('transactions/' + testGider.id);
      console.log('✓ Test GİDER okundu:', result);
      
      return result !== null && result.type === 'GİDER';
    } catch (error) {
      console.error('✗ Test GİDER hatası:', error);
      return false;
    }
  }

  // Tüm verileri sil
  async clearAllData(): Promise<void> {
    await this.deleteData('');
  }
}

export const db = new DatabaseService();
