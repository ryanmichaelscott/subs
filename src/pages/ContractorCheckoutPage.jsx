import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const TRADES_LIST = [
  'HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Windows & Doors',
  'Concrete Work', 'Driveway Paving', 'Interior Painting', 'Exterior Painting',
  'Lawn Care', 'Tree Service', 'Landscaping', 'Pest Control', 'Mold Detection',
  'Water Filtration', 'Handyman', 'Pool Service', 'Fireplace & Chimney',
  'Bathroom Remodel', 'Kitchen Remodel', 'Siding & Stucco', 'Smart Home / AV',
  'Additions & ADUs', 'Flooring', 'Insulation', 'Waterproofing', 'Fencing',
  'Decks & Patios', 'Framing', 'House Cleaning', 'Gutters', 'Carpet Cleaning',
]

export default function ContractorCheckoutPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [trades, setTrades] = useState([])
  const [promoCode, setPromoCode] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/contractor/login'); return }
    const email = user?.primaryEmailAddress?.emailAddress
    if (!email) return
    supabase.from('contractors').select('id').eq('contact_email', email).single()
      .then(({ data }) => {
        if (data) navigate('/contractor/dashboard')
        else setChecking(false)
      })
  }, [isLoaded, isSignedIn, user])

  const addTrade = (t) => { if (t && !trades.includes(t)) setTrades(ts => [...ts, t]) }
  const removeTrade = (t) => setTrades(ts => ts.filter(x => x !== t))

  const handleSubmit = async () => {
    if (!companyName.trim()) { setError('Please enter your company name.'); return }
    if (!trades.length) { setError('Please select at least one trade.'); return }
    setError(null)
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('create-contractor-checkout-session', {
      body: {
        company_name: companyName.trim(),
        trades,
        email: user?.primaryEmailAddress?.emailAddress,
        promo_code: promoCode.trim() || undefined,
        success_url: `${window.location.origin}/contractor/dashboard`,
        cancel_url: `${window.location.origin}/contractor/login`,
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
      console.error('Contractor checkout error:', fnError, data)
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
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <span style={{ fontSize: 13, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress}</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Contractor Application</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>Join the network.</div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Pre-qualified homeowners sent directly to you. Zero lead cost.</p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>

            {/* Price */}
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

            {/* Company name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setError(null) }}
                placeholder="Peak HVAC LLC"
                style={inp}
              />
            </div>

            {/* Trades */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Trade(s)</label>
              {trades.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {trades.map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100 }}>
                      {t}
                      <button onClick={() => removeTrade(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.green, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <select
                value=""
                onChange={e => { addTrade(e.target.value); setError(null) }}
                style={{ ...inp, color: trades.length ? S.muted : S.muted }}
              >
                <option value="">{trades.length === 0 ? 'Select a trade...' : '+ Add another trade'}</option>
                {TRADES_LIST.filter(t => !trades.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Promo code */}
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
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                background: S.green,
                border: 'none',
                color: S.black,
                fontFamily: C.body,
                fontSize: 15,
                fontWeight: 700,
                padding: '14px 0',
                borderRadius: 10,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: `2px solid ${S.black}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Redirecting to checkout...
                </>
              ) : 'Apply & Pay →'}
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
