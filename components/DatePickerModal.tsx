import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerModalProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS = ['PZT','SAL','ÇAR','PER','CUM','CMT','PAZ'];

function parseDate(val: string): Date {
  if (!val) return new Date();
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => value ? parseDate(value) : new Date());

  useEffect(() => {
    if (value) setViewDate(parseDate(value));
  }, [value]);

  const selected = value ? parseDate(value) : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // First day of month (0=Sun..6=Sat), convert to Mon-based (0=Mon..6=Sun)
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayMon = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayMon; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d: number) =>
    selected && d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (d: number) => {
    onChange(toIso(new Date(year, month, d)));
    setOpen(false);
  };

  const displayValue = selected
    ? `${String(selected.getDate()).padStart(2,'0')}.${String(selected.getMonth()+1).padStart(2,'0')}.${selected.getFullYear()}`
    : 'Tarih Seç';

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center justify-between bg-black/20 w-full h-[46px] rounded-xl px-3 text-[17px] font-bold text-white border border-white/5 active:scale-95 transition-all ${className}`}
      >
        <span className={selected ? 'text-white' : 'text-white/30'}>{displayValue}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/30 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm mb-4 mx-4 bg-white rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <button
                onClick={prevMonth}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              <span className="text-[18px] font-black text-gray-900">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-4 pb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-black text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
              {cells.map((d, i) => (
                <div key={i} className="flex items-center justify-center">
                  {d ? (
                    <button
                      onClick={() => selectDay(d)}
                      className={`w-10 h-10 rounded-full text-[15px] font-bold transition-all active:scale-90
                        ${isSelected(d)
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : isToday(d)
                          ? 'bg-indigo-50 text-indigo-600 font-black'
                          : 'text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                      {d}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => { onChange(toIso(new Date())); setOpen(false); }}
                className="text-[13px] font-black text-indigo-600 uppercase tracking-widest active:scale-95 transition-all bg-indigo-50 px-4 py-2 rounded-xl"
              >
                BUGÜN
              </button>
              <button
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-[13px] font-black text-red-500 uppercase tracking-widest active:scale-95 transition-all"
              >
                Temizle
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[13px] font-black text-gray-500 uppercase tracking-widest active:scale-95 transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatePickerModal;
