import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function ContractorPaymentSuccess() {
  const { user, isLoaded } = useUser()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState('loading') // loading | success | error | pending

  useEffect(() => {
    if (!isLoaded) return
    if (!sessionId) { setStatus('error'); return }

    // Only run once when Clerk finishes loading. email is optional — the edge function
    // resolves it from the Stripe session for contractors who pay without being signed in.
    const email = user?.primaryEmailAddress?.emailAddress

    supabase.functions.invoke('confirm-contractor-subscription', {
      body: { session_id: sessionId, ...(email ? { email } : {}) },
    }).then(({ data, error }) => {
      if (data?.success) {
        setStatus('success')
      } else {
        console.error('confirm-contractor-subscription error:', error || data?.error)
        // Retry once after a short delay — handles cold-start timeouts
        setTimeout(() => {
          supabase.functions.invoke('confirm-contractor-subscription', {
            body: { session_id: sessionId, ...(email ? { email } : {}) },
          }).then(({ data: d2 }) => {
            setStatus(d2?.success ? 'success' : 'pending')
          }).catch(() => setStatus('pending'))
        }, 2500)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, sessionId])

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

  if (status === 'error' || status === 'pending') {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><img src="/logo-wordmark.png" alt="SUBS" style={{ height: 22, width: 'auto', display: 'block' }} /></Link>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: S.green + '22', border: `2px solid ${S.green}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', fontSize: 32,
            }}>
              ✓
            </div>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 12 }}>Payment confirmed.</div>
            <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.8, marginBottom: 32 }}>
              Your membership is being activated — it'll be ready in just a moment. Head to your dashboard to get started.
            </p>
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
            <p style={{ fontSize: 12, color: S.muted, marginTop: 20 }}>
              Questions? <a href="mailto:hello@subs.app" style={{ color: S.green }}>hello@subs.app</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><img src="/logo-wordmark.png" alt="SUBS" style={{ height: 22, width: 'auto', display: 'block' }} /></Link>
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
