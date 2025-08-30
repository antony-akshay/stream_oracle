import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppWithProvider } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithProvider />
  </React.StrictMode>,
)

