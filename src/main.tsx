import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app');
}

createRoot(app).render(
  <StrictMode>
    <App />
  </StrictMode>
);
