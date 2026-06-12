import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { S, C } from '../theme'

const TRADES = ['HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Windows & Doors', 'Concrete Work', 'Interior Painting', 'Exterior Painting', 'Lawn Care', 'Tree Service', 'Landscaping', 'Pest Control', 'Handyman', 'Pool Service', 'Flooring', 'Fencing', 'Decks & Patios', 'House Cleaning']

const CONTRACTORS = [
  { name: 'Peak HVAC', trade: 'HVAC', rating: 4.9, jobs: 47, area: 'Salt Lake County', discount: '15–20% off', bio: 'Family-owned HVAC company serving the Wasatch Front since 2011. Emergency repair specialists.', rates: [{ service: 'AC Tune-Up', member: '$165', market: '$220–$260' }, { service: 'Diagnostic', member: '$89', market: '$120–$150' }, { service: 'Filter Swap', member: '$55', market: '$80–$100' }] },
  { name: 'BlueLine Plumbing', trade: 'Plumbing', rating: 4.8, jobs: 31, area: 'Salt Lake + Utah County', discount: '38–40% off', bio: 'Licensed master plumbers with 15+ years in residential service. No trip fees for SUBS members.', rates: [{ service: 'Service Call', member: '$79', market: '$120–$150' }, { service: 'Labor Rate', member: '$95/hr', market: '$150–$180/hr' }, { service: 'Drain Cleaning', member: '$119', market: '$175–$250' }] },
  { name: 'ClearView Windows', trade: 'Windows & Doors', rating: 4.9, jobs: 22, area: 'Wasatch Front', discount: '38–45% off', bio: 'Whole-home window cleaning specialists. Interior + exterior. SUBS members get priority scheduling.', rates: [{ service: 'Whole Home', member: '$145', market: '$220–$300' }, { service: 'Exterior Only', member: '$95', market: '$140–$180' }, { service: 'Add-on Screens', member: '$25', market: '$40–$60' }] },
  { name: 'GreenBlade Lawn', trade: 'Lawn Care', rating: 4.7, jobs: 63, area: 'Salt Lake County', discount: 'Contractor rates', bio: 'Full-service lawn care and maintenance. Weekly, bi-weekly, and one-time service.', rates: [{ service: 'Weekly Mow', member: '$35', market: '$55–$75' }, { service: 'Full Service', member: '$120', market: '$180–$220' }, { service: 'Aeration', member: '$89', market: '$130–$160' }] },
  { name: 'ProRoofing Utah', trade: 'Roofing', rating: 4.8, jobs: 18, area: 'Wasatch Front', discount: 'Up to 15% off', bio: 'Certified roofing installers. Full replacement, repair, and inspection services.', rates: [{ service: 'Inspection', member: '$0', market: '$150–$300' }, { service: 'Repair', member: 'Market −10%', market: 'Varies' }, { service: 'Full Replace', member: 'Market −15%', market: '$8K–$25K' }] },
  { name: 'Bright Electrical', trade: 'Electrical', rating: 4.9, jobs: 29, area: 'Salt Lake County', discount: '15–20% off', bio: 'Licensed master electrician. Panel upgrades, EV charging, whole-home rewires.', rates: [{ service: 'Service Call', member: '$85', market: '$120–$150' }, { service: 'Labor Rate', member: '$95/hr', market: '$120–$140/hr' }, { service: 'Panel Upgrade', member: 'Market −18%', market: '$2K–$5K' }] },
]

const JOB_HISTORY = [
  { id: 'J-1041', contractor: 'Peak HVAC', trade: 'HVAC', service: 'AC Tune-Up', date: 'Jun 14, 2026', paid: '$165', status: 'Scheduled' },
  { id: 'J-1035', contractor: 'Peak HVAC', trade: 'HVAC', service: 'AC Tune-Up', date: 'Jun 10, 2026', paid: '$165', status: 'Complete' },
  { id: 'J-1028', contractor: 'BlueLine Plumbing', trade: 'Plumbing', service: 'Drain Cleaning', date: 'May 28, 2026', paid: '$119', status: 'Complete' },
  { id: 'J-1012', contractor: 'GreenBlade Lawn', trade: 'Lawn Care', service: 'Weekly Mow', date: 'May 15, 2026', paid: '$35', status: 'Complete' },
  { id: 'J-0998', contractor: 'ProRoofing Utah', trade: 'Roofing', service: 'Inspection', date: 'Apr 22, 2026', paid: '$0', status: 'Complete' },
]

