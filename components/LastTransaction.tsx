
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
      <div className="flex justify-between items-center bg-black/40 px-4 py-1.5 rounded-t-xl border-x border-t border-white/5">
        <h4 className="text-[8px] font-bold tracking-[0.2em] text-white/50 uppercase">SON YAPILAN İŞLEM</h4>
      </div>
      
      {transaction ? (
        <div className="glass-panel rounded-b-xl p-3 border-t-0 flex justify-between items-center active:bg-white/5 transition-colors cursor-pointer animate-in fade-in duration-500">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              transaction.type === 'GELİR' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                transaction.type === 'GELİR' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <div>
              <span className={`font-black text-[10px] tracking-widest block uppercase ${
                transaction.type === 'GELİR' ? 'text-green-500' : 'text-red-500'
              }`}>
                {transaction.type}
              </span>
              <span className="text-[10px] text-white/70 font-medium truncate max-w-[120px] block">
                {transaction.description}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-white/30 text-[8px] font-bold block mb-0.5">{transaction.date}</span>
            <span className="text-white font-black text-xs tracking-tight uppercase">₺ {formatCurrency(transaction.amount)}</span>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-b-xl p-6 border-t-0 flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-500">
          <Inbox size={24} className="text-white/10" />
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Kayıtlı İşlem Bulunamadı</span>
        </div>
      )}
    </div>
  );
};

export default LastTransaction;
