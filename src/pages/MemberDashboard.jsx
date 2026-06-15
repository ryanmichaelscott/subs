import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import ImpersonationBanner from '../components/ImpersonationBanner'

const TRADES = ['HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Windows & Doors', 'Concrete Work', 'Interior Painting', 'Exterior Painting', 'Lawn Care', 'Tree Service', 'Landscaping', 'Pest Control', 'Handyman', 'Pool Service', 'Flooring', 'Fencing', 'Decks & Patios', 'House Cleaning']

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

const STATUS_COLORS = { Complete: S.green, Scheduled: S.blue, pending: S.amber }

function Card({ children, style, ...props }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }} {...props}>{children}</div>
}

const TIER_COLORS = { Member: S.green, 'Member+': S.blue, Elite: S.purple }
const TIER_PRICES = { Member: '$99/yr', 'Member+': '$199/yr', Elite: '$399/yr' }

function MemberCard({ name, member }) {
  const tier = member?.tier || 'Member'
  const joinedYear = member?.joined_at ? new Date(member.joined_at).getFullYear() : '—'
  const renewal = member?.renewal_date
    ? new Date(member.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  return (
    <Card style={{ padding: '20px 24px', background: `linear-gradient(135deg, ${S.forest} 0%, #0f1f12 100%)`, border: `1px solid ${S.greenDim}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ fontFamily: C.body, fontSize: 16, fontWeight: 800, color: S.green, letterSpacing: '0.1em' }}>SUBS</div>
        <div style={{ fontSize: 11, color: S.muted }}>SUBS.app</div>
      </div>
      <div style={{ fontSize: 14, color: S.muted, letterSpacing: '0.1em', marginBottom: 4 }}>•••• •••• •••• 4821</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>MEMBER</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>{name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>TIER</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TIER_COLORS[tier] || S.blue }}>{tier}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>SINCE</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>{joinedYear}</div>
        </div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.greenDim}`, fontSize: 11, color: S.muted }}>
        {renewal !== '—' ? `Renews ${renewal} · ${TIER_PRICES[tier]}` : TIER_PRICES[tier]}
      </div>
    </Card>
  )
}

export default function MemberDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useClerk()
  const memberZip = location.state?.zip || '84101'
  const displayName = user?.fullName || user?.firstName || 'Member'
  const displayEmail = user?.primaryEmailAddress?.emailAddress || 'ryan@neumi.com'

  const [searchParams] = useSearchParams()
  const impersonating = (() => { try { return JSON.parse(localStorage.getItem('subs_impersonating') || 'null') } catch { return null } })()
  const isImpersonating = impersonating?.role === 'member'
  const [member, setMember] = useState(null)
  const [contractors, setContractors] = useState([])
  const [jobRequests, setJobRequests] = useState([])
  const [tab, setTab] = useState('directory')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutMsg, setCheckoutMsg] = useState('Redirecting to checkout…')
  const [tradeFilter, setTradeFilter] = useState('')
  const [zipFilter, setZipFilter] = useState('')
  const [selectedContractor, setSelectedContractor] = useState(null)
  const [jobForm, setJobForm] = useState({ trade: '', description: '', zip: memberZip, state: 'UT', date: '' })
  const [jobSubmitted, setJobSubmitted] = useState(false)
  const [searching, setSearching] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', zip: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [accountError, setAccountError] = useState(null)

  const PLAN_PRICE_IDS = {
    member: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
    plus: 'price_1TiRQBAYDs9oVarW14DBq2HL',
    elite: 'price_1TiRQZAYDs9oVarWcZ10xjDG',
  }

  useEffect(() => {
    if (!user) return
    const init = async () => {
      // Admin impersonation mode
      if (isImpersonating) {
        const { data: adminData } = await supabase.functions.invoke('admin-get-member', { body: { email: impersonating.email } })
        if (adminData?.member) {
          setMember(adminData.member)
          setProfileForm({ name: adminData.member.name || '', phone: adminData.member.phone || '', zip: adminData.member.zip || '' })
          const { data: jobRows } = await supabase.from('job_requests').select('*').eq('clerk_user_id', adminData.member.clerk_user_id).order('submitted_at', { ascending: false })
          if (jobRows) setJobRequests(jobRows)
        }
        const { data: contractorRows } = await supabase.from('contractors').select('*, contractor_rates(*)').eq('status', 'active').order('rating', { ascending: false })
        if (contractorRows) setContractors(contractorRows)
        return
      }

      const email = user.primaryEmailAddress?.emailAddress || ''
      const name = user.fullName || user.firstName || ''
      const phone = user.phoneNumbers?.[0]?.phoneNumber || null

      // Upsert member via service role (bypasses RLS, preserves Stripe/tier fields on update)
      const { data: upsertData } = await supabase.functions.invoke('upsert-member', {
        body: { clerk_user_id: user.id, email, name, phone },
      })
      let memberRow = upsertData?.member

      if (memberRow) {
        setMember(memberRow)
        setProfileForm({
          name: memberRow.name || name,
          phone: memberRow.phone || '',
          zip: memberRow.zip || '',
        })
      }

      // Send welcome email for brand-new members
      if (upsertData?.created) {
        const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : 0
        if (Date.now() - createdAt < 5 * 60 * 1000) {
          supabase.functions.invoke('send-welcome-email', {
            body: { email, name: user.firstName || name || 'there' },
          })
        }
      }

      // Handle pending plan (pre-login checkout flow via localStorage)
      const pendingPlan = localStorage.getItem('subs_pending_plan') || searchParams.get('plan')
      const priceId = pendingPlan ? PLAN_PRICE_IDS[pendingPlan] : null
      if (priceId) {
        localStorage.removeItem('subs_pending_plan')
        setCheckoutLoading(true)
        const { data } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            price_id: priceId,
            clerk_user_id: user.id,
            email,
            success_url: `${window.location.origin}/dashboard`,
            cancel_url: `${window.location.origin}/checkout`,
          },
        })
        if (data?.url) {
          window.location.href = data.url
        } else {
          setCheckoutLoading(false)
        }
        return
      }

      // Handle post-Stripe return: checkout_session_id in URL means user just paid
      const checkoutSessionId = searchParams.get('checkout_session_id')
      if (checkoutSessionId && !memberRow?.stripe_subscription_id) {
        setCheckoutMsg('Setting up your account…')
        setCheckoutLoading(true)
        const { data: activateData } = await supabase.functions.invoke('activate-membership', {
          body: { checkout_session_id: checkoutSessionId, clerk_user_id: user.id },
        })
        setCheckoutLoading(false)
        if (activateData?.member) {
          memberRow = activateData.member
          setMember(activateData.member)
          setProfileForm({
            name: activateData.member.name || name,
            phone: activateData.member.phone || '',
            zip: activateData.member.zip || '',
          })
          window.history.replaceState({}, '', '/dashboard')
        } else {
          navigate('/checkout')
          return
        }
      }

      // Subscription gate: redirect to /checkout if no active Stripe subscription
      if (!memberRow?.stripe_subscription_id) {
        navigate('/checkout')
        return
      }

      // Fetch real data
      const [{ data: contractorRows }, { data: jobRows }] = await Promise.all([
        supabase
          .from('contractors')
          .select('*, contractor_rates(*)')
          .eq('status', 'active')
          .order('rating', { ascending: false }),
        supabase
          .from('job_requests')
          .select('*')
          .eq('clerk_user_id', user.id)
          .order('submitted_at', { ascending: false }),
      ])
      if (contractorRows) setContractors(contractorRows)
      if (jobRows) setJobRequests(jobRows)
    }
    init()
  }, [user])

  const handleSaveProfile = async () => {
    if (isImpersonating) return
    setProfileSaving(true)
    setAccountError(null)
    setProfileSaved(false)
    const { data, error } = await supabase.functions.invoke('upsert-member', {
      body: {
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: profileForm.name,
        phone: profileForm.phone,
        zip: profileForm.zip,
      },
    })
    setProfileSaving(false)
    if (error || !data?.member) { setAccountError('Failed to save. Please try again.'); return }
    setMember(m => ({ ...m, name: profileForm.name, phone: profileForm.phone, zip: profileForm.zip }))
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handleOpenPortal = async () => {
    setPortalLoading(true)
    setAccountError(null)
    const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
      body: { clerk_user_id: user.id, return_url: `${window.location.origin}/dashboard` },
    })
    setPortalLoading(false)
    if (error || !data?.url) {
      setAccountError('Could not open billing portal. Please try again.')
      return
    }
    window.location.href = data.url
  }

  const filtered = contractors.filter(c => {
    const allTrades = c.trades?.length ? c.trades : [c.trade].filter(Boolean)
    return (!tradeFilter || allTrades.includes(tradeFilter)) &&
      (!zipFilter || (c.service_area || '').toLowerCase().includes(zipFilter.toLowerCase()))
  })

  const jobsDone = jobRequests.filter(j => j.status === 'Complete').length
  const tradesUsed = new Set(jobRequests.map(j => j.trade).filter(Boolean)).size

  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.offwhite, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const tabs = [['directory', '📋 Directory'], ['request', '➕ Request'], ['history', '🕐 History'], ['account', '⚙️ Account']]

  if (checkoutLoading) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: S.offwhite }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: S.green, letterSpacing: '0.06em', marginBottom: 24 }}>SUBS</div>
        <div style={{ fontSize: 15, color: S.muted }}>{checkoutMsg}</div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      {/* Top nav */}
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="tel:18884543019" style={{ fontSize: 12, fontWeight: 600, color: S.green, textDecoration: 'none' }}>1-888-454-3019</a>
          <span style={{ fontSize: 12, color: S.muted }}>{displayEmail}</span>
          {member?.tier && (
            <span style={{ fontSize: 11, fontWeight: 700, color: TIER_COLORS[member.tier] || S.blue, background: (TIER_COLORS[member.tier] || S.blue) + '22', padding: '3px 10px', borderRadius: 100 }}>{member.tier}</span>
          )}
          <button onClick={() => signOut().then(() => navigate('/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      {isImpersonating && (
        <ImpersonationBanner
          name={impersonating.name}
          role="member"
          onExit={() => { localStorage.removeItem('subs_impersonating'); navigate('/admin/dashboard') }}
        />
      )}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MemberCard name={displayName} member={member} />
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Quick Stats</div>
              {[[String(jobsDone), 'Jobs completed'], [String(tradesUsed), 'Trades used'], [String(jobRequests.length), 'Total requests']].map(([val, label]) => (
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
                  {filtered.map((c) => (
                    <Card key={c.id} style={{ padding: 20, cursor: 'pointer', border: selectedContractor === c.id ? `1px solid ${S.green}` : `1px solid ${S.border}` }} onClick={() => setSelectedContractor(selectedContractor === c.id ? null : c.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                            {(c.trades?.length ? c.trades : [c.trade]).filter(Boolean).map(t => (
                              <span key={t} style={{ fontSize: 11, fontWeight: 600, color: S.blue, background: S.blue + '18', padding: '1px 7px', borderRadius: 100 }}>{t}</span>
                            ))}
                            {c.service_area && <span style={{ fontSize: 11, color: S.muted }}>· {c.service_area}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {c.discount_description && <div style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{c.discount_description}</div>}
                          <div style={{ fontSize: 12, color: S.muted }}>⭐ {c.rating ?? '—'} · {c.jobs_count ?? 0} jobs</div>
                        </div>
                      </div>
                      {selectedContractor === c.id && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}` }}>

                          {/* Bio */}
                          {c.bio && (
                            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, margin: '0 0 16px' }}>{c.bio}</p>
                          )}

                          {/* Stats */}
                          {(c.rating > 0 || c.jobs_count > 0 || c.years_experience) && (
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                              {c.rating > 0 && (
                                <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 64 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>⭐ {c.rating}</div>
                                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Rating</div>
                                </div>
                              )}
                              {c.jobs_count > 0 && (
                                <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 64 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{c.jobs_count}</div>
                                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Jobs done</div>
                                </div>
                              )}
                              {c.years_experience > 0 && (
                                <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 64 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{c.years_experience} yrs</div>
                                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Experience</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Rate card */}
                          {c.contractor_rates?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Member Rate Card</div>
                              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                {c.contractor_rates.map((r, i) => (
                                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < c.contractor_rates.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                                    <span style={{ fontSize: 13, color: S.offwhite }}>{r.service_name}</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: S.green }}>{r.member_price}</span>
                                      {r.market_price && <span style={{ fontSize: 11, color: S.muted, textDecoration: 'line-through' }}>{r.market_price}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer: credentials + request button */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: S.green, fontWeight: 600 }}>✓ SUBS Verified</span>
                              {c.licensed && <span style={{ fontSize: 12, color: S.muted }}>✓ Licensed</span>}
                              {c.insurance_doc_url && <span style={{ fontSize: 12, color: S.muted }}>✓ Insured</span>}
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setTab('request'); setJobForm(f => ({ ...f, trade: (c.trades?.[0] || c.trade || '') })) }}
                              style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
                            >
                              Request job →
                            </button>
                          </div>

                        </div>
                      )}
                    </Card>
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: S.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                      <div>{contractors.length === 0 ? 'No contractors in your area yet. More coming soon.' : 'No contractors match your filters.'}</div>
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
                      Your request is live. Vetted contractors in <span style={{ color: S.green, fontWeight: 600 }}>{jobForm.state}</span> have been notified. You'll get an email the moment one accepts — usually within a few hours.
                    </p>
                    <button onClick={() => { setJobSubmitted(false); setJobForm({ trade: '', description: '', zip: memberZip, state: 'UT', date: '' }) }} style={{ marginTop: 24, background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>
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
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>State</label>
                        <select value={jobForm.state} onChange={e => setJobForm(f => ({ ...f, state: e.target.value }))} style={inp}>
                          {US_STATES.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Zip code</label>
                        <input value={jobForm.zip} onChange={e => setJobForm(f => ({ ...f, zip: e.target.value }))} placeholder="84101" style={inp} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Preferred date</label>
                        <input type="date" value={jobForm.date} onChange={e => setJobForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Describe the job</label>
                      <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="My AC isn't cooling properly. Unit is 8 years old, Lennox 3-ton system..." rows={4} style={{ ...inp, resize: 'vertical' }} />
                    </div>
                    <button onClick={async () => {
                      if (!jobForm.trade || !jobForm.zip) return
                      setSearching(true)
                      const { data } = await supabase.functions.invoke('create-lead', {
                        body: {
                          trade: jobForm.trade,
                          description: jobForm.description,
                          zip: jobForm.zip,
                          state: jobForm.state,
                          preferred_date: jobForm.date || null,
                          member_email: user?.primaryEmailAddress?.emailAddress || '',
                          member_name: user?.fullName || user?.firstName || '',
                          clerk_user_id: user?.id || '',
                        },
                      })
                      setTimeout(() => { setSearching(false); setJobSubmitted(true) }, 1800)
                    }} style={{ background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 10, cursor: 'pointer' }}>
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
                {jobRequests.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: S.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 15, marginBottom: 8 }}>No jobs yet.</div>
                    <div style={{ fontSize: 13 }}>Submit a request to get started.</div>
                  </div>
                )}
                {jobRequests.map((job) => (
                  <Card key={job.id} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: S.muted, fontFamily: 'monospace' }}>{job.display_id || job.id.slice(0, 8).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{job.trade}</div>
                        <div style={{ fontSize: 12, color: S.muted }}>
                          {job.service || job.description?.slice(0, 40) || '—'} · {new Date(job.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {job.rate && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{job.rate}</div>
                          <div style={{ fontSize: 11, color: S.green }}>member rate</div>
                        </div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: (STATUS_COLORS[job.status] || S.muted) + '22', color: STATUS_COLORS[job.status] || S.muted }}>
                        {job.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Account tab */}
            {tab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {accountError && (
                  <div style={{ background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: S.danger }}>
                    {accountError}
                  </div>
                )}

                {/* Contact info */}
                <Card style={{ padding: 28 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>Contact Info</div>
                  <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>Update your name, phone, and zip code. Email is managed through your sign-in provider.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Full name</label>
                      <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Email</label>
                      <input value={displayEmail} disabled style={{ ...inp, opacity: 0.5, cursor: 'not-allowed' }} />
                      <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>To change your email, sign out and sign back in with a different address.</div>
                    </div>
                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Phone</label>
                        <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="(801) 555-0100" style={inp} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Zip code</label>
                        <input value={profileForm.zip} onChange={e => setProfileForm(f => ({ ...f, zip: e.target.value }))} placeholder="84101" style={inp} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 9, cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1 }}
                    >
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </button>
                    {profileSaved && <span style={{ fontSize: 13, color: S.green }}>✓ Saved</span>}
                  </div>
                </Card>

                {/* Membership */}
                <Card style={{ padding: 28 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>Membership</div>
                  <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>Change your plan, update payment method, or cancel — all handled securely through Stripe.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>Current plan</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: TIER_COLORS[member?.tier] || S.green }}>{member?.tier || 'Member'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: member?.status === 'Active' ? S.green + '22' : S.amber + '22', color: member?.status === 'Active' ? S.green : S.amber }}>
                          {member?.status || '—'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: S.offwhite }}>
                      {member?.tier === 'Member' ? '$99' : member?.tier === 'Member+' ? '$199' : member?.tier === 'Elite' ? '$399' : '—'}
                      <span style={{ fontSize: 13, color: S.muted, fontWeight: 400 }}>/yr</span>
                    </div>
                  </div>
                  {member?.stripe_customer_id ? (
                    <button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, fontWeight: 600, padding: '11px 24px', borderRadius: 9, cursor: portalLoading ? 'not-allowed' : 'pointer', opacity: portalLoading ? 0.7 : 1 }}
                    >
                      {portalLoading ? 'Opening…' : 'Manage plan →'}
                    </button>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, color: S.muted, marginBottom: 14 }}>No active subscription found. Choose a plan to get started.</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[['member', 'Member', '$99/yr', 'price_1TiRPcAYDs9oVarWLWpp0wLZ'], ['plus', 'Member+', '$199/yr', 'price_1TiRQBAYDs9oVarW14DBq2HL'], ['elite', 'Elite', '$399/yr', 'price_1TiRQZAYDs9oVarWcZ10xjDG']].map(([id, name, price, priceId]) => (
                          <button
                            key={id}
                            onClick={async () => {
                              setPortalLoading(true)
                              const { data } = await supabase.functions.invoke('create-checkout-session', {
                                body: { price_id: priceId, clerk_user_id: user.id, email: user.primaryEmailAddress?.emailAddress, success_url: `${window.location.origin}/dashboard`, cancel_url: `${window.location.origin}/signup` },
                              })
                              if (data?.url) window.location.href = data.url
                              else setPortalLoading(false)
                            }}
                            style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '10px 18px', borderRadius: 9, cursor: 'pointer' }}
                          >
                            {name} — {price}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Danger zone */}
                <Card style={{ padding: 28, border: `1px solid ${S.danger}33` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>Cancel membership</div>
                  <p style={{ fontSize: 13, color: S.muted, marginBottom: 16, lineHeight: 1.6 }}>
                    Cancelling will end your access at the end of the current billing period. You'll lose contractor pricing and priority dispatch. This is handled through Stripe.
                  </p>
                  {member?.stripe_customer_id ? (
                    <button
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      style={{ background: 'transparent', border: `1px solid ${S.danger}66`, color: S.danger, fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 9, cursor: portalLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {portalLoading ? 'Opening…' : 'Cancel membership'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: S.muted }}>No active subscription to cancel.</span>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
