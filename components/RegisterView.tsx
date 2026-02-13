import React, { useState } from 'react';
import { Building, Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface RegisterViewProps {
  onRegister: (email: string, password: string, name: string, phone: string) => void;
  onBackToLogin: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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

    onRegister(email, password, name, phone);
  };

  return (
    <div className="min-h-screen app-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-2xl shadow-blue-900/50">
            <Building size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">HESAP OLUŞTUR</h1>
          <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Galata Yönetim Sistemi</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
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

          {/* Email Input */}
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

          {/* Phone Input */}
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

          {/* Password Input */}
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

          {/* Confirm Password Input */}
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

          {/* Register Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white h-16 rounded-[28px] font-black text-sm uppercase tracking-[0.2em] active:scale-95 transition-all shadow-2xl shadow-blue-900/50 mt-6"
          >
            HESAP OLUŞTUR
          </button>

          {/* Back to Login */}
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center space-x-2 text-white/60 hover:text-white transition-colors py-4"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-black uppercase tracking-widest">GİRİŞ EKRANINA DÖN</span>
          </button>
        </form>

        {/* Info Text */}
        <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest mt-8">
          * İşaretli alanlar zorunludur
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
