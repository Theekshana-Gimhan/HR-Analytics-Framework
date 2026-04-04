import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppProviders from './app/providers/AppProviders';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
