import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ═══ INSTALL PROMPT ═══
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    if (localStorage.getItem('pwa-dismissed')) setDismissed(true);

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setDeferredPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('pwa-dismissed', 'true');
  }, []);

  return { canInstall: !!deferredPrompt && !isInstalled && !dismissed, isInstalled, install, dismiss };
}

// ═══ PUSH NOTIFICATIONS ═══
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'denied';

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      try {
        // Buscar VAPID public key do servidor
        const { publicKey } = await api.get<{ publicKey: string }>('/notifications/vapid-key');
        const reg = await navigator.serviceWorker.ready;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Enviar subscription para o servidor
        const subJson = subscription.toJSON();
        await api.post('/notifications/subscribe', {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });
      } catch (err) {
        console.warn('[PUSH] Erro ao inscrever:', err);
      }
    }

    return result;
  }, []);

  return {
    permission,
    requestPermission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator,
  };
}
