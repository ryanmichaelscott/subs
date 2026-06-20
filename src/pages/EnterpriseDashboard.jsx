import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ENTERPRISE_TRADES = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting',
  'Flooring', 'Pest Control', 'Handyman', 'Landscaping', 'Other',
]

const PROPERTY_TYPES = [
  'Single Family', 'Multi-Family', 'Condo', 'Commercial', 'Other',
]

const PLAN_COLORS = {
  Portfolio: S.green,
  Professional: S.blue,
  Enterprise: S.purple,
}

const JOB_STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: S.amber },
  assigned:  { label: 'Assigned',  color: S.blue },
  scheduled: { label: 'Scheduled', color: S.purple },
  complete:  { label: 'Complete',  color: S.green },
  completed: { label: 'Complete',  color: S.green },
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${S.border}`,
        borderTopColor: S.green,
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Card({ children, style, ...props }) {
  return (
    <div style={{
      background: S.card,
      border: `1px solid ${S.border}`,
      borderRadius: 12,
      boxSizing: 'border-box',
      ...style,
    }} {...props}>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <Card style={{ padding: '18px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || S.offwhite, fontFamily: C.body }}>{value}</div>
    </Card>
  )
}

const inp = {
  width: '100%',
  background: S.surface,
  border: `1px solid ${S.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: S.offwhite,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: C.body,
}

