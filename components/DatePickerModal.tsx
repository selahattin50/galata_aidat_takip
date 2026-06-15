import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAndroidBackHandler } from '../appBackButton';

interface DatePickerModalProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

const MONTHS = [
  'Ocak',
  '\u015eubat',
  'Mart',
  'Nisan',
  'May\u0131s',
  'Haziran',
  'Temmuz',
  'A\u011fustos',
  'Eyl\u00fcl',
  'Ekim',
  'Kas\u0131m',
  'Aral\u0131k'
];

const DAYS = ['PZT', 'SAL', '\u00c7AR', 'PER', 'CUM', 'CMT', 'PAZ'];

function parseDate(val: string): Date {
  if (!val) return new Date();
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ value, onChange, className = '', label }) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => value ? parseDate(value) : new Date());

  useEffect(() => {
    if (value) setViewDate(parseDate(value));
  }, [value]);

  useAndroidBackHandler(() => {
    if (!open) return false;
    setOpen(false);
    return true;
  }, open);

  const selected = value ? parseDate(value) : null;
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayMon = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nextCells: (number | null)[] = [];

    for (let i = 0; i < firstDayMon; i++) nextCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) nextCells.push(d);

    return nextCells;
  }, [month, year]);

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

  const selectToday = () => {
    const now = new Date();
    onChange(toIso(now));
    setViewDate(now);
    setOpen(false);
  };

  const clearDate = () => {
    onChange('');
    setOpen(false);
  };

  const displayValue = selected
    ? `${String(selected.getDate()).padStart(2, '0')}.${String(selected.getMonth() + 1).padStart(2, '0')}.${selected.getFullYear()}`
    : 'Tarih Se\u00e7';

  return (
    <>
      <button
        type="button"
        aria-label={label || 'Tarih sec'}
        onClick={() => setOpen(true)}
        className={`embossed-cash flex h-[46px] w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 text-[17px] font-bold text-white transition-all active:scale-95 ${className}`}
      >
        <span className={selected ? 'text-white' : 'text-white/30'}>{displayValue}</span>
        <CalendarDays size={18} className="shrink-0 text-white/30" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 px-3 py-5 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[310px] rounded-2xl bg-white px-3.5 pb-3.5 pt-3 text-slate-800 shadow-[0_18px_42px_rgba(0,0,0,0.38)] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3.5 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="embossed-cash flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-[0_4px_0_#a7adb7,0_10px_15px_rgba(15,23,42,0.13)] transition-all active:translate-y-1 active:shadow-[0_2px_0_#a7adb7,0_7px_12px_rgba(15,23,42,0.12)]"
                aria-label="Onceki ay"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>

              <h2 className="min-w-0 flex-1 px-2 text-center text-[22px] font-black leading-none tracking-normal text-slate-800">
                {MONTHS[month]} {year}
              </h2>

              <button
                type="button"
                onClick={nextMonth}
                className="embossed-cash flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-[0_4px_0_#a7adb7,0_10px_15px_rgba(15,23,42,0.13)] transition-all active:translate-y-1 active:shadow-[0_2px_0_#a7adb7,0_7px_12px_rgba(15,23,42,0.12)]"
                aria-label="Sonraki ay"
              >
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="mb-2.5 grid grid-cols-7 gap-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[12px] font-black leading-none text-slate-950">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-x-1.5 gap-y-2">
              {cells.map((day, index) => (
                <div key={`${day || 'empty'}-${index}`} className="flex aspect-square items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`embossed-cash flex h-9 w-9 items-center justify-center rounded-xl text-[20px] font-black leading-none transition-all active:translate-y-1 ${
                        isSelected(day)
                          ? 'bg-orange-600 text-white shadow-[0_4px_0_#a7adb7,0_9px_15px_rgba(234,88,12,0.22)]'
                          : isToday(day)
                          ? 'bg-orange-50 text-orange-600 shadow-[0_4px_0_#a7adb7,0_9px_15px_rgba(15,23,42,0.10)]'
                          : 'bg-white text-slate-700 shadow-[0_4px_0_#a7adb7,0_9px_15px_rgba(15,23,42,0.10)]'
                      }`}
                    >
                      {day}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={selectToday}
                className="embossed-cash h-10 rounded-xl bg-white px-1 text-[15px] font-black leading-none text-slate-500 shadow-[0_3px_10px_rgba(15,23,42,0.10)] transition-all active:scale-[0.98]"
              >
                {'Bug\u00fcn'}
              </button>
              <button
                type="button"
                onClick={clearDate}
                className="embossed-cash h-10 rounded-xl bg-white px-1 text-[15px] font-black leading-none text-red-600 shadow-[0_3px_10px_rgba(15,23,42,0.10)] transition-all active:scale-[0.98]"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="embossed-cash h-10 rounded-xl bg-white px-1 text-[15px] font-black leading-none text-slate-500 shadow-[0_3px_10px_rgba(15,23,42,0.10)] transition-all active:scale-[0.98]"
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
