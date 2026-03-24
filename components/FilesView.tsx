
import React, { useState } from 'react';
import { FileText, FilePlus, Search, X, Trash2, File, ImageIcon, FileCode, ChevronRight, FolderOpen, Filter, ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { FileEntry } from '../types.ts';
import { useAndroidBackHandler } from '../appBackButton';

interface FilesViewProps {
  files: FileEntry[];
  onAddFile: (file: Omit<FileEntry, 'id'>) => void;
  onDeleteFile: (id: string) => void;
  onOpenFile: (file: FileEntry) => void;
  onShareFile?: (file: FileEntry) => void;
}

const FilesView: React.FC<FilesViewProps> = ({ files, onAddFile, onDeleteFile, onOpenFile, onShareFile }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Hepsi');

  useAndroidBackHandler(() => {
    if (!showAddModal) {
      return false;
    }

    setShowAddModal(false);
    return true;
  });

  const [fileName, setFileName] = useState('');
  const [fileCategory, setFileCategory] = useState<FileEntry['category']>('Fatura');
  const [fileDate, setFileDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = ['Hepsi', 'Fatura', 'Sözleşme', 'Tutanak', 'Karar', 'Diğer'];

  const handleShareFile = async (file: FileEntry) => {
    if (onShareFile) {
      await onShareFile(file);
    }
  };

  const handleOpenFile = async (file: FileEntry) => {
    if (onOpenFile) {
      await onOpenFile(file);
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Hepsi' || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (['jpg', 'png', 'jpeg'].includes(e)) return <ImageIcon className="text-pink-400" size={24} />;
    if (['pdf'].includes(e)) return <FileText className="text-red-400" size={24} />;
    return <File className="text-blue-400" size={24} />;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    onAddFile({
      name: fileName,
      category: fileCategory,
      date: new Date(fileDate).toLocaleDateString('tr-TR'),
      size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB',
      extension: 'pdf'
    });

    setFileName('');
    setShowAddModal(false);
  };

  return (
    <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="flex items-center justify-center mb-6 relative px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-500 text-center">DİJİTAL ARŞİV</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute right-0 bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-900/40 active:scale-95 transition-all"
        >
          <FilePlus size={24} className="text-white" />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="glass-panel rounded-2xl p-1 border border-white/5 flex items-center pr-4">
          <div className="bg-white/5 p-2 rounded-xl mr-3">
            <Search size={16} className="text-white/40" />
          </div>
          <input
            type="text"
            placeholder="Belge ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-white/60 placeholder:text-white/10 flex-1"
          />
        </div>

        <div className="flex overflow-x-auto space-x-2 pb-2 no-scrollbar px-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterCategory === cat
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <FolderOpen size={64} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Arşiv Boş</p>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleOpenFile(file)}
              className="glass-panel rounded-[28px] p-4 flex items-center border border-white/5 hover:bg-white/5 transition-all group cursor-pointer active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 mr-4 shadow-inner">
                {getFileIcon(file.extension)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${file.category === 'Fatura' ? 'bg-red-500/20 text-red-400' :
                      file.category === 'Sözleşme' ? 'bg-blue-500/20 text-blue-400' :
                        file.category === 'Karar' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                    }`}>
                    {file.category}
                  </span>
                  <span className="text-[8px] font-bold text-white/20 uppercase">{file.date}</span>
                </div>
                <h4 className="text-sm font-black text-white/90 truncate leading-tight uppercase tracking-tight">
                  {file.name}
                </h4>
                <p className="text-[9px] font-bold text-white/20 mt-1 uppercase tracking-tighter">BOYUT: {file.size}</p>
              </div>

              <div className="ml-4 flex items-center space-x-2">
                {file.uri && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareFile(file);
                    }}
                    className="p-2.5 bg-green-500/10 rounded-xl hover:bg-green-500/20 transition-all active:scale-90 border border-green-500/20"
                    title="Aç veya Paylaş"
                  >
                    <Share2 size={16} className="text-green-400" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.id);
                  }}
                  className="p-2.5 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all active:scale-90 border border-red-500/20"
                  title="Sil"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-sm rounded-[40px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">BELGE EKLE</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">BELGE ADI</label>
                <input
                  autoFocus
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Örn: Asansör Bakım Sözleşmesi"
                  className="bg-white/5 w-full h-14 rounded-2xl px-5 text-base font-black text-white outline-none border border-white/10 focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">KATEGORİ</label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value as any)}
                  className="bg-white/5 w-full h-14 rounded-2xl px-5 text-sm font-black text-white outline-none border border-white/10 focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none"
                >
                  {categories.filter(c => c !== 'Hepsi').map(c => <option key={c} value={c} className="bg-[#1e293b]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">BELGE TARİHİ</label>
                <input
                  type="date"
                  value={fileDate}
                  onChange={(e) => setFileDate(e.target.value)}
                  className="bg-white/5 w-full h-[52px] rounded-2xl px-5 text-[15px] font-black text-white outline-none border border-white/10 focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white h-16 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all mt-4 shadow-xl"
              >
                ARŞİVE KAYDET
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesView;
