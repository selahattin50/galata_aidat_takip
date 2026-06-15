
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AppDialogProvider } from './components/AppDialog.tsx';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .catch(() => {});
}

if ('caches' in window) {
  caches.keys()
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(() => {});
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppDialogProvider>
      <App />
    </AppDialogProvider>
  </React.StrictMode>
);
