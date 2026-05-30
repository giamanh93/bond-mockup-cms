import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ConfirmProvider } from './components/ConfirmDialog'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px' },
            success: { style: { background: '#f0fdf4', border: '1px solid #bbf7d0' } },
            error: { style: { background: '#fef2f2', border: '1px solid #fecaca' } },
          }}
        />
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>
)
