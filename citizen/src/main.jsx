import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorModeProvider } from './theme/ColorMode.jsx';
import { AuthProvider }      from './auth/AuthContext.jsx';
import App from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ColorModeProvider>
  </StrictMode>
);
