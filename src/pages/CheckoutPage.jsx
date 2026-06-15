import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const TIERS = [
  {
    id: 'member',
    name: 'Member',
    price: 99,
    priceId: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
    color: S.green,
    tagline: 'Contractor pricing on every trade.',
    perks: [
      'Access to vetted SUBS network',
      'Member rate card on every job',
      'Priority booking',
      'Concierge support line',
    ],
  },
  {
    id: 'plus',
    name: 'Member+',
    price: 199,
    priceId: 'price_1TiRQBAYDs9oVarW14DBq2HL',
    color: S.blue,
    tagline: 'Deeper discounts + job coordination.',
    perks: [
      'Everything in Member',
      'Up to 40% off market rate',
      'Concierge job coordination',
      'Dedicated account support',
    ],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 399,
    priceId: 'price_1TiRQZAYDs9oVarWcZ10xjDG',
    color: S.purple,
    tagline: 'White-glove. One call does it all.',
    perks: [
      'Everything in Member+',
      'Up to 60% off market rate',
      'White-glove concierge',
      'Dedicated account manager',
    ],
  },
]

export default function CheckoutPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState(null)
  const [preselected] = useState(() => localStorage.getItem('subs_pending_plan'))
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/login')
      return
    }

    const check = async () => {
      const { data } = await supabase
        .from('members')
        .select('stripe_subscription_id, phone')
        .eq('clerk_user_id', user.id)
        .single()

      if (data?.stripe_subscription_id) {
        navigate('/dashboard')
        return
      }
      if (data?.phone) setPhone(data.phone)
      setChecking(false)
    }
    check()
  }, [isLoaded, isSignedIn])

  const handleSelect = async (tier) => {
    if (loadingId) return
    setError(null)
    setLoadingId(tier.id)
    localStorage.removeItem('subs_pending_plan')
    if (phone.trim()) {
      await supabase.from('members').update({ phone: phone.trim() }).eq('clerk_user_id', user.id)
    }
    const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        price_id: tier.priceId,
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        success_url: `${window.location.origin}/dashboard`,
        cancel_url: `${window.location.origin}/checkout`,
      },
    })
    if (data?.url) {
      window.location.href = data.url
    } else {
      let msg = 'Could not start checkout. Please try again.'
      if (fnError?.context) {
        try { const b = await fnError.context.json(); msg = b.error || msg } catch {}
      } else if (fnError?.message) {
        msg = fnError.message
      }
      console.error('Checkout error:', fnError, data)
      setError(msg)
      setLoadingId(null)
    }
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
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <span style={{ fontSize: 13, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress}</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: C.display, fontSize: 38, color: S.offwhite, marginBottom: 12 }}>Choose your plan.</div>
          <p style={{ fontSize: 15, color: S.muted, margin: 0 }}>
            Unlock contractor pricing on every trade in your area.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 36 }}>
          <label style={{ display: 'block', fontSize: 13, color: S.muted, marginBottom: 6 }}>
            Mobile number <span style={{ fontWeight: 400 }}>(for SMS job updates)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(801) 555-0100"
            style={{
              width: '100%',
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: 10,
              color: S.offwhite,
              fontSize: 15,
              padding: '11px 14px',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: C.body,
            }}
          />
        </div>

        {error && (
          <div style={{ background: '#2D1010', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 16px', marginBottom: 24, color: S.danger, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 960 }}>
          {TIERS.map((tier) => {
            const isPre = preselected === tier.id
            const isLoading = loadingId === tier.id
            return (
              <div
                key={tier.id}
                style={{
                  background: S.card,
                  border: `2px solid ${isPre ? tier.color : S.border}`,
                  borderRadius: 16,
                  padding: '28px 24px',
                  width: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {tier.popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: S.blue, color: S.black, fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: tier.color, letterSpacing: '0.06em', marginBottom: 8 }}>
                  {tier.name.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: C.display, fontSize: 40, color: S.offwhite }}>${tier.price}</span>
                  <span style={{ fontSize: 14, color: S.muted }}>/yr</span>
                </div>
                <p style={{ fontSize: 13, color: S.muted, margin: '0 0 20px', lineHeight: 1.5 }}>{tier.tagline}</p>
                <div style={{ flex: 1, marginBottom: 24 }}>
                  {tier.perks.map((perk) => (
                    <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ color: tier.color, fontSize: 14, lineHeight: 1 }}>✓</span>
                      <span style={{ fontSize: 13, color: S.offwhite }}>{perk}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSelect(tier)}
                  disabled={!!loadingId}
                  style={{
                    width: '100%',
                    background: isPre ? tier.color : 'transparent',
                    border: `1px solid ${tier.color}`,
                    color: isPre ? S.black : tier.color,
                    fontFamily: C.body,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '12px 0',
                    borderRadius: 10,
                    cursor: loadingId ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{ width: 14, height: 14, border: `2px solid ${isPre ? S.black : tier.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Redirecting...
                    </>
                  ) : (
                    `Start ${tier.name}`
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: 32, fontSize: 13, color: S.muted, textAlign: 'center' }}>
          Cancel anytime · Billed annually ·{' '}
          <a href="tel:18884543019" style={{ color: S.green, textDecoration: 'none' }}>1-888-454-3019</a>
        </p>
      </div>
    </div>
  )
}