export default function EnterpriseDashboard() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useClerk()

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState(null)
  const [properties, setProperties] = useState([])
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState('properties')

  // Add property form
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [propForm, setPropForm] = useState({ address: '', city: '', state: '', zip: '', property_type: 'Single Family', unit_count: '', notes: '' })
  const [propSaving, setPropSaving] = useState(false)
  const [propError, setPropError] = useState(null)

  // Job request form
  const [showJobForm, setShowJobForm] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [jobForm, setJobForm] = useState({ property_id: '', trade: '', description: '', preferred_date: '' })
  const [bulkPropertyIds, setBulkPropertyIds] = useState([])
  const [jobSaving, setJobSaving] = useState(false)
  const [jobError, setJobError] = useState(null)
  const [jobSubmitted, setJobSubmitted] = useState(false)

  // Account tab
  const [accountForm, setAccountForm] = useState({ company_name: '', contact_name: '', email: '', phone: '' })
  const [accountEditing, setAccountEditing] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [accountError, setAccountError] = useState(null)
  const [refLinkCopied, setRefLinkCopied] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { data: memberData } = await supabase
        .from('enterprise_members')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single()

      if (!memberData) {
        setLoading(false)
        return
      }

      setMember(memberData)
      setAccountForm({
        company_name: memberData.company_name || '',
        contact_name: memberData.contact_name || '',
        email: memberData.email || '',
        phone: memberData.phone || '',
      })

      const { data: propData } = await supabase
        .from('enterprise_properties')
        .select('*')
        .eq('enterprise_member_id', memberData.id)
        .order('created_at', { ascending: true })

      if (propData) setProperties(propData)

      // Jobs table may not exist yet — handle error gracefully
      try {
        const { data: jobData, error: jobErr } = await supabase
          .from('enterprise_job_requests')
          .select('*')
          .eq('enterprise_member_id', memberData.id)
          .order('created_at', { ascending: false })
        if (!jobErr && jobData) setJobs(jobData)
      } catch {
        // table doesn't exist yet
      }

      setLoading(false)
    }
    load()
  }, [user])

  const reloadProperties = async () => {
    if (!member) return
    const { data } = await supabase
      .from('enterprise_properties')
      .select('*')
      .eq('enterprise_member_id', member.id)
      .order('created_at', { ascending: true })
    if (data) setProperties(data)
  }

  const reloadJobs = async () => {
    if (!member) return
    try {
      const { data, error } = await supabase
        .from('enterprise_job_requests')
        .select('*')
        .eq('enterprise_member_id', member.id)
        .order('created_at', { ascending: false })
      if (!error && data) setJobs(data)
    } catch { /* table not yet created */ }
  }

  const handleAddProperty = async () => {
    setPropError(null)
    if (!propForm.address.trim() || !propForm.city.trim() || !propForm.state.trim() || !propForm.zip.trim()) {
      setPropError('Address, city, state, and zip are required.')
      return
    }
    setPropSaving(true)
    const { error } = await supabase.from('enterprise_properties').insert({
      enterprise_member_id: member.id,
      address: propForm.address.trim(),
      city: propForm.city.trim(),
      state: propForm.state.trim(),
      zip: propForm.zip.trim(),
      property_type: propForm.property_type,
      unit_count: propForm.unit_count ? parseInt(propForm.unit_count) : null,
      notes: propForm.notes.trim() || null,
    })
    setPropSaving(false)
    if (error) { setPropError('Failed to save property. Please try again.'); return }
    setPropForm({ address: '', city: '', state: '', zip: '', property_type: 'Single Family', unit_count: '', notes: '' })
    setShowAddProperty(false)
    await reloadProperties()
  }

  const handleSubmitJob = async () => {
    setJobError(null)
    const targetIds = bulkMode ? bulkPropertyIds : (jobForm.property_id ? [jobForm.property_id] : [])
    if (targetIds.length === 0) { setJobError('Please select at least one property.'); return }
    if (!jobForm.trade) { setJobError('Please select a trade.'); return }
    if (!jobForm.description.trim()) { setJobError('Please describe the job.'); return }
    setJobSaving(true)
    const inserts = targetIds.map(pid => ({
      enterprise_member_id: member.id,
      property_id: pid,
      trade: jobForm.trade,
      description: jobForm.description.trim(),
      preferred_date: jobForm.preferred_date || null,
      status: 'pending',
    }))
    try {
      const { error } = await supabase.from('enterprise_job_requests').insert(inserts)
      setJobSaving(false)
      if (error) { setJobError('Failed to submit. Please try again.'); return }
      setJobForm({ property_id: '', trade: '', description: '', preferred_date: '' })
      setBulkPropertyIds([])
      setBulkMode(false)
      setShowJobForm(false)
      setJobSubmitted(true)
      await reloadJobs()
      setTimeout(() => setJobSubmitted(false), 4000)
    } catch {
      setJobSaving(false)
      setJobError('Job requests table is not yet set up. Please contact your account manager.')
    }
  }

  const handleSaveAccount = async () => {
    setAccountError(null)
    setAccountSaving(true)
    const { error } = await supabase
      .from('enterprise_members')
      .update({
        company_name: accountForm.company_name,
        contact_name: accountForm.contact_name,
        email: accountForm.email,
        phone: accountForm.phone,
      })
      .eq('id', member.id)
    setAccountSaving(false)
    if (error) { setAccountError('Failed to save. Please try again.'); return }
    setMember(m => ({ ...m, ...accountForm }))
    setAccountEditing(false)
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 3000)
  }

  const handleBillingPortal = async () => {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/enterprise/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterprise_member_id: member.id }),
      })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } catch {
      // silently fail
    }
    setBillingLoading(false)
  }

  // Savings computations
  const completedJobs = jobs.filter(j => j.status === 'complete' || j.status === 'completed')
  const totalSaved = completedJobs.reduce((sum, j) => sum + (j.savings_amount || 0), 0)
  const avgSavings = completedJobs.length > 0 ? totalSaved / completedJobs.length : 0

  // Savings by property for chart
  const savingsByProp = properties.map(p => {
    const propJobs = completedJobs.filter(j => j.property_id === p.id)
    const saved = propJobs.reduce((s, j) => s + (j.savings_amount || 0), 0)
    return { name: p.address.split(' ').slice(0, 2).join(' '), saved }
  }).filter(p => p.saved > 0)

  // Monthly savings breakdown
  const monthlyMap = {}
  completedJobs.forEach(j => {
    const d = new Date(j.completed_at || j.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (!monthlyMap[key]) monthlyMap[key] = { label, jobs: 0, saved: 0 }
    monthlyMap[key].jobs++
    monthlyMap[key].saved += j.savings_amount || 0
  })
  const monthlyRows = Object.entries(monthlyMap).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v)

  // Job counts per property
  const jobCountByProp = {}
  jobs.forEach(j => {
    jobCountByProp[j.property_id] = (jobCountByProp[j.property_id] || 0) + 1
  })

  const displayEmail = user?.primaryEmailAddress?.emailAddress || ''

  const memberSince = member?.created_at ? new Date(member.created_at) : null
  const memberSinceLabel = memberSince
    ? memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'
  const renewalDate = memberSince
    ? new Date(new Date(memberSince).setFullYear(memberSince.getFullYear() + 1))
    : null
  const renewalLabel = renewalDate
    ? renewalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  const planColor = PLAN_COLORS[member?.plan] || S.green

  const TABS = [
    ['properties', 'Properties'],
    ['jobs', 'Job Requests'],
    ['savings', 'Savings'],
    ['account', 'Account'],
  ]

  if (loading) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
        <Nav displayEmail={displayEmail} signOut={signOut} navigate={navigate} />
        <Spinner />
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
        <Nav displayEmail={displayEmail} signOut={signOut} navigate={navigate} />
        <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: C.display, fontSize: 32, color: S.offwhite, marginBottom: 12 }}>Complete your setup</div>
          <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your enterprise account isn't set up yet. Complete onboarding to access your property manager dashboard.
          </p>
          <Link to="/enterprise/onboarding" style={{ display: 'inline-block', background: S.green, color: S.black, fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>
            Complete Setup →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite, fontFamily: C.body }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          .ent-header-grid { flex-direction: column !important; gap: 12px !important; }
          .ent-form-grid { grid-template-columns: 1fr !important; }
          .ent-account-cols { flex-direction: column !important; }
          .ent-stat-row { flex-wrap: wrap !important; }
          .ent-tabs button { font-size: 12px !important; padding: 9px 6px !important; }
        }
      `}</style>

      <Nav displayEmail={displayEmail} signOut={signOut} navigate={navigate} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px', boxSizing: 'border-box' }}>

        {/* Header card */}
        <Card style={{ padding: '28px 32px', marginBottom: 28, background: `linear-gradient(135deg, #0e1a11 0%, #0C0F0A 100%)`, border: `1px solid ${S.border}` }}>
          <div className="ent-header-grid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: C.display, fontSize: 34, fontWeight: 400, color: S.offwhite, lineHeight: 1.1, marginBottom: 10 }}>
                {member.company_name || 'Your Company'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {member.plan && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: planColor, background: planColor + '22', padding: '4px 12px', borderRadius: 100 }}>
                    {member.plan}
                  </span>
                )}
                <span style={{ fontSize: 13, color: S.muted }}>
                  {member.unit_count ? `${member.unit_count} units` : null}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Member since</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{memberSinceLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Renewal</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{renewalLabel}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="ent-tabs" style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 10, padding: 4, border: `1px solid ${S.border}`, marginBottom: 28 }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ flex: 1, background: tab === id ? S.card : 'transparent', border: tab === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '10px 4px', fontSize: 13, fontWeight: 600, color: tab === id ? S.offwhite : S.muted, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: C.body }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PROPERTIES TAB ── */}
        {tab === 'properties' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                onClick={() => { setShowAddProperty(true); setPropError(null) }}
                style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}
              >
                + Add Property
              </button>
            </div>

            {properties.length === 0 && (
              <Card style={{ padding: '52px 28px', textAlign: 'center' }}>
                <div style={{ fontFamily: C.display, fontSize: 24, color: S.offwhite, marginBottom: 10 }}>No properties yet</div>
                <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, maxWidth: 340, margin: '0 auto 24px' }}>
                  Add your first property to get started tracking jobs and savings across your portfolio.
                </p>
                <button
                  onClick={() => { setShowAddProperty(true); setPropError(null) }}
                  style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 10, cursor: 'pointer', fontFamily: C.body }}
                >
                  Add your first property →
                </button>
              </Card>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {properties.map(p => (
                <Card key={p.id} style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{p.address}</div>
                      <div style={{ fontSize: 13, color: S.muted }}>{[p.city, p.state, p.zip].filter(Boolean).join(', ')}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                        {p.property_type && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: S.blue, background: S.blue + '18', padding: '2px 8px', borderRadius: 100 }}>{p.property_type}</span>
                        )}
                        {p.unit_count && (
                          <span style={{ fontSize: 11, color: S.muted }}>{p.unit_count} unit{p.unit_count !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: S.amber, background: S.amber + '18', padding: '3px 10px', borderRadius: 100 }}>
                        {jobCountByProp[p.id] || 0} job{jobCountByProp[p.id] !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {p.notes && (
                    <div style={{ marginTop: 10, fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{p.notes}</div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── JOB REQUESTS TAB ── */}
        {tab === 'jobs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div />
              <button
                onClick={() => { setShowJobForm(true); setJobError(null); setJobSubmitted(false) }}
                style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}
              >
                + Submit Job Request
              </button>
            </div>

            {jobSubmitted && (
              <div style={{ background: S.green + '18', border: `1px solid ${S.green}44`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: S.green, fontWeight: 600 }}>
                Job request submitted. Your account manager will be in touch shortly.
              </div>
            )}

            {jobs.length === 0 ? (
              <Card style={{ padding: '52px 28px', textAlign: 'center' }}>
                <div style={{ fontFamily: C.display, fontSize: 24, color: S.offwhite, marginBottom: 10 }}>No job requests yet</div>
                <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, maxWidth: 340, margin: '0 auto 24px' }}>
                  Submit a job request to dispatch vetted contractors across your portfolio.
                </p>
                <button
                  onClick={() => { setShowJobForm(true); setJobError(null) }}
                  style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 10, cursor: 'pointer', fontFamily: C.body }}
                >
                  Submit a request →
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobs.map(j => {
                  const sc = JOB_STATUS_CONFIG[j.status] || { label: j.status, color: S.muted }
                  const prop = properties.find(p => p.id === j.property_id)
                  return (
                    <Card key={j.id} style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 2 }}>{j.trade}</div>
                          {prop && <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>{prop.address}, {prop.city}</div>}
                          {j.description && (
                            <div style={{ fontSize: 13, color: S.muted }}>{j.description.slice(0, 90)}{j.description.length > 90 ? '…' : ''}</div>
                          )}
                          <div style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>
                            {new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {j.preferred_date ? ` · Preferred: ${new Date(j.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, background: sc.color + '22', color: sc.color, whiteSpace: 'nowrap' }}>
                            {sc.label}
                          </span>
                          {j.quoted_amount > 0 && (
                            <span style={{ fontSize: 12, color: S.offwhite, fontWeight: 600 }}>${j.quoted_amount.toLocaleString()}</span>
                          )}
                          {j.savings_amount > 0 && (
                            <span style={{ fontSize: 11, color: S.green }}>Saved ${j.savings_amount.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SAVINGS TAB ── */}
        {tab === 'savings' && (
          <div>
            {/* Summary cards */}
            <div className="ent-stat-row" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <StatCard label="Total Saved" value={`$${totalSaved.toLocaleString()}`} color={S.green} />
              <StatCard label="Jobs Completed" value={String(completedJobs.length)} />
              <StatCard label="Avg Savings / Job" value={completedJobs.length > 0 ? `$${Math.round(avgSavings).toLocaleString()}` : '$0'} color={S.blue} />
              <StatCard label="Portfolio" value={member.unit_count ? `${member.unit_count} units` : `${properties.length} props`} color={S.purple} />
            </div>

            {/* Bar chart */}
            <Card style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 16 }}>Savings by Property</div>
              {savingsByProp.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.muted, fontSize: 14, flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 32 }}>📊</div>
                  <div>Savings data will appear here as jobs are completed.</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={savingsByProp} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, color: S.offwhite }}
                      formatter={v => [`$${v.toLocaleString()}`, 'Saved']}
                    />
                    <Bar dataKey="saved" fill={S.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Monthly breakdown */}
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 16 }}>Monthly Breakdown</div>
              {monthlyRows.length === 0 ? (
                <div style={{ fontSize: 14, color: S.muted, padding: '24px 0', textAlign: 'center' }}>No completed jobs yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Month', 'Jobs', 'Saved'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: S.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${S.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '10px 12px', color: S.offwhite, borderBottom: `1px solid ${S.border}` }}>{row.label}</td>
                          <td style={{ padding: '10px 12px', color: S.offwhite, borderBottom: `1px solid ${S.border}` }}>{row.jobs}</td>
                          <td style={{ padding: '10px 12px', color: S.green, fontWeight: 700, borderBottom: `1px solid ${S.border}` }}>${row.saved.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div className="ent-account-cols" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Left: company info */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <Card style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>Company Info</div>
                  {!accountEditing ? (
                    <button
                      onClick={() => setAccountEditing(true)}
                      style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: C.body }}
                    >
                      Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveAccount}
                        disabled={accountSaving}
                        style={{ background: S.green, border: 'none', color: S.black, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 7, cursor: accountSaving ? 'not-allowed' : 'pointer', opacity: accountSaving ? 0.7 : 1, fontFamily: C.body }}
                      >
                        {accountSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setAccountEditing(false); setAccountForm({ company_name: member.company_name || '', contact_name: member.contact_name || '', email: member.email || '', phone: member.phone || '' }) }}
                        style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: C.body }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {accountError && (
                  <div style={{ background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger, marginBottom: 16 }}>{accountError}</div>
                )}
                {accountSaved && (
                  <div style={{ background: S.green + '18', border: `1px solid ${S.green}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.green, marginBottom: 16 }}>Changes saved.</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'contact_name', label: 'Contact Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>{label}</label>
                      {accountEditing ? (
                        <input
                          value={accountForm[key]}
                          onChange={e => setAccountForm(f => ({ ...f, [key]: e.target.value }))}
                          style={inp}
                        />
                      ) : (
                        <div style={{ fontSize: 14, color: S.offwhite, padding: '8px 0' }}>{member[key] || <span style={{ color: S.muted }}>—</span>}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right: billing + account manager + referral */}
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Billing */}
              <Card style={{ padding: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 8 }}>Billing</div>
                <p style={{ fontSize: 13, color: S.muted, marginBottom: 18, lineHeight: 1.6 }}>Manage your plan, update your payment method, or view invoices.</p>
                <button
                  onClick={handleBillingPortal}
                  disabled={billingLoading}
                  style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9, cursor: billingLoading ? 'not-allowed' : 'pointer', opacity: billingLoading ? 0.7 : 1, fontFamily: C.body }}
                >
                  {billingLoading ? 'Opening…' : 'Manage Billing →'}
                </button>
              </Card>

              {/* Account Manager */}
              <Card style={{ padding: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 14 }}>Account Manager</div>
                {member.account_manager_name ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{member.account_manager_name}</div>
                    {member.account_manager_email && (
                      <a href={`mailto:${member.account_manager_email}`} style={{ fontSize: 13, color: S.blue, textDecoration: 'none', fontWeight: 500 }}>{member.account_manager_email}</a>
                    )}
                    {member.account_manager_phone && (
                      <a href={`tel:${member.account_manager_phone}`} style={{ fontSize: 13, color: S.green, textDecoration: 'none', fontWeight: 600 }}>{member.account_manager_phone}</a>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.7 }}>
                    Your dedicated account manager will be assigned shortly.
                  </p>
                )}
              </Card>

              {/* Referral */}
              <Card style={{ padding: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 8 }}>Refer Other Property Managers</div>
                <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6, marginBottom: 16 }}>Share SUBS with other property managers and help them save across their portfolios.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={`https://getsubs.co/property-managers?ref=${member.id}`}
                    style={{ ...inp, flex: 1, fontSize: 12, color: S.muted, cursor: 'default' }}
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://getsubs.co/property-managers?ref=${member.id}`)
                      setRefLinkCopied(true)
                      setTimeout(() => setRefLinkCopied(false), 2500)
                    }}
                    style={{ background: refLinkCopied ? S.green + '22' : S.surface, border: `1px solid ${refLinkCopied ? S.green : S.border}`, color: refLinkCopied ? S.green : S.offwhite, fontSize: 13, fontWeight: 600, padding: '0 16px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: C.body }}
                  >
                    {refLinkCopied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Add Property Modal */}
      {showAddProperty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: '32px 28px', maxWidth: 520, width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite, marginBottom: 6 }}>Add Property</div>
            <p style={{ fontSize: 13, color: S.muted, marginBottom: 24 }}>Enter the property details to add it to your portfolio.</p>

            {propError && (
              <div style={{ background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger, marginBottom: 16 }}>{propError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Street Address *</label>
                <input value={propForm.address} onChange={e => setPropForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" style={inp} />
              </div>
              <div className="ent-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>City *</label>
                  <input value={propForm.city} onChange={e => setPropForm(f => ({ ...f, city: e.target.value }))} placeholder="Salt Lake City" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>State *</label>
                  <input value={propForm.state} onChange={e => setPropForm(f => ({ ...f, state: e.target.value }))} placeholder="UT" style={inp} />
                </div>
              </div>
              <div className="ent-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Zip *</label>
                  <input value={propForm.zip} onChange={e => setPropForm(f => ({ ...f, zip: e.target.value }))} placeholder="84101" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Unit Count</label>
                  <input type="number" min="1" value={propForm.unit_count} onChange={e => setPropForm(f => ({ ...f, unit_count: e.target.value }))} placeholder="1" style={inp} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Property Type</label>
                <select value={propForm.property_type} onChange={e => setPropForm(f => ({ ...f, property_type: e.target.value }))} style={inp}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Notes (optional)</label>
                <textarea value={propForm.notes} onChange={e => setPropForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant details about this property..." rows={3} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleAddProperty}
                disabled={propSaving}
                style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '12px 0', borderRadius: 9, cursor: propSaving ? 'not-allowed' : 'pointer', opacity: propSaving ? 0.7 : 1, fontFamily: C.body }}
              >
                {propSaving ? 'Saving…' : 'Save Property'}
              </button>
              <button
                onClick={() => { setShowAddProperty(false); setPropError(null) }}
                style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Job Request Modal */}
      {showJobForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: '32px 28px', maxWidth: 520, width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite, marginBottom: 6 }}>Submit Job Request</div>
            <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>We'll dispatch a vetted contractor to your property at your enterprise rate.</p>

            {/* Bulk toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: S.surface, borderRadius: 8, border: `1px solid ${S.border}` }}>
              <button
                onClick={() => { setBulkMode(!bulkMode); setBulkPropertyIds([]); setJobForm(f => ({ ...f, property_id: '' })) }}
                style={{ width: 38, height: 22, borderRadius: 11, background: bulkMode ? S.purple : S.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: 3, left: bulkMode ? 18 : 3, width: 16, height: 16, borderRadius: '50%', background: S.offwhite, transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: bulkMode ? S.purple : S.muted }}>Bulk Request — apply to multiple properties</span>
            </div>

            {jobError && (
              <div style={{ background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger, marginBottom: 16 }}>{jobError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Property selection */}
              {!bulkMode ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Property *</label>
                  {properties.length === 0 ? (
                    <div style={{ fontSize: 13, color: S.muted, padding: '10px 12px', background: S.surface, borderRadius: 8, border: `1px solid ${S.border}` }}>
                      No properties added yet. Add a property first.
                    </div>
                  ) : (
                    <select value={jobForm.property_id} onChange={e => setJobForm(f => ({ ...f, property_id: e.target.value }))} style={inp}>
                      <option value="">Select a property…</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 8, fontWeight: 500 }}>Select Properties *</label>
                  {properties.length === 0 ? (
                    <div style={{ fontSize: 13, color: S.muted }}>No properties added yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {properties.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: bulkPropertyIds.includes(p.id) ? S.purple + '18' : S.surface, border: `1px solid ${bulkPropertyIds.includes(p.id) ? S.purple + '88' : S.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s' }}>
                          <input
                            type="checkbox"
                            checked={bulkPropertyIds.includes(p.id)}
                            onChange={e => {
                              setBulkPropertyIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))
                            }}
                            style={{ accentColor: S.purple, width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 13, color: S.offwhite }}>{p.address}, {p.city}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Trade *</label>
                <select value={jobForm.trade} onChange={e => setJobForm(f => ({ ...f, trade: e.target.value }))} style={inp}>
                  <option value="">Select a trade…</option>
                  {ENTERPRISE_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Description *</label>
                <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the work needed in detail…" rows={4} style={{ ...inp, resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Preferred Date</label>
                <input type="date" value={jobForm.preferred_date} onChange={e => setJobForm(f => ({ ...f, preferred_date: e.target.value }))} style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleSubmitJob}
                disabled={jobSaving}
                style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '12px 0', borderRadius: 9, cursor: jobSaving ? 'not-allowed' : 'pointer', opacity: jobSaving ? 0.7 : 1, fontFamily: C.body }}
              >
                {jobSaving ? 'Submitting…' : bulkMode && bulkPropertyIds.length > 1 ? `Submit ${bulkPropertyIds.length} Requests` : 'Submit Request'}
              </button>
              <button
                onClick={() => { setShowJobForm(false); setJobError(null) }}
                style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, fontWeight: 600, padding: '12px 20px', borderRadius: 9, cursor: 'pointer', fontFamily: C.body }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Nav({ displayEmail, signOut, navigate }) {
  return (
    <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <span style={{ fontSize: 11, fontWeight: 700, color: S.purple, background: S.purple + '22', padding: '3px 10px', borderRadius: 100, letterSpacing: '0.04em' }}>Enterprise</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: S.muted, fontFamily: C.body }}>{displayEmail}</span>
        <button
          onClick={() => signOut().then(() => navigate('/login'))}
          style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: C.body }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
