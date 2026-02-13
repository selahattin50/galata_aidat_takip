
import React, { useState } from 'react';
import { Home, ChevronLeft } from 'lucide-react';
import FindManagementView from './FindManagementView';
import CreateManagementView from './CreateManagementView';

interface CreateSessionViewProps {
  onClose: () => void;
  onManagementCreated: (data: any) => void;
}

const CreateSessionView: React.FC<CreateSessionViewProps> = ({ onClose, onManagementCreated }) => {
  const [activeSubView, setActiveSubView] = useState<'find' | 'create' | null>(null);

  if (activeSubView === 'find') {
    return <FindManagementView onClose={() => setActiveSubView(null)} />;
  }

  if (activeSubView === 'create') {
    return <CreateManagementView 
      onClose={() => setActiveSubView(null)} 
      onSuccess={(data) => {
        onManagementCreated(data);
      }}
    />;
  }

  return (
    <div className="absolute inset-0 z-[110] bg-gradient-to-b from-[#0f172a] to-[#020617] p-8 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
      {/* Top Left Close Arrow */}
      <button 
        onClick={onClose}
        className="absolute left-6 top-8 p-2 bg-white/5 rounded-xl hover:bg-white/10 active:scale-90 transition-all z-10"
      >
        <ChevronLeft size={28} className="text-zinc-500" />
      </button>

      {/* Header Section */}
      <div className="flex flex-col items-center text-center mt-12 mb-10">
        <div className="text-white mb-6">
          <Home size={80} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black text-white leading-none mb-3 uppercase tracking-tight">
          YENİ OTURUM OLUŞTURUN
        </h2>
        <p className="text-sm font-medium text-white/70 italic leading-snug px-4">
          Yeni bir yönetim kurun ya da var olan bir yönetime katılım isteğinde bulunun.
        </p>
      </div>

      {/* Action Cards */}
      <div className="space-y-6 max-w-sm mx-auto">
        {/* Malik / Kiracı Card */}
        <button 
          onClick={() => setActiveSubView('find')}
          className="w-full bg-gradient-to-br from-[#134e4a] to-[#0d9488] rounded-[32px] p-8 text-center border border-white/10 shadow-2xl active:scale-[0.98] transition-all group"
        >
          <h3 className="text-xl font-black text-white mb-4 uppercase tracking-wider group-hover:scale-105 transition-transform">
            MALİK / KİRACI
          </h3>
          <p className="text-xs font-medium text-white/80 leading-relaxed italic">
            Bu uygulamayı kullanan site ve apartman yönetimlerindeki kat malikleri yada kiracıları bu seçeneği kullanır.
          </p>
        </button>

        {/* Yönetici Card */}
        <button 
          onClick={() => setActiveSubView('create')}
          className="w-full bg-gradient-to-br from-[#064e3b] to-[#0f766e] rounded-[32px] p-8 text-center border border-white/10 shadow-2xl active:scale-[0.98] transition-all group"
        >
          <h3 className="text-xl font-black text-white mb-4 uppercase tracking-wider group-hover:scale-105 transition-transform">
            YÖNETİCİ
          </h3>
          <p className="text-xs font-medium text-white/80 leading-relaxed italic">
            Uygulamayı ilk kez kullanmak isteyen site ya da apartman yöneticileri bu seçeneği kullanır.
          </p>
        </button>
      </div>
    </div>
  );
};

export default CreateSessionView;
