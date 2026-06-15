import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { loadZipData, getCountiesForState, matchesServiceArea } from '../utils/serviceArea.js'
import { supabase } from '../lib/supabase'
import ImpersonationBanner from '../components/ImpersonationBanner'

const TRADES_LIST = [
  'HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Windows & Doors',
  'Concrete Work', 'Driveway Paving', 'Interior Painting', 'Exterior Painting',
  'Lawn Care', 'Tree Service', 'Landscaping', 'Pest Control', 'Mold Detection',
  'Water Filtration', 'Handyman', 'Pool Service', 'Fireplace & Chimney',
  'Bathroom Remodel', 'Kitchen Remodel', 'Siding & Stucco', 'Smart Home / AV',
  'Additions & ADUs', 'Flooring', 'Insulation', 'Waterproofing', 'Fencing',
  'Decks & Patios', 'Framing', 'House Cleaning', 'Gutters', 'Carpet Cleaning',
]

const PRICING_TYPES = ['per job', 'per hour', 'per sq ft', 'per unit', 'per visit', 'custom']

const INITIAL_LEADS = []

const INITIAL_RATES = []

let nextId = 6

function calcSavings(market, member) {
  const m = parseFloat(market)
  const r = parseFloat(member)
  if (!m || !r || m <= 0 || r >= m) return null
  return Math.round((1 - r / m) * 100)
}

function Timer({ seconds }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60
  const pct = (left / seconds) * 100
  const color = pct > 50 ? S.green : pct > 20 ? S.amber : S.danger
  const display = h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h > 0 ? 9 : 10, fontWeight: 700, color, flexShrink: 0 }}>
        {display}
      </div>
      <span style={{ fontSize: 11, color: S.muted }}>left</span>
    </div>
  )
}

function Card({ children, style }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }}>{children}</div>
}

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' }, { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' }, { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' }, { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' }, { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' }, { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' }, { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' }, { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' }, { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' }, { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' }, { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' }, { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' }, { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' }, { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' }, { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' }, { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' }, { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
]

