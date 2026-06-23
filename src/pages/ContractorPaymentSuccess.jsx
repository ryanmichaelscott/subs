import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function ContractorPaymentSuccess() {
  const { user, isLoaded } = useUser()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState('loading') // loading | success | error

  useEffect(() => {
    if (!isLoaded) return
    if (!sessionId) { setStatus('error'); return }

    // email is optional — the edge function will resolve it from the Stripe session
    // if the contractor isn't signed in yet (common for admin-sent payment links)
    const email = user?.primaryEmailAddress?.emailAddress

    supabase.functions.invoke('confirm-contractor-subscription', {
      body: { session_id: sessionId, ...(email ? { email } : {}) },
    }).then(({ data, error }) => {
      if (data?.success) {
        setStatus('success')
      } else {
        console.error('confirm-contractor-subscription error:', error || data?.error)
        setStatus('error')
      }
    })
  }, [isLoaded, user, sessionId])

  if (status === 'loading') {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: S.muted, fontSize: 14 }}>Activating your account…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontFamily: C.display, fontSize: 28, color: S.offwhite, marginBottom: 12 }}>Payment received</div>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your payment went through but we had trouble activating your account automatically. Contact us at{' '}
            <a href="mailto:hello@subs.app" style={{ color: S.green }}>hello@subs.app</a> and we'll get you set up right away.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: S.green + '22', border: `2px solid ${S.green}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px', fontSize: 32,
          }}>
            ✓
          </div>

          <div style={{ fontFamily: C.display, fontSize: 40, color: S.offwhite, marginBottom: 12, lineHeight: 1.1 }}>
            You're live.
          </div>

          <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.8, marginBottom: 40, maxWidth: 380, margin: '0 auto 40px' }}>
            Your SUBS partner membership is active. Pre-qualified homeowners in your area will start routing to you.
          </p>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Leads', 'Homeowners matched to your trades start coming in'],
              ['Payments', 'Collected instantly — no chasing invoices'],
              ['Dashboard', 'Track your jobs and manage your account'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
                <span style={{ color: S.green, fontSize: 15, marginTop: 1, flexShrink: 0 }}>✓</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{title} </span>
                  <span style={{ fontSize: 14, color: S.muted }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/contractor/dashboard"
            style={{
              display: 'inline-block', background: S.green, color: S.black,
              fontFamily: C.body, fontSize: 15, fontWeight: 700,
              padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
            }}
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
