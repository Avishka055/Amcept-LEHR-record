import React, { useState } from 'react';
import { Check, Plus, UserCheck, X } from 'lucide-react';
import { Language, Operator } from '../types';
import { TRANSLATIONS } from '../i18n';

interface OperatorModalProps {
  isOpen: boolean;
  canClose: boolean;
  operators: Operator[];
  activeOperator: Operator | null;
  lang: Language;
  onSelect: (operator: Operator) => void;
  onAddOperator: (payload: { name: string; code: string; shift: 'Morning' | 'Evening' | 'Night' }) => Promise<void>;
  onClose: () => void;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  canClose,
  operators,
  activeOperator,
  lang,
  onSelect,
  onAddOperator,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onAddOperator({ name: name.trim(), code: code.trim(), shift });
      setName('');
      setCode('');
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create operator.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-orange-600 shrink-0" />
            <h2 id="operator-modal-title" className="text-lg font-semibold text-slate-900">
              {t.selectOperatorTitle}
            </h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              aria-label={t.closeBtn}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-sm text-slate-600">{t.selectOperatorDesc}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {operators.map((op) => {
              const isSelected = activeOperator?.id === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => onSelect(op)}
                  className={`min-h-[60px] flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 truncate">{op.name}</div>
                    <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                      {op.code} · {op.shift}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addOperator}</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{t.addOperator}</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  {t.cancelBtn}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.operatorName}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dilshan"
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.operatorCode}</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="OP-105"
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono-tabular text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.shiftLabel}</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as 'Morning' | 'Evening' | 'Night')}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-orange-600"
                >
                  <option value="Morning">{t.shiftMorning}</option>
                  <option value="Evening">{t.shiftEvening}</option>
                  <option value="Night">{t.shiftNight}</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {t.createOperatorBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
