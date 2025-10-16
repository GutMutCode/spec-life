import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { db } from './lib/indexeddb';

// Expose database globally for E2E tests
if (import.meta.env.MODE !== 'production') {
  (window as any).db = db;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
