import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { ApiConnectivityProvider } from './hooks/useApiConnectivity'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiConnectivityProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ApiConnectivityProvider>
  </StrictMode>,
)
