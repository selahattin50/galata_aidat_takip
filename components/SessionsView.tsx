
import React, { useState, useEffect } from 'react';
import { Home, Building2, Pencil, ArrowLeft, Trash2, AlertTriangle, ShieldAlert, List } from 'lucide-react';
import { BuildingInfo, Unit, Session } from '../types.ts';
import CreateSessionView from './CreateSessionView.tsx';
import EditManagementView from './EditManagementView.tsx';
import { db } from '../databaseService';

interface SessionsViewProps {
  info: BuildingInfo;
  units?: Unit[];
  onClose: () => void;
  onManagementCreated: (data: any) => void;
  onManagementUpdated: (data: BuildingInfo) => void;
  onDeleteManagement: () => void;
  onSwitchSession?: (sessionId: string) => void;
}

const SessionsView: React.FC<SessionsViewProps> = ({ info, units = [], onClose, onManagementCreated, onManagementUpdated, onDeleteManagement, onSwitchSession }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Oturumları yükle
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoadingSessions(true);
        const allSessions = await db.getAllSessions();
        setSessions(allSessions);
        console.log('Yüklenen oturumlar:', allSessions);
      } catch (error) {
        console.error('Oturumlar yüklenemedi:', error);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    
    loadSessions();
  }, []);

  if (showCreate) return <CreateSessionView onClose={() => setShowCreate(false)} onManagementCreated={(data) => { onManagementCreated(data); setShowCreate(false); onClose(); }} />;
  if (showEdit) return <EditManagementView info={info} units={units} onClose={() => setShowEdit(false)} onSuccess={(data) => { onManagementUpdated(data); setShowEdit(false); }} />;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32">
      <div className="sticky top-0 z-[100] -mx-4 px-4 py-4 mb-6 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button onClick={onClose} className="bg-white/5 p-2 rounded-xl active:scale-90 transition-all border border-white/5">
          <ArrowLeft size={22} className="text-zinc-400" />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 text-center">OTURUM YÖNETİMİ</h3>
        <div className="w-10" />
      </div>

      <div className="px-4 space-y-3">
        {/* Oturum Listesi - Sadece oturum varsa göster */}
        {sessions.length > 0 && (
          <div className="bg-[#0f1729] rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <List size={16} className="text-purple-500" />
              </div>
              <h3 className="text-xs font-black text-white/60 uppercase tracking-widest">Oturum Listesi</h3>
            </div>

            <div className="space-y-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    if (onSwitchSession) {
                      onSwitchSession(session.id);
                      onClose();
                    }
                  }}
                  className="w-full bg-[#1e293b] hover:bg-[#2d3a4f] rounded-xl p-3 border border-white/10 transition-all group text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Building2 size={18} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wide">{session.name}</p>
                        <p className="text-[10px] text-white/40">ID: {session.id}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-white/30">
                      {new Date(session.lastAccessed).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Yönetim Ekle */}
        <div className="bg-[#0f1729] rounded-2xl p-4 border border-green-500/20">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-green-500" />
            </div>
            <h3 className="text-xs font-black text-white/60 uppercase tracking-widest">Yönetim Ekle</h3>
          </div>

          <button 
            onClick={() => setShowCreate(true)}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl py-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <Building2 size={16} />
            <span>Yeni Yönetim Oluştur</span>
          </button>
        </div>

        {/* Mevcut Yönetim Düzenle */}
        <div className="bg-[#0f1729] rounded-2xl p-4 border border-blue-500/20">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-blue-500" />
            </div>
            <h3 className="text-xs font-black text-white/60 uppercase tracking-widest">Mevcut Yönetimi Düzenle</h3>
          </div>

          <button 
            onClick={() => setShowEdit(true)}
            className="w-full bg-[#1e293b] hover:bg-[#2d3a4f] rounded-xl p-4 border border-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Home size={20} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-white uppercase tracking-wide mb-0.5">Yönetim Paneli</p>
                  <p className="text-[10px] text-white/40">Bilgileri Güncelle</p>
                </div>
              </div>
              <Pencil size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
          </button>
        </div>

        {/* Yönetim Bilgileri */}
        <div className="bg-[#0f1729] rounded-2xl p-4 border border-white/10">
          <div className="space-y-2">
            <div className="bg-[#1e293b] rounded-xl p-3">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Yönetim Adı</p>
              <p className="text-sm font-black text-white">{info.name}</p>
            </div>

            <div className="bg-[#1e293b] rounded-xl p-3">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Vergi No</p>
              <p className="text-sm font-black text-white">{info.taxNo || '--- --- ---'}</p>
            </div>

            <div className="bg-[#1e293b] rounded-xl p-3">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Yönetim Adresi</p>
              <p className="text-xs font-bold text-white/80 leading-relaxed">{info.address || 'Mahalle, Sokak, No...'}</p>
            </div>
          </div>
        </div>

        {/* Bilgileri Güncelle Butonu */}
        <button 
          onClick={() => setShowEdit(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-4 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <Pencil size={16} />
          <span>Bilgileri Güncelle</span>
        </button>
      </div>
    </div>
  );
};

export default SessionsView;
