import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const TIER_COLORS = { Member: S.green, 'Member+': S.blue, Elite: S.purple }
const STATUS_COLORS = { Active: S.green, Churned: S.danger, Trial: S.amber }
const TIER_PRICE = { Member: 99, 'Member+': 199, Elite: 399 }

function timeAgo(ts) {
  if (!ts) return '—'
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}
const EVENT_COLORS = { accept: S.green, dispatch: S.blue, complete: S.green, member: S.purple, request: S.amber, apply: S.blue, decline: S.danger }
const EVENT_ICONS = { accept: '✓', dispatch: '→', complete: '✓', member: '👤', request: '📋', apply: '📝', decline: '✗' }

function Card({ children, style }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }}>{children}</div>
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [tab, setTab] = useState('stats')
  const [contractors, setContractors] = useState([])
  const [members, setMembers] = useState([])
  const [activity, setActivity] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [actionError, setActionError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [expandedContractor, setExpandedContractor] = useState(null)
  const [adminDocUploading, setAdminDocUploading] = useState(null)
  const [adminDocError, setAdminDocError] = useState(null)
  const [waitlistEntries, setWaitlistEntries] = useState([])
  const [launchingMarket, setLaunchingMarket] = useState(null)
  const [launchResult, setLaunchResult] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [stripeRevenue, setStripeRevenue] = useState(null)

  const loadData = async () => {
    setRefreshing(true)
    await Promise.all([
      supabase.from('contractors').select('*').order('submitted_at', { ascending: false })
        .then(({ data }) => setContractors(data || [])),

      supabase.functions.invoke('admin-list-members')
        .then(({ data }) => setMembers(data?.members || [])),

      supabase.functions.invoke('get-stripe-revenue')
        .then(({ data }) => { if (data?.arr !== undefined) setStripeRevenue(data) }),

      supabase.from('waitlist').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setWaitlistEntries(data || [])),

      Promise.all([
        supabase.from('lead_notifications')
          .select('id, status, notified_at, responded_at, job_requests(trade, zip, member_name), contractors(name)')
          .order('notified_at', { ascending: false })
          .limit(30),
        supabase.from('job_requests')
          .select('id, trade, zip, member_name, status, submitted_at')
          .order('submitted_at', { ascending: false })
          .limit(20),
      ]).then(([{ data: notifs }, { data: reqs }]) => {
        const events = []
        for (const n of notifs || []) {
          const lead = n.job_requests
          const contractor = n.contractors
          if (n.status === 'accepted' && n.responded_at) {
            events.push({ time: n.responded_at, type: 'accept', event: 'Lead accepted', detail: `${contractor?.name || 'Contractor'} accepted ${lead?.trade || 'job'} · Zip ${lead?.zip || '—'} · ${lead?.member_name || 'Member'}` })
          } else if (n.status === 'declined' && n.responded_at) {
            events.push({ time: n.responded_at, type: 'decline', event: 'Lead declined', detail: `${contractor?.name || 'Contractor'} declined ${lead?.trade || 'job'} · Zip ${lead?.zip || '—'}` })
          } else if (n.status === 'pending') {
            events.push({ time: n.notified_at, type: 'dispatch', event: 'Lead dispatched', detail: `${lead?.trade || 'Job'} sent to ${contractor?.name || 'contractor'} · Zip ${lead?.zip || '—'}` })
          }
        }
        for (const r of reqs || []) {
          events.push({ time: r.submitted_at, type: 'request', event: 'Job requested', detail: `${r.member_name || 'Member'} requested ${r.trade || '—'} · Zip ${r.zip || '—'}` })
        }
        events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        setActivity(events.slice(0, 30))
      }),
    ])
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const handleContractor = async (id, action) => {
    setActionError(null)
    setActionLoading(id)
    try {
      const fnName = action === 'approved' ? 'approve-contractor' : 'reject-contractor'
      const { data, error } = await supabase.functions.invoke(fnName, { body: { contractor_id: id } })
      if (error) {
        let detail = error.message
        try {
          // error.context is the raw Response object in supabase-js v2
          const body = error.context?.json ? await error.context.json() : error.context
          const base = body?.error || body?.message || error.message
          const extra = body?.details ? ': ' + JSON.stringify(body.details) : ''
          detail = base + extra
        } catch {}
        setActionError(`${fnName} failed: ${detail}`)
        return
      }
      if (data?.error) { setActionError(`${fnName}: ${data.error}${data.details ? ' — ' + JSON.stringify(data.details) : ''}`); return }
      setContractors(cs => cs.map(c => c.id === id ? { ...c, status: action } : c))
    } catch (e) {
      setActionError(`Unexpected error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteContractor = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name} from Supabase and Clerk? This cannot be undone.`)) return
    setActionError(null)
    setActionLoading(id)
    try {
      const { data, error } = await supabase.functions.invoke('delete-contractor', { body: { contractor_id: id } })
      if (error) {
        let detail = error.message
        try {
          const body = error.context?.json ? await error.context.json() : error.context
          detail = body?.error || body?.message || error.message
        } catch {}
        setActionError(`Delete failed: ${detail}`)
        return
      }
      if (data?.error) { setActionError(`Delete failed: ${data.error}`); return }
      setContractors(cs => cs.filter(c => c.id !== id))
    } catch (e) {
      setActionError(`Unexpected error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendInvitation = async (id) => {
    setActionError(null)
    setActionLoading(id)
    try {
      const { data, error } = await supabase.functions.invoke('resend-contractor-invitation', { body: { contractor_id: id } })
      if (error) {
        let detail = error.message
        try {
          const body = error.context?.json ? await error.context.json() : error.context
          detail = body?.error || body?.message || error.message
        } catch {}
        setActionError(`Resend failed: ${detail}`)
        return
      }
      if (data?.error) { setActionError(`Resend failed: ${data.error}`); return }
      // Brief success flash via actionLoading null
    } catch (e) {
      setActionError(`Unexpected error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id)
    try {
      const { error } = await supabase.from('contractors').update({ status: newStatus }).eq('id', id)
      if (error) { setActionError(`Update failed: ${error.message}`); return }
      setContractors(cs => cs.map(c => c.id === id ? { ...c, status: newStatus } : c))
    } catch (e) {
      setActionError(`Unexpected error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLaunchMarket = async (state) => {
    setLaunchingMarket(state)
    try {
      const { data, error } = await supabase.functions.invoke('launch-market', { body: { state } })
      if (error || data?.error) {
        setLaunchResult(r => ({ ...r, [state]: { error: error?.message || data?.error } }))
        return
      }
      setLaunchResult(r => ({ ...r, [state]: { sent: data.sent, total: data.total } }))
      setWaitlistEntries(es => es.map(e => e.state === state && !e.notified_at ? { ...e, notified_at: new Date().toISOString() } : e))
    } catch (e) {
      setLaunchResult(r => ({ ...r, [state]: { error: e.message } }))
    } finally {
      setLaunchingMarket(null)
    }
  }

  const handleImpersonate = (name, email, role, contractorData) => {
    localStorage.setItem('subs_impersonating', JSON.stringify({ name, email, role, contractorData: contractorData || null }))
    navigate(role === 'member' ? '/dashboard' : '/contractor/dashboard')
  }

  const handleAdminDocUpload = async (contractorId, docType, col, file) => {
    if (!file) return
    setAdminDocUploading(`${contractorId}-${docType}`)
    setAdminDocError(null)
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
      setContractors(cs => cs.map(c => c.id === contractorId ? { ...c, [col]: publicUrl } : c))
    } catch (e) {
      setAdminDocError(`Upload failed: ${e.message}`)
    } finally {
      setAdminDocUploading(null)
    }
  }

  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  )

  const activeMembers = members.filter(m => m.status === 'Active').length
  // Use Stripe-sourced ARR/MRR (full plan prices, coupons excluded) when available
  const arr = stripeRevenue?.arr ?? null
  const mrr = stripeRevenue?.mrr ?? null
  const churnCount = members.filter(m => m.status === 'Churned').length
  const churnRate = members.length ? ((churnCount / members.length) * 100).toFixed(1) : '0.0'

  const tabs = [['stats', '📊 Revenue Stats'], ['members', '👥 Members'], ['approvals', '🛠 Approvals'], ['contractors', '🔧 Contractors'], ['activity', '⚡ Activity'], ['waitlist', '📍 Waitlist']]

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '3px 10px', borderRadius: 100 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress || 'admin@subs.co'}</span>
          <button onClick={loadData} disabled={refreshing} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: refreshing ? S.muted : S.green, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={() => signOut().then(() => navigate('/admin/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>SUBS Admin</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>Operations dashboard · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 10, padding: 4, border: `1px solid ${S.border}`, marginBottom: 28 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: tab === id ? S.card : 'transparent', border: tab === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, color: tab === id ? S.offwhite : S.muted, cursor: 'pointer', position: 'relative' }}>
              {label}
              {id === 'approvals' && contractors.filter(c => c.status === 'pending').length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 8, background: S.amber, color: S.black, borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {contractors.filter(c => c.status === 'pending').length}
                </span>
              )}
              {id === 'waitlist' && waitlistEntries.filter(e => !e.notified_at).length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 8, background: S.blue, color: S.black, borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {waitlistEntries.filter(e => !e.notified_at).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === 'stats' && (
          <div>
            <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                ['MRR', mrr !== null ? `$${Math.round(mrr).toLocaleString()}` : '—', S.green, `Monthly recurring revenue · ${stripeRevenue?.subscription_count ?? '…'} active subs`],
                ['ARR', arr !== null ? `$${Math.round(arr).toLocaleString()}` : '—', S.blue, 'Full plan prices · coupons excluded'],
                ['Active', activeMembers, S.green, 'Active members'],
                ['Churn', `${churnRate}%`, churnRate > 5 ? S.danger : S.amber, 'Churn rate'],
              ].map(([label, val, color, sub]) => (
                <Card key={label} style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
                  <div style={{ fontFamily: C.display, fontSize: 36, color, marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{sub}</div>
                </Card>
              ))}
            </div>

            <div className="billing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 16 }}>Members by Tier</div>
                {[
                  { tier: 'Member', price: 99, color: S.green },
                  { tier: 'Member+', price: 199, color: S.blue },
                  { tier: 'Elite', price: 399, color: S.purple },
                ].map(({ tier, price, color }) => {
                  const count = members.filter(m => m.tier === tier && m.status === 'Active').length
                  const pct = activeMembers ? (count / activeMembers) * 100 : 0
                  return (
                    <div key={tier} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: S.offwhite }}>{tier}</span>
                        <span style={{ color: S.muted }}>{count} members · ${(count * price / 12).toFixed(0)}/mo</span>
                      </div>
                      <div style={{ height: 6, background: S.surface, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </Card>

              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 16 }}>Revenue (Last 4 months)</div>
                {[['Mar', 1240], ['Apr', 1640], ['May', 1980], ['Jun', 2280]].map(([month, val]) => (
                  <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: S.muted, width: 28 }}>{month}</span>
                    <div style={{ flex: 1, height: 24, background: S.surface, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(val / 2280) * 100}%`, background: `linear-gradient(90deg, ${S.green}, ${S.blue})`, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: S.black }}>${val}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 16 }}>Network Overview</div>
              <div className="stat-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                {[
                  [String(members.length), 'Total members'],
                  [String(contractors.filter(c => c.status === 'active').length), 'Active contractors'],
                  [String(contractors.filter(c => c.status === 'pending').length), 'Pending approvals'],
                  [String(activity.filter(a => a.type === 'request').length), 'Lead requests'],
                  [String(contractors.filter(c => c.status === 'approved').length), 'Awaiting payment'],
                ].map(([val, label]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: C.display, fontSize: 28, color: S.offwhite }}>{val}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members by name or email..." style={{ width: '100%', maxWidth: 400, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 14px', color: S.offwhite, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div className="rate-table-wrap">
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 100px 100px 80px 110px', padding: '10px 20px', borderBottom: `1px solid ${S.border}` }}>
                {['ID', 'Name', 'Email', 'Tier', 'Joined', 'Status', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {filteredMembers.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: S.muted, fontSize: 14 }}>
                  {members.length === 0 ? 'No members yet.' : 'No members match your search.'}
                </div>
              )}
              {filteredMembers.map((m, i) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 100px 100px 80px 110px', padding: '14px 20px', borderBottom: i < filteredMembers.length - 1 ? `1px solid ${S.border}` : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: S.muted }}>{m.id.slice(0, 8)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{m.name || '—'}</span>
                  <span style={{ fontSize: 13, color: S.muted }}>{m.email || '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TIER_COLORS[m.tier] || S.green }}>{m.tier || 'Member'}</span>
                  <span style={{ fontSize: 12, color: S.muted }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: (STATUS_COLORS[m.status] || S.muted) + '22', color: STATUS_COLORS[m.status] || S.muted }}>
                    {m.status || '—'}
                  </span>
                  <button onClick={() => handleImpersonate(m.name, m.email, 'member')} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                    Impersonate
                  </button>
                </div>
              ))}
            </div>
            </div>{/* end rate-table-wrap */}
          </div>
        )}

        {/* Contractor Approvals */}
        {tab === 'approvals' && (
          <div>
            {actionError && (
              <div style={{ background: S.danger + '22', border: `1px solid ${S.danger}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: S.danger, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            {contractors.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.amber, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>⏳ Awaiting Review</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {contractors.filter(c => c.status === 'pending').map(c => (
                    <Card key={c.id} style={{ padding: 20, border: `1px solid ${S.amber}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: S.muted }}>{c.id.slice(0, 8)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: S.blue, background: S.blue + '22', padding: '2px 8px', borderRadius: 100 }}>{c.trade}</span>
                            {!c.licensed && <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '2px 8px', borderRadius: 100 }}>⚠ Unlicensed</span>}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: S.offwhite }}>{c.name}</div>
                          <div style={{ fontSize: 13, color: S.muted }}>{c.contact_name} · {c.contact_email}</div>
                          <div style={{ fontSize: 13, color: S.muted, marginTop: 2 }}>{c.years_experience ? `${c.years_experience} years in business · ` : ''}Licensed: {c.licensed ? '✓ Yes' : '✗ No'}</div>
                          <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>Applied {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => handleContractor(c.id, 'approved')} disabled={actionLoading === c.id} style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.6 : 1 }}>
                            {actionLoading === c.id ? '…' : '✓ Approve'}
                          </button>
                          <button onClick={() => handleContractor(c.id, 'rejected')} disabled={actionLoading === c.id} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.danger, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.6 : 1 }}>
                            Reject
                          </button>
                          <button onClick={() => handleDeleteContractor(c.id, c.name)} disabled={actionLoading === c.id} style={{ background: 'transparent', border: `1px solid ${S.danger}44`, color: S.danger, fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 8, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.6 : 1 }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Reviewed</div>
              {contractors.filter(c => c.status !== 'pending').map(c => (
                <Card key={c.id} style={{ padding: '14px 20px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: S.muted, marginRight: 12 }}>{c.id.slice(0, 8)}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: S.muted, marginLeft: 12 }}>{c.trade} · {c.contact_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.status === 'approved' && (
                      <button
                        onClick={() => handleResendInvitation(c.id)}
                        disabled={actionLoading === c.id}
                        style={{ background: 'transparent', border: `1px solid ${S.blue}66`, color: S.blue, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                      >
                        {actionLoading === c.id ? '…' : 'Resend Invite'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteContractor(c.id, c.name)}
                      disabled={actionLoading === c.id}
                      style={{ background: 'transparent', border: `1px solid ${S.danger}44`, color: S.danger, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                    >
                      {actionLoading === c.id ? '…' : 'Delete'}
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100,
                      background: c.status === 'active' ? S.green + '22' : c.status === 'approved' ? S.blue + '22' : S.danger + '22',
                      color: c.status === 'active' ? S.green : c.status === 'approved' ? S.blue : S.danger }}>
                      {c.status === 'active' ? '✓ Active' : c.status === 'approved' ? '⏳ Approved' : '✗ Rejected'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contractors */}
        {tab === 'contractors' && (
          <div>
            {actionError && (
              <div style={{ background: S.danger + '22', border: `1px solid ${S.danger}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: S.danger, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            {['active', 'approved', 'rejected'].map(statusGroup => {
              const group = contractors.filter(c => c.status === statusGroup)
              if (!group.length) return null
              const groupLabel = statusGroup === 'active' ? '✓ Active Partners' : statusGroup === 'approved' ? '⏳ Approved — Awaiting Payment' : '✗ Removed'
              const groupColor = statusGroup === 'active' ? S.green : statusGroup === 'approved' ? S.amber : S.muted
              return (
                <div key={statusGroup} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: groupColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    {groupLabel}
                  </div>
                  <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 120px 80px 120px', padding: '10px 20px', borderBottom: `1px solid ${S.border}` }}>
                      {['Company', 'Trade', 'Contact', 'Since', 'Docs', ''].map(h => (
                        <div key={h} style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                      ))}
                    </div>
                    {group.map((c, i) => {
                      const isExpanded = expandedContractor === c.id
                      return (
                        <div key={c.id}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 120px 80px 120px', padding: '14px 20px', borderBottom: `1px solid ${S.border}`, alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{c.name || '—'}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: S.blue, background: S.blue + '22', padding: '2px 8px', borderRadius: 100, display: 'inline-block' }}>{c.trade}</span>
                            <div>
                              <div style={{ fontSize: 13, color: S.offwhite }}>{c.contact_name || '—'}</div>
                              <div style={{ fontSize: 12, color: S.muted }}>{c.contact_email || '—'}</div>
                            </div>
                            <span style={{ fontSize: 12, color: S.muted }}>{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</span>
                            <button
                              onClick={() => setExpandedContractor(isExpanded ? null : c.id)}
                              style={{ background: 'transparent', border: `1px solid ${S.border}`, color: isExpanded ? S.green : S.muted, fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 7, cursor: 'pointer' }}
                            >
                              {isExpanded ? 'Close ▲' : 'Docs ▼'}
                            </button>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button onClick={() => handleImpersonate(c.name, c.contact_email, 'contractor', c)} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                                Impersonate
                              </button>
                              {statusGroup === 'approved' && (
                                <button
                                  onClick={() => handleResendInvitation(c.id)}
                                  disabled={actionLoading === c.id}
                                  style={{ background: 'transparent', border: `1px solid ${S.blue}66`, color: S.blue, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                                >
                                  {actionLoading === c.id ? '…' : 'Resend Invite'}
                                </button>
                              )}
                              {statusGroup !== 'rejected' ? (
                                <button
                                  onClick={() => handleStatusUpdate(c.id, 'rejected')}
                                  disabled={actionLoading === c.id}
                                  style={{ background: 'transparent', border: `1px solid ${S.danger}66`, color: S.danger, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                                >
                                  {actionLoading === c.id ? '…' : 'Remove'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(c.id, 'approved')}
                                  disabled={actionLoading === c.id}
                                  style={{ background: 'transparent', border: `1px solid ${S.green}66`, color: S.green, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                                >
                                  {actionLoading === c.id ? '…' : 'Reinstate'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteContractor(c.id, c.name)}
                                disabled={actionLoading === c.id}
                                style={{ background: 'transparent', border: `1px solid ${S.danger}44`, color: S.danger, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                              >
                                {actionLoading === c.id ? '…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: '16px 20px', background: S.black + '80', borderBottom: `1px solid ${S.border}` }}>
                              {adminDocError && <div style={{ fontSize: 12, color: S.danger, marginBottom: 10 }}>{adminDocError}</div>}
                              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Documents</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                  { docType: 'insurance', col: 'insurance_doc_url', label: 'Proof of Insurance' },
                                  { docType: 'license', col: 'license_doc_url', label: 'Business License' },
                                ].map(({ docType, col, label }) => {
                                  const url = c[col]
                                  const loadKey = `${c.id}-${docType}`
                                  const loading = adminDocUploading === loadKey
                                  return (
                                    <div key={docType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8 }}>
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
                                          id={`admin-doc-${c.id}-${docType}`}
                                          accept=".pdf,.jpg,.jpeg,.png"
                                          style={{ display: 'none' }}
                                          onChange={e => { if (e.target.files[0]) handleAdminDocUpload(c.id, docType, col, e.target.files[0]) }}
                                        />
                                        <label htmlFor={`admin-doc-${c.id}-${docType}`} style={{ fontSize: 12, fontWeight: 600, color: loading ? S.muted : S.offwhite, padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 7, cursor: loading ? 'not-allowed' : 'pointer', background: S.card, pointerEvents: loading ? 'none' : 'auto' }}>
                                          {loading ? 'Uploading…' : url ? 'Replace' : 'Upload'}
                                        </label>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {contractors.filter(c => c.status !== 'pending').length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: S.muted, fontSize: 14 }}>No approved contractors yet.</div>
            )}
          </div>
        )}

        {/* Waitlist */}
        {tab === 'waitlist' && (() => {
          const STATE_NAMES = {
            AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
            CT:'Connecticut',DE:'Delaware',DC:'DC',FL:'Florida',GA:'Georgia',HI:'Hawaii',
            ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
            LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',
            MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',
            NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
            NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
            PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
            TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
            WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
          }
          const grouped = waitlistEntries.reduce((acc, e) => {
            const key = e.state || 'Unknown'
            if (!acc[key]) acc[key] = []
            acc[key].push(e)
            return acc
          }, {})
          const sortedStates = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length)

          return (
            <div>
              {waitlistEntries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: S.muted, fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
                  No waitlist entries yet. Members from unserved zip codes will appear here.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedStates.map(state => {
                  const entries = grouped[state]
                  const unnotified = entries.filter(e => !e.notified_at)
                  const result = launchResult[state]
                  const isLaunching = launchingMarket === state
                  return (
                    <Card key={state} style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${S.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite }}>{STATE_NAMES[state] || state}</div>
                            <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>
                              {entries.length} total · <span style={{ color: unnotified.length > 0 ? S.amber : S.green }}>{unnotified.length} awaiting launch</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {result && (
                            <span style={{ fontSize: 12, color: result.error ? S.danger : S.green }}>
                              {result.error ? `Error: ${result.error}` : `✓ ${result.sent}/${result.total} emailed`}
                            </span>
                          )}
                          {unnotified.length > 0 && (
                            <button
                              onClick={() => handleLaunchMarket(state)}
                              disabled={isLaunching}
                              style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, cursor: isLaunching ? 'not-allowed' : 'pointer', opacity: isLaunching ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              {isLaunching ? '…' : `🚀 Launch ${STATE_NAMES[state] || state}`}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        {entries.map((e, i) => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: i < entries.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: S.offwhite }}>{e.name || '—'}</span>
                              <span style={{ fontSize: 13, color: S.muted, marginLeft: 12 }}>{e.email}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 12, color: S.muted }}>zip {e.zip}</span>
                              {e.notified_at ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.green + '22', padding: '3px 8px', borderRadius: 100 }}>
                                  Notified {new Date(e.notified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, color: S.amber, background: S.amber + '22', padding: '3px 8px', borderRadius: 100 }}>
                                  Waiting
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Lead Activity */}
        {tab === 'activity' && (() => {
          const EVENT_COLORS = { accept: S.green, dispatch: S.blue, complete: S.green, member: S.purple, request: S.amber, apply: S.blue, decline: S.danger }
          const EVENT_ICONS = { accept: '✓', dispatch: '→', complete: '✓', member: '👤', request: '📋', apply: '📝', decline: '✗' }
          return (
            <div>
              {activity.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: S.muted, fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                  No activity yet. Activity will appear here as members request jobs and contractors respond.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activity.map((event, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 16px', background: S.card, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: (EVENT_COLORS[event.type] || S.muted) + '22', border: `1px solid ${(EVENT_COLORS[event.type] || S.muted)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: EVENT_COLORS[event.type] || S.muted, flexShrink: 0, marginTop: 1 }}>
                      {EVENT_ICONS[event.type] || '·'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: S.offwhite }}>{event.event}</span>
                        <span style={{ fontSize: 11, color: S.muted, flexShrink: 0 }}>{timeAgo(event.time)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: S.muted, marginTop: 2, lineHeight: 1.4 }}>{event.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
