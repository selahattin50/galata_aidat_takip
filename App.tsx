
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { dispatchAppBackButton } from './appBackButton';
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
import { consumeRecentExternalIntent, markExternalIntent } from './externalIntentGuard';

const STORAGE_KEYS = {
  AUTH: 'galata_v16_auth'
};

const RECEIVABLES_INFO_NOTIFICATION_ID = 190010;
const RECEIVABLES_REMINDER_NOTIFICATION_ID = 190011;
const RECEIVABLES_REMINDER_CHANNEL_ID = 'receivables-reminders';
const ADMIN_EMAIL = 'selahattin50@gmail.com';

const DEFAULT_BUILDING_INFO: BuildingInfo = {
  name: "YENİ YÖNETİM",
  address: "Adres bilgisi giriniz",
  role: "Yönetici",
  managerName: "Yönetici Adı",
  taxNo: "",
  duesAmount: 0,
  isManagerExempt: false,
  managerUnitId: '',
  isAutoDuesEnabled: true,
  isBulkMessageEnabled: true,
  bulkMessageInfoDay: 1,
  bulkMessageReminderDay: 19,
  bulkMessageStartDay: 19,
  lastAutoDuesMonth: "",
  expenseCategories: ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Tamirat', 'Yönetim Gideri', 'Huzur Hakkı', 'Bahçe Bakımı', 'Diğer']
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
  const [currentDate, setCurrentDate] = useState(new Date());

  // Tarihi her dakika başı kontrol et ve gün/ay/yıl değişirse state'i güncelle
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(prevDate => {
        // Sadece gün, ay veya yıl değiştiyse state'i güncelle
        if (prevDate.getDate() !== now.getDate() ||
          prevDate.getMonth() !== now.getMonth() ||
          prevDate.getFullYear() !== now.getFullYear()) {
          console.log('📅 Gün değişti, takvimler güncelleniyor:', now.toLocaleDateString('tr-TR'));
          return now;
        }
        return prevDate;
      });
    }, 60000); // 1 dakikada bir kontrol et
    return () => clearInterval(timer);
  }, []);

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

  // Otomatik Aidat Borçlandırma Kontrolü (Her ayın 1'inde)
  useEffect(() => {
    if (!isAuthenticated || isLoading || !buildingInfo.isAutoDuesEnabled || !units.length) return;

    const now = currentDate;
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`; // Örn: "2026-04"
    
    // Sadece ayın 1'inde ve bu ay için daha önce yapılmadıysa çalış
    if (now.getDate() === 1 && buildingInfo.lastAutoDuesMonth !== currentMonthKey) {
      console.log('🚀 Otomatik aidat borçlandırma başlatılıyor:', currentMonthKey);
      
      const newTransactions: Transaction[] = [];
      const duesAmount = buildingInfo.duesAmount || 0;
      
      if (duesAmount <= 0) return;

      units.forEach(unit => {
        // Yönetici dairesi muafsa borçlandırma yapma
        if (buildingInfo.isManagerExempt && unit.id === buildingInfo.managerUnitId) return;

        newTransactions.push({
          id: Math.random().toString(36).slice(2),
          type: 'BORÇLANDIRMA',
          amount: duesAmount,
          description: `${now.getMonth() + 1}. AY AİDAT BORCU [genel]`,
          unitId: unit.id,
          date: now.toLocaleDateString('tr-TR'),
          periodMonth: now.getMonth(),
          periodYear: now.getFullYear()
        });
      });

      if (newTransactions.length > 0) {
        const updatedTransactions = [...newTransactions, ...transactions];
        setTransactions(updatedTransactions);
        
        // buildingInfo'yu da güncelle ki tekrar yapmasın
        const updatedInfo = { ...buildingInfo, lastAutoDuesMonth: currentMonthKey };
        setBuildingInfo(updatedInfo);
        
        console.log(`✅ ${newTransactions.length} daire için otomatik borç kaydı oluşturuldu.`);
      }
    }
  }, [currentDate, isAuthenticated, isLoading, buildingInfo.isAutoDuesEnabled, units.length]);

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
        const emailKey = currentUser.email?.replace(/[.@]/g, '_');
        const isAdminUser = currentUser.email === ADMIN_EMAIL;
        const [info, unitsData, transactionsData, boardData, filesData, messagesData, userProfile, bannedData] = await Promise.all([
          db.getBuildingInfo(),
          db.getUnits(),
          db.getTransactions(),
          db.getBoardMembers(),
          db.getFiles(),
          isAdminUser ? db.getMessages() : Promise.resolve([]),
          db.getDataDirect(`_userProfiles/${currentUser.uid}`),
          db.getDataDirect(`_bannedUsers/${emailKey}`)
        ]);

        console.log('Firebase veriler:', {
          info: !!info,
          profile: !!userProfile,
          banned: !!bannedData,
          units: unitsData?.length || 0,
          transactions: transactionsData?.length || 0
        });

        // GÜVENLİK KONTROLÜ: Eğer BANLIYSA dışarı at
        if (bannedData && currentUser.email !== ADMIN_EMAIL) {
          console.warn('⚠️ BANLI HESAP: Bu e-posta yasaklanmış, oturum kapatılıyor.');
          alert('Hesabınız sistemden kalıcı olarak yasaklanmıştır.');
          handleLogout();
          return;
        }

        // GÜVENLİK KONTROLÜ: Eğer profil silinmişse (ve ana admin değilse) dışarı at
        if (!userProfile && currentUser.email !== ADMIN_EMAIL) {
          console.warn('⚠️ HESAP SİLİNMİŞ: Profil bulunamadı, oturum kapatılıyor.');
          alert('Hesabınız yönetici tarafından silinmiştir veya geçersizdir.');
          handleLogout();
          return;
        }

        // Veri varsa güncelle, yoksa default değerleri kullan
        if (info) {
          console.log('✓ Building info yüklendi');

          // GÜVENLİK FİLTRESİ: Geçmişteki sızıntıdan dolayı corrupted (bozulmuş) olan hesapları temizle
          const isSelahattin = currentUser.email === ADMIN_EMAIL;
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
    if (isAuthenticated && !isLoading && auth.currentUser?.email === ADMIN_EMAIL && Array.isArray(messages)) {
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

    if (Capacitor.getPlatform() === 'android') {
      CapacitorApp.toggleBackButtonHandler({ enabled: true }).catch(err => {
        console.error('Geri tuşu native handler etkinleştirilemedi:', err);
      });
    }

    const handleBackButton = (event: any) => {
      const currentTab = activeTabRef.current;
      const currentSubView = activeSubViewRef.current;

      console.log('🔙 Geri tuşuna basıldı - activeTab:', currentTab, 'activeSubView:', currentSubView);

      if (dispatchAppBackButton()) {
        console.log('✓ Geri tuşu aktif alt ekran tarafından işlendi');
        event?.preventDefault?.();
        return;
      }

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

  // Mesajları gerçek zamanlı dinle
  useEffect(() => {
    if (isAuthenticated && auth.currentUser?.email === ADMIN_EMAIL) {
      const unsubscribe = db.subscribeMessages((newMessages) => {
        setMessages(newMessages);
      });
      return () => unsubscribe();
    }
    setMessages([]);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !Capacitor.isNativePlatform()) {
      return;
    }

    const isBulkMessageEnabled = buildingInfo?.isBulkMessageEnabled !== false;
    const bulkMessageInfoDay = Math.min(28, Math.max(1, Number(buildingInfo?.bulkMessageInfoDay) || 1));
    const bulkMessageReminderDay = Math.max(
      bulkMessageInfoDay,
      Math.min(28, Math.max(1, Number(buildingInfo?.bulkMessageReminderDay ?? buildingInfo?.bulkMessageStartDay) || 19))
    );

    const openReceivablesReminder = () => {
      setActiveTab('home');
      setActiveSubView('receivables');
    };

    let notificationListener: { remove: () => Promise<void> } | null = null;

    const setupReceivablesReminder = async () => {
      try {
        await LocalNotifications.cancel({
          notifications: [
            { id: RECEIVABLES_INFO_NOTIFICATION_ID },
            { id: RECEIVABLES_REMINDER_NOTIFICATION_ID }
          ],
        });

        if (!isBulkMessageEnabled) {
          return;
        }

        const permissionStatus = await LocalNotifications.checkPermissions();
        const displayPermission =
          permissionStatus.display === 'granted'
            ? permissionStatus
            : await LocalNotifications.requestPermissions();

        if (displayPermission.display !== 'granted') {
          console.warn('Bildirim izni verilmedi, alacak listesi hatırlatması kurulamadı.');
          return;
        }

        await LocalNotifications.createChannel({
          id: RECEIVABLES_REMINDER_CHANNEL_ID,
          name: 'Aidat Hatirlatmalari',
          description: 'Aylik alacak listesi hatirlatmalari',
          importance: 5,
          visibility: 1,
        });

        await LocalNotifications.cancel({
          notifications: [
            { id: RECEIVABLES_INFO_NOTIFICATION_ID },
            { id: RECEIVABLES_REMINDER_NOTIFICATION_ID }
          ],
        });

        await LocalNotifications.schedule({
          notifications: [
            {
              id: RECEIVABLES_INFO_NOTIFICATION_ID,
              title: 'Aidat Bilgilendirme Mesaji',
              body: 'Aidat olusturuldu bilgisini gondermek icin dokun. Alacak Listesi acilacak.',
              channelId: RECEIVABLES_REMINDER_CHANNEL_ID,
              schedule: {
                on: {
                  day: bulkMessageInfoDay,
                  hour: 10,
                  minute: 0,
                },
                repeats: true,
                allowWhileIdle: true,
              },
              extra: {
                targetSubView: 'receivables',
                receivablesMode: 'info',
              },
            },
            {
              id: RECEIVABLES_REMINDER_NOTIFICATION_ID,
              title: 'Alacak Listesi Hatirlatmasi',
              body: 'Borclulara mesaj gondermek icin dokun. Alacak Listesi acilacak.',
              channelId: RECEIVABLES_REMINDER_CHANNEL_ID,
              schedule: {
                on: {
                  day: bulkMessageReminderDay,
                  hour: 11,
                  minute: 0,
                },
                repeats: true,
                allowWhileIdle: true,
              },
              extra: {
                targetSubView: 'receivables',
                receivablesMode: 'reminder',
              },
            },
          ],
        });

        notificationListener = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (notificationAction) => {
            if (
              notificationAction.notification.id === RECEIVABLES_INFO_NOTIFICATION_ID ||
              notificationAction.notification.id === RECEIVABLES_REMINDER_NOTIFICATION_ID ||
              notificationAction.notification.extra?.targetSubView === 'receivables'
            ) {
              openReceivablesReminder();
            }
          }
        );
      } catch (error) {
        console.error('Alacak listesi hatirlatmasi ayarlanamadi:', error);
      }
    };

    setupReceivablesReminder();

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, [
    isAuthenticated,
    buildingInfo?.isBulkMessageEnabled,
    buildingInfo?.bulkMessageInfoDay,
    buildingInfo?.bulkMessageReminderDay,
    buildingInfo?.bulkMessageStartDay
  ]);


  const unitsWithBalances = useMemo(() => {
    if (!Array.isArray(units)) return INITIAL_UNITS;
    const now = currentDate;
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    return units.map(unit => {
      if (!unit || !unit.id) return { id: Math.random().toString(), no: '', ownerName: '', phone: '', credit: 0, debt: 0, status: 'Malik', type: '3+1', m2: 100, huzurHakki: 'YOK' };
      const isExempt = buildingInfo?.isManagerExempt && unit.id === buildingInfo?.managerUnitId;
      if (isExempt) return { ...unit, credit: 0, debt: 0 };

      const unitTransactions = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && tx.unitId === unit.id);

      // Nakit Gelir: (KREDİ) ile yapılan mahsuplar hariç tüm GELİR tipi işlemler (çünkü onlar nakit girişi değil, mevcut bakiye kullanımıdır)
      const totalIncome = unitTransactions
        .filter(tx => tx.type === 'GELİR' && !(tx.description || '').includes('(KREDİ)'))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalManualDebt = unitTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const duesValue = Number(buildingInfo?.duesAmount ?? 0);

      let paidDuesTotal = 0;
      let unpaidDuesTotal = 0;

      // Aidat ödenme kontrolü: Sadece o aya özel (periodMonth) girişi olanlar aidatı kapatır
      // (KREDİ) ile yapılan ödemeler de burada 'paid' olarak sayılır çünkü periodMonth ve periodYear değerleri vardır.
      if (duesValue > 0) {
        for (let m = 0; m <= currentMonthIdx; m++) {
          const hasManualDebtForMonth = unitTransactions.some(tx => 
            tx.type === 'BORÇLANDIRMA' && tx.periodMonth === m && tx.periodYear === currentYear
          );

          if (!hasManualDebtForMonth) {
            const hasSpecificPayment = unitTransactions.some(tx =>
              tx.type === 'GELİR' &&
              tx.periodMonth === m &&
              tx.periodYear === currentYear
            );

            if (hasSpecificPayment) {
              paidDuesTotal += duesValue;
            } else {
              unpaidDuesTotal += duesValue;
            }
          }
        }
      }

      // Kredi = Toplam Nakit Gelir - Aidat Tahsilatı ile Ödenen Miktar 
      // (Manuel Borçlandırmalar artık krediden düşmeyecek, ayrı bir borç olarak görünecek)
      const currentCredit = Math.max(0, totalIncome - paidDuesTotal);
      const currentDebt = totalManualDebt + unpaidDuesTotal;

      return {
        ...unit,
        credit: currentCredit,
        debt: currentDebt
      };
    });
  }, [units, transactions, buildingInfo, currentDate]);


  const balance: BalanceSummary = useMemo(() => {
    const txArr = Array.isArray(transactions) ? transactions : [];
    // Mevcut Bakiye hesaplanırken (KREDİ) mahsuplarını gelir olarak sayma (çünkü nakit girişi değil)
    const totalIncome = txArr
      .filter(tx => tx?.type === 'GELİR' && !(tx?.description || '').includes('(KREDİ)'))
      .reduce((sum, tx) => sum + (tx?.amount || 0), 0);
    const totalExpense = txArr.filter(tx => tx?.type === 'GİDER').reduce((sum, tx) => sum + (tx?.amount || 0), 0);
    const mevcut = totalIncome - totalExpense;
    const alacak = Array.isArray(unitsWithBalances)
      ? unitsWithBalances.reduce((sum, u) => sum + Math.max(0, (u?.debt || 0) - (u?.credit || 0)), 0)
      : 0;

    // İçinde bulunduğumuz ay için Aidat Performansı (Grafik için)
    const now = currentDate;
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
  }, [unitsWithBalances, transactions, buildingInfo, units, currentDate]);

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) {
      return;
    }

    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        if (consumeRecentExternalIntent()) {
          return;
        }
        handleLogout();
      }
    });

    return () => {
      listener.then(handle => handle.remove()).catch(() => {});
    };
  }, [isAuthenticated]);

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

    const formattedDate = date ? (date.includes('-') ? date.split('-').reverse().join('.') : date) : currentDate.toLocaleDateString('tr-TR');
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
      date: currentDate.toLocaleDateString('tr-TR'),
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
        markExternalIntent();
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

      console.log('PDF açılıyor (FileOpener):', file.uri);

      if (Capacitor.isNativePlatform()) {
        try {
          const { FileOpener } = await import('@capacitor-community/file-opener');
          markExternalIntent();
          await FileOpener.open({
            filePath: file.uri,
            contentType: 'application/pdf'
          });
        } catch (openerError) {
          console.error('FileOpener hatası, alternatif deneniyor:', openerError);
          // Fallback: Browser veya Share
          const { Share } = await import('@capacitor/share');
          markExternalIntent();
          await Share.share({
            title: file.name,
            text: 'PDF Görüntüle',
            url: file.uri,
            dialogTitle: 'PDF ile aç'
          });
        }
      } else {
        // Web tarayıcısında yeni sekmede aç
        window.open(file.uri, '_blank');
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
  const canUseGlobalMessages = auth.currentUser?.email === ADMIN_EMAIL;

  const handleMessagesClick = () => {
    if (!canUseGlobalMessages) {
      return;
    }
    setActiveSubView('messages');
    const now = Date.now();
    setLastSeenMsgTime(now);
    localStorage.setItem('galata_last_msg_time', now.toString());
  };

  const handleSendMessage = async (content: string) => {
    if (!canUseGlobalMessages) {
      alert('Mesaj panosu sadece ana yönetici tarafından kullanılabilir.');
      return;
    }

    const newMsg: AppMessage = {
      id: Math.random().toString(36).slice(2),
      senderEmail: auth.currentUser?.email || 'Bilinmiyor',
      senderName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Kullanıcı',
      content,
      createdAt: new Date().toISOString()
    };

    // Not: setMessages() çağırmıyoruz çünkü subscribeMessages otomatik güncelleyecek

    if (isAuthenticated) {
      try {
        await db.pushMessage(newMsg);
        console.log('✓ Mesaj başarıyla gönderildi');
      } catch (err) {
        console.error('Mesaj gönderme hatası:', err);
        alert('Mesaj gönderilemedi. Lütfen internetinizi kontrol edin.');
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!canUseGlobalMessages) {
      return;
    }

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
      {!activeSubView && activeTab === 'home' && <Header info={buildingInfo} onLogout={handleLogout} onMessagesClick={handleMessagesClick} unreadCount={canUseGlobalMessages ? unreadCount : 0} showMessages={canUseGlobalMessages} />}

      <main className="px-4">
        {activeSubView ? (
          activeSubView === 'tahsilat' ? <TahsilatView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} transactions={transactions} onClose={() => setActiveSubView(null)} onSave={(a, desc, v, dt, uId, m, y) => handleAddTransaction(a, desc, 'GELİR', v, dt, uId, m, y)} /> :
            activeSubView === 'gider' ? <GiderView currentDate={currentDate} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={async (a, d, v, dt) => await handleAddTransaction(a, d, 'GİDER', v, dt)} /> :
              activeSubView === 'borclandir' ? <BorclandirView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId, m, y) => handleAddTransaction(a, d, 'BORÇLANDIRMA', v, dt, uId, m, y)} /> :
                activeSubView === 'gelir' ? <GelirView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GELİR', v, dt)} /> :
                  activeSubView === 'iade' ? <IadeView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId) => handleAddTransaction(a, d, 'GİDER', v, dt, uId)} /> :
                    activeSubView === 'transfer' ? <TransferView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'TRANSFER', v, dt)} /> :
                      activeSubView === 'units' ? <UnitsView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddUnit={handleAddUnit} onEditUnit={handleEditUnit} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                        activeSubView === 'history' ? <TransactionsView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} onDeleteTransaction={async (id) => {
                          setTransactions(p => p.filter(x => x.id !== id));
                          if (isAuthenticated && !isLoading) {
                            try { await db.deleteTransaction(id); } catch (err) { console.error('✗ Silme esnasında hata:', err); }
                          }
                        }} onUpdateTransaction={tx => setTransactions(p => p.map(x => x.id === tx.id ? tx : x))} /> :
                          activeSubView === 'receivables' ? <ReceivablesView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} /> :
                            activeSubView === 'aidat-cizelge' ? <AidatCizelgeView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddDues={() => { }} /> :
                              activeSubView === 'monthly-report' ? <MonthlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                                activeSubView === 'yearly-report' ? <YearlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
                                  activeSubView === 'board' ? <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...(Array.isArray(p) ? p : []), { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} /> :
                                    activeSubView === 'messages' && canUseGlobalMessages ? <MessagesView messages={messages} onClose={() => setActiveSubView(null)} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} /> : null
        ) : (
          activeTab === 'menu' ? <MenuView onActionClick={(sv, tab) => { if (tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} /> :
            activeTab === 'settings' ? <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} onAddTransactions={(newTxs) => setTransactions(prev => [...newTxs, ...prev])} /> :
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

                  activeTab === 'files' ? <FilesView currentDate={currentDate} files={files} onAddFile={f => setFiles(p => [...(Array.isArray(p) ? p : []), { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={handleOpenFile} onShareFile={handleShareFile} /> : null
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
    </div>
  );
};

export default App;

