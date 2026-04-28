
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
  name: "",
  address: "",
  role: "Yönetici",
  managerName: "",
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(prevDate => {
        if (prevDate.getDate() !== now.getDate() ||
          prevDate.getMonth() !== now.getMonth() ||
          prevDate.getFullYear() !== now.getFullYear()) {
          console.log('📅 Gün değişti, takvimler güncelleniyor:', now.toLocaleDateString('tr-TR'));
          return now;
        }
        return prevDate;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const activeTabRef = useRef<ActiveTab>('home');
  const activeSubViewRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!isAuthenticated || isLoading || !buildingInfo.isAutoDuesEnabled || !units.length) return;

    const now = currentDate;
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (now.getDate() === 1 && buildingInfo.lastAutoDuesMonth !== currentMonthKey) {
      const newTransactions: Transaction[] = [];
      const duesAmount = buildingInfo.duesAmount || 0;
      if (duesAmount <= 0) return;

      units.forEach(unit => {
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
        setTransactions(p => [...newTransactions, ...p]);
        setBuildingInfo(p => ({ ...p, lastAutoDuesMonth: currentMonthKey }));
      }
    }
  }, [currentDate, isAuthenticated, isLoading, buildingInfo, units]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadDataFromFirebase = async () => {
      try {
        setIsLoading(true);
        let currentUser = auth.currentUser;

        if (!currentUser) {
          currentUser = await new Promise<any>((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              if (user) { unsubscribe(); resolve(user); }
            });
          });
        }

        if (!currentUser) { handleLogout(); return; }

        const sites = await db.getUserSites(currentUser.uid);
        setUserSites(sites);

        let currentSiteId = activeSiteId;
        if (sites.length > 0 && !sites.find(s => s.id === currentSiteId)) {
          currentSiteId = sites[0].id;
          setActiveSiteId(currentSiteId);
          localStorage.setItem('galata_active_site_id', currentSiteId);
        }

        const sessionPath = currentSiteId === 'main' ? `users/${currentUser.uid}` : `users/${currentUser.uid}/sites/${currentSiteId}`;
        db.setCurrentSession(sessionPath);

        const emailKey = currentUser.email?.replace(/[.@]/g, '_');
        const [info, unitsData, transactionsData, boardData, filesData, messagesData, userProfile, bannedData] = await Promise.all([
          db.getBuildingInfo().catch(() => null),
          db.getUnits().catch(() => []),
          db.getTransactions().catch(() => []),
          db.getBoardMembers().catch(() => []),
          db.getFiles().catch(() => []),
          db.getMessages().catch(() => []),
          db.getDataDirect(`_userProfiles/${currentUser.uid}`).catch(() => null),
          db.getDataDirect(`_bannedUsers/${emailKey}`).catch(() => null)
        ]);

        if (bannedData && currentUser.email !== ADMIN_EMAIL) { alert('Hesabınız yasaklanmıştır.'); handleLogout(); return; }
        if (!userProfile && currentUser.email !== ADMIN_EMAIL) { alert('Hesabınız silinmiştir.'); handleLogout(); return; }

        if (info) {
          setBuildingInfo(info);
          if (sites.length === 0 || !sites.find(s => s.id === (activeSiteId || 'main'))) {
            await db.addSiteToUser(currentUser.uid, activeSiteId || 'main', info.name || "Varsayılan");
            setUserSites([{ id: activeSiteId || 'main', name: info.name || "Varsayılan" }]);
          }
        }
        if (unitsData?.length > 0) setUnits(unitsData);
        else db.saveUnits(INITIAL_UNITS);

        setTransactions(transactionsData || []);
        setBoardMembers(boardData || []);
        setFiles(filesData || []);
        setMessages(messagesData || []);
      } catch (error) {
        console.error('Firebase error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataFromFirebase();
  }, [isAuthenticated, activeSiteId]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && buildingInfo) {
      const timer = setTimeout(() => db.saveBuildingInfo(buildingInfo), 500);
      return () => clearTimeout(timer);
    }
  }, [buildingInfo, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && units) {
      const timer = setTimeout(() => db.saveUnits(units), 500);
      return () => clearTimeout(timer);
    }
  }, [units, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && transactions) {
      const timer = setTimeout(() => db.saveTransactions(transactions), 500);
      return () => clearTimeout(timer);
    }
  }, [transactions, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && boardMembers) {
      const timer = setTimeout(() => db.saveBoardMembers(boardMembers), 500);
      return () => clearTimeout(timer);
    }
  }, [boardMembers, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && files) {
      const timer = setTimeout(() => db.saveFiles(files), 500);
      return () => clearTimeout(timer);
    }
  }, [files, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && messages) {
      const timer = setTimeout(() => db.saveMessages(messages), 500);
      return () => clearTimeout(timer);
    }
  }, [messages, isAuthenticated, isLoading]);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      CapacitorApp.toggleBackButtonHandler({ enabled: true });
    }

    const handleBackButton = (event: any) => {
      if (dispatchAppBackButton()) { event?.preventDefault(); return; }
      if (activeSubViewRef.current) { setActiveSubView(null); event?.preventDefault(); return; }
      if (activeTabRef.current !== 'home') { setActiveTab('home'); event?.preventDefault(); return; }
      CapacitorApp.exitApp();
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => { listener.then(h => h.remove()); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = db.subscribeMessages(setMessages);
      return () => unsubscribe();
    }
    setMessages([]);
  }, [isAuthenticated]);

  const unitsWithBalances = useMemo(() => {
    if (!Array.isArray(units)) return INITIAL_UNITS;
    const now = currentDate;
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    return units.map(unit => {
      const isExempt = buildingInfo?.isManagerExempt && unit.id === buildingInfo?.managerUnitId;
      if (isExempt) return { ...unit, credit: 0, debt: 0 };

      const unitTransactions = transactions.filter(tx => tx.unitId === unit.id);
      const totalIncome = unitTransactions.filter(tx => tx.type === 'GELİR' && !tx.description.includes('(KREDİ)')).reduce((s, t) => s + t.amount, 0);
      const totalManualDebt = unitTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((s, t) => s + t.amount, 0);
      const duesValue = buildingInfo.duesAmount || 0;

      let paidDues = 0; let unpaidDues = 0;
      if (duesValue > 0) {
        for (let m = 0; m <= currentMonthIdx; m++) {
          const hasManual = unitTransactions.some(tx => tx.type === 'BORÇLANDIRMA' && tx.periodMonth === m && tx.periodYear === currentYear);
          if (!hasManual) {
            const paid = unitTransactions.some(tx => tx.type === 'GELİR' && tx.periodMonth === m && tx.periodYear === currentYear);
            if (paid) paidDues += duesValue; else unpaidDues += duesValue;
          }
        }
      }
      return { ...unit, credit: Math.max(0, totalIncome - paidDues), debt: totalManualDebt + unpaidDues };
    });
  }, [units, transactions, buildingInfo, currentDate]);

  const balance: BalanceSummary = useMemo(() => {
    const totalIncome = transactions.filter(tx => tx.type === 'GELİR' && !tx.description.includes('(KREDİ)')).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === 'GİDER').reduce((s, t) => s + t.amount, 0);
    const mevcut = totalIncome - totalExpense;
    const alacak = unitsWithBalances.reduce((s, u) => s + Math.max(0, u.debt - u.credit), 0);
    
    const now = currentDate;
    const monthlyCollected = transactions.filter(tx => tx.type === 'GELİR' && tx.periodMonth === now.getMonth() && tx.periodYear === now.getFullYear()).reduce((s, t) => s + t.amount, 0);
    const activeUnits = units.filter(u => !(buildingInfo?.isManagerExempt && u.id === buildingInfo?.managerUnitId)).length;
    const monthlyTarget = activeUnits * (buildingInfo.duesAmount || 0);

    return { mevcutBakiye: mevcut, alacakBakiyesi: alacak, toplam: mevcut + alacak, demirbasKasasi: 0, monthlyCollected, monthlyRemainingDebt: Math.max(0, monthlyTarget - monthlyCollected) };
  }, [unitsWithBalances, transactions, buildingInfo, units, currentDate]);

  const handleLogin = (rem: boolean) => {
    if (rem) localStorage.setItem(STORAGE_KEYS.AUTH, 'true'); else sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    setIsAuthenticated(false);
    setBuildingInfo(DEFAULT_BUILDING_INFO); setUnits(INITIAL_UNITS); setTransactions([]); setBoardMembers([]); setFiles([]); setMessages([]);
    localStorage.removeItem(STORAGE_KEYS.AUTH); sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    setActiveTab('home'); setActiveSubView(null);
  };

  const handleAddUnit = (u: any) => {
    const newUnit = { ...u, id: Math.random().toString(36).slice(2), credit: 0, debt: 0 };
    setUnits(p => [...p, newUnit]);
  };

  const handleEditUnit = (u: Unit) => setUnits(p => p.map(x => x.id === u.id ? u : x));

  const handleAddTransaction = async (amount: number, description: string, type: any, vault: any = 'genel', date?: string, unitId?: string, periodMonth?: number, periodYear?: number) => {
    const formattedDate = date ? (date.includes('-') ? date.split('-').reverse().join('.') : date) : currentDate.toLocaleDateString('tr-TR');
    const newTx: Transaction = { id: Math.random().toString(36).slice(2), type, amount, description: `${description} [${vault}]`, unitId, date: formattedDate, periodMonth, periodYear };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    if (isAuthenticated && !isLoading) {
      try { await db.saveTransactions(updated); setActiveSubView('history'); } catch (err) { alert('Hata: ' + err); }
    } else setActiveSubView('history');
  };

  const handleAddFile = (name: string, category: any, uri?: string, size?: number, fileName?: string) => {
    const newFile: FileEntry = { id: Math.random().toString(36).slice(2), name, category, date: currentDate.toLocaleDateString('tr-TR'), size: size ? (size / 1024).toFixed(1) + ' KB' : '0 KB', extension: 'pdf', uri, fileName };
    setFiles(p => [newFile, ...p]);
  };

  const handleShareFile = async (file: FileEntry) => {
    try {
      const { Share } = await import('@capacitor/share');
      if (file.uri) { markExternalIntent(); await Share.share({ title: file.name, text: file.name, url: file.uri, dialogTitle: 'Aç veya Paylaş' }); }
    } catch (e) {}
  };

  const handleOpenFile = async (file: FileEntry) => {
    try {
      if (!file.uri) return;
      if (Capacitor.isNativePlatform()) {
        const { FileOpener } = await import('@capacitor-community/file-opener');
        markExternalIntent();
        await FileOpener.open({ filePath: file.uri, contentType: 'application/pdf' });
      } else window.open(file.uri, '_blank');
    } catch (e) {}
  };

  if (!isAuthenticated) {
    if (showRegister) return <RegisterView onBackToLogin={() => setShowRegister(false)} />;
    return <LoginView onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />;
  }

  const unreadCount = messages.filter(m => new Date(m.createdAt).getTime() > lastSeenMsgTime).length;

  const handleMessagesClick = () => {
    setActiveSubView('messages');
    const now = Date.now(); setLastSeenMsgTime(now); localStorage.setItem('galata_last_msg_time', now.toString());
  };

  const handleSendMessage = async (content: string) => {
    const newMsg: AppMessage = { id: Math.random().toString(36).slice(2), senderEmail: auth.currentUser?.email || 'Bilinmiyor', senderName: auth.currentUser?.displayName || 'Kullanıcı', content, createdAt: new Date().toISOString() };
    if (isAuthenticated) await db.pushMessage(newMsg);
  };

  const handleDeleteMessage = async (id: string) => {
    setMessages(p => p.filter(m => m.id !== id));
    if (isAuthenticated && !isLoading) await db.deleteMessage(id);
  };

  const themeClass = "bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a]";

  return (
    <div className={`fixed inset-0 ${themeClass} text-white font-['Outfit'] select-none overflow-hidden flex flex-col`}>
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden">
      {!activeSubView && activeTab === 'home' && <Header info={buildingInfo} onLogout={handleLogout} onMessagesClick={handleMessagesClick} unreadCount={unreadCount} showMessages={true} />}

      <main className="flex-1 relative overflow-hidden">
        {activeSubView ? (
          <div className={`absolute inset-0 ${themeClass} z-[50] overflow-y-auto custom-scrollbar`}>
            {activeSubView === 'tahsilat' && <TahsilatView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} transactions={transactions} onClose={() => setActiveSubView(null)} onSave={(a, desc, v, dt, uId, m, y) => handleAddTransaction(a, desc, 'GELİR', v, dt, uId, m, y)} />}
            {activeSubView === 'gider' && <GiderView currentDate={currentDate} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GİDER', v, dt)} />}
            {activeSubView === 'borclandir' && <BorclandirView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId, m, y) => handleAddTransaction(a, d, 'BORÇLANDIRMA', v, dt, uId, m, y)} />}
            {activeSubView === 'gelir' && <GelirView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GELİR', v, dt)} />}
            {activeSubView === 'iade' && <IadeView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId) => handleAddTransaction(a, d, 'GİDER', v, dt, uId)} />}
            {activeSubView === 'transfer' && <TransferView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'TRANSFER', v, dt)} />}
            {activeSubView === 'units' && <UnitsView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddUnit={handleAddUnit} onEditUnit={handleEditUnit} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'history' && <TransactionsView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} onDeleteTransaction={async (id) => { setTransactions(p => p.filter(x => x.id !== id)); if (isAuthenticated) await db.deleteTransaction(id); }} onUpdateTransaction={tx => setTransactions(p => p.map(x => x.id === tx.id ? tx : x))} />}
            {activeSubView === 'receivables' && <ReceivablesView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} />}
            {activeSubView === 'aidat-cizelge' && <AidatCizelgeView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddDues={() => { }} />}
            {activeSubView === 'monthly-report' && <MonthlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'yearly-report' && <YearlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'board' && <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...p, { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} />}
            {activeSubView === 'messages' && <MessagesView messages={messages} onClose={() => setActiveSubView(null)} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} />}
          </div>
        ) : (
          <div className={`h-full overflow-y-auto px-4 custom-scrollbar ${themeClass}`}>
            {activeTab === 'menu' && <MenuView onActionClick={(sv, tab) => { if (tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} />}
            {activeTab === 'settings' && <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} onAddTransactions={(newTxs) => setTransactions(prev => [...newTxs, ...prev])} />}
            {activeTab === 'sessions' && <SessionsView activeSiteId={activeSiteId} userSites={userSites} onSelectSite={(id) => { setActiveSiteId(id); localStorage.setItem('galata_active_site_id', id); setActiveTab('home'); }} onCreateSite={async (name) => { const currentUser = auth.currentUser; if (currentUser) { const newId = 'site_' + Math.random().toString(36).slice(2); await db.addSiteToUser(currentUser.uid, newId, name); const initialInfo = { ...DEFAULT_BUILDING_INFO, name: name }; db.setCurrentSession(`users/${currentUser.uid}/sites/${newId}`); await db.saveBuildingInfo(initialInfo); setUserSites(p => [...p, { id: newId, name }]); setActiveSiteId(newId); localStorage.setItem('galata_active_site_id', newId); setActiveTab('home'); } }} onDeleteSite={async (id) => { const currentUser = auth.currentUser; if (currentUser && userSites.length > 1) { await db.removeSiteFromUser(currentUser.uid, id); setUserSites(p => p.filter(s => s.id !== id)); if (activeSiteId === id) { const nextSite = userSites.find(s => s.id !== id); if (nextSite) { setActiveSiteId(nextSite.id); localStorage.setItem('galata_active_site_id', nextSite.id); } } } else alert("Son kalan siteyi silemezsiniz."); }} onUpdateUnits={async (newCount: number) => { setUnits(prev => { const currentCount = prev.length; if (newCount > currentCount) { const added = Array.from({ length: newCount - currentCount }, (_, i) => ({ id: (currentCount + i + 1).toString(), no: (currentCount + i + 1).toString(), ownerName: "", phone: "", credit: 0, debt: 0, status: "Malik", type: "3+1", m2: 100, huzurHakki: "YOK" })); return [...prev, ...added]; } else if (newCount < currentCount) return prev.slice(0, newCount); return prev; }); }} info={buildingInfo} units={unitsWithBalances} onClose={() => setActiveTab('home')} onUpdateInfo={setBuildingInfo} />}
            {activeTab === 'home' && (
              <div className="h-full flex flex-col pt-1 pb-20 space-y-1 overflow-hidden touch-none">
                <SummaryCard balance={balance} />
                <div className="flex-1 min-h-0 flex flex-col justify-center py-1">
                  <ActionGrid variant="grid" onActionClick={a => { const m: any = { 'Tahsilat': 'tahsilat', 'Gider': 'gider', 'Borçlandır': 'borclandir', 'Gelir': 'gelir', 'İade': 'iade', 'Transfer': 'transfer', 'Bağımsız Bölümler': 'units', 'İşlem Hareketleri': 'history', 'Alacak Listesi': 'receivables', 'AİDAT ÇİZELGE': 'aidat-cizelge', 'AYLIK BİLANÇO': 'monthly-report', 'YILLIK BİLANÇO': 'yearly-report' }; if (m[a]) setActiveSubView(m[a]); }} />
                </div>
                <div className="flex-shrink-0">
                  <LastTransaction transaction={(Array.isArray(transactions) && transactions.length > 0) ? transactions[0] : null} />
                </div>
              </div>
            )}
            {activeTab === 'files' && <FilesView currentDate={currentDate} files={files} onAddFile={f => setFiles(p => [...p, { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={handleOpenFile} onShareFile={handleShareFile} />}
          </div>
        )}
      </main>

      {!activeSubView && activeTab !== 'settings' && (
        <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
      )}
      </div>
    </div>
  );
};

export default App;
