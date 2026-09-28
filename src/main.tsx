import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { OutletProvider } from './context/OutletContext';
import './index.css';

// Register robust PWA service worker with auto-update
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('[PWA SW] New content available, updating service worker...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA SW] Live Shift Checklist is ready for robust offline operation.');
      },
      onRegisterError(error) {
        console.warn('[PWA SW] Service worker registration notice:', error);
      },
    });
  } catch (err) {
    console.warn('[PWA SW] SW initialization notice:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <OutletProvider>
          <App />
        </OutletProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

