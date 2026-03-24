import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, Phone, Calendar, Trash2, Loader2, ShieldCheck, ChevronRight, Search, X } from 'lucide-react';
import { db } from '../databaseService';
import { auth } from '../firebaseConfig';
import { useAndroidBackHandler } from '../appBackButton';

interface User {
  uid?: string;
  sourcePath?: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface UserManagementViewProps {
  onClose: () => void;
}

interface ScanCategorySummary {
  key: string;
  label: string;
  total: number;
  perSource: { label: string; count: number }[];
}

interface CloudScanSummary {
  totalRecords: number;
  scannedSources: number;
  categories: ScanCategorySummary[];
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [cloudScanSummary, setCloudScanSummary] = useState<CloudScanSummary | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<{ email: string, bannedAt: string }[]>([]);
  const [migrationSource, setMigrationSource] = useState('');
  const [migrationTarget, setMigrationTarget] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  useAndroidBackHandler(() => {
    if (showDeleteModal) {
      setShowDeleteModal(false);
      setSelectedUserToDelete(null);
      return true;
    }

    onClose();
    return true;
  });

  // Güvenlik Kontrolü: Sadece ana yönetici girebilir
  if (auth.currentUser?.email !== 'selahattin50@gmail.com') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-500 font-black uppercase tracking-widest p-10 text-center">
        BU SAYFAYA ERİŞİM YETKİNİZ YOKTUR!
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const countEntries = (value: any): number => {
    if (!value) return 0;
    if (Array.isArray(value)) {
      return value.filter(item => item !== null && item !== undefined).length;
    }
    if (typeof value === 'object') {
      return Object.values(value).filter(item => item !== null && item !== undefined).length;
    }
    return 1;
  };

