
import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, Building2, ShieldCheck, Check, Info } from 'lucide-react';

interface LoginViewProps {
  onLogin: (remember: boolean) => void;
  onShowRegister: () => void;
}

const REMEMBERED_USER_KEY = 'galata_remembered_username';

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onShowRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sayfa yüklendiğinde hatırlanan kullanıcı adını getir
  useEffect(() => {
    const savedUser = localStorage.getItem(REMEMBERED_USER_KEY);
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mock authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
      // "Beni Hatırla" seçiliyse kullanıcı adını kaydet, değilse sil
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USER_KEY, cleanUsername);
      } else {
        localStorage.removeItem(REMEMBERED_USER_KEY);
      }
      onLogin(rememberMe);
    } else {
      setError('Hatalı kullanıcı adı veya şifre!');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] app-gradient flex items-center justify-center px-6 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-green-600/10 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-white/5 border border-white/10 mb-6 shadow-2xl relative group">
             <div className="absolute inset-0 bg-blue-500/10 rounded-[28px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <Building2 size={40} className="text-white relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">Galata Apartmanı</h1>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] leading-none">AİDAT TAKİP SİSTEMİ</p>
        </div>

        <div className="bg-[#1e293b]/40 backdrop-blur-2xl rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-1">KULLANICI ADI</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className={`w-full h-14 bg-white/5 border rounded-2xl px-12 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all placeholder:text-white/10 ${error ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/50'}`}
                  required
                />
                <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-white/20 group-focus-within:text-blue-400'}`} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-1">ŞİFRE</label>
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
              
              <button type="button" className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest hover:text-blue-400 transition-colors">Şifremi Unuttum</button>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
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

            {/* Register Button */}
            <button 
              type="button"
              onClick={onShowRegister}
              className="w-full h-14 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
            >
              YENİ HESAP OLUŞTUR
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center flex flex-col items-center space-y-2 opacity-20">
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">GALATA DİJİTAL YÖNETİM SİSTEMİ</p>
            <p className="text-[8px] font-bold">Version 2.4.0 • 2026 Tüm Hakları Saklıdır</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
