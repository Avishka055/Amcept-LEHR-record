import React, { useState } from 'react';
import { Calendar, Check, Clock, Grid3X3 } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n';

interface HourSelectorProps {
  selectedDate: string;
  selectedHour: number;
  loggedHours: number[];
  lang: Language;
  onDateChange: (date: string) => void;
  onHourChange: (hour: number) => void;
}

export const HourSelector: React.FC<HourSelectorProps> = ({
  selectedDate,
  selectedHour,
  loggedHours,
  lang,
  onDateChange,
  onHourChange,
}) => {
  const t = TRANSLATIONS[lang];
  const [expandedGrid, setExpandedGrid] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900">{t.hourSlotTitle}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t.hourSlotHint}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label={t.logDate}
              className="h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:border-orange-600"
            />
          </div>
          <button
            type="button"
            onClick={() => setExpandedGrid((prev) => !prev)}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              expandedGrid
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="24h Grid"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">24H</span>
          </button>
        </div>
      </div>

      {expandedGrid ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {hours.map((h) => {
            const isSelected = h === selectedHour;
            const isLogged = loggedHours.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => onHourChange(h)}
                className={`min-h-[46px] px-2 rounded-xl border text-sm font-mono-tabular font-medium flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : isLogged
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{formatHour(h)}</span>
                {isLogged && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {hours.map((h) => {
            const isSelected = h === selectedHour;
            const isLogged = loggedHours.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => onHourChange(h)}
                className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-mono-tabular font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : isLogged
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{formatHour(h)}</span>
                {isLogged && (
                  <Check className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
