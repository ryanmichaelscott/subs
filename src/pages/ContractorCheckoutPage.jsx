import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function ContractorCheckoutPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [contractor, setContractor] = useState(null)
  const [price, setPrice] = useState(null)

  const impersonating = (() => { try { return JSON.parse(localStorage.getItem('subs_impersonating') || 'null') } catch { return null } })()
  const isImpersonating = impersonating?.role === 'contractor'

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/contractor/login'); return }
    const email = isImpersonating ? impersonating.email : user?.primaryEmailAddress?.emailAddress
    if (!email) return

    const init = async () => {
      const { data } = await supabase
        .from('contractors')
        .select('id, name, status')
        .eq('contact_email', email)
        .single()

      // Active contractors already have a subscription — send them to the dashboard
      if (data?.status === 'active') {
        navigate('/contractor/dashboard')
        return
      }

      // Approved contractors proceed to checkout; anything else (pending, rejected, not found)
      // goes to the dashboard — do NOT redirect back here to avoid a loop
      if (!data || data.status !== 'approved') {
        navigate('/contractor/dashboard')
        return
      }

      setContractor(data)

      const { data: priceData } = await supabase.functions.invoke('get-contractor-price', {})
      if (priceData?.unit_amount) setPrice(priceData)

      setChecking(false)
    }
    init()
  }, [isLoaded, isSignedIn, user])

  const handleCheckout = async () => {
    setError(null)
    setLoading(true)
    const email = isImpersonating ? impersonating.email : user?.primaryEmailAddress?.emailAddress
    const { data, error: fnError } = await supabase.functions.invoke('create-contractor-checkout-session', {
      body: {
        email,
        promo_code: promoCode.trim() || undefined,
        success_url: `${window.location.origin}/contractor/payment-success?session_id={CHECKOUT_SESSION_ID}`,
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

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><span style={{ fontFamily: C.display, fontSize: 24, fontWeight: 400, color: S.green, lineHeight: 1, letterSpacing: '0.02em' }}>SUBS</span></Link>
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
                <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, lineHeight: 1 }}>
                  {price ? `$${(price.unit_amount / 100).toLocaleString()}` : '—'}
                </div>
                <div style={{ fontSize: 12, color: S.muted }}>/{price?.interval ?? 'yr'}</div>
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
                placeholder="Enter Code"
                style={{ ...inp, letterSpacing: '0.05em' }}
              />
            </div>

            {error && (
              <div style={{ background: '#F6E7E2', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: S.danger, fontSize: 13 }}>
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