const STATUS_COLORS = { Complete: S.green, Scheduled: S.blue, Pending: S.amber }

function Card({ children, style }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }}>{children}</div>
}

function MemberCard() {
  return (
    <Card style={{ padding: '20px 24px', background: `linear-gradient(135deg, ${S.forest} 0%, #0f1f12 100%)`, border: `1px solid ${S.greenDim}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ fontFamily: C.body, fontSize: 16, fontWeight: 800, color: S.green, letterSpacing: '0.1em' }}>SUBS</div>
        <div style={{ fontSize: 11, color: S.muted }}>SUBS.co</div>
      </div>
      <div style={{ fontSize: 14, color: S.muted, letterSpacing: '0.1em', marginBottom: 4 }}>•••• •••• •••• 4821</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>MEMBER</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>Ryan Scott</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>TIER</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.blue }}>Member+</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>SINCE</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>2026</div>
        </div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.greenDim}`, fontSize: 11, color: S.muted }}>
        Renews Jan 1, 2027 · $199/yr
      </div>
    </Card>
  )
}

export default function MemberDashboard() {
  const location = useLocation()
  const memberZip = location.state?.zip || '84101'

  const [tab, setTab] = useState('directory')
  const [tradeFilter, setTradeFilter] = useState('')
  const [zipFilter, setZipFilter] = useState('')
  const [selectedContractor, setSelectedContractor] = useState(null)
  const [jobForm, setJobForm] = useState({ trade: '', description: '', zip: memberZip, date: '' })
  const [jobSubmitted, setJobSubmitted] = useState(false)
  const [searching, setSearching] = useState(false)

  const filtered = CONTRACTORS.filter(c =>
    (!tradeFilter || c.trade === tradeFilter) &&
    (!zipFilter || c.area.toLowerCase().includes('salt lake'))
  )

  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.offwhite, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const tabs = [['directory', '📋 Contractor Directory'], ['request', '➕ Request a Job'], ['history', '🕐 Job History']]

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      {/* Top nav */}
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: S.muted }}>ryan@neumi.com</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.blue, background: S.blue + '22', padding: '3px 10px', borderRadius: 100 }}>Member+</span>
          <Link to="/login"><button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button></Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MemberCard />
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Quick Stats</div>
              {[['5', 'Jobs completed'], ['$484', 'Total saved est.'], ['3', 'Trades used']].map(([val, label]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: S.muted }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{val}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Your Rate Card</div>
              {[['HVAC', '15–20% off'], ['Plumbing', '38–40% off'], ['Lawn Care', 'Contractor rate'], ['Windows', '38–45% off']].map(([trade, rate]) => (
                <div key={trade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: S.muted }}>{trade}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: S.green }}>{rate}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: S.muted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
                + 26 more trades at member rates
              </div>
            </Card>
          </div>

          {/* Main */}
          <div>
            {/* Tabs */}
            <div className="tabs-bar" style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 10, padding: 4, border: `1px solid ${S.border}`, marginBottom: 24 }}>
              {tabs.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: tab === id ? S.card : 'transparent', border: tab === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, color: tab === id ? S.offwhite : S.muted, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Directory tab */}
            {tab === 'directory' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} style={{ ...inp, width: 'auto', flex: 1, minWidth: 160 }}>
                    <option value="">All trades</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={zipFilter} onChange={e => setZipFilter(e.target.value)} placeholder="Zip code" style={{ ...inp, width: 140 }} />
                  <button onClick={() => { setTradeFilter(''); setZipFilter('') }} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 13, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>Clear</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filtered.map((c, i) => (
                    <Card key={i} style={{ padding: 20, cursor: 'pointer', border: selectedContractor === i ? `1px solid ${S.green}` : `1px solid ${S.border}` }} onClick={() => setSelectedContractor(selectedContractor === i ? null : i)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: S.muted }}>{c.trade} · {c.area}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{c.discount}</div>
                          <div style={{ fontSize: 12, color: S.muted }}>⭐ {c.rating} · {c.jobs} jobs</div>
                        </div>
                      </div>
                      {selectedContractor === i && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                          <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6, marginBottom: 14 }}>{c.bio}</p>
                          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Member Rate Card</div>
                          {c.rates.map((r, j) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                              <span style={{ color: S.offwhite }}>{r.service}</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: S.green, fontWeight: 700 }}>{r.member}</span>
                                <span style={{ color: S.muted, fontSize: 11, marginLeft: 8 }}>market: {r.market}</span>
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}`, fontSize: 12 }}>
                            <span style={{ color: S.green }}>✓ Verified</span>
                            <span style={{ color: S.muted }}>Licensed & insured</span>
                            <span style={{ color: S.muted }}>·</span>
                            <span style={{ color: S.muted }}>All {c.jobs} jobs confirmed member pricing</span>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: S.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                      <div>No contractors match your filters.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Request tab */}
            {tab === 'request' && (
              <Card style={{ padding: 28 }}>
                {searching ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 8 }}>Searching contractors near {jobForm.zip}…</div>
                    <p style={{ fontSize: 14, color: S.muted }}>Matching you with vetted partners at your member rate.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: S.green, opacity: 0.4 + i * 0.3 }} />
                      ))}
                    </div>
                  </div>
                ) : jobSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
                    <div style={{ fontFamily: C.display, fontSize: 24, color: S.offwhite, marginBottom: 8 }}>Request submitted</div>
                    <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6 }}>
                      We found contractors near <span style={{ color: S.green, fontWeight: 600 }}>{jobForm.zip}</span>. We'll confirm within 24 hours with their contact info and your member rate.
                    </p>
                    <button onClick={() => { setJobSubmitted(false); setJobForm({ trade: '', description: '', zip: memberZip, date: '' }) }} style={{ marginTop: 24, background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>
                      Request another job
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 6 }}>Request a job</div>
                    <p style={{ fontSize: 14, color: S.muted, marginBottom: 24 }}>We'll match you with a SUBS vetted contractor at your member rate.</p>
                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Trade / Service</label>
                        <select value={jobForm.trade} onChange={e => setJobForm(f => ({ ...f, trade: e.target.value }))} style={inp}>
                          <option value="">Select a trade...</option>
                          {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Zip code</label>
                        <input value={jobForm.zip} onChange={e => setJobForm(f => ({ ...f, zip: e.target.value }))} placeholder="84101" style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Preferred date</label>
                      <input type="date" value={jobForm.date} onChange={e => setJobForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Describe the job</label>
                      <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="My AC isn't cooling properly. Unit is 8 years old, Lennox 3-ton system..." rows={4} style={{ ...inp, resize: 'vertical' }} />
                    </div>
                    <button onClick={() => { setSearching(true); setTimeout(() => { setSearching(false); setJobSubmitted(true) }, 1800) }} style={{ background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 10, cursor: 'pointer' }}>
                      Submit Request →
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}`, fontSize: 12, color: S.muted }}>
                      <span>✓ Member rate guaranteed</span>
                      <span>✓ Vetted contractor only</span>
                      <span>✓ Response within 24hr</span>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* History tab */}
            {tab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {JOB_HISTORY.map((job, i) => (
                  <Card key={i} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: S.muted, fontFamily: 'monospace' }}>{job.id}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{job.contractor}</div>
                        <div style={{ fontSize: 12, color: S.muted }}>{job.service} · {job.date}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{job.paid}</div>
                        <div style={{ fontSize: 11, color: S.green }}>member rate</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: (STATUS_COLORS[job.status] || S.muted) + '22', color: STATUS_COLORS[job.status] || S.muted }}>
                        {job.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
