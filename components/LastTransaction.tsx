
import React from 'react';
import { Transaction } from '../types.ts';
import { Inbox } from 'lucide-react';

interface LastTransactionProps {
  transaction: Transaction | null;
}

const LastTransaction: React.FC<LastTransactionProps> = ({ transaction }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="mt-1 pb-2">
      <div className="flex justify-between items-center bg-black/40 px-4 py-1 rounded-t-xl border-x border-t border-white/5">
        <h4 className="text-[7px] font-bold tracking-[0.2em] text-white/50 uppercase">SON YAPILAN İŞLEM</h4>
      </div>
      
      {transaction ? (
        <div className="glass-panel rounded-b-xl px-3 py-2 border-t-0 flex justify-between items-center active:bg-white/5 transition-colors cursor-pointer animate-in fade-in duration-500">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
              transaction.type === 'GELİR' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className={`w-1 h-1 rounded-full animate-pulse ${
                transaction.type === 'GELİR' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`font-black text-[8px] tracking-widest uppercase ${
                  transaction.type === 'GELİR' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {transaction.type}
                </span>
                <span className="text-[8px] text-white/70 font-medium truncate">
                  {transaction.description.split('[')[0].trim()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <span className="text-white font-black text-[11px] tracking-tight">₺{formatCurrency(transaction.amount)}</span>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-b-xl p-4 border-t-0 flex flex-col items-center justify-center space-y-1 animate-in fade-in duration-500">
          <Inbox size={20} className="text-white/10" />
          <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Kayıtlı İşlem Bulunamadı</span>
        </div>
      )}
    </div>
  );
};

export default LastTransaction;
