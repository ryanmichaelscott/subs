import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function ContractorCheckoutPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [contractor, setContractor] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/contractor/login'); return }
    const email = user?.primaryEmailAddress?.emailAddress
    if (!email) return

    const init = async () => {
      // Handle Stripe success redirect
      if (sessionId) {
        const { data } = await supabase.functions.invoke('confirm-contractor-subscription', {
          body: { session_id: sessionId, email },
        })
        if (data?.success) {
          setConfirmed(true)
          setChecking(false)
          setTimeout(() => navigate('/contractor/dashboard'), 3000)
          return
        }
      }

      // Load contractor record — must be approved
      const { data } = await supabase
        .from('contractors')
        .select('id, name, status')
        .eq('contact_email', email)
        .single()

      if (!data || data.status !== 'approved') {
        navigate('/contractor/dashboard')
        return
      }

      setContractor(data)
      setChecking(false)
    }
    init()
  }, [isLoaded, isSignedIn, user, sessionId])

  const handleCheckout = async () => {
    setError(null)
    setLoading(true)
    const email = user?.primaryEmailAddress?.emailAddress
    const { data, error: fnError } = await supabase.functions.invoke('create-contractor-checkout-session', {
      body: {
        email,
        promo_code: promoCode.trim() || undefined,
        success_url: `${window.location.origin}/contractor/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/contractor/checkout`,
      },
    })
    if (data?.url) {
      window.location.href = data.url
    } else {
      let msg = 'Could not start checkout. Please try again.'
      if (fnError?.context) {
        try { const b = await fnError.context.json(); msg = b.error || msg } catch {}
      } else if (fnError?.message) msg = fnError.message
      setError(msg)
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 15,
    outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
  }

  if (!isLoaded || checking) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (confirmed) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 52 }}>🎉</div>
        <div style={{ fontFamily: C.display, fontSize: 32, color: S.offwhite }}>You're live!</div>
        <p style={{ fontSize: 15, color: S.muted, textAlign: 'center', maxWidth: 400, lineHeight: 1.7 }}>
          Your subscription is active. Pre-qualified leads in your service area will start routing to you. Redirecting to your dashboard…
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <span style={{ fontSize: 13, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress}</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.green + '22', border: `1px solid ${S.green}44`, borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ color: S.green, fontSize: 13 }}>✓</span>
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Application Approved</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>One last step.</div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Subscribe to start receiving leads from pre-qualified homeowners.</p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${S.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.green, letterSpacing: '0.06em', marginBottom: 4 }}>PARTNER MEMBERSHIP</div>
                <div style={{ fontSize: 13, color: S.muted }}>AI-matched leads · Instant payment · Zero bidding</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, lineHeight: 1 }}>$299</div>
                <div style={{ fontSize: 12, color: S.muted }}>/yr</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Promo Code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setError(null) }}
                placeholder="PARTNER20"
                style={{ ...inp, letterSpacing: '0.05em' }}
              />
            </div>

            {error && (
              <div style={{ background: '#2D1010', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: S.danger, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                width: '100%', background: S.green, border: 'none', color: S.black,
                fontFamily: C.body, fontSize: 15, fontWeight: 700, padding: '14px 0',
                borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: `2px solid ${S.black}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Redirecting to checkout...
                </>
              ) : 'Subscribe & Go Live →'}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {['Vetted homeowners only', 'Cancel anytime', 'Instant digital payments', '30-day money-back'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: S.muted }}>
                <span style={{ color: S.green }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
