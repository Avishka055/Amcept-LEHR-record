import React, { useMemo, useState } from 'react';
import { Calendar, Camera, Edit3, Eye, FileText, Trash2, User, X } from 'lucide-react';
import { Language, LehrLogEntry, Operator, TC_DEFINITIONS } from '../types';
import { TRANSLATIONS } from '../i18n';

interface HistoryViewProps {
  lang: Language;
  logs: LehrLogEntry[];
  operators: Operator[];
  onLoadIntoEditor: (log: LehrLogEntry) => void;
  onDeleteLog: (id: string) => Promise<void>;
  onGoToLogger: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  lang,
  logs,
  operators,
  onLoadIntoEditor,
  onDeleteLog,
  onGoToLogger,
}) => {
  const t = TRANSLATIONS[lang];
  const [dateFilter, setDateFilter] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('');
  const [inspectedLog, setInspectedLog] = useState<LehrLogEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (dateFilter && log.date !== dateFilter) return false;
      if (operatorFilter && log.operatorId !== operatorFilter) return false;
      return true;
    });
  }, [logs, dateFilter, operatorFilter]);

  const coverageDate = dateFilter || logs[0]?.date || new Date().toISOString().slice(0, 10);
  const loggedHoursForCoverageDate = useMemo(() => {
    const hours = new Set<number>();
    logs.forEach((l) => {
      if (l.date === coverageDate) hours.add(l.hour);
    });
    return hours;
  }, [logs, coverageDate]);

  const getAlertsCount = (log: LehrLogEntry) =>
    log.zones.filter((z) => z.pv !== null && z.sv !== null && Math.abs(z.pv - z.sv) > 15).length;

  const getAvgPv = (log: LehrLogEntry) => {
    const valid = log.zones.map((z) => z.pv).filter((v): v is number => v !== null);
    if (valid.length === 0) return null;
    return (valid.reduce((acc, v) => acc + v, 0) / valid.length).toFixed(1);
  };

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.historyTitle}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t.historyDesc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-mono-tabular text-slate-900 focus:outline-none focus:border-orange-600"
              />
            </div>
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t.filterAllDates}
              </button>
            )}
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-orange-600"
            >
              <option value="">{t.filterAllOperators}</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 24-Hour Shift Coverage Strip */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {t.shiftCoverage} · <span className="font-mono-tabular">{coverageDate}</span>
            </span>
            <span className="font-mono-tabular text-slate-600">
              {loggedHoursForCoverageDate.size} / 24 {t.hoursLoggedOf24}
            </span>
          </div>
          <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
            {Array.from({ length: 24 }, (_, h) => {
              const hasLog = loggedHoursForCoverageDate.has(h);
              return (
                <div
                  key={h}
                  title={`${String(h).padStart(2, '0')}:00`}
                  className={`h-7 rounded-md flex items-center justify-center font-mono-tabular text-[10px] font-semibold border ${
                    hasLog
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  {String(h).padStart(2, '0')}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">{t.noLogsTitle}</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{t.noLogsDesc}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToLogger}
              className="min-h-[44px] px-5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
            >
              {t.goToLogBtn}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredLogs.map((log) => {
            const alerts = getAlertsCount(log);
            const avgPv = getAvgPv(log);
            return (
              <article
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono-tabular text-base font-bold text-slate-900">
                        {log.date} · {String(log.hour).padStart(2, '0')}:00
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {log.operatorName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{log.source === 'ai-camera' ? t.sourceAi : t.sourceManual}</span>
                      </div>
                    </div>
                    {log.photoDataUrl && (
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-orange-600" />
                      </span>
                    )}
                  </div>

                  {/* Key Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-slate-500">{t.matSpeedLabel}</div>
                      <div className="font-mono-tabular font-bold text-sm text-slate-900 mt-0.5">
                        {log.matSpeed !== null ? `${log.matSpeed.toFixed(1)}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Avg PV</div>
                      <div className="font-mono-tabular font-bold text-sm text-slate-900 mt-0.5">
                        {avgPv ? `${avgPv}°C` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">{t.kpiAlerts}</div>
                      <div
                        className={`font-mono-tabular font-bold text-sm mt-0.5 ${
                          alerts > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {alerts}
                      </div>
                    </div>
                  </div>

                  {log.recipe && (
                    <div className="text-xs text-slate-500 font-mono-tabular">
                      Recipe: {log.recipe} {log.mode ? `· ${log.mode}` : ''}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInspectedLog(log)}
                    className="min-h-[44px] flex-1 px-3 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.inspectBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoadIntoEditor(log)}
                    className="min-h-[44px] flex-1 px-3 rounded-xl border border-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.loadIntoEditorBtn}</span>
                  </button>
                  {confirmDeleteId === log.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteLog(log.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      {t.deleteBtn}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(log.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                      aria-label={t.deleteBtn}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Inspection Modal */}
      {inspectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-mono-tabular text-base font-bold text-slate-900">
                  {inspectedLog.date} · {String(inspectedLog.hour).padStart(2, '0')}:00
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectedLog.operatorName} · {t.matSpeedLabel}:{' '}
                  <span className="font-mono-tabular font-semibold text-slate-800">
                    {inspectedLog.matSpeed !== null ? `${inspectedLog.matSpeed} MM/Min` : '—'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {inspectedLog.photoDataUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                  <img
                    src={inspectedLog.photoDataUrl}
                    alt="Captured HMI Panel"
                    referrerPolicy="no-referrer"
                    className="w-full max-h-60 object-contain mx-auto"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">{t.recipeLabel}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">{inspectedLog.recipe || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t.modeLabel}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">{inspectedLog.mode || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t.fan1Label}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {inspectedLog.fan1Hz !== null ? `${inspectedLog.fan1Hz} Hz` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t.fan2Label}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {inspectedLog.fan2Hz !== null ? `${inspectedLog.fan2Hz} Hz` : '—'}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">{t.tcCol}</th>
                      <th className="text-right px-4 py-2.5 font-semibold">{t.pvCol}</th>
                      <th className="text-right px-4 py-2.5 font-semibold">{t.svCol}</th>
                      <th className="text-right px-4 py-2.5 font-semibold">{t.deltaCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-tabular">
                    {TC_DEFINITIONS.map((def) => {
                      const z = inspectedLog.zones.find((item) => item.tc === def.tc);
                      const delta = z?.pv !== null && z?.pv !== undefined && z?.sv !== null && z?.sv !== undefined
                        ? z.pv - z.sv
                        : null;
                      return (
                        <tr key={def.tc}>
                          <td className="px-4 py-2 font-semibold text-slate-900">
                            {def.tc}{' '}
                            <span className="font-sans font-normal text-xs text-slate-500 ml-1">
                              {lang === 'si' ? def.zoneSi : def.zoneEn}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900">
                            {z?.pv !== null && z?.pv !== undefined ? z.pv.toFixed(1) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {z?.sv !== null && z?.sv !== undefined ? z.sv.toFixed(1) : '—'}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-semibold ${
                              delta === null
                                ? 'text-slate-400'
                                : Math.abs(delta) > 15
                                ? 'text-red-600'
                                : Math.abs(delta) > 5
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {inspectedLog.notes && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-1">{t.notesLabel}</span>
                  {inspectedLog.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
