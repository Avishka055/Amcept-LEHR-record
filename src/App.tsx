import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Globe,
  History,
  Loader2,
  RotateCcw,
  Save,
  UserCheck,
} from 'lucide-react';
import {
  HmiExtractionResponse,
  Language,
  LehrLogEntry,
  Operator,
  TC_DEFINITIONS,
  TcCode,
  TcReading,
} from './types';
import { TRANSLATIONS } from './i18n';
import { compressImageToDataUrl, createThumbnailDataUrl } from './utils/image';
import { OperatorModal } from './components/OperatorModal';
import { HourSelector } from './components/HourSelector';
import { HmiScannerCard } from './components/HmiScannerCard';
import { ZoneTempTable } from './components/ZoneTempTable';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/usePWAInstall';

type ActiveTab = 'log' | 'history' | 'reports';

const SAMPLE_HMI_PATH = '/assets/aistudio/WhatsApp_Image_2026-11-22_at_22.35.25__1__0eb86a6c.jpeg';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyZones(): TcReading[] {
  return TC_DEFINITIONS.map((d) => ({ tc: d.tc, pv: null, sv: null }));
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lehr01_lang');
    return saved === 'si' ? 'si' : 'en';
  });
  const t = TRANSLATIONS[lang];
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<ActiveTab>('log');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [activeOperator, setActiveOperator] = useState<Operator | null>(null);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);

  const [logs, setLogs] = useState<LehrLogEntry[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Logger Form State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);
  const [selectedHour, setSelectedHour] = useState<number>(() => new Date().getHours());
  const [zones, setZones] = useState<TcReading[]>(createEmptyZones);
  const [matSpeed, setMatSpeed] = useState<number | null>(null);
  const [recipe, setRecipe] = useState<string>('');
  const [mode, setMode] = useState<string>('');
  const [fan1Hz, setFan1Hz] = useState<number | null>(null);
  const [fan2Hz, setFan2Hz] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [source, setSource] = useState<'ai-camera' | 'manual'>('manual');

  // Scanner State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoThumbnailUrl, setPhotoThumbnailUrl] = useState<string | undefined>(undefined);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanErrorMessage, setScanErrorMessage] = useState('');

  // Save State
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleToggleLang = (nextLang: Language) => {
    setLang(nextLang);
    localStorage.setItem('lehr01_lang', nextLang);
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const [opRes, logsRes] = await Promise.all([fetch('/api/operators'), fetch('/api/logs')]);
      const opJson = (await opRes.json()) as { operators: Operator[] };
      const logsJson = (await logsRes.json()) as { logs: LehrLogEntry[] };

      const fetchedOps = opJson.operators ?? [];
      setOperators(fetchedOps);
      setLogs(logsJson.logs ?? []);

      const savedOpId = localStorage.getItem('lehr01_active_operator_id');
      const matched = fetchedOps.find((o) => o.id === savedOpId);
      if (matched) {
        setActiveOperator(matched);
      } else if (fetchedOps.length > 0) {
        setActiveOperator(fetchedOps[0]);
      } else {
        setOperatorModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const loggedHoursForSelectedDate = useMemo(() => {
    return logs.filter((l) => l.date === selectedDate).map((l) => l.hour);
  }, [logs, selectedDate]);

  const existingSlotLog = useMemo(() => {
    return logs.find((l) => l.date === selectedDate && l.hour === selectedHour) ?? null;
  }, [logs, selectedDate, selectedHour]);

  const handleSelectOperator = (op: Operator) => {
    setActiveOperator(op);
    localStorage.setItem('lehr01_active_operator_id', op.id);
    setOperatorModalOpen(false);
  };

  const handleAddOperator = async (payload: {
    name: string;
    code: string;
    shift: 'Morning' | 'Evening' | 'Night';
  }) => {
    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { operator?: Operator; error?: string };
    if (!res.ok || !data.operator) {
      throw new Error(data.error || 'Could not add operator.');
    }
    setOperators((prev) => [...prev, data.operator!]);
    handleSelectOperator(data.operator);
  };

  const runGeminiExtraction = async (dataUrl: string, mimeType: string) => {
    setScanning(true);
    setScanStatus('idle');
    setScanErrorMessage('');
    try {
      const thumb = await createThumbnailDataUrl(dataUrl, 720, 0.72);
      setPhotoThumbnailUrl(thumb);

      const res = await fetch('/api/extract-hmi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType }),
      });

      const payload = (await res.json()) as Partial<HmiExtractionResponse> & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t.scanError);
      }

      if (Array.isArray(payload.zones)) {
        setZones(
          TC_DEFINITIONS.map((def) => {
            const found = payload.zones?.find((z) => z.tc === def.tc);
            return {
              tc: def.tc,
              pv: found?.pv ?? null,
              sv: found?.sv ?? null,
            };
          })
        );
      }
      if (typeof payload.matSpeed === 'number' || payload.matSpeed === null) {
        setMatSpeed(payload.matSpeed ?? null);
      }
      if (typeof payload.recipe === 'string') setRecipe(payload.recipe);
      if (typeof payload.mode === 'string') setMode(payload.mode);
      if (typeof payload.fan1Hz === 'number' || payload.fan1Hz === null) {
        setFan1Hz(payload.fan1Hz ?? null);
      }
      if (typeof payload.fan2Hz === 'number' || payload.fan2Hz === null) {
        setFan2Hz(payload.fan2Hz ?? null);
      }
      if (typeof payload.notes === 'string' && payload.notes.trim()) {
        setNotes(payload.notes.trim());
      }

      setSource('ai-camera');
      setScanStatus('success');
    } catch (err) {
      setScanStatus('error');
      setScanErrorMessage(err instanceof Error ? err.message : t.scanError);
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      const { dataUrl, mimeType } = await compressImageToDataUrl(file, 1600, 0.85);
      setPreviewUrl(dataUrl);
      await runGeminiExtraction(dataUrl, mimeType);
    } catch (err) {
      setScanStatus('error');
      setScanErrorMessage(err instanceof Error ? err.message : t.scanError);
    }
  };

  const handleLoadSample = async () => {
    try {
      setScanning(true);
      setScanStatus('idle');
      setScanErrorMessage('');
      const resp = await fetch(SAMPLE_HMI_PATH);
      if (!resp.ok) throw new Error('Sample HMI image could not be loaded.');
      const blob = await resp.blob();
      const { dataUrl, mimeType } = await compressImageToDataUrl(blob, 1600, 0.85);
      setPreviewUrl(dataUrl);
      await runGeminiExtraction(dataUrl, mimeType);
    } catch (err) {
      setScanning(false);
      setScanStatus('error');
      setScanErrorMessage(err instanceof Error ? err.message : t.scanError);
    }
  };

  const handleClearPhoto = () => {
    setPreviewUrl(null);
    setPhotoThumbnailUrl(undefined);
    setScanStatus('idle');
    setScanErrorMessage('');
  };

  const handleZoneChange = (tc: TcCode, field: 'pv' | 'sv', value: number | null) => {
    setZones((prev) =>
      prev.map((item) => (item.tc === tc ? { ...item, [field]: value } : item))
    );
  };

  const handleResetValues = () => {
    setZones(createEmptyZones());
    setMatSpeed(null);
    setRecipe('');
    setMode('');
    setFan1Hz(null);
    setFan2Hz(null);
    setNotes('');
    setSource('manual');
    handleClearPhoto();
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOperator) {
      setOperatorModalOpen(true);
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveToast('');

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          hour: selectedHour,
          operatorId: activeOperator.id,
          operatorName: activeOperator.name,
          recipe,
          mode,
          matSpeed,
          fan1Hz,
          fan2Hz,
          zones,
          notes,
          source,
          photoDataUrl: photoThumbnailUrl,
        }),
      });
      const data = (await res.json()) as { log?: LehrLogEntry; error?: string };
      if (!res.ok || !data.log) {
        throw new Error(data.error || 'Failed to save log.');
      }

      setLogs((prev) => {
        const filtered = prev.filter((item) => item.id !== data.log!.id);
        return [data.log!, ...filtered].sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.hour - a.hour;
        });
      });

      setSaveToast(t.savedToast);
      setTimeout(() => setSaveToast(''), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save log.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadIntoEditor = (log: LehrLogEntry) => {
    setSelectedDate(log.date);
    setSelectedHour(log.hour);
    setZones(
      TC_DEFINITIONS.map((def) => {
        const found = log.zones.find((z) => z.tc === def.tc);
        return { tc: def.tc, pv: found?.pv ?? null, sv: found?.sv ?? null };
      })
    );
    setMatSpeed(log.matSpeed);
    setRecipe(log.recipe);
    setMode(log.mode);
    setFan1Hz(log.fan1Hz);
    setFan2Hz(log.fan2Hz);
    setNotes(log.notes);
    setSource(log.source);
    setPreviewUrl(log.photoDataUrl ?? null);
    setPhotoThumbnailUrl(log.photoDataUrl);
    setScanStatus('idle');
    setActiveTab('log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLog = async (id: string) => {
    const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLogs((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const parseNullableNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 pb-24 md:pb-10">
      {/* Top Navigation Bar (3-zone contract) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            {t.appTitle}
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'log'
                  ? 'border-orange-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.navLog}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'history'
                  ? 'border-orange-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.navHistory}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'reports'
                  ? 'border-orange-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.navReports}
            </button>
          </nav>

          {/* Zone 3: Install App + Language Switcher + Operator Action */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton lang={lang} />

            <button
              type="button"
              onClick={() => handleToggleLang(lang === 'en' ? 'si' : 'en')}
              className="min-h-[40px] px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'සිංහල' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setOperatorModalOpen(true)}
              className="min-h-[40px] px-3 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors max-w-[140px]"
            >
              <UserCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="truncate">{activeOperator ? activeOperator.name : t.switchOperator}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {!isOnline && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            {lang === 'si'
              ? 'Offline තත්ත්වය: AI ස්කෑන් සහ Save කිරීමට internet අවශ්‍යයි.'
              : 'Offline mode: Internet connection is required for AI photo scan and saving logs.'}
          </div>
        )}
        {loadingInitial ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : activeTab === 'log' ? (
          <form onSubmit={handleSaveLog} className="space-y-5">
            {/* Compact Workspace Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.appSubtitle}</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>
                    {t.activeOperator}:{' '}
                    <strong className="text-slate-800 font-semibold">
                      {activeOperator ? `${activeOperator.name} (${activeOperator.code})` : '—'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t.selectedHour}:{' '}
                    <strong className="font-mono-tabular text-slate-800">
                      {selectedDate} {String(selectedHour).padStart(2, '0')}:00
                    </strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetValues}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.clearFormBtn}</span>
              </button>
            </div>

            {existingSlotLog && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
                <span>{t.overwriteNotice}</span>
                <button
                  type="button"
                  onClick={() => handleLoadIntoEditor(existingSlotLog)}
                  className="font-semibold underline underline-offset-2 text-amber-900 hover:text-amber-950"
                >
                  {t.loadIntoEditorBtn}
                </button>
              </div>
            )}

            {/* 24-Hour Selector */}
            <HourSelector
              selectedDate={selectedDate}
              selectedHour={selectedHour}
              loggedHours={loggedHoursForSelectedDate}
              lang={lang}
              onDateChange={setSelectedDate}
              onHourChange={setSelectedHour}
            />

            {/* Two-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: AI Scanner + Mat Speed & Line Parameters */}
              <div className="lg:col-span-5 space-y-5">
                <HmiScannerCard
                  lang={lang}
                  previewUrl={previewUrl}
                  scanning={scanning}
                  scanStatus={scanStatus}
                  scanErrorMessage={scanErrorMessage}
                  onFileSelected={handleFileSelected}
                  onLoadSample={handleLoadSample}
                  onClearPhoto={handleClearPhoto}
                />

                {/* Mat Speed & Line Parameters */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-orange-600 shrink-0" />
                    <h2 className="text-base font-semibold text-slate-900">{t.matSpeedTitle}</h2>
                  </div>

                  {/* Highlighted Mat Speed Field */}
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5">
                    <label htmlFor="mat-speed-input" className="block text-xs font-medium text-slate-300">
                      {t.matSpeedLabel}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="mat-speed-input"
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={matSpeed ?? ''}
                        onChange={(e) => setMatSpeed(parseNullableNumber(e.target.value))}
                        placeholder="217.5"
                        className="w-full h-12 px-3 rounded-lg bg-slate-800 border border-slate-700 font-mono-tabular text-2xl font-bold text-orange-400 placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                      />
                      <span className="font-mono-tabular text-xs font-semibold text-slate-300 shrink-0">
                        MM/Min
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.recipeLabel}
                      </label>
                      <input
                        type="text"
                        value={recipe}
                        onChange={(e) => setRecipe(e.target.value)}
                        placeholder="_DATA_92"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.modeLabel}
                      </label>
                      <input
                        type="text"
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        placeholder="Auto"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.fan1Label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={fan1Hz ?? ''}
                        onChange={(e) => setFan1Hz(parseNullableNumber(e.target.value))}
                        placeholder="30.0"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.fan2Label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={fan2Hz ?? ''}
                        onChange={(e) => setFan2Hz(parseNullableNumber(e.target.value))}
                        placeholder="50.0"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-mono-tabular text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t.notesLabel}
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notesPlaceholder}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                    />
                  </div>
                </section>
              </div>

              {/* Right Column: TC-3 to TC-13 Readings + Save Action */}
              <div className="lg:col-span-7 space-y-5">
                <ZoneTempTable lang={lang} zones={zones} onChange={handleZoneChange} />

                {saveError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm font-medium">
                    {saveError}
                  </div>
                )}

                {saveToast && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveToast}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || scanning}
                  className="w-full h-13 rounded-2xl bg-orange-600 text-white font-semibold text-base hover:bg-orange-700 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-sm transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t.savingLogBtn}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{existingSlotLog ? t.updateLogBtn : t.saveLogBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'history' ? (
          <HistoryView
            lang={lang}
            logs={logs}
            operators={operators}
            onLoadIntoEditor={handleLoadIntoEditor}
            onDeleteLog={handleDeleteLog}
            onGoToLogger={() => setActiveTab('log')}
          />
        ) : (
          <ReportsView
            lang={lang}
            logs={logs}
            onGoToLogger={() => setActiveTab('log')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (<= 15% viewport height) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 ${
              activeTab === 'log' ? 'text-orange-600' : 'text-slate-500'
            }`}
          >
            {activeTab === 'log' ? <Camera className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
            <span className="text-[10px] font-semibold tracking-tight">{t.navLog}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 ${
              activeTab === 'history' ? 'text-orange-600' : 'text-slate-500'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight">{t.navHistory}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 ${
              activeTab === 'reports' ? 'text-orange-600' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight">{t.navReports}</span>
          </button>

          <button
            type="button"
            onClick={() => setOperatorModalOpen(true)}
            className="min-h-[44px] flex flex-col items-center justify-center gap-1 text-slate-600"
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight truncate max-w-[72px]">
              {activeOperator ? activeOperator.name : t.switchOperator}
            </span>
          </button>
        </div>
      </nav>

      {/* Operator Selection / Sign-In Modal */}
      <OperatorModal
        isOpen={operatorModalOpen}
        canClose={activeOperator !== null}
        operators={operators}
        activeOperator={activeOperator}
        lang={lang}
        onSelect={handleSelectOperator}
        onAddOperator={handleAddOperator}
        onClose={() => setOperatorModalOpen(false)}
      />
    </div>
  );
}
