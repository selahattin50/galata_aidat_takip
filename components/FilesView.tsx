
import React, { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FileText, FilePlus, Search, X, Trash2, File, ImageIcon, FolderOpen, ArrowLeft, Share2, Upload } from 'lucide-react';
import { FileEntry } from '../types.ts';
import { useAndroidBackHandler } from '../appBackButton';
import DatePickerModal from './DatePickerModal';
import { appConfirm } from './AppDialog';

interface FilesViewProps {
  files: FileEntry[];
  onAddFile: (file: Omit<FileEntry, 'id'>) => void;
  onDeleteFile: (id: string) => void;
  onOpenFile: (file: FileEntry) => void;
  onShareFile?: (file: FileEntry) => void;
  onClose: () => void;
  currentDate: Date;
}

const FilesView: React.FC<FilesViewProps> = ({ files, onAddFile, onDeleteFile, onOpenFile, onShareFile, onClose, currentDate }) => {
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
  const [fileDate, setFileDate] = useState(currentDate.toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Hepsi', 'Fatura', 'Sözleşme', 'Tutanak', 'Karar', 'Diğer'];

  const getExtension = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext && ext !== name.toLowerCase() ? ext : 'dosya';
  };

  const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '');

  const sanitizeFileName = (name: string) => name
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 90);

  const fileToBase64 = (file: globalThis.File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSelectedFile = (file?: globalThis.File) => {
    if (!file) return;
    setSelectedFile(file);
    setFileName(prev => prev.trim() || stripExtension(file.name));
  };

  const resetAddForm = () => {
    setFileName('');
    setSelectedFile(null);
    setFileCategory('Fatura');
    setFileDate(currentDate.toISOString().split('T')[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleDeleteFile = async (file: FileEntry) => {
    const confirmed = await appConfirm(
      `${file.name} arşivden silinecek.\n\nBu işlem geri alınamaz. Silmek istediğinizden emin misiniz?`,
      'Silme Onayı',
      'SİL'
    );
    if (confirmed) onDeleteFile(file.id);
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !selectedFile) return;

    const safeOriginalName = sanitizeFileName(selectedFile.name) || `belge.${getExtension(selectedFile.name)}`;
    const extension = getExtension(safeOriginalName);
    const storedFileName = `${Date.now()}-${safeOriginalName}`;
    let uri = '';

    if (Capacitor.isNativePlatform()) {
      const base64Data = await fileToBase64(selectedFile);
      const saved = await Filesystem.writeFile({
        path: storedFileName,
        data: base64Data,
        directory: Directory.Data
      });
      uri = saved.uri;
    } else {
      uri = URL.createObjectURL(selectedFile);
    }

    onAddFile({
      name: fileName.trim(),
      category: fileCategory,
      date: new Date(fileDate).toLocaleDateString('tr-TR'),
      size: selectedFile.size >= 1024 * 1024
        ? (selectedFile.size / 1024 / 1024).toFixed(1) + ' MB'
        : (selectedFile.size / 1024).toFixed(1) + ' KB',
      extension,
      uri,
      fileName: storedFileName,
      mimeType: selectedFile.type || undefined
    });

    resetAddForm();
    setShowAddModal(false);
  };

  return (
    <div className="pt-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="relative px-4 py-6 flex items-center justify-center mb-6">
        <button onClick={onClose} className="app-back-button absolute left-4">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h3 className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-[17px] font-black uppercase tracking-[0.2em] text-green-500 text-center">
          <FolderOpen size={20} />
          <span>DİJİTAL ARŞİV</span>
        </h3>
        <button
          onClick={() => {
            resetAddForm();
            setShowAddModal(true);
          }}
          className="absolute right-4 bg-blue-600 p-2.5 rounded-xl shadow-lg active:scale-90 transition-all border border-blue-500/50"
        >
          <FilePlus size={20} className="text-white" />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="embossed-cash glass-panel rounded-2xl p-1 border border-white/5 flex items-center pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_0_rgba(2,6,23,0.34),0_10px_16px_rgba(0,0,0,0.16)]">
          <div className="embossed-cash bg-white/5 p-2 rounded-xl mr-3 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_rgba(2,6,23,0.38),0_7px_10px_rgba(0,0,0,0.14)]">
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
              className={`embossed-cash whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border active:translate-y-0.5 active:scale-[0.99] ${filterCategory === cat
                  ? 'bg-white text-black border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_rgba(148,163,184,0.85),0_10px_15px_rgba(0,0,0,0.18)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_rgba(148,163,184,0.9),0_7px_12px_rgba(0,0,0,0.16)]'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(2,6,23,0.4),0_8px_12px_rgba(0,0,0,0.16)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_0_rgba(2,6,23,0.5),0_5px_9px_rgba(0,0,0,0.14)]'
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
                    handleDeleteFile(file);
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
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] block mb-2 ml-1">DOSYA</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => handleSelectedFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="embossed-cash w-full min-h-14 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_0_rgba(2,6,23,0.34),0_10px_16px_rgba(0,0,0,0.16)] active:translate-y-0.5 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="embossed-cash flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-300">
                      <Upload size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                        {selectedFile ? selectedFile.name : 'Dosya Seç'}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35">
                        {selectedFile ? `${getExtension(selectedFile.name).toUpperCase()} - ${(selectedFile.size / 1024).toFixed(1)} KB` : 'PDF, Resim, Word, Excel veya TXT'}
                      </p>
                    </div>
                  </div>
                </button>
              </div>

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
                <DatePickerModal value={fileDate} onChange={setFileDate} />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || !fileName.trim()}
                className="embossed-cash w-full bg-blue-600 hover:bg-blue-500 text-white h-16 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all mt-4 shadow-xl disabled:opacity-35 disabled:grayscale disabled:active:scale-100"
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
