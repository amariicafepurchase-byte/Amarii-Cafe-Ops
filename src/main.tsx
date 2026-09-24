import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { OutletProvider } from './context/OutletContext';
import './index.css';

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

