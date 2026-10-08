import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registrado:', reg.scope);
    }).catch((err) => {
      console.warn('[SW] Erro ao registrar:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" theme="dark" richColors />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
