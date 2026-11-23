import React, { useRef } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n';

interface HmiScannerCardProps {
  lang: Language;
  previewUrl: string | null;
  scanning: boolean;
  scanStatus: 'idle' | 'success' | 'error';
  scanErrorMessage: string;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onClearPhoto: () => void;
}

export const HmiScannerCard: React.FC<HmiScannerCardProps> = ({
  lang,
  previewUrl,
  scanning,
  scanStatus,
  scanErrorMessage,
  onFileSelected,
  onLoadSample,
  onClearPhoto,
}) => {
  const t = TRANSLATIONS[lang];
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    e.target.value = '';
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t.scannerTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{t.scannerDesc}</p>
        </div>
        {previewUrl && !scanning && (
          <button
            type="button"
            onClick={onClearPhoto}
            className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 self-start transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.retakeBtn}</span>
          </button>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          disabled={scanning}
          onClick={() => cameraInputRef.current?.click()}
          className="min-h-[48px] px-4 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">{t.takePhotoBtn}</span>
        </button>

        <button
          type="button"
          disabled={scanning}
          onClick={() => uploadInputRef.current?.click()}
          className="min-h-[48px] px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
        >
          <ImagePlus className="w-4 h-4 shrink-0" />
          <span className="truncate">{t.uploadPhotoBtn}</span>
        </button>

        <button
          type="button"
          disabled={scanning}
          onClick={onLoadSample}
          className="min-h-[48px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="truncate">{t.testSampleBtn}</span>
        </button>
      </div>

      {/* Preview + Scanning State */}
      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
          <img
            src={previewUrl}
            alt="Siemens SIMATIC HMI Panel"
            referrerPolicy="no-referrer"
            className={`w-full max-h-64 object-contain mx-auto transition-opacity ${
              scanning ? 'opacity-40' : 'opacity-100'
            }`}
          />
          {scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-slate-950/50 text-white px-4 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
              <span className="text-sm font-medium">{t.scanningText}</span>
            </div>
          )}
        </div>
      )}

      {!previewUrl && scanning && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex items-center justify-center gap-3 text-slate-700">
          <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
          <span className="text-sm font-medium">{t.scanningText}</span>
        </div>
      )}

      {scanStatus === 'success' && !scanning && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{t.scanSuccess}</span>
        </div>
      )}

      {scanStatus === 'error' && !scanning && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{scanErrorMessage || t.scanError}</span>
        </div>
      )}
    </section>
  );
};
