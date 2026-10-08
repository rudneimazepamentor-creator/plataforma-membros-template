import { APP_NAME } from '@/lib/config';
import { useInstallPrompt, usePushNotifications } from '@/hooks/usePWA';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Bell, BellRing, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        style={{ background: 'linear-gradient(to top, hsl(220 13% 6%) 0%, hsl(220 13% 6% / 0.95) 100%)' }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <Smartphone size={24} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Instale o {APP_NAME}</h3>
            <p className="text-xs text-gray-400">Acesse direto da tela inicial do seu celular</p>
          </div>

          <button
            onClick={async () => {
              const accepted = await install();
              if (accepted) toast.success('App instalado!');
            }}
            className="btn-primary !px-4 !py-2.5 text-sm flex items-center gap-2 flex-shrink-0"
          >
            <Download size={14} /> Instalar
          </button>

          <button onClick={dismiss} className="text-gray-500 hover:text-white p-1 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function NotificationButton() {
  const { user } = useAuth();
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  if (!user || !isSupported) return null;
  if (permission === 'denied') return null;

  const handleEnable = async () => {
    setLoading(true);
    const result = await requestPermission();
    setLoading(false);

    if (result === 'granted') {
      toast.success('Notificações ativadas! Você será avisado sobre novas aulas.');
    } else if (result === 'denied') {
      toast.error('Notificações bloqueadas. Ative nas configurações do navegador.');
    }
  };

  if (permission === 'granted') {
    return (
      <button className="flex items-center gap-2 text-xs text-green-400 px-3 py-1.5 rounded-lg bg-green-500/10" disabled>
        <BellRing size={12} /> Notificações ativas
      </button>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={loading}
      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
    >
      <Bell size={12} className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Ativando...' : 'Ativar notificações'}
    </button>
  );
}
