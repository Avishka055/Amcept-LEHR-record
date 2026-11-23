import React from 'react';
import { Language, TC_DEFINITIONS, TcCode, TcReading } from '../types';
import { TRANSLATIONS } from '../i18n';

interface ZoneTempTableProps {
  lang: Language;
  zones: TcReading[];
  onChange: (tc: TcCode, field: 'pv' | 'sv', value: number | null) => void;
}

export const ZoneTempTable: React.FC<ZoneTempTableProps> = ({ lang, zones, onChange }) => {
  const t = TRANSLATIONS[lang];

  const parseNum = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-900">{t.tempGridTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t.tempGridDesc}</p>
      </div>

      {/* Desktop / Tablet Table Header */}
      <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
        <div className="col-span-4">{t.tcCol}</div>
        <div className="col-span-3">{t.pvCol}</div>
        <div className="col-span-3">{t.svCol}</div>
        <div className="col-span-2 text-right">{t.deltaCol}</div>
      </div>

      <div className="divide-y divide-slate-100">
        {TC_DEFINITIONS.map((def) => {
          const reading = zones.find((z) => z.tc === def.tc) ?? { tc: def.tc, pv: null, sv: null };
          const hasDelta = reading.pv !== null && reading.sv !== null;
          const delta = hasDelta ? Number((reading.pv! - reading.sv!).toFixed(1)) : null;
          const absDelta = delta !== null ? Math.abs(delta) : 0;

          let statusColor = 'text-slate-400';
          let statusLabel = t.statusMissing;
          if (delta !== null) {
            if (absDelta <= 5) {
              statusColor = 'text-emerald-700';
              statusLabel = t.statusOk;
            } else if (absDelta <= 15) {
              statusColor = 'text-amber-700';
              statusLabel = t.statusDrift;
            } else {
              statusColor = 'text-red-700';
              statusLabel = t.statusAlert;
            }
          }

          return (
            <div
              key={def.tc}
              className="p-4 sm:px-5 sm:py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center hover:bg-slate-50/70 transition-colors"
            >
              {/* Channel / Zone */}
              <div className="sm:col-span-4 flex items-center justify-between sm:block">
                <div>
                  <span className="font-mono-tabular font-bold text-sm text-slate-900">{def.tc}</span>
                  <span className="text-xs text-slate-500 ml-2 sm:ml-0 sm:block">
                    {lang === 'si' ? def.zoneSi : def.zoneEn}
                  </span>
                </div>
                {/* Mobile Deviation Readout */}
                <div className={`sm:hidden text-xs font-mono-tabular font-semibold ${statusColor}`}>
                  {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}°C · ${statusLabel}` : statusLabel}
                </div>
              </div>

              {/* PV & SV Inputs */}
              <div className="grid grid-cols-2 gap-2.5 sm:contents">
                <div className="sm:col-span-3">
                  <label className="block sm:hidden text-[11px] font-medium text-slate-500 mb-1">
                    {t.pvCol}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={reading.pv ?? ''}
                    onChange={(e) => onChange(def.tc, 'pv', parseNum(e.target.value))}
                    placeholder="—"
                    aria-label={`${def.tc} PV`}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white font-mono-tabular text-sm font-semibold text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block sm:hidden text-[11px] font-medium text-slate-500 mb-1">
                    {t.svCol}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={reading.sv ?? ''}
                    onChange={(e) => onChange(def.tc, 'sv', parseNum(e.target.value))}
                    placeholder="—"
                    aria-label={`${def.tc} SV`}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
              </div>

              {/* Desktop Deviation Column */}
              <div className={`hidden sm:block sm:col-span-2 text-right font-mono-tabular text-xs font-semibold ${statusColor}`}>
                {delta !== null ? (
                  <div>
                    <div>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}°C`}</div>
                    <div className="text-[11px] font-sans font-semibold">{statusLabel}</div>
                  </div>
                ) : (
                  <span>{statusLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
