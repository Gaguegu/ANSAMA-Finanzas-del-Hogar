import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Prevención de pantalla en blanco por fallos de carga de chunks o assets dinámicos
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detectado. Recargando de forma segura...', event);
  window.location.reload();
});

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('ANSAMA Service Worker activo:', reg.scope);
      })
      .catch((err) => {
        console.warn('Aviso Service Worker:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
