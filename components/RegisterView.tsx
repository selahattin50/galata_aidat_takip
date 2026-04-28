import React, { useState } from 'react';
import { Building, Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAndroidBackHandler } from '../appBackButton';

interface RegisterViewProps {
  onBackToLogin: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useAndroidBackHandler(() => {
    onBackToLogin();
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      alert('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    if (password.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      alert('Şifreler eşleşmiyor');
      return;
    }

    // 0. Yasaklı kontrolü
    try {
      const { db } = await import('../databaseService');
      const emailKey = email.trim().toLocaleLowerCase('tr-TR').replace(/[.@]/g, '_');
      const bannedData = await db.getDataDirect(`_bannedUsers/${emailKey}`);

      if (bannedData) {
        alert('Bu e-posta adresi sistemden kalıcı olarak yasaklanmıştır!');
        return;
      }
    } catch (err) {
      console.warn('Ban kontrolü yapılamadı, devam ediliyor...');
    }

    // Firebase Authentication ile kayıt
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { auth } = await import('../firebaseConfig');

      console.log('Firebase Authentication ile kayıt başlatılıyor...');

      // Kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      console.log('Kullanıcı oluşturuldu:', userCredential.user.uid);

      // Kullanıcı profilini güncelle (isim ekle)
      await updateProfile(userCredential.user, {
        displayName: name
      });

      console.log('Profil güncellendi');

      // Ek bilgileri Realtime Database'e kaydet
      const { ref, set } = await import('firebase/database');
      const { database } = await import('../firebaseConfig');

      const userDataRef = ref(database, `_userProfiles/${userCredential.user.uid}`);
      await set(userDataRef, {
        name: name,
        phone: phone || '',
        email: email,
        createdAt: new Date().toISOString()
      });

      console.log('Kullanıcı profili kaydedildi');

      alert(`Hesabınız başarıyla oluşturuldu!\n\nE-posta: ${email}\nAd: ${name}\n\nŞimdi giriş yapabilirsiniz.`);
      onBackToLogin();
    } catch (error: any) {
      console.error('Kayıt hatası:', error);
      let errorMessage = 'Kayıt sırasında hata oluştu!';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi!';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf! En az 6 karakter olmalıdır.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'E-posta/şifre girişi Firebase Console\'da aktif değil!';
      } else if (error.message) {
        errorMessage = `Hata: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 mb-6 shadow-2xl relative group p-3">
            <div className="absolute inset-0 bg-blue-500/10 rounded-[40px] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <img src="/assets/logo.png" alt="Galata Logo" className="w-full h-full object-cover rounded-[28px] relative z-10" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2 tracking-[0.2em] uppercase">HESAP OLUŞTUR</h1>
          <p className="text-xs text-white/20 font-medium uppercase tracking-[0.3em]">Galata Yönetim Sistemi</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-panel rounded-2xl p-1 border border-white/10">
            <div className="flex items-center">
              <div className="bg-white/5 p-3 rounded-xl mr-3">
                <User size={20} className="text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Ad Soyad *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-white/30 flex-1 py-3"
                required
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-1 border border-white/10">
            <div className="flex items-center">
              <div className="bg-white/5 p-3 rounded-xl mr-3">
                <Mail size={20} className="text-white/40" />
              </div>
              <input
                type="email"
                placeholder="E-posta *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-white/30 flex-1 py-3"
                required
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-1 border border-white/10">
            <div className="flex items-center">
              <div className="bg-white/5 p-3 rounded-xl mr-3">
                <Phone size={20} className="text-white/40" />
              </div>
              <input
                type="tel"
                placeholder="Telefon (opsiyonel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-white/30 flex-1 py-3"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-1 border border-white/10">
            <div className="flex items-center">
              <div className="bg-white/5 p-3 rounded-xl mr-3">
                <Lock size={20} className="text-white/40" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Şifre (min 6 karakter) *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-white/30 flex-1 py-3"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-1 border border-white/10">
            <div className="flex items-center">
              <div className="bg-white/5 p-3 rounded-xl mr-3">
                <Lock size={20} className="text-white/40" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Şifre Tekrar *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-white/30 flex-1 py-3"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white h-16 rounded-[28px] font-black text-sm uppercase tracking-[0.2em] active:scale-95 transition-all shadow-2xl shadow-blue-900/50 mt-6"
          >
            HESAP OLUŞTUR
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center space-x-2 text-white/60 hover:text-white transition-colors py-4"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-black uppercase tracking-widest">GİRİŞ EKRANINA DÖN</span>
          </button>
        </form>

        <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest mt-8">
          * İşaretli alanlar zorunludur
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
