import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './components/ui';
import { applyTheme, savedTheme } from './screens/Settings';
import { PasscodeGate } from './screens/Passcode';
import './styles.css';
import './recipe.css';

applyTheme(savedTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasscodeGate>
      <StoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StoreProvider>
    </PasscodeGate>
  </StrictMode>,
);
