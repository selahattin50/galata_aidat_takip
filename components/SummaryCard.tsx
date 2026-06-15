import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { BalanceSummary } from '../types.ts';

interface SummaryCardProps {
  balance: BalanceSummary;
}

const ALACAK_RED = '#D1232A'; // Galata Kırmızısı

const SummaryCard: React.FC<SummaryCardProps> = ({ balance }) => {
  const [vaultType, setVaultType] = useState<'genel' | 'demirbas'>('genel');

  const currentMevcut = vaultType === 'genel' ? balance.mevcutBakiye : balance.demirbasKasasi;
  const currentAlacak = vaultType === 'genel' ? balance.alacakBakiyesi : balance.demirbasAlacakBakiyesi;
  const currentToplam = currentMevcut + currentAlacak;
  const isGenel = vaultType === 'genel';

  const chartData = [
    { name: 'Tahsilat', value: balance.monthlyCollected || 0, color: '#22c55e' },
    { name: 'Alacak', value: balance.monthlyRemainingDebt || 0, color: ALACAK_RED },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    chartData.push({ name: 'Boş', value: 1, color: '#334155' });
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const rows = [
    { label: 'MEVCUT', value: currentMevcut, className: 'text-green-500' },
    { label: 'ALACAK', value: currentAlacak, className: '', color: ALACAK_RED },
    { label: 'TOPLAM', value: currentToplam, className: 'text-blue-300' },
  ];

  return (
    <div className="px-1">
      <div className="embossed-cash relative flex min-h-[112px] items-center overflow-hidden rounded-[22px] border border-white/10 bg-slate-700/35 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10" />

        <div className="relative flex w-[28%] max-w-[108px] items-center justify-center">
          <div className="h-[92px] w-[92px] min-[390px]:h-[102px] min-[390px]:w-[102px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={chartData.map((d) => `${d.name}:${d.value}`).join('|')}
                  data={chartData}
                  innerRadius="42%"
                  outerRadius="104%"
                  paddingAngle={1}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={950}
                  animationEasing="ease-out"
                  stroke="rgba(255,255,255,0.82)"
                  strokeWidth={1.1}
                  label={false}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.82)" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="relative ml-3 flex min-w-0 flex-1 flex-col justify-center">
          <div className="mb-2 flex items-center gap-2 pl-2">
            <span className={`text-[14px] font-black uppercase tracking-[0.16em] ${isGenel ? 'text-green-500' : 'text-amber-300'}`}>
              {isGenel ? 'GENEL GİDER' : 'DEMİRBAŞ'}
            </span>
            <button
              type="button"
              onClick={() => setVaultType((v) => (v === 'genel' ? 'demirbas' : 'genel'))}
              className={`rounded-lg border p-1 transition-all active:scale-95 ${
                isGenel
                  ? 'border-green-500/35 bg-green-500/10 text-green-500'
                  : 'border-amber-400/35 bg-amber-500/10 text-amber-300'
              }`}
              aria-label="Kasa değiştir"
            >
              <RefreshCw size={12} strokeWidth={3} />
            </button>
          </div>

          <div className="embossed-cash overflow-hidden rounded-2xl border border-white/10 bg-slate-950/15">
            {rows.map((row, index) => (
              <div
                key={row.label}
                className={`flex items-center justify-between gap-3 px-3 py-1 ${
                  index !== rows.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <span className="text-[12px] font-black uppercase tracking-[0.12em] text-white/80">
                  {row.label}
                </span>
                <span
                  className={`embossed-cash-value whitespace-nowrap text-[15px] min-[390px]:text-[16px] font-black leading-none tracking-tight ${row.className}`}
                  style={row.color ? { color: row.color } : undefined}
                >
                  ₺{formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
