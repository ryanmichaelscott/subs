import { useState, useEffect } from 'react'
import { S, C } from '../theme'

const DISMISS_KEY = 'subs_a2hs_dismissed'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isMobile() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

// "Add to Home Screen" banner for the member dashboard.
// Android: captures beforeinstallprompt and triggers the native install sheet.
// iOS: shows Share-button instructions (no programmatic install on iOS).
// "Not now" dismisses permanently via localStorage.
export default function AddToHomeScreen() {
  const [visible, setVisible] = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const ios = isIOS()

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === 'true') return
    if (!isMobile() || isStandalone()) return

    if (ios) {
      setVisible(true)
      return
    }

    // Android/Chrome — wait for the browser to offer install
    const onPrompt = (e) => {
      e.preventDefault()
      setInstallEvent(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }

  const install = async () => {
    if (!installEvent) return
    installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 95, padding: '0 12px 12px' }}>
      <style>{`
        @keyframes a2hs-slide-up { from { transform: translateY(110%); } to { transform: translateY(0); } }
        @keyframes a2hs-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>
      <div style={{
        maxWidth: 480, margin: '0 auto', background: S.card, border: `1px solid ${S.green}55`,
        borderRadius: 16, padding: '18px 18px 16px', boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(23,90,65,0.08)',
        animation: 'a2hs-slide-up 0.35s ease-out',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <img src="/icons/icon-192.png?v=3" alt="SUBS" width={44} height={44} style={{ borderRadius: 11, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: S.offwhite, marginBottom: 3 }}>Add SUBS to your home screen</div>
            {ios ? (
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.55 }}>
                Tap <span style={{ display: 'inline-block', animation: 'a2hs-bounce 1.4s ease-in-out infinite', fontSize: 15 }}>⬆️</span>{' '}
                <b style={{ color: S.offwhite }}>Share</b>, then <b style={{ color: S.offwhite }}>Add to Home Screen</b> — one-tap access to your membership.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.55 }}>
                One-tap access to your membership card, jobs, and member pricing.
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {!ios && (
            <button onClick={install} style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 0', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}>
              Add to home screen
            </button>
          )}
          <button onClick={dismiss} style={{ flex: ios ? 1 : 'none', background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
