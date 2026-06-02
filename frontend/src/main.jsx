import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmProvider } from './components/ConfirmDialog'
import App from './App'
import './index.css'

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
