import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useSignIn, useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'

const PLAN_VALUES = { member: 99, 'member-plus': 179, plus: 179, elite: 349 }

export default function WelcomePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isSignedIn, isLoaded: userLoaded } = useUser()
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn()

  const ticket    = searchParams.get('ticket')
  const sessionId = searchParams.get('session_id')
  const purchaseFired = useRef(false)

  const [phase, setPhase]           = useState('loading') // loading | authing | confirmed | expired | error
  const [email, setEmail]           = useState('')
  const [resendState, setResendState] = useState(null) // null | sending | sent | error

  useEffect(() => {
    if (!sessionId || purchaseFired.current) return
    purchaseFired.current = true
    const plan = sessionStorage.getItem('subs_checkout_plan') || ''
    const value = PLAN_VALUES[plan] || 99
    if (window.fbq) window.fbq('track', 'Purchase', { value, currency: 'USD' })
    sessionStorage.removeItem('subs_checkout_plan')
  }, [sessionId])

  useEffect(() => {
    if (!userLoaded) return
    if (isSignedIn) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (ticket && signInLoaded && signIn) {
      exchangeTicket(ticket)
    } else if (signInLoaded) {
      setPhase('confirmed')
    }
  }, [userLoaded, isSignedIn, ticket, signInLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const exchangeTicket = async (t) => {
    setPhase('authing')
    try {
      const result = await signIn.create({ strategy: 'ticket', ticket: t })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard', { replace: true })
      } else {
        setPhase('error')
      }
    } catch (err) {
      const code = err?.errors?.[0]?.code || ''
      if (code.includes('expired') || code.includes('used') || code.includes('not_found') || code.includes('invalid')) {
        setPhase('expired')
      } else {
        setPhase('error')
      }
    }
  }

  const handleResend = async () => {
    if (!email.trim() || resendState === 'sending') return
    setResendState('sending')
    try {
      await signIn.create({
        strategy: 'email_link',
        identifier: email.trim(),
        redirectUrl: `${window.location.origin}/dashboard`,
      })
      setResendState('sent')
    } catch {
      setResendState('error')
    }
  }

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, color: S.offwhite, fontSize: 15, padding: '11px 14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
  }
  const btn = {
    background: S.green, border: 'none', color: S.black, fontSize: 14,
    fontWeight: 700, padding: '13px 28px', borderRadius: 10, cursor: 'pointer', width: '100%',
  }

  if (phase === 'loading' || phase === 'authing') {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 14, color: S.muted }}>{phase === 'authing' ? 'Signing you in…' : 'Loading…'}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><img src="/logo-wordmark.png" alt="SUBS" style={{ height: 22, width: 'auto', display: 'block' }} /></Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>

          {phase === 'confirmed' && (
            <>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 12 }}>You're in.</div>
              <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.6, marginBottom: 32 }}>
                {sessionId
                  ? 'Payment confirmed. Your membership access link is on its way to your inbox.'
                  : 'Check your email for your membership access link.'}
              </p>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '24px 20px', textAlign: 'left' }}>
                <p style={{ fontSize: 13, color: S.muted, marginBottom: 14 }}>Didn't get the email? Enter your address to get a new access link.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResend()} style={inp} />
                  {resendState === null && <button onClick={handleResend} style={btn}>Send access link</button>}
                  {resendState === 'sending' && <button disabled style={{ ...btn, opacity: 0.6, cursor: 'not-allowed' }}>Sending…</button>}
                  {resendState === 'sent' && (
                    <div style={{ background: '#E7EFE0', border: `1px solid ${S.green}`, borderRadius: 8, padding: '10px 16px', fontSize: 14, color: S.green }}>
                      ✓ Access link sent — check your inbox (and spam folder).
                    </div>
                  )}
                  {resendState === 'error' && (
                    <div style={{ background: '#F6E7E2', border: '1px solid #B3402F', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: '#B3402F' }}>
                      Couldn't send that address. Double-check and try again.
                    </div>
                  )}
                </div>
              </div>
              <p style={{ marginTop: 24, fontSize: 13, color: S.muted }}>
                Questions? Call <a href="tel:18884543019" style={{ color: S.green, textDecoration: 'none' }}>1-888-454-3019</a>
              </p>
            </>
          )}

          {phase === 'expired' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
              <div style={{ fontFamily: C.display, fontSize: 30, color: S.offwhite, marginBottom: 12 }}>Link expired.</div>
              <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.6, marginBottom: 24 }}>
                Access links expire after 24 hours. Enter your email to get a new one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResend()} style={inp} />
                {resendState !== 'sent' && (
                  <button onClick={handleResend} disabled={resendState === 'sending'} style={{ ...btn, opacity: resendState === 'sending' ? 0.6 : 1 }}>
                    {resendState === 'sending' ? 'Sending…' : 'Send new access link'}
                  </button>
                )}
                {resendState === 'sent' && (
                  <div style={{ background: '#E7EFE0', border: `1px solid ${S.green}`, borderRadius: 8, padding: '10px 16px', fontSize: 14, color: S.green }}>
                    ✓ New access link sent — check your inbox.
                  </div>
                )}
                {resendState === 'error' && (
                  <div style={{ background: '#F6E7E2', border: '1px solid #B3402F', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: '#B3402F' }}>
                    Couldn't send that address. Try <Link to="/login" style={{ color: '#B3402F' }}>logging in</Link> instead.
                  </div>
                )}
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontFamily: C.display, fontSize: 30, color: S.offwhite, marginBottom: 12 }}>Something went wrong.</div>
              <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.6, marginBottom: 24 }}>
                Try logging in with your email, or contact us.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/login" style={{ textDecoration: 'none' }}><button style={btn}>Go to login</button></Link>
                <a href="tel:18884543019" style={{ fontSize: 14, color: S.green }}>Call 1-888-454-3019</a>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
