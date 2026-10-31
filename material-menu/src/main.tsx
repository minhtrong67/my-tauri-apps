import { StrictMode, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import './fonts.css'
import './index.css'
import { api } from './lib/api'
import { AppProvider } from './lib/app'
import { SettingsProvider, applyAll, bootSettings } from './lib/settings'
import { ToastProvider } from './components/ui'
import App from './App'

applyAll(bootSettings())

const icons = {
  info: <Info size={20} />, success: <CircleCheck size={20} />, error: <CircleAlert size={20} />, warning: <TriangleAlert size={20} />,
}

function Root() {
  const ask = useCallback(() => window.dispatchEvent(new Event('mm-ask-restart')), [])
  const ready = useCallback(() => requestAnimationFrame(() => requestAnimationFrame(() => api.ready().catch(() => {}))), [])
  return (
    <AppProvider askRestart={ask}>
      <App onReady={ready} />
    </AppProvider>
  )
}

function Boot() {
  const noop = useCallback(() => {}, [])
  return (
    <SettingsProvider onLoaded={noop}>
      <ToastProvider icons={icons}>
        <Root />
      </ToastProvider>
    </SettingsProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Boot /></StrictMode>)
