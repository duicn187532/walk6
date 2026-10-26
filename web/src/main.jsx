import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BASE } from './api.js';
import { SessionProvider } from './lib.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={BASE || undefined}>
    <SessionProvider>
      <App />
    </SessionProvider>
  </BrowserRouter>,
);
