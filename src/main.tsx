import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Provider } from 'react-redux'
import { store } from './app/store'

// Clean up static loader if it exists
const loader = document.getElementById('static-loader');
if (loader) loader.style.display = 'none';

// Force Service Worker unregistration to clear old PWA caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

console.log("%cWhoApp v2.0 - Sistema de Usuarios Activo", "color: #00a884; font-weight: bold; font-size: 16px;");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
