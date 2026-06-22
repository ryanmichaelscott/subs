import { useState } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const TRADES_LIST = [
  'Additions & ADUs', 'Bathroom Remodel', 'Carpet Cleaning', 'Concrete Work', 'Countertops',
  'Decks & Patios', 'Driveway Paving', 'Electrical', 'Excavation', 'Exterior Painting',
  'Fencing', 'Finish Carpentry', 'Fireplace & Chimney', 'Flooring', 'Framing',
  'Garage Doors', 'Gutters', 'Handyman', 'House Cleaning', 'HVAC',
  'Insulation', 'Interior Painting', 'Kitchen Remodel', 'Landscaping', 'Lawn Care',
  'Fire, Mold & Flood Restoration', 'Mold Detection', 'Pest Control', 'Plumbing', 'Pool Service', 'Roofing',
  'Siding & Stucco', 'Smart Home / AV', 'Solar', 'Tree Service', 'Water Filtration',
  'Waterproofing', 'Window Cleaning', 'Window Install', 'Windows & Doors',
]

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

export default function ContractorApply() {
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '' })
  const [trades, setTrades] = useState([])
  const [saType, setSaType] = useState('county')
  const [saState, setSaState] = useState('UT')
  const [saCounties, setSaCounties] = useState('')
  const [saZip, setSaZip] = useState('')
  const [saRadius, setSaRadius] = useState('25')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError(null) }
  const addTrade = (t) => { if (t && !trades.includes(t)) setTrades(ts => [...ts, t]) }
  const removeTrade = (t) => setTrades(ts => ts.filter(x => x !== t))

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { setError('Please enter your company name.'); return }
    if (!form.email.trim()) { setError('Please enter your email address.'); return }
    if (!trades.length) { setError('Please select at least one trade.'); return }
    if (saType === 'county' && !saCounties.trim()) { setError('Please enter the counties you serve.'); return }
    if (saType === 'radius' && !saZip.trim()) { setError('Please enter your zip code.'); return }

    const service_area = saType === 'county'
      ? { type: 'county', state: saState, counties: saCounties.trim() }
      : { type: 'radius', zip: saZip.trim(), radius: parseInt(saRadius), state: saState }

    setError(null)
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('create-contractor-account', {
      body: { ...form, trades, service_area },
    })
    let msg = null
    if (fnError?.context) {
      try { const b = await fnError.context.json(); msg = b.error } catch {}
    } else if (data?.error) {
      msg = data.error
    } else if (fnError?.message) {
      msg = fnError.message
    }
    if (msg) { setError(msg); setLoading(false); return }
    setSubmitted(true)
    setLoading(false)
  }

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 15,
    outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
  }

  if (submitted) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', width: '100%' }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>📬</div>
            <div style={{ fontFamily: C.display, fontSize: 32, color: S.offwhite, marginBottom: 12 }}>Application submitted!</div>
            <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, marginBottom: 28 }}>
              Check your inbox — we sent login instructions to <strong style={{ color: S.offwhite }}>{form.email}</strong>. Log in now to upload your documents and build your profile while we review your application.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/contractor/login" style={{ textDecoration: 'none' }}>
                <button style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 10, cursor: 'pointer' }}>
                  Log in to your dashboard →
                </button>
              </Link>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, padding: '12px 24px', borderRadius: 10, cursor: 'pointer' }}>
                  Back to home
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', width: '100%' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <Link to="/contractor/login" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>Already a partner? Sign in</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Contractor Application</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>Apply to join the network.</div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0, lineHeight: 1.6 }}>Pre-qualified homeowners sent directly to you. We review every partner — typically 1–2 business days.</p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[['Company Name', 'company_name', 'text', 'Peak HVAC LLC'], ['Contact Name', 'contact_name', 'text', 'Jake Morrison']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[['Email', 'email', 'email', 'jake@peakhvac.com'], ['Phone', 'phone', 'tel', '(801) 555-0100']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} style={inp} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
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
              <select value="" onChange={e => { addTrade(e.target.value); setError(null) }} style={{ ...inp, color: S.muted }}>
                <option value="">{trades.length === 0 ? 'Select your primary trade...' : '+ Add another trade'}</option>
                {TRADES_LIST.filter(t => !trades.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Service Area */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Service Area</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[['county', '📍 By County', 'Select counties you cover'], ['radius', '📡 By Radius', 'Distance from your location']].map(([val, title, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setSaType(val); setError(null) }}
                    style={{
                      background: saType === val ? S.green + '18' : S.surface,
                      border: `1px solid ${saType === val ? S.green : S.border}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: saType === val ? S.green : S.offwhite, marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 11, color: S.muted }}>{desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: saType === 'radius' ? '1fr 1fr' : '120px 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>State</label>
                  <select
                    value={saState}
                    onChange={e => { setSaState(e.target.value); setError(null) }}
                    style={{ ...inp, color: S.offwhite }}
                  >
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>{code} — {name}</option>
                    ))}
                  </select>
                </div>

                {saType === 'county' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Counties <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
                    <input
                      type="text"
                      value={saCounties}
                      onChange={e => { setSaCounties(e.target.value); setError(null) }}
                      placeholder="Salt Lake, Utah, Davis"
                      style={inp}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your Zip Code</label>
                      <input
                        type="text"
                        value={saZip}
                        onChange={e => { setSaZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setError(null) }}
                        placeholder="84101"
                        maxLength={5}
                        style={inp}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Radius</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['10', '25', '50', '75', '100'].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSaRadius(r)}
                            style={{
                              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                              background: saRadius === r ? S.green + '18' : S.surface,
                              border: `1px solid ${saRadius === r ? S.green : S.border}`,
                              color: saRadius === r ? S.green : S.muted,
                            }}
                          >
                            {r} mi
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                  Submitting...
                </>
              ) : 'Submit Application →'}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {['Vetted homeowners only', 'No bidding or lead fees', 'Instant digital payments', 'Cancel anytime'].map(t => (
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
