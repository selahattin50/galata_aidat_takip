// Firebase'deki tüm verileri kontrol et
import { ref, get } from 'firebase/database';
import { database } from './firebaseConfig.js';

async function checkAllData() {
  try {
    console.log('Firebase verileri kontrol ediliyor...\n');
    
    // Root seviyesindeki tüm verileri al
    const rootRef = ref(database, '/');
    const snapshot = await get(rootRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('Root seviyesindeki anahtarlar:');
      Object.keys(data).forEach(key => {
        console.log(`  - ${key}`);
        if (typeof data[key] === 'object') {
          const subKeys = Object.keys(data[key]);
          console.log(`    Alt anahtarlar (${subKeys.length} adet):`, subKeys.slice(0, 5).join(', '));
        }
      });
    } else {
      console.log('Firebase boş!');
    }
  } catch (error) {
    console.error('Hata:', error);
  }
}

checkAllData();
