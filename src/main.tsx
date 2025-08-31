import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker if supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Build an absolute URL so it works on GitHub Pages project paths
    const swUrl = new URL('sw.js', window.location.origin + import.meta.env.BASE_URL).toString()
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
