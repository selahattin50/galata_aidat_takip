import React from 'react';
import { FileDown, Share2 } from 'lucide-react';

interface PdfActionButtonProps {
  type: 'download' | 'share';
  onClick: () => void;
  disabled?: boolean;
}

const PdfActionButton: React.FC<PdfActionButtonProps> = ({ type, onClick, disabled = false }) => {
  const isDownload = type === 'download';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="embossed-cash h-12 bg-[#1e293b] rounded-xl border border-white/10 flex items-center px-2.5 space-x-3 active:bg-white/10 active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(2,6,23,0.24)] disabled:opacity-50 disabled:active:scale-100"
    >
      <div className={`embossed-cash w-9 h-9 rounded-lg flex items-center justify-center border shadow-inner ${isDownload ? 'bg-red-500/15 border-red-500/25' : 'bg-blue-600/25 border-blue-500/25'}`}>
        {isDownload ? (
          <div className="flex flex-col items-center">
            <span className="text-[6px] font-black text-red-500 leading-none mb-0.5">PDF</span>
            <FileDown size={16} strokeWidth={2.7} className="text-red-500" />
          </div>
        ) : (
          <Share2 size={20} strokeWidth={2.7} className="text-white" />
        )}
      </div>
      <span className="text-[13px] font-black text-white uppercase tracking-[0.16em] leading-none">
        {isDownload ? <>&#304;ND&#304;R</> : <>PAYLA&#350;</>}
      </span>
    </button>
  );
};

export default PdfActionButton;
