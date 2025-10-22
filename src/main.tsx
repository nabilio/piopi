import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root')!;
const loader = document.getElementById('root-loader');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

setTimeout(() => {
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 300);
  }
}, 500);
