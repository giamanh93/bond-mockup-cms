import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmProvider } from './components/ConfirmDialog'
import { loadRuntime } from '@/lib/runtime'
import { configureApi } from '@/services/api'
import { configureAuth } from '@/services/auth'
import App from './App'
import './index.css'

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <ConfirmProvider>
            <App />
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

function renderFatal(message) {
  document.getElementById('root').innerHTML = `
    <div style="font-family: Inter, sans-serif; padding: 40px; max-width: 600px; margin: 80px auto; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b;">
      <h2 style="margin: 0 0 8px;">Khởi tạo thất bại</h2>
      <p style="margin: 0; font-size: 14px;">${message}</p>
    </div>
  `
}

loadRuntime()
  .then((runtime) => {
    configureApi({ baseURL: runtime.apiUrl })
    configureAuth(runtime.oidc)
    renderApp()
  })
  .catch((err) => {
    console.error('[runtime] load failed:', err)
    renderFatal(`Không tải được /config/runtime.json. ${err?.message || ''}`)
  })
