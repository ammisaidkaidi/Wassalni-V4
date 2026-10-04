import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Task 16.1 — PWA installability. Chromium/Edge/Android fire
 * `beforeinstallprompt` once the manifest + service-worker criteria are
 * met; we stash that event (the browser suppresses its own mini-infobar
 * once we call preventDefault) and expose a normal button that re-triggers
 * it on demand, anywhere in the topbar. Safari/iOS never fire this event —
 * there a user installs via the native "Add to Home Screen" share-sheet
 * action instead, so the button simply never appears there.
 */
export default function InstallAppButton() {
  const { t } = useI18n();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event): void => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !promptEvent) return null;

  const install = async (): Promise<void> => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPromptEvent(null);
  };

  return (
    <button type="button" className="btn ghost icon-btn" onClick={() => void install()} title={t('nav.installApp')}>
      <span aria-hidden="true">⬇️</span>
      <span className="sr-only">{t('nav.installApp')}</span>
    </button>
  );
}
