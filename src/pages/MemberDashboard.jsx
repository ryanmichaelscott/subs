import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import ImpersonationBanner from '../components/ImpersonationBanner'

const TRADES = [
  'Additions & ADUs', 'Bathroom Remodel', 'Carpet Cleaning', 'Concrete Work', 'Countertops',
  'Decks & Patios', 'Driveway Paving', 'Electrical', 'Excavation', 'Exterior Painting',
  'Fencing', 'Finish Carpentry', 'Fireplace & Chimney', 'Flooring', 'Framing',
  'Garage Doors', 'Gutters', 'Handyman', 'House Cleaning', 'HVAC',
  'Insulation', 'Interior Painting', 'Kitchen Remodel', 'Landscaping', 'Lawn Care',
  'Fire, Mold & Flood Restoration', 'Mold Detection', 'Pest Control', 'Plumbing', 'Pool Service', 'Roofing',
  'Siding & Stucco', 'Smart Home / AV', 'Solar', 'Tree Service', 'Water Filtration',
  'Waterproofing', 'Window Cleaning', 'Window Install', 'Window Treatments / Blinds', 'Windows & Doors',
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

// Zip code coordinate cache — persists for the session
const _zipCache = {}
async function fetchZipCoords(zip) {
  if (_zipCache[zip] !== undefined) return _zipCache[zip]
  try {
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`)
    if (!r.ok) { _zipCache[zip] = null; return null }
    const d = await r.json()
    const p = d.places?.[0]
    const result = p ? { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude), state: p['state abbreviation'] } : null
    _zipCache[zip] = result
    return result
  } catch { _zipCache[zip] = null; return null }
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const STATUS_CONFIG = {
  open:      { label: 'Searching for contractor',  color: S.amber },
  pending:   { label: 'Searching for contractor',  color: S.amber },
  accepted:  { label: 'Contractor assigned',       color: S.blue },
  Scheduled: { label: 'Scheduled',                 color: S.blue },
  Complete:  { label: 'Completed',                 color: S.green },
  completed: { label: 'Completed',                 color: S.green },
  Cancelled: { label: 'Cancelled',                 color: '#FF5A5A' },
}

function Card({ children, style, className = '', ...props }) {
  return <div className={`md-card ${className}`} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, boxSizing: 'border-box', ...style }} {...props}>{children}</div>
}

const TIER_COLORS = { Member: S.green, 'Member+': S.blue, Elite: S.purple }

function parseServiceArea(raw) {
  if (!raw) return null
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (obj.type === 'county' && obj.counties) {
      const counties = obj.counties.split(',').map(c => c.trim().replace(/\s*county$/i, '').trim()).filter(Boolean)
      return `Serving ${counties.join(', ')} ${counties.length === 1 ? 'County' : 'Counties'}${obj.state ? ` · ${obj.state}` : ''}`
    }
    if (obj.type === 'zip' && obj.zip) return `Zip ${obj.zip}${obj.radius ? ` +${obj.radius}mi` : ''}`
    if (obj.type === 'statewide' && obj.state) return `Statewide · ${obj.state}`
    return Object.values(obj).filter(v => v && typeof v === 'string').join(' · ')
  } catch {
    return raw
  }
}
const TIER_PRICES = { Member: '$99/yr', 'Member+': '$179/yr', Elite: '$349/yr' }

const TIER_PERKS = {
  Member: [
    'Access to the vetted SUBS contractor network',
    'Member discounts on every service',
    'Up to 5 service requests per year',
    'Digital membership card',
    'Concierge line — call us to book the right contractor',
    '30-day money back guarantee',
  ],
  'Member+': [
    'Unlimited service requests',
    'Better rates + priority access',
    'Priority concierge — skip the queue, faster response',
    'Full job history and account management',
    'Annual home maintenance checklist',
    'Early access to new contractors and trades',
  ],
  Elite: [
    'Best available rates + VIP priority scheduling',
    'White glove concierge — we handle everything, you do nothing',
    'Same-week scheduling guaranteed',
    'Dedicated SUBS home advisor',
    'First access to top-rated contractors in your area',
  ],
}

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

  const [searchParams, setSearchParams] = useSearchParams()
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
  const [showServiceLimitModal, setShowServiceLimitModal] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', zip: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [googleWalletLoading, setGoogleWalletLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [accountError, setAccountError] = useState(null)
  const [reviewingJobId, setReviewingJobId] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [referralStats, setReferralStats] = useState(null)
  const [refLinkCopied, setRefLinkCopied] = useState(false)
  const [showPhonePopup, setShowPhonePopup] = useState(false)
  const [popupPhone, setPopupPhone] = useState('')
  const [popupConsent, setPopupConsent] = useState(false)
  const [popupDontShow, setPopupDontShow] = useState(false)
  const [popupSaving, setPopupSaving] = useState(false)
  const [filtered, setFiltered] = useState([])

  const PLAN_PRICE_IDS = {
    member: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
    plus: 'price_1TjQ8TAYDs9oVarWqCQyxLM5',
    elite: 'price_1TjQ7DAYDs9oVarWbJONkQ1P',
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
          const { data: jobData } = await supabase.functions.invoke('get-member-jobs', { body: { clerk_user_id: adminData.member.clerk_user_id } })
          if (jobData?.jobs) setJobRequests(jobData.jobs)
        }
        const { data: contractorRows } = await supabase.from('contractors').select('*, contractor_rates(*)').eq('status', 'active').order('rating', { ascending: false })
        if (contractorRows) setContractors(contractorRows)
        return
      }

      const email = user.primaryEmailAddress?.emailAddress || ''
      const name = user.fullName || user.firstName || ''
      const phone = user.phoneNumbers?.[0]?.phoneNumber || null

      // Upsert member via service role (bypasses RLS, preserves Stripe/tier fields on update)
      const pendingRef = localStorage.getItem('subs_referral_code')
      const { data: upsertData } = await supabase.functions.invoke('upsert-member', {
        body: { clerk_user_id: user.id, email, name, ...(phone ? { phone } : {}), ...(pendingRef ? { referral_code: pendingRef } : {}) },
      })
      if (pendingRef && upsertData?.created) localStorage.removeItem('subs_referral_code')
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

      // Fetch real data — job_requests has RLS that requires a Clerk JWT the
      // anon client doesn't send, so we use an edge function with service role
      const [{ data: contractorRows }, { data: jobData }, { data: refData }] = await Promise.all([
        supabase
          .from('contractors')
          .select('*, contractor_rates(*)')
          .eq('status', 'active')
          .order('rating', { ascending: false }),
        supabase.functions.invoke('get-member-jobs', { body: { clerk_user_id: user.id } }),
        supabase.functions.invoke('get-referral-stats', { body: { clerk_user_id: user.id } }),
      ])
      if (contractorRows) setContractors(contractorRows)
      if (jobData?.jobs) setJobRequests(jobData.jobs)
      if (refData?.referral_code) setReferralStats(refData)
    }
    init()
  }, [user])

  const handlePhonePopupSave = async () => {
    if (!popupPhone.trim() || !popupConsent || popupSaving) return
    setPopupSaving(true)
    await supabase.functions.invoke('upsert-member', {
      body: {
        clerk_user_id: isImpersonating ? (member?.clerk_user_id || '') : user?.id,
        phone: popupPhone.trim(),
        sms_consent: true,
        sms_consent_at: new Date().toISOString(),
      },
    })
    setMember(m => ({ ...m, phone: popupPhone.trim(), sms_consent: true }))
    setProfileForm(f => ({ ...f, phone: popupPhone.trim() }))
    setPopupSaving(false)
    setShowPhonePopup(false)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setAccountError(null)
    setProfileSaved(false)
    const targetClerkId = isImpersonating ? member?.clerk_user_id : user.id
    const targetEmail = isImpersonating ? impersonating.email : (user.primaryEmailAddress?.emailAddress || '')
    const { data, error } = await supabase.functions.invoke('upsert-member', {
      body: {
        clerk_user_id: targetClerkId,
        email: targetEmail,
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

  const handleAddToWallet = async () => {
    setWalletLoading(true)
    try {
      const res = await fetch('/api/wallet/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          name: member?.name || displayName,
          email: displayEmail,
          tier: member?.tier || 'Member',
          mode: 'download',
        }),
      })
      if (!res.ok) { console.error('Wallet error:', await res.json()); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'subs-membership.pkpass'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Wallet error:', err)
    } finally {
      setWalletLoading(false)
    }
  }

  const handleAddToGoogleWallet = async () => {
    setGoogleWalletLoading(true)
    try {
      const res = await fetch('/api/wallet/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          name: member?.name || displayName,
          email: displayEmail,
          tier: member?.tier || 'Member',
        }),
      })
      if (!res.ok) { console.error('Google Wallet error:', await res.json()); return }
      const { google_wallet_url } = await res.json()
      if (google_wallet_url) window.open(google_wallet_url, '_blank')
    } catch (err) {
      console.error('Google Wallet error:', err)
    } finally {
      setGoogleWalletLoading(false)
    }
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

  useEffect(() => {
    let cancelled = false
    async function compute() {
      const byTrade = contractors.filter(c => {
        const allTrades = c.trades?.length ? c.trades : [c.trade].filter(Boolean)
        return !tradeFilter || allTrades.includes(tradeFilter)
      })
      if (!zipFilter || !/^\d{5}$/.test(zipFilter)) {
        if (!cancelled) setFiltered(byTrade)
        return
      }
      const memberCoords = await fetchZipCoords(zipFilter)
      if (cancelled) return
      if (!memberCoords) { setFiltered(byTrade); return }
      const result = []
      for (const c of byTrade) {
        let sa = null
        try { sa = JSON.parse(c.service_area || 'null') } catch {}
        if (!sa) { result.push(c); continue }
        if (sa.type === 'statewide') {
          if (!sa.state || sa.state === memberCoords.state) result.push(c)
        } else if (sa.type === 'county') {
          if (!sa.state || sa.state === memberCoords.state) result.push(c)
        } else if (sa.type === 'zip' && sa.zip) {
          const radius = parseInt(sa.radius) || 50
          if (sa.zip === zipFilter) { result.push(c); continue }
          const cCoords = await fetchZipCoords(sa.zip)
          if (cancelled) return
          if (cCoords && haversineMiles(memberCoords.lat, memberCoords.lon, cCoords.lat, cCoords.lon) <= radius) result.push(c)
        } else {
          if ((c.service_area || '').toLowerCase().includes(zipFilter)) result.push(c)
        }
      }
      if (!cancelled) setFiltered(result)
    }
    compute()
    return () => { cancelled = true }
  }, [contractors, tradeFilter, zipFilter])

  // Show phone popup once when member loads without a phone number
  useEffect(() => {
    if (!member?.clerk_user_id) return
    if (member.phone || member.phone_popup_dismissed) return
    if (sessionStorage.getItem('subs_phone_prompt_dismissed') === '1') return
    setShowPhonePopup(true)
  }, [member?.clerk_user_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get('conversion') !== '1') return
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: 'AW-18267284940',
        value: 99.0,
        currency: 'USD',
      })
    }
    // Remove the param so a page refresh doesn't fire it again
    const next = new URLSearchParams(searchParams)
    next.delete('conversion')
    setSearchParams(next, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitReview = async (job) => {
    if (!reviewForm.rating) return
    setReviewSubmitting(true)
    await supabase.functions.invoke('submit-review', {
      body: {
        job_request_id: job.id,
        contractor_id: job.accepted_contractor_id || job.contractor_id,
        clerk_user_id: user.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment || null,
      },
    })
    setJobRequests(prev => prev.map(j => j.id === job.id ? { ...j, my_review: { rating: reviewForm.rating, comment: reviewForm.comment } } : j))
    // Refresh contractor list so updated rating/review count is visible in the directory
    const { data: refreshed } = await supabase
      .from('contractors')
      .select('*, contractor_rates(*)')
      .eq('status', 'active')
      .order('rating', { ascending: false })
    if (refreshed) setContractors(refreshed)
    setReviewingJobId(null)
    setReviewForm({ rating: 0, comment: '' })
    setReviewSubmitting(false)
  }

  const jobsDone = jobRequests.filter(j => ['Complete', 'Scheduled', 'accepted', 'completed'].includes(j.status)).length
  const tradesUsed = new Set(jobRequests.map(j => j.trade).filter(Boolean)).size
  const totalSaved = jobsDone * 75

  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const requestsThisYear = jobRequests.filter(j => new Date(j.submitted_at) > yearAgo).length

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
      <style>{`
        .md-nav-meta { display: flex; align-items: center; gap: 8px; }
        .md-nav-email, .md-nav-tier { display: inline; }
        @media (max-width: 600px) {
          .md-nav-email, .md-nav-tier { display: none; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .tabs-bar button { font-size: 11px !important; padding: 9px 4px !important; }
          .md-outer { padding: 16px 12px !important; }
          .md-card { padding: 16px !important; }
          .md-card-inner { padding: 14px 16px !important; }
          * { max-width: 100%; box-sizing: border-box; }
          input, select, textarea { max-width: 100% !important; }
        }
      `}</style>
      {/* Top nav */}
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <div className="md-nav-meta">
          <a href="tel:18884543019" className="md-nav-email" style={{ fontSize: 12, fontWeight: 600, color: S.green, textDecoration: 'none' }}>1-888-454-3019</a>
          <span className="md-nav-email" style={{ fontSize: 12, color: S.muted }}>{displayEmail}</span>
          {member?.tier && (
            <span className="md-nav-tier" style={{ fontSize: 11, fontWeight: 700, color: TIER_COLORS[member.tier] || S.blue, background: (TIER_COLORS[member.tier] || S.blue) + '22', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{member.tier}</span>
          )}
          <button onClick={() => signOut().then(() => navigate('/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}>Sign out</button>
        </div>
      </nav>

      {isImpersonating && (
        <ImpersonationBanner
          name={impersonating.name}
          role="member"
          onExit={() => { localStorage.removeItem('subs_impersonating'); navigate('/admin/dashboard') }}
        />
      )}


      <div className="md-outer" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MemberCard name={member?.name || displayName} member={member} />
            {member?.status === 'Active' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={handleAddToWallet}
                  disabled={walletLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '12px 16px', borderRadius: 10, cursor: walletLoading ? 'not-allowed' : 'pointer', opacity: walletLoading ? 0.7 : 1 }}
                >
                  <svg width="14" height="17" viewBox="0 0 170 170" fill="white" style={{ flexShrink: 0 }}><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 2.13-9.501 3.24-12.742 3.35-4.929.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.38 0-10.857 2.346-20.2 7.045-28.007 3.693-6.303 8.606-11.275 14.755-14.925s12.793-5.51 19.948-5.629c3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 3.599 12.238 3.599 1.339 0 5.877-1.416 13.57-4.239 7.275-2.617 13.415-3.7 18.445-3.275 13.63 1.1 23.87 6.473 30.68 16.153-12.19 7.386-18.22 17.731-18.1 31.002.11 10.337 3.86 18.939 11.23 25.769 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.102-2.96 15.667-8.86 22.669-7.12 8.324-15.732 13.134-25.071 12.375a25.222 25.222 0 01-.188-3.07c0-7.778 3.386-16.102 9.399-22.908 3.002-3.446 6.82-6.311 11.45-8.597 4.62-2.252 8.99-3.497 13.1-3.71.12 1.017.17 2.033.17 3.24z"/></svg>
                  {walletLoading ? 'Generating…' : 'Add to Apple Wallet'}
                </button>
                <button
                  onClick={handleAddToGoogleWallet}
                  disabled={googleWalletLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#fff', border: '1px solid #dadce0', color: '#3c4043', fontSize: 13, fontWeight: 600, padding: '12px 16px', borderRadius: 10, cursor: googleWalletLoading ? 'not-allowed' : 'pointer', opacity: googleWalletLoading ? 0.7 : 1 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {googleWalletLoading ? 'Opening…' : 'Add to Google Wallet'}
                </button>
              </div>
            )}
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Quick Stats</div>
              {[
                [String(jobsDone), 'Jobs completed'],
                [String(tradesUsed), 'Trades used'],
                [String(jobRequests.length), 'Total requests'],
              ].map(([val, label]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: S.muted }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingTop: 10, borderTop: `1px solid ${S.border}` }}>
                <span style={{ fontSize: 13, color: S.muted }}>Total saved</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: S.green }}>${totalSaved > 0 ? totalSaved.toLocaleString() + '+' : '0'}</span>
              </div>
            </Card>

            {/* Member-tier: service request usage tracker */}
            {member?.tier === 'Member' && (
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Service Requests</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: S.offwhite, fontWeight: 600 }}>{requestsThisYear} of 5 used this year</span>
                  <span style={{ fontSize: 11, color: requestsThisYear >= 5 ? S.danger : S.muted }}>
                    {requestsThisYear >= 5 ? 'Limit reached' : `${5 - requestsThisYear} left`}
                  </span>
                </div>
                <div style={{ height: 6, background: S.surface, borderRadius: 3, overflow: 'hidden', marginBottom: requestsThisYear >= 5 ? 14 : 0 }}>
                  <div style={{ height: '100%', width: `${Math.min((requestsThisYear / 5) * 100, 100)}%`, background: requestsThisYear >= 5 ? S.danger : S.green, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                {requestsThisYear >= 5 && (
                  <button
                    onClick={async () => {
                      setUpgradeLoading(true)
                      const { data } = await supabase.functions.invoke('create-checkout-session', {
                        body: { price_id: PLAN_PRICE_IDS.plus, clerk_user_id: user?.id, email: user?.primaryEmailAddress?.emailAddress, success_url: `${window.location.origin}/dashboard`, cancel_url: `${window.location.origin}/dashboard` },
                      })
                      setUpgradeLoading(false)
                      if (data?.url) window.location.href = data.url
                    }}
                    style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '9px 0', borderRadius: 8, cursor: upgradeLoading ? 'not-allowed' : 'pointer', opacity: upgradeLoading ? 0.7 : 1 }}
                  >
                    {upgradeLoading ? 'Loading…' : 'Upgrade to Member+ →'}
                  </button>
                )}
              </Card>
            )}

            {/* Your Benefits */}
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Your Benefits
                {member?.tier && <span style={{ marginLeft: 8, color: TIER_COLORS[member.tier] || S.green, textTransform: 'none', fontSize: 10, fontWeight: 700 }}>· {member.tier}</span>}
              </div>
              {(TIER_PERKS[member?.tier] || TIER_PERKS.Member).map((perk, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                  <span style={{ color: S.green, fontSize: 11, flexShrink: 0, marginTop: 2, fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 12, color: S.muted, lineHeight: 1.45 }}>{perk}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Main */}
          <div>
            {/* Tabs */}
            <div className="tabs-bar" style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 10, padding: 4, border: `1px solid ${S.border}`, marginBottom: 24 }}>
              {tabs.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: tab === id ? S.card : 'transparent', border: tab === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '10px 2px', fontSize: 13, fontWeight: 600, color: tab === id ? S.offwhite : S.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                            {c.service_area && <span style={{ fontSize: 11, color: S.muted }}>· {parseServiceArea(c.service_area)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {c.discount_description && <div style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{c.discount_description}</div>}
                          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 600, color: S.green, border: '1px solid rgba(93,255,138,0.4)', borderRadius: 20, padding: '3px 9px', lineHeight: 1.4 }}>✓ Certified Pro*</span>
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
                                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{c.jobs_count === 1 ? 'Review' : 'Reviews'}</div>
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
                  {filtered.length > 0 && (
                    <div style={{ fontSize: 11, color: S.muted, padding: '12px 4px 0' }}>* Certified Pro contractors are licensed, insured, and highly rated.</div>
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
                          {(() => {
                            const covered = new Set(
                              contractors.flatMap(c => c.trades?.length ? c.trades : [c.trade].filter(Boolean))
                            )
                            const available = TRADES.filter(t => covered.has(t))
                            const other = TRADES.filter(t => !covered.has(t))
                            return (
                              <>
                                {available.length > 0 && (
                                  <optgroup label="Available now">
                                    {available.map(t => <option key={t} value={t}>{t}</option>)}
                                  </optgroup>
                                )}
                                {other.length > 0 && (
                                  <optgroup label="All trades">
                                    {other.map(t => <option key={t} value={t}>{t}</option>)}
                                  </optgroup>
                                )}
                              </>
                            )
                          })()}
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
                      // Check 5-request annual limit for Member tier
                      if (member?.tier === 'Member' && requestsThisYear >= 5) {
                        setShowServiceLimitModal(true); return
                      }
                      setSearching(true)
                      const { data } = await supabase.functions.invoke('create-lead', {
                        body: {
                          trade: jobForm.trade,
                          description: jobForm.description,
                          zip: jobForm.zip,
                          state: jobForm.state,
                          preferred_date: jobForm.date || null,
                          member_email: isImpersonating ? impersonating.email : (user?.primaryEmailAddress?.emailAddress || ''),
                          member_name: isImpersonating ? impersonating.name : (user?.fullName || user?.firstName || ''),
                          clerk_user_id: isImpersonating ? (member?.clerk_user_id || '') : (user?.id || ''),
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {jobRequests.length === 0 && (
                  <Card style={{ padding: '52px 28px', textAlign: 'center' }}>
                    <div style={{ fontSize: 38, marginBottom: 16 }}>🏠</div>
                    <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 10 }}>No service requests yet.</div>
                    <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, maxWidth: 340, margin: '0 auto 24px' }}>
                      Ready to save on your first home service? We'll match you with a vetted contractor at your member rate.
                    </p>
                    <button
                      onClick={() => setTab('request')}
                      style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: 'pointer' }}
                    >
                      Request a Service →
                    </button>
                  </Card>
                )}
                {jobRequests.map((job) => {
                  const sc = STATUS_CONFIG[job.status] || { label: job.status, color: S.muted }
                  const c = job.contractor
                  const isAssigned = ['accepted', 'Scheduled', 'Complete', 'completed'].includes(job.status)
                  return (
                    <Card key={job.id} style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{job.trade}</div>
                          <div style={{ fontSize: 12, color: S.muted }}>
                            Zip {job.zip}{job.state ? ` · ${job.state}` : ''} · {new Date(job.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          {job.description && (
                            <div style={{ fontSize: 12, color: S.muted, marginTop: 4, maxWidth: 380 }}>{job.description.slice(0, 80)}{job.description.length > 80 ? '…' : ''}</div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, background: sc.color + '22', color: sc.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {sc.label}
                        </span>
                      </div>
                      {isAssigned && c && (
                        <div style={{ marginTop: 14, padding: '12px 14px', background: S.green + '0D', border: `1px solid ${S.green}33`, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: S.green, letterSpacing: '0.08em', marginBottom: 6 }}>YOUR CONTRACTOR</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite, marginBottom: 4 }}>{c.name || c.contact_name}</div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 13, color: S.green, textDecoration: 'none', fontWeight: 600 }}>{c.phone}</a>}
                            {c.contact_email && <a href={`mailto:${c.contact_email}`} style={{ fontSize: 13, color: S.blue, textDecoration: 'none' }}>{c.contact_email}</a>}
                          </div>
                        </div>
                      )}
                      {isAssigned && !c && (
                        <div style={{ marginTop: 12, fontSize: 12, color: S.muted }}>Contractor details will appear here once confirmed.</div>
                      )}
                      {(job.status === 'completed' || job.status === 'Complete') && (
                        <div style={{ marginTop: 12 }}>
                          {job.my_review ? (
                            <div style={{ padding: '10px 14px', background: S.amber + '10', border: `1px solid ${S.amber}33`, borderRadius: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: S.amber, marginBottom: 4 }}>YOUR REVIEW</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: job.my_review.comment ? 4 : 0 }}>
                                <span>{'⭐'.repeat(job.my_review.rating)}</span>
                                <span style={{ fontSize: 12, color: S.muted }}>{job.my_review.rating}/5</span>
                              </div>
                              {job.my_review.comment && <div style={{ fontSize: 13, color: S.offwhite }}>{job.my_review.comment}</div>}
                            </div>
                          ) : reviewingJobId === job.id ? (
                            <div style={{ padding: '14px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: S.offwhite, marginBottom: 10 }}>Rate your experience</div>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                {[1,2,3,4,5].map(n => (
                                  <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                                    style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', opacity: reviewForm.rating >= n ? 1 : 0.3, padding: 0 }}>
                                    ⭐
                                  </button>
                                ))}
                              </div>
                              <textarea
                                value={reviewForm.comment}
                                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                                placeholder="Optional — what went well?"
                                rows={2}
                                style={{ width: '100%', background: S.card, border: `1px solid ${S.border}`, color: S.offwhite, borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button
                                  onClick={() => handleSubmitReview(job)}
                                  disabled={!reviewForm.rating || reviewSubmitting}
                                  style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '9px 0', borderRadius: 8, cursor: 'pointer', opacity: !reviewForm.rating ? 0.5 : 1 }}>
                                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                                </button>
                                <button onClick={() => setReviewingJobId(null)}
                                  style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setReviewingJobId(job.id); setReviewForm({ rating: 0, comment: '' }) }}
                              style={{ width: '100%', background: 'transparent', border: `1px solid ${S.amber}55`, color: S.amber, fontSize: 13, fontWeight: 600, padding: '9px 0', borderRadius: 8, cursor: 'pointer', marginTop: 2 }}>
                              ⭐ Leave a Review
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
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

                {/* Referral Program */}
                {referralStats && (() => {
                  const { referral_code, converted, total, referrals } = referralStats
                  const refLink = `https://subs.app/?ref=${referral_code}`
                  const nextMilestone = converted >= 3 ? null : converted >= 1 ? 3 : 1
                  const reward = converted >= 3 ? 'free year' : converted >= 1 ? '$20 off' : null
                  const progressMsg = converted >= 3
                    ? '🎉 You\'ve earned a free year — it\'ll be applied at renewal.'
                    : converted === 2
                    ? '1 more paying referral = a free year!'
                    : converted === 1
                    ? `2 more paying referrals = a free year. You've already earned $20 off.`
                    : `Refer 1 friend = $20 off. Refer 3 = a free year.`
                  return (
                    <Card style={{ padding: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>Refer a Friend</div>
                        {converted > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: S.green + '22', color: S.green, padding: '3px 10px', borderRadius: 100 }}>
                            {converted} paid referral{converted !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: S.muted, margin: '0 0 20px', lineHeight: 1.6 }}>{progressMsg}</p>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.muted, marginBottom: 6 }}>
                          <span>{converted} of 3 paying referrals</span>
                          <span>Free year at 3</span>
                        </div>
                        <div style={{ height: 6, background: S.border, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (converted / 3) * 100)}%`, background: S.green, borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          {[{ n: 1, label: '$20 off' }, { n: 3, label: 'Free year' }].map(({ n, label }) => (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: converted >= n ? S.green : S.border, border: `2px solid ${converted >= n ? S.green : S.muted}`, flexShrink: 0 }} />
                              <span style={{ color: converted >= n ? S.green : S.muted, fontWeight: converted >= n ? 700 : 400 }}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Referral link */}
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Your referral link</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            readOnly
                            value={refLink}
                            style={{ ...inp, flex: 1, fontSize: 12, color: S.muted, cursor: 'default' }}
                            onFocus={e => e.target.select()}
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(refLink); setRefLinkCopied(true); setTimeout(() => setRefLinkCopied(false), 2000) }}
                            style={{ background: refLinkCopied ? S.green + '22' : S.surface, border: `1px solid ${refLinkCopied ? S.green : S.border}`, color: refLinkCopied ? S.green : S.offwhite, fontSize: 13, fontWeight: 600, padding: '0 16px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {refLinkCopied ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* Referral list */}
                      {referrals.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>People you've referred</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {referrals.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: S.surface, borderRadius: 8 }}>
                                <span style={{ fontSize: 13, color: S.offwhite }}>{r.referred_email}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {r.reward_applied && (
                                    <span style={{ fontSize: 11, color: S.green, fontWeight: 600 }}>{r.reward_applied === 'free_year' ? '🎉 Free year' : '💚 $20 off'}</span>
                                  )}
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: r.status === 'converted' ? S.green + '22' : S.amber + '22', color: r.status === 'converted' ? S.green : S.amber }}>
                                    {r.status === 'converted' ? 'Paid' : 'Signed up'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })()}

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
                        <div style={{ fontSize: 11, color: S.muted, marginTop: 5, lineHeight: 1.65 }}>By providing your phone number and checking this box, you consent to receive SMS text messages from SUBS, Inc. regarding your membership, service updates, contractor updates, and promotional offers. Message and data rates may apply. Message frequency varies. Reply STOP to opt out at any time. Reply HELP for help. View our <Link to="/privacy" target="_blank" style={{ color: S.green, textDecoration: 'none' }}>Privacy Policy</Link> at subs.app/privacy and <Link to="/sms-consent" target="_blank" style={{ color: S.green, textDecoration: 'none' }}>SMS Consent Policy</Link> at subs.app/sms-consent.</div>
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
                      {(TIER_PRICES[member?.tier] || '—').replace('/yr', '')}
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
                        {[['member', 'Member', '$99/yr', 'price_1TiRPcAYDs9oVarWLWpp0wLZ'], ['plus', 'Member+', '$179/yr', 'price_1TjQ8TAYDs9oVarWqCQyxLM5'], ['elite', 'Elite', '$349/yr', 'price_1TjQ7DAYDs9oVarWbJONkQ1P']].map(([id, name, price, priceId]) => (
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

      {/* Phone number collection popup */}
      {showPhonePopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 18, padding: '32px 28px', maxWidth: 460, width: '100%' }}>
            {/* Headline */}
            <h2 style={{ fontFamily: C.display, fontSize: 32, fontWeight: 400, color: S.offwhite, margin: '0 0 10px', lineHeight: 1.1 }}>
              Stay in the loop.
            </h2>
            <p style={{ fontSize: 14, color: S.muted, margin: '0 0 22px', lineHeight: 1.6 }}>
              Add your phone number to receive real-time updates on your service requests.
            </p>

            {/* Why we collect it */}
            <div style={{ background: S.surface, borderRadius: 12, padding: '14px 16px', marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>We use your number exclusively for:</div>
              {[
                'Booking confirmations when a contractor is assigned',
                'Service reminders and scheduling updates',
                'Support from our concierge team at 1-888-454-3019',
                'Status updates when your job is accepted or completed',
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < arr.length - 1 ? 7 : 0 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: S.green, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 13, color: S.offwhite, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Phone input */}
            <input
              type="tel"
              placeholder="(801) 555-0100"
              value={popupPhone}
              onChange={e => setPopupPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePhonePopupSave()}
              style={{ width: '100%', boxSizing: 'border-box', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '13px 16px', color: S.offwhite, fontSize: 15, outline: 'none', fontFamily: 'inherit', marginBottom: 10 }}
            />

            {/* SMS consent checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={popupConsent}
                onChange={e => setPopupConsent(e.target.checked)}
                style={{ marginTop: 3, accentColor: S.green, width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: S.muted, lineHeight: 1.65 }}>
                By providing your phone number and checking this box, you consent to receive SMS text messages from SUBS, Inc. regarding your membership, service updates, contractor updates, and promotional offers. Message and data rates may apply. Message frequency varies. Reply STOP to opt out at any time. Reply HELP for help. View our <Link to="/privacy" target="_blank" style={{ color: S.green, textDecoration: 'none' }}>Privacy Policy</Link> at subs.app/privacy and <Link to="/sms-consent" target="_blank" style={{ color: S.green, textDecoration: 'none' }}>SMS Consent Policy</Link> at subs.app/sms-consent.
              </span>
            </label>

            {/* Save button */}
            <button
              onClick={handlePhonePopupSave}
              disabled={!popupPhone.trim() || !popupConsent || popupSaving}
              style={{ width: '100%', background: (!popupPhone.trim() || !popupConsent) ? S.surface : S.green, border: `1px solid ${(!popupPhone.trim() || !popupConsent) ? S.border : S.green}`, borderRadius: 10, color: (!popupPhone.trim() || !popupConsent) ? S.muted : S.black, fontSize: 15, fontWeight: 700, padding: '14px 0', cursor: (!popupPhone.trim() || !popupConsent || popupSaving) ? 'not-allowed' : 'pointer', marginBottom: 10, transition: 'all 0.12s' }}
            >
              {popupSaving ? 'Saving…' : 'Save My Number'}
            </button>

            {/* Remind me later */}
            <button
              onClick={() => { sessionStorage.setItem('subs_phone_prompt_dismissed', '1'); setShowPhonePopup(false) }}
              style={{ width: '100%', background: 'transparent', border: 'none', color: S.muted, fontSize: 13, cursor: 'pointer', padding: '8px 0', marginBottom: 14 }}
            >
              Remind me later
            </button>

            {/* Don't show again */}
            <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={popupDontShow}
                  onChange={async (e) => {
                    setPopupDontShow(e.target.checked)
                    if (e.target.checked) {
                      setShowPhonePopup(false)
                      await supabase.functions.invoke('upsert-member', {
                        body: { clerk_user_id: isImpersonating ? (member?.clerk_user_id || '') : user?.id, phone_popup_dismissed: true },
                      })
                      setMember(m => ({ ...m, phone_popup_dismissed: true }))
                    }
                  }}
                  style={{ accentColor: S.muted, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: S.muted }}>Don't show this again</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Service limit upgrade modal */}
      {showServiceLimitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <div style={{ fontSize: 32, marginBottom: 16, textAlign: 'center' }}>📋</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: S.offwhite, marginBottom: 12, textAlign: 'center' }}>
              Annual limit reached
            </div>
            <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, textAlign: 'center', marginBottom: 28 }}>
              You've used all 5 of your annual service requests. Upgrade to Member+ for unlimited requests.
            </p>
            <button
              onClick={async () => {
                setUpgradeLoading(true)
                const { data } = await supabase.functions.invoke('create-checkout-session', {
                  body: {
                    priceId: PLAN_PRICE_IDS.plus,
                    email: user?.primaryEmailAddress?.emailAddress || '',
                    name: user?.fullName || user?.firstName || '',
                    clerk_user_id: user?.id || '',
                  },
                })
                setUpgradeLoading(false)
                if (data?.url) window.location.href = data.url
              }}
              disabled={upgradeLoading}
              style={{ width: '100%', background: S.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 0', cursor: upgradeLoading ? 'not-allowed' : 'pointer', opacity: upgradeLoading ? 0.7 : 1, marginBottom: 12 }}
            >
              {upgradeLoading ? 'Redirecting…' : 'Upgrade to Member+ — $179/yr →'}
            </button>
            <button
              onClick={() => setShowServiceLimitModal(false)}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 10, color: S.muted, fontSize: 14, fontWeight: 600, padding: '11px 0', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
