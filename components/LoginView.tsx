
import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, Building2, ShieldCheck, Check, Info, Mail, X } from 'lucide-react';
import { useAndroidBackHandler } from '../appBackButton';

interface LoginViewProps {
  onLogin: (remember: boolean) => void;
  onShowRegister: () => void;
}

const REMEMBERED_USER_KEY = 'galata_remembered_username';
const FAILED_ATTEMPTS_KEY = 'galata_failed_login_attempts';

const getAuthErrorDetails = (error: any, fallbackMessage: string) => {
  const code = error?.code || '';
  const message = error?.message || '';
  const raw = `${code} ${message}`.toLowerCase();
  const isConfigOrConnectionError =
    raw.includes('api_key_invalid') ||
    raw.includes('api key not found') ||
    raw.includes('api key not valid') ||
    raw.includes('api-key-not-valid') ||
    raw.includes('invalid-api-key') ||
    raw.includes('auth/api-key') ||
    raw.includes('network-request-failed');

  if (
    raw.includes('api_key_invalid') ||
    raw.includes('api key not found') ||
    raw.includes('api key not valid') ||
    raw.includes('api-key-not-valid') ||
    raw.includes('invalid-api-key') ||
    raw.includes('auth/api-key')
  ) {
    return {
      message: 'Firebase API key geçersiz. Firebase Console’dan güncel API key alınıp yeni APK oluşturulmalı.',
      isConfigOrConnectionError
    };
  }

  if (raw.includes('network-request-failed')) {
    return {
      message: 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.',
      isConfigOrConnectionError
    };
  }

  if (code === 'auth/invalid-email') {
    return { message: 'Geçersiz e-posta adresi!', isConfigOrConnectionError };
  }

  if (code === 'auth/user-not-found') {
    return { message: 'Kullanıcı bulunamadı!', isConfigOrConnectionError };
  }

  if (code === 'auth/wrong-password') {
    return { message: 'Hatalı şifre!', isConfigOrConnectionError };
  }

  if (code === 'auth/invalid-credential') {
    return { message: 'Hatalı kullanıcı adı veya şifre!', isConfigOrConnectionError };
  }

  if (code === 'auth/too-many-requests') {
    return { message: 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin veya şifrenizi sıfırlayın.', isConfigOrConnectionError };
  }

  if (code === 'auth/operation-not-allowed') {
    return { message: 'E-posta/şifre girişi Firebase Console üzerinde aktif değil.', isConfigOrConnectionError };
  }

  return {
    message: code ? `${fallbackMessage} Hata kodu: ${code}` : fallbackMessage,
    isConfigOrConnectionError
  };
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onShowRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showContactUs, setShowContactUs] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Sayfa yüklendiğinde hatırlanan kullanıcı adını getir
  useEffect(() => {
    const savedUser = localStorage.getItem(REMEMBERED_USER_KEY);
    if (savedUser) {
      setUsername(savedUser);
    }
    const savedPassword = localStorage.getItem('galata_remembered_password');
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  useAndroidBackHandler(() => {
    if (showContactUs) {
      setShowContactUs(false);
      return true;
    }
    if (showForgotPassword) {
      setShowForgotPassword(false);
      setResetEmail('');
      setError('');
      setResetMessage('');
      return true;
    }

    return true;
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Sadece email formatında girişe izin ver
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanUsername)) {
      setError('Lütfen geçerli bir e-posta adresi giriniz! (İsim veya kullanıcı adı ile giriş yapılamaz)');
      setIsLoading(false);
      return;
    }

    // Hatalı deneme sayısını kontrol et
    const failedAttempts = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0');

    // Firebase Authentication ile giriş
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../firebaseConfig');

      await signInWithEmailAndPassword(auth, cleanUsername, cleanPassword);

      // Giriş başarılı - Deneme sayısını sıfırla
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USER_KEY, cleanUsername);
        localStorage.setItem('galata_remembered_password', cleanPassword);
      } else {
        localStorage.removeItem(REMEMBERED_USER_KEY);
        localStorage.removeItem('galata_remembered_password');
      }

      onLogin(rememberMe);
    } catch (error: any) {
      console.error('Giriş hatası:', error);

      const authError = getAuthErrorDetails(error, 'Giriş başarısız!');
      if (authError.isConfigOrConnectionError) {
        localStorage.removeItem(FAILED_ATTEMPTS_KEY);
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // Hatalı deneme sayısını artır
      const newFailedAttempts = failedAttempts + 1;
      localStorage.setItem(FAILED_ATTEMPTS_KEY, newFailedAttempts.toString());

      // Hata mesajlarını Türkçeleştir
      let errorMessage = authError.message;

      // 5. hatalı denemede otomatik mail göndermiyoruz; sadece kullanıcıyı yönlendiriyoruz.
      if (newFailedAttempts >= 5) {
        errorMessage = '5 kez hatalı giriş yapıldı. Şifrenizi unuttuysanız "Şifremi Unuttum" bölümünden sıfırlama isteyin.';
        localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = `Hatalı şifre! Kalan deneme hakkı: ${5 - newFailedAttempts}`;
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = `Hatalı kullanıcı adı veya şifre! Kalan deneme hakkı: ${5 - newFailedAttempts}`;
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Şifre sıfırlama talebi
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!resetEmail.trim() || !emailPattern.test(resetEmail.trim())) {
      setError('Lütfen geçerli bir e-posta adresi girin');
      return;
    }

    setIsLoading(true);

    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../firebaseConfig');

      await sendPasswordResetEmail(auth, resetEmail.trim());

      setResetMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Şifre sıfırlama hatası:', error);

      const errorMessage = getAuthErrorDetails(error, 'Şifre sıfırlama başarısız!').message;

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] flex items-center justify-center px-6 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-green-600/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-36 h-32 mb-5 relative group">
            <img src="/assets/logo.png" alt="Galata Logo" className="h-full w-auto object-contain relative z-10 drop-shadow-xl" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2 leading-none drop-shadow-2xl">
            GALATA AİDAT
          </h1>
          <p className="text-[13px] font-black uppercase tracking-[0.5em] text-zinc-400">
            TAKİP SİSTEMİ
          </p>
        </div>

        <div className="bg-[#1e293b]/50 backdrop-blur-3xl rounded-[40px] p-8 border border-white/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] ml-1">KULLANICI ADI</label>
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ornek@email.com"
                  className={`w-full h-14 bg-white/5 border rounded-2xl px-12 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all placeholder:text-white/10 ${error ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/50'}`}
                  required
                />
                <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-white/20 group-focus-within:text-blue-400'}`} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] ml-1">ŞİFRE</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className={`w-full h-14 bg-white/5 border rounded-2xl px-12 pr-12 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all placeholder:text-white/10 ${error ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/50'}`}
                  required
                />
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-white/20 group-focus-within:text-blue-400'}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-in shake duration-300">
                <p className="text-[10px] font-black text-red-400 text-center uppercase tracking-widest">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center space-x-2 group cursor-pointer"
              >
                <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`}>
                  {rememberMe && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">Beni Hatırla</span>
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest hover:text-blue-400 transition-colors"
              >
                Şifremi Unuttum
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span>SİSTEME GİRİŞ YAP</span>
                  <ShieldCheck size={20} />
                </>
              )}
            </button>

            {/* Register and Contact Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onShowRegister}
                className="flex-1 h-14 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-3xl font-black text-[11px] uppercase tracking-[0.1em] active:scale-[0.98] transition-all"
              >
                YENİ KAYIT OLUŞTUR
              </button>
              <button
                type="button"
                onClick={() => setShowContactUs(true)}
                className="flex-1 h-14 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-3xl font-black text-[11px] uppercase tracking-[0.1em] active:scale-[0.98] transition-all"
              >
                BİZE YAZIN
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center flex flex-col items-center space-y-2 opacity-20">
          <p className="text-[9px] font-black uppercase tracking-[0.3em]">GALATA AİDAT TAKİP SİSTEMİ</p>
          <p className="text-[8px] font-bold">Tum haklari Galata Aidat Takip Sistemine aittir 2026</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#1e293b]/95 backdrop-blur-2xl rounded-[40px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-white mb-2 text-center">ŞİFREMİ UNUTTUM</h2>
            <p className="text-xs text-white/60 text-center mb-6 font-bold">E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-1">E-POSTA ADRESİ</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full h-14 bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-2xl px-12 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all placeholder:text-white/10"
                    required
                  />
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-black text-red-400 text-center uppercase tracking-widest">{error}</p>
                </div>
              )}

              {resetMessage && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-black text-green-400 text-center uppercase tracking-widest">{resetMessage}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setError('');
                    setResetMessage('');
                  }}
                  className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'GÖNDER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {showContactUs && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0f172a] rounded-[16px] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Kırmızı Çarpı Butonu */}
            <button 
              onClick={() => setShowContactUs(false)}
              className="absolute top-0 right-0 bg-red-600 hover:bg-red-500 text-white w-12 h-12 flex items-center justify-center rounded-bl-xl transition-colors z-10"
            >
              <X size={28} strokeWidth={4} />
            </button>

            <div className="p-6 pt-8">
              <div className="flex items-start space-x-4 mb-6">
                <div className="mt-1">
                  <Mail size={48} strokeWidth={1.5} className="text-white" />
                </div>
                <div className="flex-1 pr-8">
                  <h2 className="text-[18px] font-black text-white mb-1 tracking-wide">BİZE YAZIN</h2>
                  <p className="text-xs text-white/60 italic leading-snug">
                    Sorun yaşadığınız konularda ya da sormak istediğiniz herhangi bir konuda bize yazın. Size e-posta adresiniz üzerinden cevap vereceğiz.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="E-Posta Adresiniz"
                    className="w-full h-14 bg-transparent border border-white/80 rounded-sm px-4 text-sm font-bold text-white outline-none focus:border-white transition-colors placeholder:text-white/80"
                  />
                </div>
                <div>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value.slice(0, 500))}
                    className="w-full h-32 bg-transparent border border-white/80 rounded-sm p-4 text-sm font-medium text-white outline-none focus:border-white transition-colors resize-none"
                  />
                  <div className="text-right text-[12px] text-black font-black mt-1 opacity-40">
                    {contactMessage.length}/500
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!contactEmail || !contactMessage) {
                        alert("Lütfen tüm alanları doldurun.");
                        return;
                      }
                      window.location.href = `mailto:selahattin50@gmail.com?subject=Galata Aidat Takip - İletişim&body=Gönderen: ${contactEmail}%0D%0A%0D%0A${contactMessage}`;
                      setShowContactUs(false);
                      setContactEmail('');
                      setContactMessage('');
                    }}
                    className="bg-[#94a3b8] hover:bg-[#cbd5e1] text-[#0f172a] px-8 py-3 rounded-xl font-black text-sm tracking-wide transition-colors shadow-lg active:scale-95"
                  >
                    GÖNDER
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
