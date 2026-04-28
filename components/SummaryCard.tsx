
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { BalanceSummary } from '../types.ts';

interface SummaryCardProps {
  balance: BalanceSummary;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ balance }) => {
  const [vaultType, setVaultType] = useState<'genel' | 'demirbas'>('genel');

  const currentMevcut = vaultType === 'genel' ? balance.mevcutBakiye : balance.demirbasKasasi;
  const currentAlacak = vaultType === 'genel' ? balance.alacakBakiyesi : 0;
  const currentToplam = currentMevcut + currentAlacak;

  const chartData = [
    { name: 'Aidat Tahsilatı', value: balance.monthlyCollected || 0, color: '#22c55e' },
    { name: 'Alacak', value: balance.monthlyRemainingDebt || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    chartData.push({ name: 'Boş', value: 1, color: '#1e293b' });
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };



  return (
    <div className="px-1">
      <div className="bg-white/5 backdrop-blur-md rounded-[24px] py-2.5 px-5 flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-hidden min-h-[105px]">

        {/* Sol Taraf: Donut Grafik */}
        <div className="w-[28%] aspect-square relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius="40%"
                outerRadius="95%"
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                stroke="#ffffff"
                strokeWidth={0.5}
                label={false}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sağ Taraf: Bakiye Verileri */}
        <div className="w-[72%] pl-5 space-y-0.5 flex flex-col justify-center -mt-[10px]">
          <div className="flex items-center space-x-2 mb-1 -ml-[15px]">
            <span className="text-[15px] font-black tracking-[0.2em] text-[#22c55e] uppercase">
              {vaultType === 'genel' ? 'GENEL GİDER' : 'DEMİRBAŞ'}
            </span>
            <button onClick={() => setVaultType(v => v === 'genel' ? 'demirbas' : 'genel')} className="text-[#22c55e]/30 hover:text-[#22c55e] transition-colors">
              <RefreshCw size={15} strokeWidth={3} />
            </button>
          </div>

          <div className="flex justify-between items-center border-b border-white/5 py-0.5">
            <span className="text-[12px] font-black text-white uppercase tracking-widest opacity-80">MEVCUT</span>
            <span className="text-[16px] font-black text-[#22c55e] tracking-tight leading-none">₺{formatCurrency(currentMevcut)}</span>
          </div>

          <div className="flex justify-between items-center border-b border-white/5 py-0.5">
            <span className="text-[12px] font-black text-white uppercase tracking-widest opacity-80">ALACAK</span>
            <span className="text-[16px] font-black text-[#ef4444] tracking-tight leading-none">₺{formatCurrency(currentAlacak)}</span>
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-black text-white uppercase tracking-widest opacity-80">TOPLAM</span>
              <span className="text-[16px] font-black text-[#60a5fa] leading-none tracking-tight">₺{formatCurrency(currentToplam)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
