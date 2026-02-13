
import React, { useState, useEffect, useMemo } from 'react';
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

  const handleRegister = async (email: string, password: string, name: string, phone: string) => {
    try {
      console.log('Yeni kullanıcı kaydı:', { email, name, phone });
      
      // Kullanıcı bilgilerini Firebase'e kaydet
      const userData = {
        email,
        password, // Not: Gerçek uygulamada şifreyi hash'lemek gerekir
        name,
        phone,
        createdAt: new Date().toISOString()
      };
      
      await db.saveData('users/' + email.replace(/[.@]/g, '_'), userData);
      
      alert(`Hesabınız başarıyla oluşturuldu!\n\nE-posta: ${email}\nAd: ${name}\n\nŞimdi giriş yapabilirsiniz.`);
      setShowRegister(false);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      alert('Kayıt sırasında hata oluştu: ' + (error as Error).message);
    }
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

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterView onRegister={handleRegister} onBackToLogin={() => setShowRegister(false)} />;
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
          activeSubView === 'aidat-cizelge' ? <AidatCizelgeView units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddDues={() => {}} /> :
          activeSubView === 'monthly-report' ? <MonthlyReportView transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
          activeSubView === 'yearly-report' ? <YearlyReportView transactions={transactions} units={unitsWithBalances} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} /> :
          activeSubView === 'board' ? <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...(Array.isArray(p) ? p : []), { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} /> : null
        ) : (
          activeTab === 'menu' ? <MenuView onActionClick={(sv, tab) => { if(tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} /> :
          activeTab === 'settings' ? <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} /> :
          activeTab === 'home' ? <div className="space-y-3 pt-1"><SummaryCard balance={balance} /><ActionGrid variant="grid" onActionClick={a => { const m: any = { 'Tahsilat': 'tahsilat', 'Gider': 'gider', 'Borçlandır': 'borclandir', 'Gelir': 'gelir', 'İade': 'iade', 'Transfer': 'transfer', 'Bağımsız Bölümler': 'units', 'İşlem Hareketleri': 'history', 'Alacak Listesi': 'receivables' }; if (m[a]) setActiveSubView(m[a]); }} /><SecondaryWidgets onActionClick={a => { const m: any = { 'AİDAT ÇİZELGE': 'aidat-cizelge', 'AYLIK BİLANÇO': 'monthly-report', 'YILLIK BİLANÇO': 'yearly-report' }; if (m[a]) setActiveSubView(m[a]); }} /><LastTransaction transaction={(Array.isArray(transactions) && transactions.length > 0) ? transactions[0] : null} /></div> :
          activeTab === 'sessions' ? <SessionsView info={buildingInfo} units={unitsWithBalances} onClose={() => setActiveTab('home')} onManagementCreated={data => { setBuildingInfo(data); setUnits(INITIAL_UNITS); setTransactions([]); }} onManagementUpdated={setBuildingInfo} onDeleteManagement={() => {}} /> : 
          activeTab === 'files' ? <FilesView files={files} onAddFile={f => setFiles(p => [...(Array.isArray(p) ? p : []), { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={async (file) => {
            try {
              const { PDFService } = await import('./pdfService.ts');
              if (file.uri) {
                console.log('PDF açılıyor:', file.uri);
                console.log('Dosya adı:', file.fileName);
                await PDFService.openPDF(file.uri, file.fileName);
              } else {
                alert('Dosya yolu bulunamadı. Lütfen PDF\'i yeniden oluşturun.');
              }
            } catch (error) {
              console.error('PDF açma hatası:', error);
              const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
              // "canceled" hatalarını gösterme
              if (!errorMsg.toLowerCase().includes('canceled')) {
                alert('PDF açılamadı: ' + errorMsg);
              }
            }
          }} /> : null
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
    </div>
  );
};

export default App;