// ─── Onboarding ────────────────────────────────────────────────────────────────

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ trades: [], title: '', description: '' })
  const [error, setError] = useState('')

  // Service area state
  const [saType, setSaType] = useState('county')
  const [saState, setSaState] = useState('UT')
  const [counties, setCounties] = useState([])
  const [selectedCounties, setSelectedCounties] = useState([])
  const [saZip, setSaZip] = useState('')
  const [saRadius, setSaRadius] = useState(25)
  const [zipReady, setZipReady] = useState(false)

  useEffect(() => {
    loadZipData().then(() => {
      setZipReady(true)
      setCounties(getCountiesForState('UT'))
    })
  }, [])

  useEffect(() => {
    if (zipReady) setCounties(getCountiesForState(saState))
    setSelectedCounties([])
  }, [saState, zipReady])

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }

  const dot = (n) => ({
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
    ...(step >= n
      ? { background: S.green, color: S.black }
      : { background: S.surface, border: `1px solid ${S.border}`, color: S.muted }),
  })
  const line = (n) => ({ flex: 1, height: 2, borderRadius: 1, background: step > n ? S.green : S.border })

  const handleNext = () => {
    if (!form.trades.length) { setError('Please select at least one trade.'); return }
    if (!form.title.trim()) { setError('Please enter your business name.'); return }
    if (!form.description.trim()) { setError('Please add a short description.'); return }
    setError('')
    setStep(2)
  }

  const handleComplete = () => {
    if (saType === 'county' && selectedCounties.length === 0) {
      setError('Please select at least one county.'); return
    }
    if (saType === 'radius' && !saZip) {
      setError('Please enter your business zip code.'); return
    }
    const serviceArea = { type: saType, state: saState }
    if (saType === 'county') serviceArea.counties = selectedCounties
    if (saType === 'radius') { serviceArea.zip = saZip; serviceArea.radius = saRadius }
    onComplete({ trades: form.trades, title: form.title, description: form.description, serviceArea })
  }

  const toggleCounty = (county) =>
    setSelectedCounties(cs => cs.includes(county) ? cs.filter(c => c !== county) : [...cs, county])

  const stateName = US_STATES.find(s => s.abbr === saState)?.name ?? saState

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: step === 2 ? 540 : 480 }}>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
            <div style={dot(1)}>1</div>
            <div style={line(1)} />
            <div style={dot(2)}>2</div>
            <div style={line(2)} />
            <div style={{ ...dot(3), ...(step >= 3 ? {} : { background: S.surface, border: `1px solid ${S.border}`, color: S.muted }) }}>3</div>
          </div>

          {/* Step 1 — Profile */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>Set up your profile.</div>
                <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Shown to SUBS members when we send them your contact info.</p>
              </div>
              <Card style={{ padding: 28 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Trades</label>
                  {form.trades.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {form.trades.map(t => (
                        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100 }}>
                          {t}
                          <button onClick={() => { setForm(f => ({ ...f, trades: f.trades.filter(x => x !== t) })); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.green, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select value="" onChange={e => { if (e.target.value && !form.trades.includes(e.target.value)) { setForm(f => ({ ...f, trades: [...f.trades, e.target.value] })); setError('') } }} style={{ ...inp, color: S.muted }}>
                    <option value="">{form.trades.length === 0 ? 'Select a trade...' : '+ Add another trade'}</option>
                    {TRADES_LIST.filter(t => !form.trades.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Business Name</label>
                  <input type="text" placeholder="e.g. Peak HVAC, BlueLine Plumbing..." value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError('') }} style={inp} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Short Description
                    <span style={{ fontSize: 11, textTransform: 'none', letterSpacing: 0, fontWeight: 400, marginLeft: 8 }}>Shown to members before they call you</span>
                  </label>
                  <textarea placeholder="Licensed HVAC company serving the Wasatch Front since 2011..." value={form.description} onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setError('') }} rows={4} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 6, textAlign: 'right' }}>{form.description.length} / 300</div>
                </div>
                {error && <div style={{ background: S.danger + '15', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger, marginBottom: 16 }}>{error}</div>}
                <button onClick={handleNext} style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '14px 0', borderRadius: 10, cursor: 'pointer' }}>
                  Next: Service Area →
                </button>
              </Card>
            </>
          )}

          {/* Step 2 — Service Area */}
          {step === 2 && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>Where do you work?</div>
                <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Only leads within your service area will be routed to you.</p>
              </div>

              {/* Selectable option cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

                {/* ── Option 1: By County ── */}
                {[
                  { type: 'county', icon: '📍', title: 'By County', desc: 'Select specific counties you serve.' },
                  { type: 'radius', icon: '📡', title: 'By Radius', desc: 'Serve members within a set distance from your location.' },
                  { type: 'statewide', icon: '🗺', title: 'Statewide', desc: 'Serve all members anywhere in your state.' },
                ].map(({ type, icon, title, desc }) => {
                  const active = saType === type
                  return (
                    <div key={type} style={{ border: `1px solid ${active ? S.green : S.border}`, borderRadius: 12, background: active ? S.green + '0A' : S.card, opacity: active ? 1 : 0.6, cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => { setSaType(type); setError('') }}>

                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? S.green : S.border}`, background: active ? S.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.black }} />}
                        </div>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: active ? S.offwhite : S.muted }}>{title}</div>
                          <div style={{ fontSize: 12, color: S.muted, marginTop: 1 }}>{desc}</div>
                        </div>
                        {type === 'county' && active && selectedCounties.length > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.green + '22', padding: '3px 10px', borderRadius: 100, flexShrink: 0 }}>
                            {selectedCounties.length} {selectedCounties.length === 1 ? 'county' : 'counties'} selected
                          </span>
                        )}
                      </div>

                      {/* Card body — only for selected option */}
                      {active && (
                        <div style={{ padding: '16px 18px 18px', borderTop: `1px solid ${S.green}33` }}
                          onClick={e => e.stopPropagation()}>

                          {type === 'county' && (
                            <>
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>State</label>
                                <select value={saState} onChange={e => setSaState(e.target.value)} style={inp}>
                                  {US_STATES.map(s => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                  Counties
                                  {selectedCounties.length > 0 && (
                                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: S.green, background: S.green + '22', padding: '2px 8px', borderRadius: 100, textTransform: 'none', letterSpacing: 0 }}>
                                      {selectedCounties.length} selected
                                    </span>
                                  )}
                                </label>
                                {!zipReady ? (
                                  <div style={{ padding: '16px', textAlign: 'center', color: S.muted, fontSize: 13, background: S.surface, borderRadius: 8, border: `1px solid ${S.border}` }}>
                                    Loading county data…
                                  </div>
                                ) : (
                                  <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${S.border}`, borderRadius: 8, background: S.surface }}>
                                    {counties.map((county, i) => (
                                      <label key={county} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < counties.length - 1 ? `1px solid ${S.border}44` : 'none', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={selectedCounties.includes(county)} onChange={() => toggleCounty(county)} style={{ accentColor: S.green, width: 15, height: 15, flexShrink: 0 }} />
                                        <span style={{ fontSize: 14, color: selectedCounties.includes(county) ? S.offwhite : S.muted }}>{county}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {type === 'radius' && (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Your Zip Code</label>
                                  <input type="text" maxLength={5} placeholder="84101" value={saZip}
                                    onChange={e => { setSaZip(e.target.value.replace(/\D/g, '')); setError('') }}
                                    style={inp} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Radius</label>
                                  <select value={saRadius} onChange={e => setSaRadius(Number(e.target.value))} style={inp}>
                                    {[10, 25, 50, 100, 150].map(r => <option key={r} value={r}>{r} miles</option>)}
                                  </select>
                                </div>
                              </div>
                              <div style={{ marginTop: 10, fontSize: 12, color: S.muted }}>
                                We'll match you with members within {saRadius} miles of zip {saZip || '—'}.
                              </div>
                            </>
                          )}

                          {type === 'statewide' && (
                            <>
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>State</label>
                                <select value={saState} onChange={e => setSaState(e.target.value)} style={inp}>
                                  {US_STATES.map(s => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
                                </select>
                              </div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: S.green + '15', border: `1px solid ${S.green}33`, borderRadius: 10, cursor: 'pointer' }}>
                                <input type="checkbox" checked readOnly style={{ accentColor: S.green, width: 18, height: 18 }} />
                                <span style={{ fontSize: 14, color: S.offwhite, fontWeight: 600 }}>I serve all of {stateName}</span>
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {error && <div style={{ background: S.danger + '15', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger, marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep(1); setError('') }} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, fontWeight: 600, padding: '13px 20px', borderRadius: 10, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button onClick={handleComplete} style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: 'pointer' }}>
                  Complete Setup →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Rate Card Builder ──────────────────────────────────────────────────────────

function RateCardBuilder() {
  const [rates, setRates] = useState(INITIAL_RATES)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)   // draft row while editing
  const [saved, setSaved] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)

  const startEdit = (rate) => {
    setEditingId(rate.id)
    setDraft({ ...rate })
  }

  const startAdd = () => {
    const newRow = { id: nextId++, service: '', pricingType: 'per job', marketRate: '', memberRate: '' }
    setRates(rs => [...rs, newRow])
    setEditingId(newRow.id)
    setDraft({ ...newRow })
  }

  const commitEdit = () => {
    if (!draft) return
    setRates(rs => rs.map(r => r.id === editingId ? { ...draft } : r))
    setEditingId(null)
    setDraft(null)
  }

  const cancelEdit = (id) => {
    // if this was a new (empty) row, remove it on cancel
    const row = rates.find(r => r.id === id)
    if (row && !row.service) setRates(rs => rs.filter(r => r.id !== id))
    setEditingId(null)
    setDraft(null)
  }

  const deleteRow = (id) => {
    setRates(rs => rs.filter(r => r.id !== id))
    if (editingId === id) { setEditingId(null); setDraft(null) }
  }

  const handleSave = () => {
    if (editingId) commitEdit()
    setPendingApproval(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  const colStyle = { display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px 108px', gap: 10, alignItems: 'center', padding: '0 20px' }
  const inp = { background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', color: S.offwhite, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: S.offwhite }}>Rate Card Builder</div>
          <div style={{ fontSize: 13, color: S.muted, marginTop: 2 }}>
            These rates are published to SUBS members. {pendingApproval ? <span style={{ color: S.amber }}>⏳ Changes pending admin approval.</span> : 'Rate lock expires Dec 31, 2026.'}
          </div>
        </div>
        <button
          onClick={startAdd}
          style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          + Add Service
        </button>
      </div>

      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: S.amber + '15', border: `1px solid ${S.amber}44`, borderRadius: 9, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: S.amber }}>
          ⏳ Rate card submitted for admin review. Changes go live once approved — usually within 1 business day.
        </div>
      )}

      <div className="rate-table-wrap">
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        {/* Header */}
        <div style={{ ...colStyle, padding: '10px 20px', borderBottom: `1px solid ${S.border}` }}>
          {['Service', 'Pricing Type', 'Market Rate', 'SUBS Rate', 'Savings', ''].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {rates.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: S.muted, fontSize: 14 }}>
            No services yet. Click "+ Add Service" to get started.
          </div>
        )}

        {rates.map((rate, i) => {
          const isEditing = editingId === rate.id
          const row = isEditing ? draft : rate
          const savings = calcSavings(row.marketRate, row.memberRate)
          const isLast = i === rates.length - 1

          return (
            <div key={rate.id} style={{ borderBottom: isLast ? 'none' : `1px solid ${S.border}`, background: isEditing ? S.black + '80' : 'transparent' }}>
              <div style={{ ...colStyle, padding: '13px 20px' }}>
                {/* Service name */}
                {isEditing ? (
                  <input
                    autoFocus
                    placeholder="Service name..."
                    value={draft.service}
                    onChange={e => setDraft(d => ({ ...d, service: e.target.value }))}
                    style={inp}
                  />
                ) : (
                  <span style={{ fontSize: 14, color: S.offwhite, fontWeight: 500 }}>{rate.service || <span style={{ color: S.muted }}>—</span>}</span>
                )}

                {/* Pricing type */}
                {isEditing ? (
                  <select
                    value={draft.pricingType}
                    onChange={e => setDraft(d => ({ ...d, pricingType: e.target.value }))}
                    style={{ ...inp }}
                  >
                    {PRICING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: 12, color: S.muted, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '3px 9px', display: 'inline-block' }}>
                    {rate.pricingType}
                  </span>
                )}

                {/* Market rate */}
                {isEditing ? (
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: S.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={draft.marketRate}
                      onChange={e => setDraft(d => ({ ...d, marketRate: e.target.value }))}
                      style={{ ...inp, paddingLeft: 22 }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: S.offwhite }}>{rate.marketRate ? `$${parseFloat(rate.marketRate).toLocaleString()}` : '—'}</span>
                )}

                {/* Member rate */}
                {isEditing ? (
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: S.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={draft.memberRate}
                      onChange={e => setDraft(d => ({ ...d, memberRate: e.target.value }))}
                      style={{ ...inp, paddingLeft: 22 }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: S.green }}>{rate.memberRate ? `$${parseFloat(rate.memberRate).toLocaleString()}` : '—'}</span>
                )}

                {/* Savings badge */}
                <div>
                  {savings !== null ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: S.green, background: S.green + '1A', border: `1px solid ${S.green}33`, borderRadius: 100, padding: '3px 10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {savings}% off
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: S.muted }}>—</span>
                  )}
                </div>

                {/* Actions */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={commitEdit}
                      style={{ background: S.green, border: 'none', color: S.black, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ✓ Done
                    </button>
                    <button
                      onClick={() => cancelEdit(rate.id)}
                      style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 8px', borderRadius: 7, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => startEdit(rate)}
                      style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRow(rate.id)}
                      style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.danger, fontSize: 12, padding: '6px 8px', borderRadius: 7, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>{/* end rate-table-wrap */}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.5, maxWidth: 520 }}>
          ⚠️ Changes are reviewed by SUBS before going live. Member-facing prices are locked per your partner agreement.
        </div>
        <button
          onClick={handleSave}
          style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }}
        >
          Save Rate Card
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────

