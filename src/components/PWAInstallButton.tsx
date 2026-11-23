import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Smartphone, X } from 'lucide-react';
import { Language } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  lang: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="min-h-[40px] px-2.5 sm:px-3 rounded-xl border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-800 hover:bg-orange-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
      >
        <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        <span>{lang === 'si' ? 'App එක ගන්න' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'si' ? 'Phone එකට App එක Install කරගන්න' : 'Install Amcept Lehr on Phone'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700 overflow-y-auto">
              {inIframe && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <p className="text-xs font-medium text-amber-900">
                    {lang === 'si'
                      ? 'AI Studio Preview කවුළුව ඇතුළේ App Install කිරීම browser එකෙන් අවහිර කර ඇත. පළමුව අලුත් Browser Tab එකකින් open කරන්න:'
                      : 'Browsers block app installation inside preview frames. Open the app in a standalone browser tab first:'}
                  </p>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] px-4 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{lang === 'si' ? 'Browser Tab එකකින් Open කරන්න' : 'Open in Browser Tab'}</span>
                  </a>
                </div>
              )}

              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">iPhone / iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
                    <li>
                      {lang === 'si'
                        ? 'Safari පහළ තියෙන Share icon (↑) එක tap කරන්න.'
                        : 'Tap the Share icon in the Safari toolbar.'}
                    </li>
                    <li>
                      {lang === 'si'
                        ? 'පහළට scroll කර "Add to Home Screen" තෝරන්න.'
                        : 'Scroll down and tap "Add to Home Screen".'}
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Android Phone (Chrome):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
                    <li>
                      {lang === 'si'
                        ? 'වෙනත් phone වලට link එක දීමට AI Studio හි "Deploy" බටන් එකෙන් Deploy කරන්න.'
                        : 'Use the "Deploy" button in AI Studio to get a public URL for other phones.'}
                    </li>
                    <li>
                      {lang === 'si'
                        ? 'Phone එකේ Chrome browser එකෙන් එම link එක open කර, Chrome Menu (⋮) → "Install app" / "Add to Home screen" tap කරන්න.'
                        : 'Open that URL in Chrome on your phone, then tap Menu (⋮) → "Install app" or "Add to Home screen".'}
                    </li>
                  </ol>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-600">
                  {lang === 'si' ? 'වත්මන් App Link එක:' : 'Current App URL:'}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono-tabular text-slate-800 truncate">
                    {currentUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="min-h-[36px] px-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (lang === 'si' ? 'Copy වුණා' : 'Copied') : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                {lang === 'si' ? 'වසන්න' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
