import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, Phone, Calendar, Trash2, Loader2, ShieldCheck, ChevronRight, Search } from 'lucide-react';
import { db } from '../databaseService';

interface User {
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface UserManagementViewProps {
  onClose: () => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await db.getData('users');

      if (usersData) {
        const usersList: User[] = Object.keys(usersData).map(key => ({
          email: usersData[key].email,
          name: usersData[key].name,
          phone: usersData[key].phone,
          createdAt: usersData[key].createdAt
        }));

        // Sort: selahattin50@gmail.com first, then by createdAt ascending
        usersList.sort((a, b) => {
          if (a.email === 'selahattin50@gmail.com') return -1;
          if (b.email === 'selahattin50@gmail.com') return 1;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });

        setUsers(usersList);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (window.confirm(`${email} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      try {
        const emailKey = email.replace(/[.@]/g, '_');
        await db.deleteData(`users/${emailKey}`);
        setUsers(users.filter(u => u.email !== email));
        alert('Kullanıcı silindi');
      } catch (error) {
        console.error('Kullanıcı silinemedi:', error);
        alert('Silme işlemi başarısız oldu');
      }
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
                <label className="text-[10px] font-black opacity-40 uppercase block mb-1">KAYNAK (EMAIL/USERNAME)</label>
                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder-white/20" placeholder="admin" />
                <p className="text-[10px] text-indigo-400/80 italic mt-1.5">* Sahipsiz veriler için 'Bilinmiyor' yazın.</p>
              </div>
              <div>
                <label className="text-[10px] font-black opacity-40 uppercase block mb-1">HEDEF (EMAIL)</label>
                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder-white/20" placeholder="selahattin50@gmail.com" />
              </div>
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4">
                <ChevronRight size={16} />
                <span>Verileri Aktar</span>
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
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold text-sm shadow-xl active:scale-95 transition-all">
              Bulut Verilerini Tara
            </button>
          </div>

        </div>

        <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-3 px-1">KAYITLI KULLANICILAR</h3>

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
                key={user.email}
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
                    onClick={() => handleDeleteUser(user.email)}
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
      </div>
    </div>
  );
};

export default UserManagementView;
