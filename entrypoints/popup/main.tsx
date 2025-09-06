import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style.css'

const root = document.getElementById('root')
if (root) {
  root.style.width = '100%'
  root.style.height = '100%'
  ReactDOM.createRoot(root).render(<App />)
}