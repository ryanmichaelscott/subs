import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignUp, useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

// Free-tier signup: Clerk account only, zero Stripe interaction. Once Clerk
// reports the user signed in, create-free-account stamps tier:free metadata
// and the members row, then we land on the dashboard.

const PERKS = [
  'Member discounts on every home service',
  'Submit service requests to our vetted contractor network',
  'Concierge line — call us, we find the right pro',
  'No credit card required',
]

export default function JoinPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const activating = useRef(false)

  useEffect(() => {
    const prev = document.title
    document.title = 'Join SUBS Free — Member Pricing on Every Home Service'
    return () => { document.title = prev }
  }, [])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || activating.current) return
    activating.current = true
    const activate = async () => {
      const { data, error: fnError } = await supabase.functions.invoke('create-free-account', {
        body: { clerk_user_id: user.id },
      })
      if (data?.success) {
        if (window.fbq) window.fbq('track', 'CompleteRegistration')
        if (window.gtag) window.gtag('event', 'sign_up', { method: 'free_tier' })
        navigate('/dashboard', { replace: true })
      } else {
        activating.current = false
        setError(fnError?.message || data?.error || 'Something went wrong — please try again or call 1-888-454-3019.')
      }
    }
    activate()
  }, [isLoaded, isSignedIn, user?.id, navigate])

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <style>{`
        .join-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; max-width: 980px; margin: 0 auto; }
        @media (max-width: 860px) { .join-grid { grid-template-columns: 1fr; gap: 28px; } }
      `}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px, 4vw, 28px)' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: C.display, fontSize: 24, fontWeight: 400, color: S.green, lineHeight: 1, letterSpacing: '0.02em' }}>SUBS</span>
        </Link>
        <Link to="/login" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>
          Already a member? <span style={{ color: S.green, fontWeight: 600 }}>Sign in →</span>
        </Link>
      </nav>

      <div style={{ padding: 'clamp(32px, 6vw, 64px) 20px' }}>
        <div className="join-grid">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: S.green, textTransform: 'uppercase', marginBottom: 14 }}>
              Free to join · No credit card
            </div>
            <h1 style={{ fontFamily: C.display, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, lineHeight: 1.08, margin: '0 0 16px' }}>
              Join SUBS for free.
            </h1>
            <p style={{ fontSize: 15.5, color: S.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 420 }}>
              Create a free account and get member pricing from vetted contractors on every home service — HVAC, plumbing, roofing, and 30+ more.
            </p>
            {PERKS.map(perk => (
              <div key={perk} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, fontSize: 14, color: S.offwhite }}>
                <span style={{ color: S.green, flexShrink: 0 }}>✓</span>{perk}
              </div>
            ))}
            <p style={{ fontSize: 12.5, color: S.muted, marginTop: 20 }}>
              Want more? <button onClick={() => navigate('/#plans')} style={{ background: 'none', border: 'none', color: S.green, fontWeight: 600, cursor: 'pointer', fontSize: 12.5, padding: 0, fontFamily: C.body }}>See Member and Full Pass options →</button>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {error && (
              <div style={{ background: '#F6E7E2', border: `1px solid ${S.danger}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: S.danger, fontSize: 13, maxWidth: 400 }}>
                {error}
              </div>
            )}
            {isLoaded && isSignedIn ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <div style={{ width: 32, height: 32, margin: '0 auto 16px', border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: S.muted }}>Setting up your free account…</div>
              </div>
            ) : (
              <SignUp
                routing="hash"
                forceRedirectUrl="/join"
                fallbackRedirectUrl="/join"
                signInUrl="/login"
                appearance={{
                  elements: {
                    rootBox: { width: '100%', maxWidth: 420 },
                    card: { width: '100%', background: S.card, border: `1px solid ${S.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
