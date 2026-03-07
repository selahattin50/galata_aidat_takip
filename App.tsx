
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
import MessagesView from './components/MessagesView.tsx';
import { BuildingInfo, ActiveTab, Transaction, Unit, BoardMember, FileEntry, BalanceSummary, AppMessage } from './types.ts';
import { db } from './databaseService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const STORAGE_KEYS = {
  AUTH: 'galata_v16_auth'
};

const DEFAULT_BUILDING_INFO: BuildingInfo = {
  name: "YENİ APARTMAN YÖNETİMİ",
  address: "Adres bilgisi giriniz",
  role: "Yönetici",
  managerName: "Yönetici Adı",
  taxNo: "",
  duesAmount: 0,
  isManagerExempt: false,
  managerUnitId: '',
  isAutoDuesEnabled: true
};

const INITIAL_UNITS: Unit[] = [];

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
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [userSites, setUserSites] = useState<{ id: string, name: string }[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string>(() => localStorage.getItem('galata_active_site_id') || 'main');

  const [lastSeenMsgTime, setLastSeenMsgTime] = useState(() => {
    return parseInt(localStorage.getItem('galata_last_msg_time') || '0', 10);
  });

  // Firebase'den verileri yükle
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadDataFromFirebase = async () => {
      try {
        setIsLoading(true);
        console.log('Firebase\'den veri yükleniyor (Site:', activeSiteId, ')...');

        // Site değişirken eski verileri temizle
        setBuildingInfo(DEFAULT_BUILDING_INFO);
        setUnits(INITIAL_UNITS);
        setTransactions([]);
        setBoardMembers([]);
        setFiles([]);
        setMessages([]);

        let currentUser = auth.currentUser;

        if (!currentUser) {
          console.log('Firebase oturumu bekleniyor (onAuthStateChanged)...');
          currentUser = await new Promise<any>((resolve) => {
            let timeout = setTimeout(() => {
              console.log('⚠️ Firebase yetkilendirmesi zaman aşımına uğradı');
              resolve(null);
            }, 6000);

            const unsubscribe = onAuthStateChanged(auth, (user) => {
              if (user) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(user);
              }
            });
          });
        }

        if (!currentUser) {
          console.error('❌ Oturum alınamadı, çıkış yapılıyor.');
          handleLogout();
          return;
        }

        console.log('✓ Firebase oturumu doğrulandı:', currentUser.email);

        // Kullanıcının yetkili olduğu binaları getir
        const sites = await db.getUserSites(currentUser.uid);
        setUserSites(sites);

        // Eğer yüklü binalar arasında activeSiteId yoksa, varsa ilk olanı seç
        let currentSiteId = activeSiteId;
        if (sites.length > 0 && !sites.find(s => s.id === currentSiteId)) {
          currentSiteId = sites[0].id;
          setActiveSiteId(currentSiteId);
          localStorage.setItem('galata_active_site_id', currentSiteId);
        }

        const sessionPath = currentSiteId === 'main' ? `users/${currentUser.uid}` : `users/${currentUser.uid}/sites/${currentSiteId}`;
        db.setCurrentSession(sessionPath);
        console.log('📌 Oturum yolu belirlendi:', sessionPath);

        // Önce Firebase bağlantısını test et
        const isConnected = await db.testConnection();

        // Tüm verileri Firebase'den çek
        const [info, unitsData, transactionsData, boardData, filesData, messagesData] = await Promise.all([
          db.getBuildingInfo(),
          db.getUnits(),
          db.getTransactions(),
          db.getBoardMembers(),
          db.getFiles(),
          db.getMessages()
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

          // GÜVENLİK FİLTRESİ: Geçmişteki sızıntıdan dolayı corrupted (bozulmuş) olan hesapları temizle
          const isSelahattin = currentUser.email === 'selahattin50@gmail.com';
          const isManagerSelahattin = info.managerName && info.managerName.toLocaleUpperCase('tr-TR').includes('SELAHATTİN');
          const isBuildingGalata = info.name && info.name.toLocaleUpperCase('tr-TR').includes('GALATA');

          if (!isSelahattin && (isManagerSelahattin || (isBuildingGalata && unitsData && unitsData.length > 20))) {
            console.warn('⚠️ OTOMATİK TEMİZLEME: Başka hesaba ait veri sızıntısı tespit edildi ve temizlendi.');
            setBuildingInfo(DEFAULT_BUILDING_INFO);
            setUnits(INITIAL_UNITS);
            setTransactions([]);
            setBoardMembers([]);
            setFiles([]);
            setMessages([]);
            // Veritabanını da bu hesap için sıfırla
            await db.clearAllData();
          } else {
            setBuildingInfo(info);
            // Eğer available_sites listesinde yoksa (eski kullanıcı), listeye ekle
            if (sites.length === 0 || !sites.find(s => s.id === (activeSiteId || 'main'))) {
              const siteName = info.name || "Varsayılan Bölüm";
              await db.addSiteToUser(currentUser.uid, activeSiteId || 'main', siteName);
              setUserSites([{ id: activeSiteId || 'main', name: siteName }]);
            }
          }
        } else {
          console.log('Building info yok, default kullanılıyor');
          setBuildingInfo(DEFAULT_BUILDING_INFO);
        }

        if (unitsData && unitsData.length > 0) {
          console.log('✓ Units yüklendi:', unitsData.length, 'adet');
          setUnits(unitsData);
        } else {
          console.log('Units yok, default kullanılıyor');
          setUnits(INITIAL_UNITS);
          // İlk yüklemede default units'i kaydet
          await db.saveUnits(INITIAL_UNITS);
        }

        if (transactionsData && transactionsData.length > 0) {
          console.log('✓ Transactions yüklendi:', transactionsData.length);
          setTransactions(transactionsData);
        } else {
          setTransactions([]);
        }

        if (boardData && boardData.length > 0) {
          console.log('✓ Board members yüklendi:', boardData.length);
          setBoardMembers(boardData);
        } else {
          setBoardMembers([]);
        }

        if (filesData && filesData.length > 0) {
          console.log('✓ Files yüklendi:', filesData.length);
          setFiles(filesData);
        } else {
          setFiles([]);
        }

        if (messagesData && messagesData.length > 0) {
          console.log('✓ Messages yüklendi:', messagesData.length);
          setMessages(messagesData);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('✗ Firebase veri yükleme hatası:', error);
        alert('Firebase hatası: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataFromFirebase();
  }, [isAuthenticated, activeSiteId]); // siteId değiştiğinde veriyi tekrar yükle

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
  }, [buildingInfo, isAuthenticated, isLoading, activeSiteId]);

  // Bina ismi değiştiğinde available_sites listesini de güncelle
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser && buildingInfo?.name && isAuthenticated) {
      db.updateSiteName(currentUser.uid, activeSiteId, buildingInfo.name);
      setUserSites(prev => prev.map(s => s.id === activeSiteId ? { ...s, name: buildingInfo.name } : s));
    }
  }, [buildingInfo?.name, isAuthenticated, activeSiteId]);

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

  useEffect(() => {
    if (isAuthenticated && !isLoading && Array.isArray(messages)) {
      const timer = setTimeout(() => {
        console.log('Messages Firebase\'e kaydediliyor:', messages.length);
        db.saveMessages(messages)
          .then(() => console.log('✓ Messages kaydedildi'))
          .catch(err => console.error('✗ Messages kaydetme hatası:', err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages, isAuthenticated, isLoading]);

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


  const unitsWithBalances = useMemo(() => {
    if (!Array.isArray(units)) return INITIAL_UNITS;
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    return units.map(unit => {
      if (!unit || !unit.id) return { id: Math.random().toString(), no: '', ownerName: '', phone: '', credit: 0, debt: 0, status: 'Malik', type: '3+1', m2: 100, huzurHakki: 'YOK' };
      const isExempt = buildingInfo?.isManagerExempt && unit.id === buildingInfo?.managerUnitId;
      if (isExempt) return { ...unit, credit: 0, debt: 0 };
      const totalIncome = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && tx.unitId === unit.id && tx.type === 'GELİR').reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const totalManualDebt = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA').reduce((sum, tx) => sum + (tx.amount || 0), 0);
      let runningCredit = totalIncome - totalManualDebt;
      let totalDebtAccrued = 0;
      const duesValue = Number(buildingInfo?.duesAmount) || 750;

      // Aidat çizelgesi ve kredilerden aidatı "istisnasız" düşüyoruz.
      if (duesValue > 0) {
        for (let m = 0; m <= currentMonthIdx; m++) {
          const hasManualForThisMonth = (Array.isArray(transactions) ? transactions : []).some(tx => tx && tx.unitId === unit.id && tx.type === 'BORÇLANDIRMA' && tx.periodMonth === m && tx.periodYear === currentYear);
          if (!hasManualForThisMonth) {
            if (runningCredit >= duesValue) {
              runningCredit -= duesValue;
            } else {
              // Kredi yetmiyorsa borca yaz (kalan krediyi de sfırla, çünkü bir kısmı ödendi)
              if (runningCredit > 0) {
                totalDebtAccrued += (duesValue - runningCredit);
                runningCredit = 0;
              } else {
                totalDebtAccrued += duesValue;
              }
            }
          }
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

    // İçinde bulunduğumuz ay için Aidat Performansı (Grafik için)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Bu ay için yapılan tahsilatlar (GELİR tipinde ve bu aya ait olanlar)
    // periodMonth 0-indexed yapılmıştı handleAddTransaction'da
    const monthlyCollected = txArr.filter(tx =>
      tx.type === 'GELİR' &&
      tx.periodMonth === currentMonth &&
      tx.periodYear === currentYear
    ).reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Bu ay toplam toplanması gereken (Muaf olmayan daire sayısı * aidat)
    const activeUnits = (Array.isArray(units) ? units : []).filter(u => !(buildingInfo?.isManagerExempt && u.id === buildingInfo?.managerUnitId)).length;
    const monthlyTarget = activeUnits * (buildingInfo.duesAmount || 0);

    // Bu ay kalan alacak (O ayın toplamından tahsilat düşülür)
    const monthlyRemainingDebt = Math.max(0, monthlyTarget - monthlyCollected);

    return {
      mevcutBakiye: mevcut,
      alacakBakiyesi: alacak,
      toplam: mevcut + alacak,
      demirbasKasasi: 0,
      monthlyCollected,
      monthlyRemainingDebt
    };
  }, [unitsWithBalances, transactions, buildingInfo, units]);

  const handleLogin = (remember: boolean) => {
    if (remember) localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    else sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Çıkış yapıldığında firebase auth oturumunu da tamamen kapat
    signOut(auth).catch(err => console.error('SignOut hatası:', err));

    setIsAuthenticated(false);

    // Eski kullanıcının verilerini tamamen temizle
    setBuildingInfo(DEFAULT_BUILDING_INFO);
    setUnits(INITIAL_UNITS);
    setTransactions([]);
    setBoardMembers([]);
    setFiles([]);
    setMessages([]);
    db.setCurrentSession(''); // Oturumu tamamen sıfırla

    // Sadece oturum bilgilerini temizle (Email hatırasını korumak için)
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);

    setActiveTab('home');
    setActiveSubView(null);
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
            directory: Directory.Data
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

  const unreadCount = messages.filter(m => new Date(m.createdAt).getTime() > lastSeenMsgTime).length;

  const handleMessagesClick = () => {
    setActiveSubView('messages');
    const now = Date.now();
    setLastSeenMsgTime(now);
    localStorage.setItem('galata_last_msg_time', now.toString());
  };

  const handleSendMessage = async (content: string) => {
    const newMsg: AppMessage = {
      id: Math.random().toString(36).slice(2),
      senderEmail: auth.currentUser?.email || 'Bilinmiyor',
      senderName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Kullanıcı',
      content,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);

    if (isAuthenticated && !isLoading) {
      try {
        await db.saveMessages(updatedMessages);
      } catch (err) {
        console.error('Mesaj gönderme hatası:', err);
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const updatedMessages = messages.filter(m => m.id !== id);
    setMessages(updatedMessages);

    if (isAuthenticated && !isLoading) {
      try {
        await db.deleteMessage(id);
      } catch (err) {
        console.error('Mesaj silme hatası:', err);
      }
    }
  };

  return (
    <div className="app-gradient text-white pb-24 max-w-md mx-auto shadow-2xl relative min-h-screen">
      {!activeSubView && activeTab === 'home' && <Header info={buildingInfo} onLogout={handleLogout} onMessagesClick={handleMessagesClick} unreadCount={unreadCount} />}

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
                                  activeSubView === 'board' ? <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...(Array.isArray(p) ? p : []), { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} /> :
                                    activeSubView === 'messages' ? <MessagesView messages={messages} onClose={() => setActiveSubView(null)} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} /> : null
        ) : (
          activeTab === 'menu' ? <MenuView onActionClick={(sv, tab) => { if (tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} /> :
            activeTab === 'settings' ? <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} /> :
              activeTab === 'sessions' ? <SessionsView
                activeSiteId={activeSiteId}
                userSites={userSites}
                onSelectSite={(id) => {
                  setActiveSiteId(id);
                  localStorage.setItem('galata_active_site_id', id);
                  setActiveTab('home');
                }}
                onCreateSite={async (name) => {
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                    const newId = 'site_' + Math.random().toString(36).slice(2);
                    await db.addSiteToUser(currentUser.uid, newId, name);
                    setUserSites(p => [...p, { id: newId, name }]);
                    setActiveSiteId(newId);
                    localStorage.setItem('galata_active_site_id', newId);
                    setActiveTab('home');
                    // loadDataFromFirebase activeSiteId değişince tetiklenecek
                  }
                }}
                onDeleteSite={async (id) => {
                  const currentUser = auth.currentUser;
                  if (currentUser && userSites.length > 1) {
                    await db.removeSiteFromUser(currentUser.uid, id);
                    setUserSites(p => p.filter(s => s.id !== id));
                    if (activeSiteId === id) {
                      const nextSite = userSites.find(s => s.id !== id);
                      if (nextSite) {
                        setActiveSiteId(nextSite.id);
                        localStorage.setItem('galata_active_site_id', nextSite.id);
                      }
                    }
                  } else {
                    alert("Son kalan siteyi silemezsiniz.");
                  }
                }}
                onUpdateUnits={async (newCount: number) => {
                  setUnits(prev => {
                    const currentCount = prev.length;
                    if (newCount > currentCount) {
                      const added = Array.from({ length: newCount - currentCount }, (_, i) => ({
                        id: (currentCount + i + 1).toString(),
                        no: (currentCount + i + 1).toString(),
                        ownerName: "",
                        phone: "",
                        credit: 0,
                        debt: 0,
                        status: "Malik",
                        type: "3+1",
                        m2: 100,
                        huzurHakki: "YOK"
                      }));
                      return [...prev, ...added];
                    } else if (newCount < currentCount) {
                      return prev.slice(0, newCount);
                    }
                    return prev;
                  });
                }}
                info={buildingInfo}
                units={unitsWithBalances}
                onClose={() => setActiveTab('home')}
                onUpdateInfo={setBuildingInfo}
              /> :
                activeTab === 'home' ? <div className="space-y-3 pt-1"><SummaryCard balance={balance} /><ActionGrid variant="grid" onActionClick={a => { const m: any = { 'Tahsilat': 'tahsilat', 'Gider': 'gider', 'Borçlandır': 'borclandir', 'Gelir': 'gelir', 'İade': 'iade', 'Transfer': 'transfer', 'Bağımsız Bölümler': 'units', 'İşlem Hareketleri': 'history', 'Alacak Listesi': 'receivables' }; if (m[a]) setActiveSubView(m[a]); }} /><SecondaryWidgets onActionClick={a => { const m: any = { 'AİDAT ÇİZELGE': 'aidat-cizelge', 'AYLIK BİLANÇO': 'monthly-report', 'YILLIK BİLANÇO': 'yearly-report' }; if (m[a]) setActiveSubView(m[a]); }} /><LastTransaction transaction={(Array.isArray(transactions) && transactions.length > 0) ? transactions[0] : null} /></div> :

                  activeTab === 'files' ? <FilesView files={files} onAddFile={f => setFiles(p => [...(Array.isArray(p) ? p : []), { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={handleOpenFile} onShareFile={handleShareFile} /> : null
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
    </div>
  );
};

export default App;

