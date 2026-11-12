import './utils/safeStorage.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './utils/pwaRegister'
import { seedMockTenants } from './utils/seedMockTenants.js'

// Initialize PWA Service Worker for offline resilience
registerServiceWorker()

// Seed Mock Multi-Tenant Data (School A and School B)
seedMockTenants()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)