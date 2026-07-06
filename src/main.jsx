import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import './styles/responsive.css'
import App from './App.jsx'

// Always reload at the top of the page instead of the browser restoring
// whatever scroll position was open before the refresh
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// Capture referral code synchronously before Clerk can redirect
const _subs_ref = new URLSearchParams(window.location.search).get('ref')
if (_subs_ref) localStorage.setItem('subs_referral_code', _subs_ref)

// Register service worker for offline support + faster repeat loads
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
