
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import Header from './components/Header.tsx';
import SummaryCard from './components/SummaryCard.tsx';
import ActionGrid from './components/ActionGrid.tsx';
import BottomNav from './components/BottomNav.tsx';
import SecondaryWidgets from './components/SecondaryWidgets.tsx';
import LastTransaction from './components/LastTransaction.tsx';
import SettingsView from './components/SettingsView.tsx';
import TahsilatView from './components/TahsilatView.tsx';
import GiderView from './components/GiderView.tsx';
import BorclandirView from './components/BorclandirView.tsx';
import IadeView from './components/IadeView.tsx';
import GelirView from './components/GelirView.tsx';
import TransferView from './components/TransferView.tsx';
import UnitsView from './components/UnitsView.tsx';
import TransactionsView from './components/TransactionsView.tsx';
import ReceivablesView from './components/ReceivablesView.tsx';
import AidatCizelgeView from './components/AidatCizelgeView.tsx';
import MonthlyReportView from './components/MonthlyReportView.tsx';
import YearlyReportView from './components/YearlyReportView.tsx';
import BoardView from './components/BoardView.tsx';
import SessionsView from './components/SessionsView.tsx';
import LoginView from './components/LoginView.tsx';
import RegisterView from './components/RegisterView.tsx';
import FilesView from './components/FilesView.tsx';
import MenuView from './components/MenuView.tsx';
import { BuildingInfo, ActiveTab, Transaction, Unit, BoardMember, FileEntry, BalanceSummary } from './types.ts';
import { db } from './databaseService';

const STORAGE_KEYS = {
  AUTH: 'galata_v16_auth'
};

const DEFAULT_BUILDING_INFO: BuildingInfo = {
  name: "GALATA APARTMANI",
  address: "Cevherdudaev Mahallesi Yasemin Sokak No 6 Nevşehir",
  role: "Yönetici",
  managerName: "Selahattin Ölgün",
  taxNo: "3881743149",
  duesAmount: 750,
  isManagerExempt: false,
  managerUnitId: '',
  isAutoDuesEnabled: true
};