  const getSourceLabel = (sourcePath: string, data: any, fallbackId: string) => {
    const profile = data?.building_info || {};
    const siteName = profile?.name || profile?.managerName;
    const email = data?.email;

    if (sourcePath.includes('/sites/')) {
      return siteName || `Alt Site: ${fallbackId}`;
    }

    return email || siteName || `Kullanici: ${fallbackId}`;
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setCloudScanSummary(null);
      setDebugInfo('Tarama başlatılıyor...');

      let finalUsers: User[] = [];
      let lastError = null;
      const categoryMap = new Map<string, ScanCategorySummary>([
        ['building_info', { key: 'building_info', label: 'PROFIL BILGISI', total: 0, perSource: [] }],
        ['units', { key: 'units', label: 'BAGIMSIZ BOLUMLER', total: 0, perSource: [] }],
        ['transactions', { key: 'transactions', label: 'ISLEM HAREKETLERI', total: 0, perSource: [] }],
        ['board_members', { key: 'board_members', label: 'YONETIM KURULU', total: 0, perSource: [] }],
        ['files', { key: 'files', label: 'DOSYALAR', total: 0, perSource: [] }],
        ['messages', { key: 'messages', label: 'MESAJLAR', total: 0, perSource: [] }],
      ]);
      let scannedSources = 0;

      const addCategoryCount = (key: string, count: number, sourceLabel: string) => {
        if (count <= 0) return;
        const category = categoryMap.get(key);
        if (!category) return;
        category.total += count;
        category.perSource.push({ label: sourceLabel, count });
      };

      const scanSessionData = (sessionData: any, sourcePath: string, fallbackId: string) => {
        if (!sessionData || typeof sessionData !== 'object') return;

        scannedSources += 1;
        const sourceLabel = getSourceLabel(sourcePath, sessionData, fallbackId);

        addCategoryCount('building_info', sessionData.building_info ? 1 : 0, sourceLabel);
        addCategoryCount('units', countEntries(sessionData.units), sourceLabel);
        addCategoryCount('transactions', countEntries(sessionData.transactions), sourceLabel);
        addCategoryCount('board_members', countEntries(sessionData.board_members), sourceLabel);
        addCategoryCount('files', countEntries(sessionData.files), sourceLabel);
        addCategoryCount('messages', countEntries(sessionData.messages), sourceLabel);
      };

      // 1. Önce _userProfiles tablosunu dene
      setDebugInfo('Adım 1: _userProfiles taranıyor...');
      try {
        const usersData = await db.getDataDirect('_userProfiles');
        if (usersData) {
          const profileList = Object.keys(usersData).map(uid => ({
            uid: uid,
            sourcePath: `_userProfiles/${uid}`,
            email: usersData[uid].email,
            name: usersData[uid].name,
            phone: usersData[uid].phone,
            createdAt: usersData[uid].createdAt
          }));
          finalUsers = [...finalUsers, ...profileList];
          setDebugInfo(`_userProfiles: ${profileList.length} kullanıcı bulundu.`);
        } else {
          setDebugInfo('_userProfiles: Veri bulunamadı.');
        }
      } catch (err: any) {
        console.warn('Failed to read _userProfiles:', err);
        lastError = err;
        setDebugInfo(`_userProfiles: Hata (${err.message?.substring(0, 30)}...)`);
      }

      // 2. Eğer ilk yol başarısızsa veya boşsa, 'users' kök dizinini dene
      setDebugInfo(prev => prev + '\nAdım 2: users kök dizini taranıyor...');
      try {
        const rootUsers = await db.getDataDirect('users');
        if (rootUsers) {
          const uids = Object.keys(rootUsers);
          let count = 0;
          let nestedSiteCount = 0;
          for (const uid of uids) {
            const rootUserData = rootUsers[uid];
            scanSessionData(rootUserData, `users/${uid}`, uid);
            // Eğer bu UID zaten finalUsers'da yoksa ekle
            if (!finalUsers.find(u => u.sourcePath === `users/${uid}`)) {
              const profile = rootUserData?.building_info || {};
              finalUsers.push({
                uid: uid,
                sourcePath: `users/${uid}`,
                email: rootUserData?.email || (profile.managerName ? `${profile.managerName} (Bina: ${profile.name || '?'})` : `UID: ${uid.substring(0, 6)}...`),
                name: profile.name || profile.managerName || 'İsimsiz Kullanıcı',
                phone: '',
                createdAt: ''
              });
              count++;
            }
            const sites = rootUserData?.sites;
            if (sites && typeof sites === 'object') {
              for (const siteId of Object.keys(sites)) {
                const siteData = sites[siteId];
                scanSessionData(siteData, `users/${uid}/sites/${siteId}`, siteId);
                const profile = siteData?.building_info || {};
                const sourcePath = `users/${uid}/sites/${siteId}`;
                if (!finalUsers.find(u => u.sourcePath === sourcePath)) {
                  finalUsers.push({
                    uid: `${uid}:${siteId}`,
                    sourcePath: sourcePath,
                    email: rootUserData?.email || (profile.managerName ? `${profile.managerName} (Site: ${profile.name || siteId})` : `Site: ${siteId}`),
                    name: profile.name || profile.managerName || `Site: ${siteId}`,
                    phone: '',
                    createdAt: ''
                  });
                  nestedSiteCount++;
                }
              }
            }
          }
          setDebugInfo(prev => prev + `\nusers: ${count} ana kayıt, ${nestedSiteCount} alt site eklendi.`);
        } else {
          setDebugInfo(prev => prev + '\nusers: Veri bulunamadı.');
        }
          const categories = Array.from(categoryMap.values()).filter(category => category.total > 0);
          const totalRecords = categories.reduce((sum, category) => sum + category.total, 0);
          setCloudScanSummary({
            totalRecords,
            scannedSources,
            categories
          });
          setDebugInfo(prev => prev + `\nBulut tarama ozeti hazir: ${scannedSources} kaynak, ${totalRecords} kayit.`);
      } catch (err: any) {
        console.warn('Failed to read users root:', err);
        if (!lastError) lastError = err;
        setDebugInfo(prev => prev + `\nusers root: Hata (${err.message?.substring(0, 30)}...)`);
      }

      if (finalUsers.length > 0) {
        // Sort: selahattin50@gmail.com first
        // Tekrar edenleri temizle (email bazlı)
        const uniqueUsers = Array.from(new Map(finalUsers.map(u => [u.sourcePath || u.uid || u.email, u])).values());

        uniqueUsers.sort((a, b) => {
          if (a.email === 'selahattin50@gmail.com') return -1;
          if (b.email === 'selahattin50@gmail.com') return 1;
          return 0;
        });
        setUsers(uniqueUsers);
        setDebugInfo(prev => prev + `\nToplam ${uniqueUsers.length} benzersiz kullanıcı yüklendi.`);
      } else if (lastError && lastError.message?.toLowerCase().includes('permission denied')) {
        setErrorMessage('Firebase Güvenlik Kuralları Engelliyor (Permission Denied). Lütfen admin yetkilerinizi Firebase Console üzerinden kontrol edin.');
      } else {
        setDebugInfo(prev => prev + '\nKayıtlı kullanıcı verisi bulunamadı.');
      }
    } catch (error: any) {
      console.error('Genel yükleme hatası:', error);
      setErrorMessage(`Hata: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }

    // Yasaklı kullanıcıları da getir
    loadBannedUsers();
  };

  const loadBannedUsers = async () => {
    try {
      const bannedData = await db.getDataDirect('_bannedUsers');
      if (bannedData) {
        const list = Object.keys(bannedData).map(key => ({
          email: bannedData[key].email,
          bannedAt: bannedData[key].bannedAt
        }));
        setBannedUsers(list);
      } else {
        setBannedUsers([]);
      }
    } catch (error) {
      console.warn('Yasaklı listesi yüklenemedi:', error);
    }
  };

  const handleUnbanUser = async (email: string) => {
    if (window.confirm(`${email} üzerindeki banı kaldırmak istediğinize emin misiniz?`)) {
      try {
        const emailKey = email.replace(/[.@]/g, '_');
        await db.deleteDataDirect(`_bannedUsers/${emailKey}`);
        setBannedUsers(bannedUsers.filter(u => u.email !== email));
        alert('Ban başarıyla kaldırıldı. Kullanıcı artık tekrar kayıt olabilir.');
      } catch (error) {
        console.error('Ban kaldırılamadı:', error);
        alert('Hata: Ban kaldırılamadı.');
      }
    }
  };

  const confirmDelete = async (type: 'delete' | 'ban') => {
    if (!selectedUserToDelete) return;
    const user = selectedUserToDelete;

    try {
      setIsDeleting(true);

      // 1. Profil bilgisini sil
      if (user.sourcePath?.startsWith('users/')) {
        await db.deleteDataDirect(user.sourcePath);
      } else if (user.uid) {
        await db.deleteDataDirect(`_userProfiles/${user.uid}`);
      } else {
        const emailKey = user.email.replace(/[.@]/g, '_');
        await db.deleteDataDirect(`_userProfiles/${emailKey}`);
      }

      // 2. Eğer BAN seçildiyse yasaklı listesine ekle
      if (type === 'ban') {
        const emailKey = user.email.replace(/[.@]/g, '_');
        await db.saveData(`_bannedUsers/${emailKey}`, {
          email: user.email,
          bannedAt: new Date().toISOString(),
          reason: 'Yönetici tarafından yasaklandı'
        });
      }

      setUsers(users.filter(u => (u.sourcePath || u.email) !== (user.sourcePath || user.email)));
      setShowDeleteModal(false);
      alert(type === 'ban' ? 'Kullanıcı yasaklandı ve silindi.' : 'Kullanıcı silindi.');
    } catch (error) {
      console.error('İşlem başarısız:', error);
      alert('İşlem sırasında bir hata oluştu.');
    } finally {
      setIsDeleting(false);
      setSelectedUserToDelete(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.email === 'selahattin50@gmail.com') {
      alert('Ana yönetici silinemez!');
      return;
    }
    setSelectedUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleMigrate = async () => {
    if (!migrationSource || !migrationTarget) {
      alert('Lütfen kaynak ve hedef bilgilerini eksiksiz girin.');
      return;
    }

    if (migrationSource === migrationTarget) {
      alert('Kaynak ve hedef aynı olamaz.');
      return;
    }

    const confirmed = window.confirm(`${migrationSource} verilerini ${migrationTarget} hesabına aktarmak istediğinize emin misiniz? Bu işlem mevcut verilerin üzerine yazabilir.`);
    if (!confirmed) return;

    try {
      setIsMigrating(true);
      setDebugInfo(`Aktarım başlatıldı: ${migrationSource} -> ${migrationTarget}`);

      // 1. Kaynak ve hedef UID'lerini bul
      let sourceUid = '';
      let targetUid = '';

      // Kullanıcı listesinden bulmayı dene
      const sUser = users.find(u => u.email === migrationSource || u.uid === migrationSource);
      const tUser = users.find(u => u.email === migrationTarget || u.uid === migrationTarget);

      sourceUid = sUser?.uid || migrationSource;
      targetUid = tUser?.uid || migrationTarget;

      // 2. Verileri çek
      setDebugInfo(prev => prev + `\nKaynak veri okunuyor (${sourceUid})...`);
      const sourceData = await db.getDataDirect(sourceUid);

      if (!sourceData) {
        throw new Error('Kaynak hesapta aktarılacak veri bulunamadı.');
      }

      // 3. Hedef hesaba yaz (building_info hariç? Genelde hepsi aktarılır)
      // building_info'yu korumak isteyebiliriz ama migration genelde tam aktarımdır.
      setDebugInfo(prev => prev + `\nVeriler hedefe yazılıyor (${targetUid})...`);
      
      // Bazı kritik alanları korumak isteyebiliriz (email gibi)
      if (sourceData.building_info && tUser?.email) {
        // sourceData.building_info.managerEmail = tUser.email; // Opsiyonel
      }

      await db.saveDataDirect(targetUid, sourceData);

      // 4. Eğer kanyak UID biliniyorsa ve email değilse (geçici ID ise) eskiyi silmek isteyebiliriz?
      // Şimdilik sadece kopyalıyoruz, güvenli tarafta kalalım.

      alert('Veri aktarımı başarıyla tamamlandı.');
      setDebugInfo(prev => prev + '\nAktarım BAŞARILI.');
      setMigrationSource('');
      setMigrationTarget('');
    } catch (error: any) {
      console.error('Migration error:', error);
      alert(`Aktarım hatası: ${error.message}`);
      setDebugInfo(prev => prev + `\nHATA: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32">
      <div className="sticky top-0 z-[200] -mx-4 px-4 py-4 mb-6 bg-[#030712] backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="bg-white/5 p-3 rounded-xl active:scale-90 transition-all border border-white/5 hover:bg-white/10"
        >
          <ArrowLeft size={22} className="text-zinc-400" />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 text-center">KULLANICI YÖNETİMİ</h3>
        <div className="w-10" />
      </div>

      <div className="px-2">
        {/* Admin Tools */}
        <div className="space-y-4 mb-8">

          {/* Veri Aktarma (Migration) */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl">
            <h4 className="flex items-center text-sm font-black text-white uppercase tracking-tight mb-4">
              <ChevronRight size={18} className="text-indigo-400 mr-2" />
              Veri Aktarma (Migration)
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black opacity-40 uppercase block mb-1">KAYNAK (EMAIL/USERNAME/UID)</label>
                <input 
                  type="text" 
                  value={migrationSource}
                  onChange={(e) => setMigrationSource(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder-white/20" 
                  placeholder="Eski hesap e-postası veya UID" 
                />
                <p className="text-[10px] text-indigo-400/80 italic mt-1.5">* Sahipsiz veriler için UID veya 'Bilinmiyor' yazın.</p>
              </div>
              <div>
                <label className="text-[10px] font-black opacity-40 uppercase block mb-1">HEDEF (EMAIL/UID)</label>
                <input 
                  type="text" 
                  value={migrationTarget}
                  onChange={(e) => setMigrationTarget(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder-white/20" 
                  placeholder="Yeni hesap e-postası veya UID" 
                />
              </div>
              <button 
                onClick={handleMigrate}
                disabled={isMigrating}
                className={`w-full ${isMigrating ? 'bg-indigo-900/50' : 'bg-indigo-600 hover:bg-indigo-500'} text-white rounded-xl py-3 font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4`}
              >
                {isMigrating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span>{isMigrating ? 'Veriler Aktarılıyor...' : 'Verileri Aktar'}</span>
              </button>
            </div>
          </div>

          {/* Veri Tarayıcı */}
          <div className="bg-emerald-900/10 backdrop-blur-md rounded-3xl p-5 border border-emerald-500/20 shadow-xl">
            <h4 className="flex items-center text-sm font-black text-emerald-400 tracking-tight mb-2">
              <Search size={18} className="mr-2" />
              Veri Tarayıcı
            </h4>
            <p className="text-[12px] text-white/60 mb-4 font-medium">Bulut veritabanındaki tüm verileri tarar.</p>
            <button
              onClick={() => {
                const confirmed = window.confirm('Bulut veritabanındaki tüm dalları taramak istiyor musunuz? Bu işlem yetki durumuna bağlıdır.');
                if (confirmed) loadUsers();
              }}
              disabled={isLoading}
              className={`w-full ${isLoading ? 'bg-emerald-800/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'} text-white rounded-xl py-3 font-bold text-sm shadow-xl active:scale-95 transition-all`}
            >
              {isLoading ? 'Bulut Verileri Taraniyor...' : 'Bulut Verilerini Tara (Yenile)'}
            </button>
            {cloudScanSummary && !errorMessage && (
              <div className="mt-5 rounded-[28px] bg-amber-100 border border-amber-200/90 p-4 shadow-inner">
                <div className="mb-3 flex items-center justify-end">
                  <button
                    onClick={() => setCloudScanSummary(null)}
                    className="rounded-full bg-amber-200/80 p-2 text-amber-900 transition-all active:scale-90"
                    aria-label="Bulut raporunu kapat"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3 font-mono text-[11px] leading-7 text-slate-900 sm:text-xs">
                  {cloudScanSummary.categories.map(category => (
                    <div key={category.key}>
                      <p className="uppercase tracking-[0.18em] text-slate-900">
                        {category.label}: {category.total} kayit bulundu.
                      </p>
                      {category.perSource.map(source => (
                        <p key={`${category.key}-${source.label}`} className="text-slate-700">
                          - {source.label}: {source.count} kayit
                        </p>
                      ))}
                    </div>
                  ))}
                  <div className="pt-2 border-t border-amber-300">
                    <p className="uppercase tracking-[0.18em] text-slate-950">
                      TOPLAM {cloudScanSummary.totalRecords} kayit tarandi.
                    </p>
                    <p className="text-slate-700">
                      {cloudScanSummary.scannedSources} kaynak oturum incelendi.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-3 px-1">KAYITLI KULLANICILAR</h3>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6">
            <p className="text-xs font-black text-red-400 text-center uppercase tracking-widest mb-3">{errorMessage}</p>
            <div className="bg-black/20 rounded-xl p-3 space-y-2">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight">• Firebase Console adresine gidin.</p>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight">• Realtime Database {'>'} Rules sekmesini açın.</p>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight underline">• 'selahattin50@gmail.com' için OKUMA yetkisi verin.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={40} className="animate-spin text-emerald-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/5">
            <Users size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Henüz kayıtlı kullanıcı yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={user.sourcePath || user.uid || user.email}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/20">
                      <Users size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{user.name}</h4>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="bg-red-600/10 hover:bg-red-600/20 p-2.5 rounded-xl border border-red-500/20 active:scale-90 transition-all"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 bg-black/20 rounded-xl p-3 border border-white/5">
                    <Phone size={14} className="text-green-400" />
                    <span className="text-xs font-bold text-white/70">{user.phone || 'Girilmemiş'}</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-black/20 rounded-xl p-3 border border-white/5">
                    <Calendar size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-white/70">Kayıt: {formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Yasaklı Kullanıcılar Bölümü */}
        {bannedUsers.length > 0 && (
          <div className="mt-10">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-red-500/50 mb-3 px-1">YASAKLI (BANLI) LİSTESİ</h3>
            <div className="space-y-3">
              {bannedUsers.map((user) => (
                <div key={user.email} className="bg-red-950/10 border border-red-500/10 rounded-3xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/10">
                      <ShieldCheck size={20} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{user.email}</p>
                      <p className="text-[9px] font-black text-red-400/40 uppercase tracking-widest mt-0.5">YASAKLANDI: {formatDate(user.bannedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbanUser(user.email)}
                    className="h-10 px-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 transition-all uppercase tracking-widest"
                  >
                    BANI KALDIR
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Silme Seçenekleri Modalı */}
        {showDeleteModal && selectedUserToDelete && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center px-6 animate-in fade-in duration-300">
            <div className="bg-[#1e293b] w-full max-w-sm rounded-[32px] p-6 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 size={28} className="text-red-400" />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">KULLANICIYI SİL</h4>
                <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                  {selectedUserToDelete.email} için silme yöntemini seçin
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => confirmDelete('delete')}
                  disabled={isDeleting}
                  className="w-full bg-white/5 hover:bg-white/10 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] border border-white/5 transition-all text-left px-5 flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span>SADECE BİLGİLERİ SİL</span>
                    <span className="text-[8px] opacity-40 font-bold mt-1">TEKRAR KAYIT OLABİLİR</span>
                  </div>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                </button>

                <button
                  onClick={() => confirmDelete('ban')}
                  disabled={isDeleting}
                  className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/20 transition-all text-left px-5 flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span>TAMAMEN BANLA VE SİL</span>
                    <span className="text-[8px] opacity-40 font-bold mt-1">BİR DAHA KAYIT OLAMAZ</span>
                  </div>
                  <ChevronRight size={16} className="text-red-500/40 group-hover:text-red-500/60 transition-colors" />
                </button>

                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUserToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="w-full h-12 text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white/40 transition-colors mt-2"
                >
                  İPTAL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementView;
