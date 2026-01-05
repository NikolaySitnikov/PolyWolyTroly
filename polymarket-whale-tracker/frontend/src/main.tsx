import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { ToastProvider } from './contexts/ToastContext'
import { ApiConnectivityProvider } from './hooks/useApiConnectivity'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiConnectivityProvider>
      <SettingsProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SettingsProvider>
    </ApiConnectivityProvider>
  </StrictMode>,
)
