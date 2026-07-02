import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { S, C } from '../theme'
import SavingsCalculator from '../components/SavingsCalculator'

export default function CalculatorPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const prev = document.title
    document.title = 'SUBS — Savings Calculator'
    return () => { document.title = prev }
  }, [])

  const goJoin = () => {
    if (window.fbq) window.fbq('track', 'Lead')
    navigate('/#plans')
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite, display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 12 }}>Savings Calculator</div>
            <h1 style={{ fontFamily: C.display, fontSize: 'clamp(30px, 5vw, 50px)', color: S.offwhite, fontWeight: 400, margin: '0 0 14px', lineHeight: 1.08 }}>
              What would <span style={{ color: S.green }}>you</span> save?
            </h1>
            <p style={{ fontSize: 15, color: S.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Pick the service you need and see the SUBS member price next to what everyone else pays.
            </p>
          </div>

          <SavingsCalculator onJoin={goJoin} joinLabel="Join now →" />

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button onClick={goJoin} style={{ background: S.green, border: 'none', color: S.black, fontSize: 16, fontWeight: 800, padding: '16px 48px', borderRadius: 100, cursor: 'pointer', boxShadow: '0 10px 34px rgba(93,255,138,0.3)' }}>
              Join now — from $99/yr →
            </button>
            <p style={{ fontSize: 13, color: S.muted, marginTop: 16 }}>
              Membership pays for itself on the first job. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