const INITIAL_UNITS: Unit[] = Array.from({ length: 24 }, (_, i) => ({
  id: `u${i + 1}`,
  no: (i + 1).toString(),
  ownerName: '',
  phone: '',
  credit: 0,
  debt: 0,
  status: 'Malik',
  type: '3+1',
  m2: 100,
  huzurHakki: 'YOK'
}));

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true' ||
        sessionStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    } catch { return false; }
  });

  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  // Ref'ler ile güncel state'leri takip et
  const activeTabRef = useRef<ActiveTab>('home');
  const activeSubViewRef = useRef<string | null>(null);

  // State değiştiğinde ref'leri güncelle
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeSubViewRef.current = activeSubView;
  }, [activeSubView]);

  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>(DEFAULT_BUILDING_INFO);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);

  // Firebase'den verileri yükle
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadDataFromFirebase = async () => {
      try {
        setIsLoading(true);
        console.log('Firebase\'den veri yükleniyor...');

        // Önce Firebase bağlantısını test et
        const isConnected = await db.testConnection();
        if (!isConnected) {
          alert('Firebase bağlantısı kurulamadı! İnternet bağlantınızı kontrol edin.');
          setIsLoading(false);
          return;
        }
        console.log('✓ Firebase bağlantısı başarılı!');

        // Tüm verileri Firebase'den çek
        const [info, unitsData, transactionsData, boardData, filesData] = await Promise.all([
          db.getBuildingInfo(),
          db.getUnits(),
          db.getTransactions(),
          db.getBoardMembers(),
          db.getFiles()
        ]);

        console.log('Firebase veriler:', {
          info: !!info,
          units: unitsData?.length || 0,
          transactions: transactionsData?.length || 0,
          board: boardData?.length || 0,
          files: filesData?.length || 0
        });

        // Veri varsa güncelle, yoksa default değerleri kullan
        if (info) {
          console.log('✓ Building info yüklendi');
          setBuildingInfo(info);
        } else {
          console.log('Building info yok, default kullanılıyor');
        }

        if (unitsData && unitsData.length > 0) {
          console.log('✓ Units yüklendi:', unitsData.length, 'adet');
          setUnits(unitsData);
        } else {
          console.log('Units yok, default kullanılıyor');
          // İlk yüklemede default units'i kaydet
          await db.saveUnits(INITIAL_UNITS);
        }

        if (transactionsData && transactionsData.length > 0) {
          console.log('✓ Transactions yüklendi:', transactionsData.length);
          setTransactions(transactionsData);
        }

        if (boardData && boardData.length > 0) {
          console.log('✓ Board members yüklendi:', boardData.length);
          setBoardMembers(boardData);
        }

        if (filesData && filesData.length > 0) {
          console.log('✓ Files yüklendi:', filesData.length);
          setFiles(filesData);
        }
      } catch (error) {
        console.error('✗ Firebase veri yükleme hatası:', error);
        alert('Firebase hatası: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataFromFirebase();
  }, [isAuthenticated]);

  // Verileri Firebase'e kaydet (debounce ile)
  useEffect(() => {
    if (isAuthenticated && !isLoading && buildingInfo) {
      const timer = setTimeout(() => {
        console.log('Building info Firebase\'e kaydediliyor...');
        db.saveBuildingInfo(buildingInfo)
          .then(() => console.log('✓ Building info kaydedildi'))
          .catch(err => {
            console.error('✗ Building info kaydetme hatası:', err);
          });
      }, 500); // 0.5 saniye bekle
      return () => clearTimeout(timer);
    }
  }, [buildingInfo, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && Array.isArray(units)) {
      const timer = setTimeout(() => {
        console.log('Units Firebase\'e kaydediliyor:', units.length, 'adet');
        db.saveUnits(units)
          .then(() => {
            console.log('✓ Units kaydedildi:', units.length, 'adet');
          })
          .catch(err => {
            console.error('✗ Units kaydetme hatası:', err);
          });
      }, 500); // 0.5 saniye bekle
      return () => clearTimeout(timer);
    }
  }, [units, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && Array.isArray(transactions)) {
      console.log('⏰ Transactions değişti, Firebase\'e kaydedilecek:', transactions.length, 'adet');
      console.log('⏰ Son 5 transaction:', transactions.slice(0, 5).map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        desc: t.description?.substring(0, 30)
      })));

      const timer = setTimeout(() => {
        console.log('Transactions Firebase\'e kaydediliyor:', transactions.length);
        db.saveTransactions(transactions)
          .then(() => console.log('✓ Transactions kaydedildi'))
          .catch(err => console.error('✗ Transactions kaydetme hatası:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [transactions, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && Array.isArray(boardMembers)) {
      const timer = setTimeout(() => {
        console.log('Board members Firebase\'e kaydediliyor:', boardMembers.length);
        db.saveBoardMembers(boardMembers)
          .then(() => console.log('✓ Board members kaydedildi'))
          .catch(err => console.error('✗ Board members kaydetme hatası:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [boardMembers, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && Array.isArray(files)) {
      const timer = setTimeout(() => {
        console.log('Files Firebase\'e kaydediliyor:', files.length);
        db.saveFiles(files)
          .then(() => console.log('✓ Files kaydedildi'))
          .catch(err => console.error('✗ Files kaydetme hatası:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [files, isAuthenticated, isLoading]);

  // Android geri tuşu yönetimi
  useEffect(() => {
    console.log('🔧 Geri tuşu listener kurulumu başlatılıyor...');

    const handleBackButton = (event: any) => {
      const currentTab = activeTabRef.current;
      const currentSubView = activeSubViewRef.current;

      console.log('🔙 Geri tuşuna basıldı - activeTab:', currentTab, 'activeSubView:', currentSubView);

      // Eğer subview açıksa, subview'i kapat
      if (currentSubView) {
        console.log('✓ SubView kapatılıyor:', currentSubView);
        setActiveSubView(null);
        event?.preventDefault?.();
        return;
      }

      // Eğer ana sayfa değilse, ana sayfaya dön
      if (currentTab !== 'home') {
        console.log('✓ Ana sayfaya dönülüyor, mevcut tab:', currentTab);
        setActiveTab('home');
        event?.preventDefault?.();
        return;
      }

      // Ana sayfadaysa uygulamadan çık
      console.log('✓ Ana sayfada, uygulamadan çıkılıyor');
      CapacitorApp.exitApp();
    };

    // Capacitor App plugin listener
    let listenerHandle: any = null;

    CapacitorApp.addListener('backButton', handleBackButton).then(handle => {
      listenerHandle = handle;
      console.log('✅ Geri tuşu listener başarıyla kuruldu');
    }).catch(err => {
      console.error('❌ Geri tuşu listener kurulumu hatası:', err);
    });

    return () => {
      if (listenerHandle) {
        console.log('🧹 Geri tuşu listener temizleniyor');
        listenerHandle.remove();
      }
    };
  }, []); // Boş dependency array - sadece bir kez çalışır

  /* Otomatik aidat kontrolü ve eksik işlem oluşturma (Krediden Tahsilat) - İPTAL EDİLDİ

    const generateAutoTransactions = () => {
      const newTransactions: Transaction[] = [];
      const now = new Date();
      const currentMonthIdx = now.getMonth();
      const currentYear = now.getFullYear();
      const duesAmount = buildingInfo.duesAmount || 750;

      units.forEach(unit => {
        // Skip exempt units
        if (buildingInfo.isManagerExempt && unit.id === buildingInfo.managerUnitId) return;

        // Calculate initial credit (Income - Existing Manual Debts)
        const unitTransactions = transactions.filter(t => t.unitId === unit.id);
        const totalIncome = unitTransactions.filter(t => t.type === 'GELİR').reduce((sum, t) => sum + (t.amount || 0), 0);
        // "BORÇLANDIRMA" transaction'ları, hem manuel eklenenleri hem de bizim otomatik eklediklerimizi kapsar
        const manualDebts = unitTransactions.filter(t => t.type === 'BORÇLANDIRMA');
        const totalManualDebt = manualDebts.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Başlangıç kredisi (Henüz işlenmemiş aylar için düşülmemiş hali)
        // Dikkat: Burada totalManualDebt zaten o ana kadar eklenmiş "Krediden Tahsilat"ları da içeriyor olacak (bir sonraki render'da)
        let runningCredit = totalIncome - totalManualDebt;

        // Iterate months to simulate and capture missing 'credit payments'
        for (let m = 0; m <= currentMonthIdx; m++) {
          // Bu ay için zaten bir borçlandırma (manuel veya otomatik) var mı?
          const hasManual = manualDebts.some(t => t.periodMonth === m && t.periodYear === currentYear);

          if (!hasManual) {
            // Eğer yoksa ve kredi yetiyorsa -> Otomatik işlem oluştur
            if (runningCredit >= duesAmount) {

              const monthName = new Date(currentYear, m, 1).toLocaleString('tr-TR', { month: 'long' });
              const uMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

              // Create a real transaction
              const newTx: Transaction = {
                id: "auto_" + Math.random().toString(36).slice(2) + "_" + Date.now(),
                type: 'BORÇLANDIRMA',
                amount: duesAmount,
                unitId: unit.id,
                description: `${uMonthName} ${currentYear} Aidat Tahsilatı (Krediden Ödendi)`,
                date: new Date(currentYear, m, 1).toLocaleDateString('tr-TR'), // 1st of month
                periodMonth: m,
                periodYear: currentYear
              };

              newTransactions.push(newTx);

              // Krediyi düş, böylece sonraki aylar için doğru hesaplansın
              runningCredit -= duesAmount;
            } else {
              // Kredi yetmiyor, borç birikiyor (Sistemin mevcut işleyişi bunu 'debt' olarak gösteriyor zaten)
              // Burada bir işlem yapmamıza gerek yok, sadece döngü için logic.
            }
          }
        }
      });
      return newTransactions;
    };

    // Debounce veya check
    const timer = setTimeout(() => {
      const newTx = generateAutoTransactions();
      if (newTx.length > 0) {
        console.log('🔄 Otomatik Krediden Tahsilat İşlemleri Oluşturuluyor:', newTx.length, 'adet');

        const updatedTransactions = [...newTx, ...transactions];
        setTransactions(updatedTransactions);

        // Firebase'e kaydet
        db.saveTransactions(updatedTransactions)
          .then(() => console.log('✓ Otomatik işlemler veritabanına kaydedildi'))
          .catch(err => console.error('✗ Otomatik işlem kaydetme hatası:', err));
      }
    }, 1000); // 1 saniye bekle ki diğer yüklemeler tam bitsin

    return () => clearTimeout(timer);

  */

  const unitsWithBalances = useMemo(() => {
    if (!Array.isArray(units)) return INITIAL_UNITS;
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    return units.map(unit => {
      if (!unit || !unit.id) return { ...INITIAL_UNITS[0], id: Math.random().toString() };
      const isExempt = buildingInfo?.isManagerExempt && unit.id === buildingInfo?.managerUnitId;
      if (isExempt) return { ...unit, credit: 0, debt: 0 };
      const totalIncome = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && tx.unitId === unit.id && tx.type === 'GELİR').reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const totalManualDebt = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA').reduce((sum, tx) => sum + (tx.amount || 0), 0);
      let runningCredit = totalIncome - totalManualDebt;
      let totalDebtAccrued = 0;
      const duesValue = buildingInfo?.duesAmount || 750;
      if (buildingInfo?.isAutoDuesEnabled && duesValue > 0) {
        for (let m = 0; m <= currentMonthIdx; m++) {
          const hasManualForThisMonth = (Array.isArray(transactions) ? transactions : []).some(tx => tx && tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA' && tx.periodMonth === m && tx.periodYear === currentYear);
          if (!hasManualForThisMonth) { if (runningCredit >= duesValue) runningCredit -= duesValue; else totalDebtAccrued += duesValue; }
        }
      }
      return { ...unit, credit: runningCredit > 0 ? runningCredit : 0, debt: totalDebtAccrued > 0 ? totalDebtAccrued : 0 };
    });
  }, [units, transactions, buildingInfo]);


  const balance: BalanceSummary = useMemo(() => {
    const txArr = Array.isArray(transactions) ? transactions : [];
    const totalIncome = txArr.filter(tx => tx?.type === 'GELİR').reduce((sum, tx) => sum + (tx?.amount || 0), 0);
    const totalExpense = txArr.filter(tx => tx?.type === 'GİDER').reduce((sum, tx) => sum + (tx?.amount || 0), 0);
    const mevcut = totalIncome - totalExpense;
    const alacak = Array.isArray(unitsWithBalances) ? unitsWithBalances.reduce((sum, u) => sum + (u?.debt || 0), 0) : 0;
    return { mevcutBakiye: mevcut, alacakBakiyesi: alacak, toplam: mevcut + alacak, demirbasKasasi: 0 };
  }, [unitsWithBalances, transactions]);

  const handleLogin = (remember: boolean) => {
    if (remember) localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    else sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    setIsAuthenticated(false);
  };

  const handleAddUnit = (u: Omit<Unit, 'id' | 'credit' | 'debt'>) => {
    const newUnit = { ...u, id: Math.random().toString(36).slice(2), credit: 0, debt: 0 };
    const updatedUnits = [...(Array.isArray(units) ? units : []), newUnit];
    setUnits(updatedUnits);

    // Hemen Firebase'e kaydet
    if (isAuthenticated && !isLoading) {
      db.saveUnits(updatedUnits)
        .then(() => console.log('✓ Unit hemen kaydedildi'))
        .catch(err => console.error('✗ Unit kaydetme hatası:', err));
    }
  };

  const handleEditUnit = (u: Unit) => {
    const updatedUnits = units.map(x => x.id === u.id ? u : x);
    setUnits(updatedUnits);

    // Hemen Firebase'e kaydet
    if (isAuthenticated && !isLoading) {
      db.saveUnits(updatedUnits)
        .then(() => console.log('✓ Unit güncelleme hemen kaydedildi'))
        .catch(err => console.error('✗ Unit güncelleme hatası:', err));
    }
  };

  const handleAddTransaction = async (amount: number, description: string, type: any, vault: any = 'genel', date?: string, unitId?: string, periodMonth?: number, periodYear?: number) => {
    console.log('🔵 handleAddTransaction çağrıldı:', { amount, description, type, vault, date, unitId });

    const formattedDate = date ? (date.includes('-') ? date.split('-').reverse().join('.') : date) : new Date().toLocaleDateString('tr-TR');
    const newTx: Transaction = { id: Math.random().toString(36).slice(2), type, amount, description: `${description} [${vault}]`, unitId, date: formattedDate, periodMonth, periodYear };

    console.log('🔵 Yeni transaction oluşturuldu:', newTx);

    const updatedTransactions = [newTx, ...(Array.isArray(transactions) ? transactions : [])];

    console.log('🔵 Güncellenmiş transactions listesi:', updatedTransactions.length, 'adet');
    console.log('🔵 İlk 3 transaction:', updatedTransactions.slice(0, 3).map(t => ({ type: t.type, amount: t.amount, desc: t.description })));

    // Önce state'i güncelle
    setTransactions(updatedTransactions);

    // Hemen Firebase'e kaydet (await ile bekle)
    if (isAuthenticated && !isLoading) {
      console.log('🔵 Firebase\'e kaydediliyor...');
      try {
        await db.saveTransactions(updatedTransactions);
        console.log('✓ Transaction Firebase\'e kaydedildi');
        console.log('✓ Kaydedilen transaction sayısı:', updatedTransactions.length);

        // Firebase kaydı başarılı olduktan sonra view'ı değiştir
        console.log('🔵 View değiştiriliyor: history');
        setActiveSubView('history');
      } catch (err) {
        console.error('✗ Transaction kaydetme hatası:', err);
        alert('Kaydetme hatası: ' + (err as Error).message);
      }
    } else {
      console.log('⚠️ Firebase kaydı atlandı - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
      setActiveSubView('history');
    }
  };

  const handleAddFile = (name: string, category: FileEntry['category'], uri?: string, size?: number, fileName?: string) => {
    const fileSizeStr = size ? (size / 1024).toFixed(1) + ' KB' : '0 KB';
    const newFile: FileEntry = {
      id: Math.random().toString(36).slice(2),
      name: name,
      category: category,
      date: new Date().toLocaleDateString('tr-TR'),
      size: fileSizeStr,
      extension: 'pdf',
      uri: uri,
      fileName: fileName
    };
    setFiles(p => [newFile, ...(Array.isArray(p) ? p : [])]);
    console.log('Dosya eklendi:', newFile);
  };

  const handleShareFile = async (file: FileEntry) => {
    try {
      const { Share } = await import('@capacitor/share');

      if (file.uri) {
        console.log('Dosya paylaşılıyor/açılıyor:', file.uri);
        await Share.share({
          title: file.name,
          text: file.name,
          url: file.uri,
          dialogTitle: 'Aç veya Paylaş'
        });
      } else {
        alert('Dosya yolu bulunamadı. Lütfen PDF\'i yeniden oluşturun.');
      }
    } catch (error) {
      console.error('Paylaşma hatası:', error);
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (!errorMsg.toLowerCase().includes('canceled') && !errorMsg.toLowerCase().includes('cancel')) {
        alert('Dosya paylaşılamadı: ' + errorMsg);
      }
    }
  };

  const handleOpenFile = async (file: FileEntry) => {
    try {
      if (!file.uri) {
        alert('Dosya yolu bulunamadı. Lütfen PDF\'i yeniden oluşturun.');
        return;
      }

      console.log('PDF açılıyor:', file.uri);
      console.log('Dosya adı:', file.fileName);

      // Dosyayı oku ve base64 olarak al
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      if (file.fileName) {
        try {
          const fileData = await Filesystem.readFile({
            path: file.fileName,
            directory: Directory.Documents
          });

          console.log('Dosya okundu, base64 uzunluğu:', fileData.data.toString().length);

          // Base64 data'yı blob'a çevir
          const base64Data = fileData.data as string;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          // Blob'dan URL oluştur
          const blobUrl = URL.createObjectURL(blob);

          // Browser ile aç
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({
            url: blobUrl,
            presentationStyle: 'fullscreen'
          });

          // Cleanup
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (readError) {
          console.error('Dosya okuma hatası:', readError);
          // Fallback: Share API kullan
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: file.name,
            text: 'PDF Görüntüle',
            url: file.uri,
            dialogTitle: 'PDF ile aç'
          });
        }
      } else {
        // fileName yoksa direkt Share kullan
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: file.name,
          text: 'PDF Görüntüle',
          url: file.uri,
          dialogTitle: 'PDF ile aç'
        });
      }
    } catch (error) {
      console.error('PDF açma hatası:', error);
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (!errorMsg.toLowerCase().includes('canceled') && !errorMsg.toLowerCase().includes('cancel')) {
        alert('PDF açılamadı: ' + errorMsg);
      }
    }
  };

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterView onBackToLogin={() => setShowRegister(false)} />;
    }
    return <LoginView onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />;
  }

  return (
    <div className="app-gradient text-white pb-24 max-w-md mx-auto shadow-2xl relative min-h-screen">
      {!activeSubView && activeTab === 'home' && <Header info={buildingInfo} onLogout={handleLogout} />}

      <main className="px-4">
        {activeSubView ? (
          activeSubView === 'tahsilat' ? <TahsilatView units={unitsWithBalances} info={buildingInfo} transactions={transactions} onClose={() => setActiveSubView(null)} onSave={(a, desc, v, dt, uId, m, y) => handleAddTransaction(a, desc, 'GELİR', v, dt, uId, m, y)} /> :
            activeSubView === 'gider' ? <GiderView onClose={() => setActiveSubView(null)} onSave={async (a, d, v, dt) => await handleAddTransaction(a, d, 'GİDER', v, dt)} /> :
              activeSubView === 'borclandir' ? <BorclandirView units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId, m, y) => handleAddTransaction(a, d, 'BORÇLANDIRMA', v, dt, uId, m, y)} /> :
                activeSubView === 'gelir' ? <GelirView onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GELİR', v, dt)} /> :
                  activeSubView === 'iade' ? <IadeView units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId) => handleAddTransaction(a, d, 'GİDER', v, dt, uId)} /> :
                    activeSubView === 'transfer' ? <TransferView onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'TRANSFER', v, dt)} /> :
                      activeSubView === 'units' ? <UnitsView units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddUnit={handleAddUnit} onEditUnit={handleEditUnit} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                        activeSubView === 'history' ? <TransactionsView transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} onDeleteTransaction={async (id) => {
                          setTransactions(p => p.filter(x => x.id !== id));
                          if (isAuthenticated && !isLoading) {
                            try { await db.deleteTransaction(id); } catch (err) { console.error('✗ Silme esnasında hata:', err); }
                          }
                        }} onUpdateTransaction={tx => setTransactions(p => p.map(x => x.id === tx.id ? tx : x))} /> :
                          activeSubView === 'receivables' ? <ReceivablesView units={unitsWithBalances} onClose={() => setActiveSubView(null)} /> :
                            activeSubView === 'aidat-cizelge' ? <AidatCizelgeView units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddDues={() => { }} /> :
                              activeSubView === 'monthly-report' ? <MonthlyReportView transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                                activeSubView === 'yearly-report' ? <YearlyReportView transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                                  activeSubView === 'board' ? <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...(Array.isArray(p) ? p : []), { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} /> : null
        ) : (
          activeTab === 'menu' ? <MenuView onActionClick={(sv, tab) => { if (tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} /> :
            activeTab === 'settings' ? <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} /> :
              activeTab === 'sessions' ? <SessionsView info={buildingInfo} units={unitsWithBalances} onClose={() => setActiveTab('home')} onUpdateInfo={setBuildingInfo} /> :
                activeTab === 'home' ? <div className="space-y-3 pt-1"><SummaryCard balance={balance} /><ActionGrid variant="grid" onActionClick={a => { const m: any = { 'Tahsilat': 'tahsilat', 'Gider': 'gider', 'Borçlandır': 'borclandir', 'Gelir': 'gelir', 'İade': 'iade', 'Transfer': 'transfer', 'Bağımsız Bölümler': 'units', 'İşlem Hareketleri': 'history', 'Alacak Listesi': 'receivables' }; if (m[a]) setActiveSubView(m[a]); }} /><SecondaryWidgets onActionClick={a => { const m: any = { 'AİDAT ÇİZELGE': 'aidat-cizelge', 'AYLIK BİLANÇO': 'monthly-report', 'YILLIK BİLANÇO': 'yearly-report' }; if (m[a]) setActiveSubView(m[a]); }} /><LastTransaction transaction={(Array.isArray(transactions) && transactions.length > 0) ? transactions[0] : null} /></div> :

                  activeTab === 'files' ? <FilesView files={files} onAddFile={f => setFiles(p => [...(Array.isArray(p) ? p : []), { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={handleOpenFile} onShareFile={handleShareFile} /> : null
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
    </div>
  );
};

export default App;

