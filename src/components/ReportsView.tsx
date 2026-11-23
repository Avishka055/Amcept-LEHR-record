import React, { useMemo, useState } from 'react';
import { Calendar, Download, ThermometerSun } from 'lucide-react';
import { Language, LehrLogEntry, TC_DEFINITIONS } from '../types';
import { TRANSLATIONS } from '../i18n';

interface ReportsViewProps {
  lang: Language;
  logs: LehrLogEntry[];
  onGoToLogger: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ lang, logs, onGoToLogger }) => {
  const t = TRANSLATIONS[lang];
  const latestDate = logs[0]?.date || new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(latestDate);

  const dayLogs = useMemo(() => {
    return logs
      .filter((l) => l.date === selectedDate)
      .sort((a, b) => a.hour - b.hour);
  }, [logs, selectedDate]);

  const [selectedLogId, setSelectedLogId] = useState<string>('');
  const activeLog = useMemo(() => {
    if (dayLogs.length === 0) return null;
    return dayLogs.find((l) => l.id === selectedLogId) || dayLogs[dayLogs.length - 1];
  }, [dayLogs, selectedLogId]);

  const avgSpeed = useMemo(() => {
    const speeds = dayLogs.map((l) => l.matSpeed).filter((v): v is number => v !== null);
    if (speeds.length === 0) return null;
    return (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1);
  }, [dayLogs]);

  const totalAlertsForDay = useMemo(() => {
    return dayLogs.reduce((acc, log) => {
      const count = log.zones.filter(
        (z) => z.pv !== null && z.sv !== null && Math.abs(z.pv - z.sv) > 15
      ).length;
      return acc + count;
    }, 0);
  }, [dayLogs]);

  const handleExportCsv = () => {
    const targetLogs = dayLogs.length > 0 ? dayLogs : logs;
    if (targetLogs.length === 0) return;

    const tcHeaders = TC_DEFINITIONS.flatMap((d) => [`${d.tc}_PV`, `${d.tc}_SV`]);
    const headers = [
      'Date',
      'Hour',
      'Operator',
      'Recipe',
      'Mode',
      'MatSpeed_MM_Min',
      'Fan1_Hz',
      'Fan2_Hz',
      ...tcHeaders,
      'Notes',
      'Source',
    ];

    const rows = targetLogs.map((log) => {
      const tcCells = TC_DEFINITIONS.flatMap((def) => {
        const z = log.zones.find((item) => item.tc === def.tc);
        return [z?.pv ?? '', z?.sv ?? ''];
      });
      return [
        log.date,
        `${String(log.hour).padStart(2, '0')}:00`,
        log.operatorName,
        log.recipe,
        log.mode,
        log.matSpeed ?? '',
        log.fan1Hz ?? '',
        log.fan2Hz ?? '',
        ...tcCells,
        log.notes,
        log.source,
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amcept-lehr-report-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SVG Chart Geometry for Thermal Profile (TC-3 to TC-13)
  const chartW = 720;
  const chartH = 260;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 36;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxTemp = 750;
  const minTemp = 200;

  const getX = (idx: number) => padL + (idx / (TC_DEFINITIONS.length - 1)) * plotW;
  const getY = (val: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, val));
    return padT + plotH - ((clamped - minTemp) / (maxTemp - minTemp)) * plotH;
  };

  const buildPolyline = (field: 'pv' | 'sv') => {
    if (!activeLog) return '';
    return TC_DEFINITIONS.map((def, i) => {
      const z = activeLog.zones.find((item) => item.tc === def.tc);
      const val = z?.[field];
      if (val === null || val === undefined) return null;
      return `${getX(i)},${getY(val)}`;
    })
      .filter((pt): pt is string => pt !== null)
      .join(' ');
  };

  const pvPoints = buildPolyline('pv');
  const svPoints = buildPolyline('sv');

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t.reportsTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t.reportsDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedLogId('');
              }}
              className="h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-mono-tabular text-slate-900 focus:outline-none focus:border-orange-600"
            />
          </div>

          <button
            type="button"
            disabled={logs.length === 0}
            onClick={handleExportCsv}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsvBtn}</span>
          </button>
        </div>
      </div>

      {/* 4-KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">{t.kpiTotalLogs}</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">{logs.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">{t.kpiCoverage}</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {dayLogs.length} / 24
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">{t.kpiAvgSpeed}</div>
          <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {avgSpeed ? `${avgSpeed}` : '—'}{' '}
            <span className="text-xs font-normal text-slate-500">MM/Min</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">{t.kpiAlerts}</div>
          <div
            className={`font-mono-tabular text-2xl font-bold mt-1 ${
              totalAlertsForDay > 0 ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {totalAlertsForDay}
          </div>
        </div>
      </div>

      {!activeLog ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
          <ThermometerSun className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600 max-w-md mx-auto">{t.noChartData}</p>
          <button
            type="button"
            onClick={onGoToLogger}
            className="min-h-[44px] px-5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            {t.goToLogBtn}
          </button>
        </div>
      ) : (
        <>
          {/* Thermal Profile Chart (TC-3 to TC-13) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t.profileChartTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.profileChartDesc}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-600">{t.selectLogForChart}:</label>
                <select
                  value={activeLog.id}
                  onChange={(e) => setSelectedLogId(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-xs font-semibold text-slate-900"
                >
                  {dayLogs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {String(l.hour).padStart(2, '0')}:00 ({l.operatorName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-orange-600 inline-block" />
                <span className="text-slate-700">PV (°C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-slate-500 border-t border-dashed border-slate-600 inline-block" />
                <span className="text-slate-600">SV (°C)</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[540px] h-auto">
                {/* Y-axis Gridlines */}
                {[250, 350, 450, 550, 650, 750].map((temp) => {
                  const y = getY(temp);
                  return (
                    <g key={temp}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#E2E8F0" strokeWidth="1" />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px] font-mono-tabular"
                      >
                        {temp}
                      </text>
                    </g>
                  );
                })}

                {/* SV Dashed Line */}
                {svPoints && (
                  <polyline
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="2"
                    strokeDasharray="5,4"
                    points={svPoints}
                  />
                )}

                {/* PV Solid Line */}
                {pvPoints && (
                  <polyline
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="2.5"
                    points={pvPoints}
                  />
                )}

                {/* Data Points & X-axis Labels */}
                {TC_DEFINITIONS.map((def, i) => {
                  const z = activeLog.zones.find((item) => item.tc === def.tc);
                  const x = getX(i);
                  return (
                    <g key={def.tc}>
                      <text
                        x={x}
                        y={chartH - 10}
                        textAnchor="middle"
                        className="fill-slate-600 text-[10px] font-mono-tabular font-semibold"
                      >
                        {def.tc}
                      </text>
                      {z?.sv !== null && z?.sv !== undefined && (
                        <circle cx={x} cy={getY(z.sv)} r="3.5" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" />
                      )}
                      {z?.pv !== null && z?.pv !== undefined && (
                        <circle cx={x} cy={getY(z.pv)} r="4.5" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1.5" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* 24-Hour Mat Speed Trend */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900">{t.speedChartTitle}</h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {dayLogs.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center"
                >
                  <div className="text-[11px] font-mono-tabular text-slate-500">
                    {String(l.hour).padStart(2, '0')}:00
                  </div>
                  <div className="font-mono-tabular text-sm font-bold text-slate-900 mt-0.5">
                    {l.matSpeed !== null ? l.matSpeed.toFixed(1) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
