
import React, { useState } from 'react';
import { ChevronLeft, UserPlus, Phone, MessageCircle, ShieldCheck, X, Trash2, User, ArrowLeft } from 'lucide-react';
import { BoardMember } from '../types.ts';

interface BoardViewProps {
  members: BoardMember[];
  onClose: () => void;
  onAddMember: (member: Omit<BoardMember, 'id'>) => void;
  onDeleteMember: (id: string) => void;
  buildingName: string;
}

const BoardView: React.FC<BoardViewProps> = ({ members, onClose, onAddMember, onDeleteMember, buildingName }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Yönetim Kurulu Başkanı');
  const [phone, setPhone] = useState('');

  const toTitleCase = (str: string) => {
    return str
      .split(/(\s+)/)
      .map(part => {
        if (part.trim().length > 0) {
          return part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR');
        }
        return part;
      })
      .join('');
  };

  const roles = [
    "Yönetim Kurulu Başkanı",
    "Başkan Yardımcısı",
    "Denetçi",
    "Sekreter",
    "Üye",
    "Muhasip Üye"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;
    onAddMember({ name: toTitleCase(name), role, phone });
    setName('');
    setPhone('');
    setShowAddForm(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 pb-24 px-1 relative">
      <div className="flex items-center justify-center mb-6 relative px-1">
        <button 
          onClick={onClose}
          className="absolute left-0 bg-white/5 p-3 rounded-xl hover:bg-white/10 active:scale-90 transition-all border border-white/5"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-500 text-center">YÖNETİM KURULU</h3>
        <button 
          onClick={() => setShowAddForm(true)}
          className="absolute right-0 bg-green-600/20 border border-green-500/30 p-2 rounded-xl active:scale-90 transition-all shadow-lg"
        >
          <UserPlus size={20} className="text-green-400" />
        </button>
      </div>

      <div className="flex-1 bg-[#1e293b] rounded-xl py-2 px-4 flex items-center shadow-lg border border-white/5 mb-6">
        <span className="text-white font-bold text-sm tracking-tight truncate">{buildingName}</span>
      </div>

      <div className="flex items-center space-x-2 mb-4 px-2">
        <ShieldCheck size={14} className="text-blue-400" />
        <h3 className="text-[10px] font-black text-white/60 uppercase tracking-widest">GÜNCEL YÖNETİM KURULU</h3>
      </div>

      <div className="space-y-3 px-1">
        {members.length === 0 ? (
          <div className="bg-[#1e293b]/40 rounded-[32px] p-12 flex flex-col items-center justify-center border border-white/5 opacity-40">
            <User size={48} className="mb-4 text-white/20" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">YÖNETİM KAYDI BULUNAMADI</p>
          </div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="bg-[#1e293b]/60 backdrop-blur-md rounded-[32px] p-5 border border-white/5 shadow-xl flex items-center group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center border border-blue-500/20 mr-4 shadow-inner shrink-0">
                <User size={24} className="text-blue-400/70" />
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">{member.role}</span>
                <h4 className="text-sm font-black text-white uppercase truncate tracking-tight">{member.name}</h4>
                <div className="flex items-center space-x-2 mt-1.5">
                   <Phone size={10} className="text-white/20" />
                   <span className="text-[10px] font-bold text-white/30 tracking-tight">{member.phone || 'Telefon Belirtilmedi'}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-3">
                <button 
                  onClick={() => window.open(`tel:${member.phone}`)}
                  className="p-2 bg-green-500/10 rounded-xl hover:bg-green-500/20 transition-all active:scale-90"
                >
                  <Phone size={14} className="text-green-500" />
                </button>
                <button 
                  onClick={() => onDeleteMember(member.id)}
                  className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">YENİ ÜYE EKLE</h3>
              <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">İSİM SOYİSİM</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    value={name}
                    onChange={(e) => setName(toTitleCase(e.target.value))}
                    placeholder="Ad Soyad"
                    className="bg-white/5 w-full h-14 rounded-2xl px-5 pl-12 text-base font-black text-white outline-none border border-white/10 focus:border-green-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                    required
                  />
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">GÖREV / UNVAN</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-white/5 w-full h-14 rounded-2xl px-5 text-sm font-black text-white outline-none border border-white/10 focus:border-green-500/50 focus:bg-white/10 transition-all appearance-none"
                >
                  {roles.map(r => <option key={r} value={r} className="bg-[#1e293b]">{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">TELEFON</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="bg-white/5 w-full h-14 rounded-2xl px-5 pl-12 text-base font-black text-white outline-none border border-white/10 focus:border-green-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                  />
                  <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white h-16 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all mt-4 shadow-xl"
              >
                ÜYEYİ KAYDET
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardView;
