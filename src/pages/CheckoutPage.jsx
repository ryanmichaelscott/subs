import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

const TIERS = [
  {
    id: 'full',
    name: 'Full Pass',
    price: 249,
    compareAt: 349,
    priceId: 'price_1TtwA5AYDs9oVarWSOV7SwP7',
    color: S.green,
    tagline: '$1,525 in free services, included.',
    perks: [
      'All member discounts — 15–35% off every service',
      '6 FREE services worth $1,525 total value',
      'Concierge line — we find and book the right contractor',
      'Digital membership card',
      'Valid 12 months',
      'Transferable as a gift',
    ],
    popular: true,
  },
  {
    id: 'member',
    name: 'Member Pass',
    price: 99,
    priceId: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
    color: S.forest,
    tagline: 'Every member discount, all year.',
    perks: [
      'All member discounts — 15–35% off every service',
      'Save on every booking',
      'Access to the vetted SUBS contractor network',
      'Digital membership card',
      'Valid 12 months',
    ],
  },
]

export default function CheckoutPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showUnpaidBanner = searchParams.get('unpaid') === '1'
  const couponCode = searchParams.get('coupon')
  const DOOR100_PROMO_ID = 'promo_1TtwmjAYDs9oVarW7K7jt7Xq'
  const [checking, setChecking] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState(null)
  const [preselected] = useState(() => localStorage.getItem('subs_pending_plan'))
  const [memberState, setMemberState] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/login')
      return
    }

    const check = async () => {
      const { data } = await supabase.functions.invoke('admin-get-member', {
        body: { clerk_user_id: user.id },
      })
      if (data?.member?.stripe_subscription_id) {
        navigate('/dashboard')
        return
      }
      setChecking(false)
    }
    check()
  }, [isLoaded, isSignedIn])

  const [agreed, setAgreed] = useState(false)

  const handleSelect = async (tier) => {
    if (loadingId) return
    if (!memberState) {
      setError('Please select your state so we can confirm service availability in your area.')
      return
    }
    if (!agreed) {
      setError('Please agree to the Member Agreement and Terms of Service to continue.')
      return
    }
    setError(null)
    setLoadingId(tier.id)

    // Check if this state has ≥3 active contractors before sending to Stripe
    const { data: coverageData } = await supabase.functions.invoke('check-state-coverage', {
      body: { state: memberState },
    })
    if (!coverageData?.covered) {
      navigate(`/waitlist?state=${memberState}`)
      setLoadingId(null)
      return
    }

    localStorage.removeItem('subs_pending_plan')
    const checkoutBody = {
      price_id: tier.priceId,
      clerk_user_id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      success_url: `${window.location.origin}/dashboard?conversion=1&checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/checkout`,
    }
    if (couponCode === 'DOOR100' && tier.id === 'full') {
      checkoutBody.promotion_code_id = DOOR100_PROMO_ID
    }
    const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
      body: checkoutBody,
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

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, color: S.offwhite, fontSize: 15, padding: '11px 14px',
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
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress}</span>
          <button onClick={() => signOut().then(() => navigate('/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        {showUnpaidBanner && (
          <div style={{ background: '#E7EFE0', border: `1px solid ${S.green}`, borderRadius: 10, padding: '12px 20px', marginBottom: 28, maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: S.green, fontWeight: 600 }}>Complete your membership to access your dashboard.</span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: C.display, fontSize: 38, color: S.offwhite, marginBottom: 12 }}>Choose your plan.</div>
          <p style={{ fontSize: 15, color: S.muted, margin: 0 }}>
            Unlock contractor pricing on every trade in your area.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 400, marginBottom: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: S.muted, marginBottom: 6 }}>
              Your state <span style={{ fontWeight: 400 }}>(confirms service availability)</span>
            </label>
            <select
              value={memberState}
              onChange={e => { setMemberState(e.target.value); setError(null) }}
              style={{ ...inp, color: memberState ? S.offwhite : S.muted, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="" style={{ color: S.muted }}>Select your state...</option>
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code} style={{ background: S.surface, color: S.offwhite }}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agreement checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', maxWidth: 400, width: '100%', marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, accentColor: S.green, flexShrink: 0, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: S.muted, lineHeight: 1.6 }}>
            I agree to the{' '}
            <a href="/member-agreement" target="_blank" rel="noreferrer" style={{ color: S.green, textDecoration: 'none' }}>Member Agreement</a>
            {' '}and{' '}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: S.green, textDecoration: 'none' }}>Terms of Service</a>
          </span>
        </label>

        {error && (
          <div style={{ background: '#F6E7E2', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 16px', marginBottom: 24, color: S.danger, fontSize: 14 }}>
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
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: S.green, color: S.black, fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: tier.color, letterSpacing: '0.06em', marginBottom: 8 }}>
                  {tier.name.toUpperCase()}
                </div>
                {tier.id === 'full' && couponCode === 'DOOR100' ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: C.display, fontSize: 40, color: S.green }}>$149</span>
                      <span style={{ fontFamily: C.display, fontSize: 22, color: S.muted, textDecoration: 'line-through' }}>$249</span>
                      <span style={{ fontSize: 14, color: S.muted }}>/yr</span>
                    </div>
                    <div style={{ fontSize: 12, color: S.green, fontWeight: 700, marginTop: 4 }}>DOOR100 ✓ — $100 off</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                    {tier.compareAt && (
                      <span style={{ fontFamily: C.display, fontSize: 22, color: S.muted, textDecoration: 'line-through' }}>${tier.compareAt}</span>
                    )}
                    <span style={{ fontFamily: C.display, fontSize: 40, color: S.offwhite }}>${tier.price}</span>
                    <span style={{ fontSize: 14, color: S.muted }}>/yr</span>
                  </div>
                )}
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
                      Checking your area...
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