export default function ContractorDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useClerk()
  const impersonating = (() => { try { return JSON.parse(localStorage.getItem('subs_impersonating') || 'null') } catch { return null } })()
  const isImpersonating = impersonating?.role === 'contractor'
  const [showOnboarding, setShowOnboarding] = useState(location.state?.firstTime ?? false)
  const [tab, setTab] = useState('leads')
  const [leads, setLeads] = useState(INITIAL_LEADS)
  const [profile, setProfile] = useState({
    name: '',
    trade: '',
    trades: [],
    contact: '',
    email: '',
    phone: '',
    bio: '',
    serviceArea: null,
  })
  const [zipReady, setZipReady] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [contractorStatus, setContractorStatus] = useState(null)
  const [contractorId, setContractorId] = useState(null)
  const [docs, setDocs] = useState({ insurance_doc_url: null, license_doc_url: null })
  const [docUploading, setDocUploading] = useState(null)
  const [docError, setDocError] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  const isActive = contractorStatus === 'active'
  const tabs = [['leads', '📥 Lead Inbox'], ['rates', '💲 Rate Card'], ['profile', '👤 Profile'], ['billing', '💳 Billing']]

  useEffect(() => { loadZipData().then(() => setZipReady(true)) }, [])

  useEffect(() => {
    // When impersonating, admin passes full contractor data via localStorage — no DB fetch needed
    if (isImpersonating && impersonating.contractorData) {
      const data = impersonating.contractorData
      setContractorId(data.id)
      setContractorStatus(data.status)
      setDocs({ insurance_doc_url: data.insurance_doc_url, license_doc_url: data.license_doc_url })
      setProfile(p => ({
        ...p,
        name: data.name || p.name,
        contact: data.contact_name || p.contact,
        email: data.contact_email || p.email,
        phone: data.phone || p.phone,
        trade: data.trade || p.trade,
        trades: data.trades?.length ? data.trades : [data.trade].filter(Boolean),
        bio: data.bio || p.bio,
      }))
      setDataLoading(false)
      return
    }

    const targetEmail = isImpersonating ? impersonating.email : user?.primaryEmailAddress?.emailAddress
    if (!targetEmail) {
      setDataLoading(false)
      return
    }
    supabase
      .from('contractors')
      .select('*')
      .eq('contact_email', targetEmail)
      .single()
      .then(({ data }) => {
        if (!data) {
          setDataLoading(false)
          if (!isImpersonating) navigate('/contractor/checkout')
          return
        }
        setContractorId(data.id)
        setContractorStatus(data.status)
        setDocs({ insurance_doc_url: data.insurance_doc_url, license_doc_url: data.license_doc_url })
        setProfile(p => ({
          ...p,
          name: data.name || p.name,
          contact: data.contact_name || p.contact,
          email: data.contact_email || p.email,
          phone: data.phone || p.phone,
          trade: data.trade || p.trade,
          trades: data.trades?.length ? data.trades : [data.trade].filter(Boolean),
          bio: data.bio || p.bio,
        }))
        setDataLoading(false)
      })
      .catch(() => setDataLoading(false))
  }, [user, isImpersonating])

  const handleOnboardingComplete = async (data) => {
    const primaryTrade = data.trades[0] || ''
    await supabase.from('contractors').insert({
      name: data.title,
      trade: primaryTrade,
      trades: data.trades,
      bio: data.description,
      service_area: JSON.stringify(data.serviceArea),
      contact_name: user?.fullName || user?.firstName || '',
      contact_email: user?.primaryEmailAddress?.emailAddress || '',
      status: 'pending',
    })
    setProfile(p => ({ ...p, name: data.title, trade: primaryTrade, trades: data.trades, bio: data.description, serviceArea: data.serviceArea }))
    setShowOnboarding(false)
  }

  const fetchLeads = async (cId) => {
    if (!cId) return
    const { data } = await supabase.functions.invoke('get-contractor-leads', {
      body: { contractor_id: cId },
    })
    if (data?.leads) setLeads(data.leads)
  }

  useEffect(() => {
    if (!contractorId || !isActive) return
    fetchLeads(contractorId)
    const interval = setInterval(() => fetchLeads(contractorId), 30000)
    return () => clearInterval(interval)
  }, [contractorId, isActive])

  const handleLead = async (lead, action) => {
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, notification_status: action } : l))
    if (action === 'accepted') {
      const { data, error } = await supabase.functions.invoke('accept-lead', {
        body: { job_request_id: lead.job_request_id, contractor_id: lead.contractor_id },
      })
      if (error || !data?.success) {
        setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, notification_status: 'pending' } : l))
        alert('This lead was already taken by another contractor.')
      }
    } else {
      await supabase.functions.invoke('decline-lead', {
        body: { job_request_id: lead.job_request_id, contractor_id: lead.contractor_id },
      })
    }
  }

  const handleDocUpload = async (docType, col, file) => {
    if (!file || !contractorId) return
    setDocUploading(docType)
    setDocError(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `${contractorId}/${docType}.${ext}`
      const { error: upErr } = await supabase.storage.from('contractor-docs').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('contractor-docs').getPublicUrl(path)
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('upload-contractor-doc', {
        body: { contractor_id: contractorId, col, url: publicUrl },
      })
      if (fnErr || !fnData?.success) throw new Error(fnErr?.message || fnData?.error || 'Failed to save document URL')
      setDocs(d => ({ ...d, [col]: publicUrl }))
    } catch (e) {
      setDocError(`Upload failed: ${e.message}`)
    } finally {
      setDocUploading(null)
    }
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  if (dataLoading) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <span style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</span>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 13, color: S.muted }}>Loading dashboard…</div>
        </div>
      </div>
    )
  }

  if (contractorStatus === 'rejected') {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
          <button onClick={() => signOut().then(() => navigate('/contractor/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
            <div style={{ fontFamily: C.display, fontSize: 32, color: S.offwhite, marginBottom: 12 }}>Application not approved.</div>
            <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, marginBottom: 24 }}>
              Unfortunately we weren't able to approve your application at this time. Contact us if you believe this is an error or would like more information.
            </p>
            <a href="mailto:partners@subs.app" style={{ color: S.green, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>partners@subs.app</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <style>{`
        .cd-nav-meta { display: flex; align-items: center; gap: 8px; }
        .cd-nav-email, .cd-nav-name { display: inline; }
        @media (max-width: 600px) {
          .cd-nav-email, .cd-nav-name { display: none; }
        }
      `}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <div className="cd-nav-meta">
          <span className="cd-nav-email" style={{ fontSize: 12, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress || profile.email}</span>
          <span className="cd-nav-name" style={{ fontSize: 13, color: S.offwhite, fontWeight: 600 }}>{user?.fullName || profile.name}</span>
          {contractorStatus === 'pending'
            ? <span style={{ fontSize: 11, fontWeight: 700, color: S.amber, background: S.amber + '22', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>Pending Review</span>
            : contractorStatus === 'approved'
            ? <span style={{ fontSize: 11, fontWeight: 700, color: S.blue, background: S.blue + '22', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>Approved</span>
            : <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.green + '22', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>Active Partner</span>
          }
          <button onClick={() => signOut().then(() => navigate('/contractor/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}>Sign out</button>
        </div>
      </nav>

      {isImpersonating && (
        <ImpersonationBanner
          name={impersonating.name}
          role="contractor"
          onExit={() => { localStorage.removeItem('subs_impersonating'); navigate('/admin/dashboard') }}
        />
      )}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

        {contractorStatus === 'pending' && (
          <div style={{ background: S.amber + '15', border: `1px solid ${S.amber}44`, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>⏳</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.amber, marginBottom: 3 }}>Application under review</div>
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.5 }}>We typically respond within 1–2 business days. Use this time to complete your profile and rate card — you'll be ready to go the moment you're approved.</div>
            </div>
          </div>
        )}

        {contractorStatus === 'approved' && (
          <div style={{ background: S.green + '15', border: `1px solid ${S.green}44`, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.green, marginBottom: 3 }}>You're approved!</div>
                <div style={{ fontSize: 13, color: S.muted }}>Subscribe to activate your account and start receiving pre-qualified leads.</div>
              </div>
            </div>
            <button onClick={() => navigate('/contractor/checkout')} style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Subscribe now →
            </button>
          </div>
        )}

        {contractorStatus === 'active' && (!docs.insurance_doc_url || !docs.license_doc_url) && (
          <div style={{ background: S.blue + '15', border: `1px solid ${S.blue}44`, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, marginBottom: 3 }}>Add your documents</div>
                <div style={{ fontSize: 13, color: S.muted }}>
                  Upload your {!docs.insurance_doc_url && !docs.license_doc_url ? 'proof of insurance and business license' : !docs.insurance_doc_url ? 'proof of insurance' : 'business license'} to complete your profile.
                </div>
              </div>
            </div>
            <button onClick={() => setTab('profile')} style={{ background: S.blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Upload now →
            </button>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>Welcome, {profile.name || 'Partner'} 👋</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>{profile.trade ? `${profile.trade} Partner` : 'Partner'}</div>
        </div>

        <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '24px 0' }}>
          {[
            [String(leads.filter(l => l.status === 'pending').length), 'Pending leads', S.amber],
            ['0', 'Jobs this year', S.green],
            ['—', 'Last payout', S.blue],
            ['—', 'Verification rate', S.green],
          ].map(([val, label, color]) => (
            <Card key={label} style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: C.display, fontSize: 28, color, marginBottom: 4 }}>{val}</div>
              <div style={{ fontSize: 12, color: S.muted }}>{label}</div>
            </Card>
          ))}
        </div>

        <div className="tabs-bar" style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 10, padding: 4, border: `1px solid ${S.border}`, marginBottom: 24 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: tab === id ? S.card : 'transparent', border: tab === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, color: tab === id ? S.offwhite : S.muted, cursor: 'pointer', position: 'relative' }}>
              {label}
              {id === 'leads' && leads.filter(l => l.notification_status === 'pending').length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 8, background: S.amber, color: S.black, borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {leads.filter(l => l.notification_status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lead Inbox */}
        {tab === 'leads' && !isActive && (
          <Card style={{ padding: '52px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.offwhite, marginBottom: 8 }}>Your leads will appear here</div>
            <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 20px' }}>
              {contractorStatus === 'approved'
                ? 'Subscribe to activate your account and start receiving pre-qualified leads.'
                : 'Once your application is approved and your subscription is active, leads will be routed here based on your service area.'}
            </p>
            {contractorStatus === 'approved' && (
              <button onClick={() => navigate('/contractor/checkout')} style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 9, cursor: 'pointer' }}>
                Subscribe now →
              </button>
            )}
          </Card>
        )}

        {tab === 'leads' && isActive && (() => {
          const pending = leads.filter(l => l.notification_status === 'pending')
          const responded = leads.filter(l => l.notification_status !== 'pending')
          return (
            <div>
              {pending.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.amber, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>⚡ Awaiting Response</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pending.map(lead => (
                      <Card key={lead.id} style={{ padding: 20, border: `1px solid ${S.amber}44` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{lead.service}</div>
                            <div style={{ fontSize: 13, color: S.muted, marginBottom: 4 }}>Zip {lead.zip}{lead.state ? ` · ${lead.state}` : ''}</div>
                            {lead.description && (
                              <div style={{ fontSize: 13, color: S.offwhite, lineHeight: 1.5, maxWidth: 420 }}>{lead.description}</div>
                            )}
                            {lead.preferred_date && (
                              <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>
                                Preferred: {new Date(lead.preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                          {lead.seconds_left > 0 && <Timer seconds={lead.seconds_left} />}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => handleLead(lead, 'accepted')} style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 0', borderRadius: 9, cursor: 'pointer' }}>
                            ✓ Accept Lead
                          </button>
                          <button onClick={() => handleLead(lead, 'declined')} style={{ flex: 1, background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, fontWeight: 600, padding: '11px 0', borderRadius: 9, cursor: 'pointer' }}>
                            Decline
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {responded.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Responded</div>
                  {responded.map(lead => (
                    <Card key={lead.id} style={{ padding: '14px 20px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{lead.service}</div>
                        <div style={{ fontSize: 12, color: S.muted }}>Zip {lead.zip}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100, flexShrink: 0,
                        background: lead.notification_status === 'accepted' ? S.green + '22' : lead.notification_status === 'expired' ? S.border : S.danger + '22',
                        color: lead.notification_status === 'accepted' ? S.green : lead.notification_status === 'expired' ? S.muted : S.danger,
                      }}>
                        {lead.notification_status === 'accepted' ? '✓ Accepted' : lead.notification_status === 'expired' ? 'Expired' : '✗ Declined'}
                      </span>
                    </Card>
                  ))}
                </div>
              )}
              {pending.length === 0 && responded.length === 0 && (
                <Card style={{ padding: '52px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📥</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: S.offwhite, marginBottom: 8 }}>No leads yet</div>
                  <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                    Leads will appear here as SUBS members in your service area request your trade. Check back soon.
                  </p>
                </Card>
              )}
            </div>
          )
        })()}

        {/* Rate Card */}
        {tab === 'rates' && <RateCardBuilder />}

        {/* Profile */}
        {tab === 'profile' && (
          <Card style={{ padding: 28 }}>
            {profileSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: S.green + '15', border: `1px solid ${S.green}44`, borderRadius: 8, padding: '10px 16px' }}>
                <span style={{ color: S.green }}>✓</span>
                <span style={{ fontSize: 14, color: S.green }}>Profile saved successfully.</span>
              </div>
            )}
            <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 24 }}>Partner Profile</div>
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[['Company name', 'name'], ['Primary contact', 'contact'], ['Email', 'email'], ['Phone', 'phone']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>{label}</label>
                  <input
                    value={profile[key]}
                    onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                    disabled={key === 'email'}
                    style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: key === 'email' ? S.muted : S.offwhite, fontSize: 14, outline: 'none', boxSizing: 'border-box', opacity: key === 'email' ? 0.6 : 1, cursor: key === 'email' ? 'not-allowed' : 'text' }}
                  />
                  {key === 'email' && <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Email is tied to your login — contact support to change.</div>}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Trades</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {(profile.trades?.length ? profile.trades : [profile.trade]).filter(Boolean).map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100 }}>
                    {t}
                    <button onClick={() => setProfile(p => ({ ...p, trades: (p.trades || [p.trade]).filter(x => x !== t), trade: (p.trades || [p.trade]).filter(x => x !== t)[0] || '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.green, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                  </span>
                ))}
              </div>
              <select value="" onChange={e => { if (e.target.value) setProfile(p => ({ ...p, trades: [...(p.trades || [p.trade].filter(Boolean)), e.target.value], trade: p.trade || e.target.value })) }} style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">+ Add another trade</option>
                {TRADES_LIST.filter(t => !(profile.trades?.length ? profile.trades : [profile.trade]).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Bio (shown to members)</label>
              <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={4} style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.offwhite, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 12 }}>Documents</div>
              {[
                { docType: 'insurance', col: 'insurance_doc_url', label: 'Proof of Insurance' },
                { docType: 'license', col: 'license_doc_url', label: 'Business License' },
              ].map(({ docType, col, label }) => {
                const url = docs[col]
                const loading = docUploading === docType
                return (
                  <div key={docType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>{label}</div>
                      <div style={{ fontSize: 12, color: url ? S.green : S.muted, marginTop: 2 }}>{url ? '✓ Uploaded' : 'Not uploaded'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: S.blue, padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 7, textDecoration: 'none' }}>
                          View
                        </a>
                      )}
                      <input
                        type="file"
                        id={`doc-${docType}`}
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) handleDocUpload(docType, col, e.target.files[0]) }}
                      />
                      <label htmlFor={`doc-${docType}`} style={{ fontSize: 12, fontWeight: 600, color: loading ? S.muted : S.offwhite, padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 7, cursor: loading ? 'not-allowed' : 'pointer', background: S.card, pointerEvents: loading ? 'none' : 'auto' }}>
                        {loading ? 'Uploading…' : url ? 'Replace' : 'Upload'}
                      </label>
                    </div>
                  </div>
                )
              })}
              {docError && <div style={{ fontSize: 12, color: S.danger, marginTop: 4 }}>{docError}</div>}
            </div>
            {contractorStatus === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: S.green + '10', borderRadius: 8, border: `1px solid ${S.green}44` }}>
                <span style={{ color: S.green, fontSize: 16 }}>✓</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>Active Partner</div>
                  <div style={{ fontSize: 12, color: S.muted }}>Your account is active and receiving leads.</div>
                </div>
              </div>
            )}
            <button
              disabled={profileSaving || !contractorId}
              onClick={async () => {
                if (!contractorId) return
                setProfileSaving(true)
                const primaryTrade = profile.trades?.[0] || profile.trade || ''
                const allTrades = profile.trades?.length ? profile.trades : [primaryTrade].filter(Boolean)
                const { error } = await supabase
                  .from('contractors')
                  .update({
                    name: profile.name,
                    contact_name: profile.contact,
                    phone: profile.phone,
                    trade: primaryTrade,
                    trades: allTrades,
                    bio: profile.bio,
                  })
                  .eq('id', contractorId)
                setProfileSaving(false)
                if (!error) {
                  setProfileSaved(true)
                  setTimeout(() => setProfileSaved(false), 3000)
                }
              }}
              style={{ background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '12px 24px', borderRadius: 10, cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1 }}
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </Card>
        )}

        {/* Billing */}
        {tab === 'billing' && (
          <div className="billing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div>
              <Card style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Listing Status</div>
                {[
                  ['Status', contractorStatus === 'active' ? '✓ Active' : contractorStatus === 'approved' ? 'Approved' : 'Pending', contractorStatus === 'active' ? S.green : S.amber, true],
                  ['Per-job fee', '$0', S.green, false],
                ].map(([label, val, color, badge]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, color: S.offwhite }}>{label}</span>
                    <span style={{ fontSize: badge ? 12 : 14, fontWeight: 700, color, background: badge ? color + '22' : 'transparent', padding: badge ? '4px 12px' : 0, borderRadius: 100 }}>{val}</span>
                  </div>
                ))}
              </Card>
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Verification Rate</div>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontFamily: C.display, fontSize: 52, color: S.muted }}>—</div>
                  <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>No jobs completed yet</div>
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: S.muted, lineHeight: 1.5 }}>
                  After every job, SUBS texts the member: "Did you receive member pricing?" Two unresolved disputes = removal from network.
                </div>
              </Card>
            </div>
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Payout History</div>
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
                <div style={{ fontSize: 14, color: S.muted }}>No payouts yet</div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>Payouts will appear here after your first completed jobs.</div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
