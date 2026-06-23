import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import RevenueChart from '../components/RevenueChart'
import CreateAccountModal from '../components/CreateAccountModal'

const TIER_COLORS = { Member: S.green, 'Member+': S.blue, Elite: S.purple }
const STATUS_COLORS = { Active: S.green, Churned: S.danger, Trial: S.amber }

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
  const userRole = user?.publicMetadata?.role
  const isAdmin = userRole === 'admin'
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

  const [stripeRevenue, setStripeRevenue] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [sendingCard, setSendingCard] = useState(null)
  const [cardSent, setCardSent] = useState({})
  const [enterpriseMembers, setEnterpriseMembers] = useState([])
  const [enterpriseLeads, setEnterpriseLeads] = useState([])
  const [enterpriseLeadFilter, setEnterpriseLeadFilter] = useState('all')
  const [assigningManager, setAssigningManager] = useState(null)
  const [managerForm, setManagerForm] = useState({ name: '', email: '', phone: '' })
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [staffMembers, setStaffMembers] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffForm, setStaffForm] = useState({ full_name: '', email: '', role: 'staff' })
  const [staffFormError, setStaffFormError] = useState(null)
  const [staffFormLoading, setStaffFormLoading] = useState(false)
  const [changingStaffRole, setChangingStaffRole] = useState(null)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)
  const [dismissedPriceIds, setDismissedPriceIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('subs_dismissed_price_ids') || '[]') } catch { return [] }
  })

  const loadData = async () => {
    await Promise.all([
      supabase.from('contractors').select('*').order('submitted_at', { ascending: false })
        .then(({ data }) => setContractors(data || [])),

      supabase.functions.invoke('admin-list-members')
        .then(({ data }) => setMembers(data?.members || [])),

      supabase.functions.invoke('get-stripe-revenue')
        .then(({ data }) => { if (data?.arr !== undefined) setStripeRevenue(data) }),

      supabase.from('waitlist').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setWaitlistEntries(data || [])),

      supabase.from('enterprise_members').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setEnterpriseMembers(data || [])),

      supabase.from('enterprise_leads').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setEnterpriseLeads(data || [])),

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
  }

  useEffect(() => { loadData() }, [])

  const handleContractor = async (id, action) => {
    setActionError(null)
    setActionLoading(id)
    try {
      if (action === 'approved') {
        const res = await fetch('/api/admin/approve-contractor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractor_id: id }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setActionError(`approve-contractor failed: ${data.error || res.statusText}`)
          return
        }
        if (data.warning) console.warn('approve-contractor warning:', data.warning)
      } else {
        const { data, error } = await supabase.functions.invoke('reject-contractor', { body: { contractor_id: id } })
        if (error) {
          let detail = error.message
          try {
            const body = error.context?.json ? await error.context.json() : error.context
            const base = body?.error || body?.message || error.message
            const extra = body?.details ? ': ' + JSON.stringify(body.details) : ''
            detail = base + extra
          } catch {}
          setActionError(`reject-contractor failed: ${detail}`)
          return
        }
        if (data?.error) { setActionError(`reject-contractor: ${data.error}`); return }
      }
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
      const { data, error } = await supabase.functions.invoke('admin-set-contractor-status', {
        body: { contractor_id: id, status: newStatus },
      })
      if (error || data?.error) { setActionError(`Update failed: ${error?.message || data?.error}`); return }
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

  const handleSendCard = async (m) => {
    setSendingCard(m.id)
    try {
      // Fetch Google Wallet URL first so the email includes both wallet buttons
      let googleWalletUrl = null
      try {
        const gRes = await fetch('/api/wallet/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_user_id: m.clerk_user_id, name: m.name, email: m.email, tier: m.tier || 'Member' }),
        })
        if (gRes.ok) {
          const gData = await gRes.json()
          googleWalletUrl = gData.google_wallet_url || null
        }
      } catch {}

      const res = await fetch('/api/wallet/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: m.clerk_user_id, name: m.name, email: m.email, tier: m.tier || 'Member', mode: 'email', google_wallet_url: googleWalletUrl }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = null }
      setSendingCard(null)
      if (!res.ok || data?.error) {
        const detail = [data?.error, data?.detail, data?.cause].filter(Boolean).join('\n')
        alert(`Failed to send card:\n\n${detail || text.slice(0, 500)}`)
      } else {
        setCardSent(prev => ({ ...prev, [m.id]: true }))
      }
    } catch (e) {
      setSendingCard(null)
      alert(`Failed to send card: ${e.message}`)
    }
  }

  const handleBackfill = async () => {
    setBackfillLoading(true)
    setBackfillResult(null)
    try {
      const res = await fetch('/api/admin/backfill-subscriptions', { method: 'POST' })
      const data = await res.json()
      setBackfillResult(data)
      if (data.backfilled > 0) {
        // Reload Stripe revenue to reflect updated tiers
        supabase.functions.invoke('get-stripe-revenue').then(({ data: d }) => { if (d?.arr !== undefined) setStripeRevenue(d) })
      }
    } catch (e) {
      setBackfillResult({ error: e.message })
    } finally {
      setBackfillLoading(false)
    }
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

  useEffect(() => {
    if (tab !== 'kpis' || kpiData || kpiLoading) return
    setKpiLoading(true)
    supabase.functions.invoke('get-kpi-data')
      .then(({ data }) => { if (data && !data.error) setKpiData(data) })
      .finally(() => setKpiLoading(false))
  }, [tab])

  useEffect(() => {
    if (tab !== 'staff' || !isAdmin) return
    setStaffLoading(true)
    fetch('/api/admin/staff')
      .then(r => r.json())
      .then(d => setStaffMembers(d.staff || []))
      .catch(() => {})
      .finally(() => setStaffLoading(false))
  }, [tab, isAdmin])

  const tabs = [['stats', '📊 Revenue'], ['members', '👥 Members'], ['approvals', '🛠 Approvals'], ['contractors', '🔧 Contractors'], ['activity', '⚡ Activity'], ['waitlist', '📍 Waitlist'], ['kpis', '📈 KPIs'], ['enterprise', '🏢 Enterprise'], ...(isAdmin ? [['staff', '👤 Staff']] : [])]

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <style>{`
        .admin-nav-actions { display: flex; align-items: center; gap: 10px; }
        .admin-hamburger { display: none; }
        .admin-mobile-menu { display: none; }
        .rate-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 640px) {
          .admin-nav-actions { display: none; }
          .admin-hamburger { display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid ${S.border}; color: ${S.muted}; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 18px; }
          .admin-mobile-menu { display: block; position: absolute; top: 58px; right: 0; left: 0; background: ${S.card}; border-bottom: 1px solid ${S.border}; z-index: 49; padding: 12px 16px; }
        }
      `}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '3px 10px', borderRadius: 100 }}>Admin</span>
        </div>
        {/* Desktop nav actions */}
        <div className="admin-nav-actions">
          <button onClick={() => setShowCreateAccount(true)} style={{ background: S.green, border: 'none', color: S.black, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', letterSpacing: '0.02em' }}>+ Create Account</button>
          <span style={{ fontSize: 12, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress || 'admin@subs.co'}</span>
          <button onClick={() => signOut().then(() => navigate('/admin/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </div>
        {/* Mobile hamburger */}
        <button className="admin-hamburger" onClick={() => setNavOpen(o => !o)}>
          {navOpen ? '✕' : '☰'}
        </button>
      </nav>
      {/* Mobile dropdown menu */}
      {navOpen && (
        <div className="admin-mobile-menu">
          <div style={{ fontSize: 12, color: S.muted, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
            {user?.primaryEmailAddress?.emailAddress || 'admin@subs.co'}
          </div>
          <button
            onClick={() => { setShowCreateAccount(true); setNavOpen(false) }}
            style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '11px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}
          >
            + Create Account
          </button>
          {isAdmin && (
            <button
              onClick={() => { setTab('staff'); setNavOpen(false) }}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}
            >
              👤 Staff Management
            </button>
          )}
          <button
            onClick={() => signOut().then(() => navigate('/admin/login'))}
            style={{ width: '100%', background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
          >
            Sign out
          </button>
        </div>
      )}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onCreated={() => { loadData(); setShowCreateAccount(false) }} />}

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
              {id === 'waitlist' && tab !== 'waitlist' && waitlistEntries.filter(e => !e.notified_at).length > 0 && (
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
            {isAdmin && (
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
            )}

            <div className="billing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 16 }}>Members by Tier</div>
                {[
                  { tier: 'Member', color: S.green },
                  { tier: 'Member+', color: S.blue },
                  { tier: 'Elite', color: S.purple },
                ].map(({ tier, color }) => {
                  const count = members.filter(m => m.tier === tier && m.status === 'Active').length
                  const pct = activeMembers ? (count / activeMembers) * 100 : 0
                  const tierMrr = stripeRevenue?.mrr_by_tier?.[tier]
                  return (
                    <div key={tier} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: S.offwhite }}>{tier}</span>
                        <span style={{ color: S.muted }}>
                          {count} members{tierMrr !== undefined ? ` · $${Math.round(tierMrr).toLocaleString()}/mo` : ''}
                        </span>
                      </div>
                      <div style={{ height: 6, background: S.surface, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </Card>

              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 16 }}>Revenue by Plan</div>
                {[
                  { tier: 'Member', color: S.green },
                  { tier: 'Member+', color: S.blue },
                  { tier: 'Elite', color: S.purple },
                  { tier: 'Contractor', color: S.amber },
                ].map(({ tier, color }) => {
                  const mrr = stripeRevenue?.mrr_by_tier?.[tier] ?? 0
                  return (
                    <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: S.surface, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: S.offwhite }}>{tier}</span>
                      </div>
                      <span style={{ fontSize: 13, color: mrr > 0 ? color : S.muted, fontWeight: 600 }}>
                        ${Math.round(mrr).toLocaleString()}/mo
                      </span>
                    </div>
                  )
                })}
              </Card>
            </div>

            {isAdmin && (() => {
              const unknownIds = stripeRevenue?.unknown_price_ids ?? {}
              const newUnknownIds = Object.fromEntries(Object.entries(unknownIds).filter(([id]) => !dismissedPriceIds.includes(id)))
              const hasNew = Object.keys(newUnknownIds).length > 0
              if (!hasNew && !backfillResult) return null
              return (
                <Card style={{ padding: 20, marginBottom: 20, borderColor: S.amber }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      {hasNew && (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, color: S.amber, marginBottom: 6 }}>Revenue data warning</div>
                          <div style={{ fontSize: 12, color: S.muted, marginBottom: 8 }}>
                            {Object.keys(newUnknownIds).length} Stripe price ID{Object.keys(newUnknownIds).length > 1 ? 's' : ''} not in the tier mapping — bucketed as Contractor. Run backfill to fix MRR by tier.
                          </div>
                          <div style={{ fontSize: 11, color: S.muted, fontFamily: 'monospace' }}>
                            {Object.entries(newUnknownIds).map(([id, info]) => `${id} · $${(info.unit_amount / 100).toFixed(2)} · ${info.count} sub${info.count > 1 ? 's' : ''}`).join('  •  ')}
                          </div>
                        </>
                      )}
                      {backfillResult && (
                        <div style={{ fontSize: 12, color: backfillResult.error ? S.danger : S.green, marginTop: hasNew ? 10 : 0 }}>
                          {backfillResult.error
                            ? `Backfill error: ${backfillResult.error}`
                            : `Backfill complete: ${backfillResult.backfilled} fixed, ${backfillResult.not_found} no active sub found, ${backfillResult.errors} errors`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={handleBackfill}
                        disabled={backfillLoading}
                        style={{ background: S.amber, color: '#0C0F0A', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: backfillLoading ? 'not-allowed' : 'pointer', opacity: backfillLoading ? 0.6 : 1 }}
                      >
                        {backfillLoading ? 'Running…' : 'Backfill subscriptions'}
                      </button>
                      {hasNew && (
                        <button
                          onClick={() => {
                            const updated = [...dismissedPriceIds, ...Object.keys(newUnknownIds)]
                            setDismissedPriceIds(updated)
                            localStorage.setItem('subs_dismissed_price_ids', JSON.stringify(updated))
                            setBackfillResult(null)
                          }}
                          style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })()}
            {isAdmin && <RevenueChart supabase={supabase} />}


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
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {filteredMembers.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: S.muted, fontSize: 14 }}>
                  {members.length === 0 ? 'No members yet.' : 'No members match your search.'}
                </div>
              )}
              {filteredMembers.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < filteredMembers.length - 1 ? `1px solid ${S.border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{m.name || '—'}</div>
                    <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{m.email || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TIER_COLORS[m.tier] || S.green }}>{m.tier || 'Member'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: (STATUS_COLORS[m.status] || S.muted) + '22', color: STATUS_COLORS[m.status] || S.muted }}>{m.status || '—'}</span>
                    <span style={{ fontSize: 11, color: S.muted }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    <button onClick={() => handleImpersonate(m.name, m.email, 'member')} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                      Impersonate
                    </button>
                    <button
                      onClick={() => handleSendCard(m)}
                      disabled={sendingCard === m.id || cardSent[m.id]}
                      style={{ background: cardSent[m.id] ? S.green + '22' : 'transparent', border: `1px solid ${cardSent[m.id] ? S.green + '44' : S.border}`, color: cardSent[m.id] ? S.green : S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: sendingCard === m.id || cardSent[m.id] ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {sendingCard === m.id ? '…' : cardSent[m.id] ? '✓ Sent' : 'Send Card'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                      <>
                        <button
                          onClick={() => handleResendInvitation(c.id)}
                          disabled={actionLoading === c.id}
                          style={{ background: 'transparent', border: `1px solid ${S.blue}66`, color: S.blue, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                        >
                          {actionLoading === c.id ? '…' : 'Resend Invite'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(c.id, 'active')}
                          disabled={actionLoading === c.id}
                          style={{ background: 'transparent', border: `1px solid ${S.green}66`, color: S.green, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                        >
                          {actionLoading === c.id ? '…' : 'Mark Active'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteContractor(c.id, c.name)}
                      disabled={actionLoading === c.id}
                      style={{ background: 'transparent', border: `1px solid ${S.danger}44`, color: S.danger, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                    >
                      {actionLoading === c.id ? '…' : 'Delete'}
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100,
                      background: c.status === 'active' ? S.green + '22' : c.status === 'docs_signed' ? S.amber + '22' : c.status === 'approved' ? S.blue + '22' : S.danger + '22',
                      color: c.status === 'active' ? S.green : c.status === 'docs_signed' ? S.amber : c.status === 'approved' ? S.blue : S.danger }}>
                      {c.status === 'active' ? '✓ Active' : c.status === 'docs_signed' ? '✍ Docs Signed' : c.status === 'approved' ? '⏳ Approved' : '✗ Rejected'}
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
            {['active', 'docs_signed', 'approved', 'rejected'].map(statusGroup => {
              const group = contractors.filter(c => c.status === statusGroup)
              if (!group.length) return null
              const groupLabel = statusGroup === 'active' ? '✓ Active Partners' : statusGroup === 'docs_signed' ? '✍ Docs Signed — Awaiting Payment' : statusGroup === 'approved' ? '⏳ Approved — Awaiting Signature' : '✗ Removed'
              const groupColor = statusGroup === 'active' ? S.green : statusGroup === 'docs_signed' ? S.amber : statusGroup === 'approved' ? S.blue : S.muted
              return (
                <div key={statusGroup} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: groupColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    {groupLabel}
                  </div>
                  <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    {group.map((c, i) => {
                      const isExpanded = expandedContractor === c.id
                      return (
                        <div key={c.id}>
                          <div style={{ display: 'flex', padding: '14px 20px', borderBottom: `1px solid ${S.border}`, alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 180 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{c.name || '—'}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: S.blue, background: S.blue + '22', padding: '2px 8px', borderRadius: 100 }}>{c.trade}</span>
                              </div>
                              <div style={{ fontSize: 12, color: S.muted }}>{c.contact_name || '—'} · {c.contact_email || '—'}</div>
                              <div style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, alignSelf: 'center' }}>
                              <button
                                onClick={() => setExpandedContractor(isExpanded ? null : c.id)}
                                style={{ background: 'transparent', border: `1px solid ${S.border}`, color: isExpanded ? S.green : S.muted, fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 7, cursor: 'pointer' }}
                              >
                                {isExpanded ? 'Close ▲' : 'Docs ▼'}
                              </button>
                              <button onClick={() => handleImpersonate(c.name, c.contact_email, 'contractor', c)} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                                Impersonate
                              </button>
                              {(statusGroup === 'approved' || statusGroup === 'docs_signed') && (
                                <button
                                  onClick={() => handleResendInvitation(c.id)}
                                  disabled={actionLoading === c.id}
                                  style={{ background: 'transparent', border: `1px solid ${S.blue}66`, color: S.blue, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                                >
                                  {actionLoading === c.id ? '…' : 'Resend Invite'}
                                </button>
                              )}
                              {(statusGroup === 'docs_signed' || statusGroup === 'approved') && (
                                <button
                                  onClick={() => handleStatusUpdate(c.id, 'active')}
                                  disabled={actionLoading === c.id}
                                  style={{ background: 'transparent', border: `1px solid ${S.green}66`, color: S.green, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.5 : 1 }}
                                >
                                  {actionLoading === c.id ? '…' : 'Mark Active'}
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

        {/* KPIs */}
        {tab === 'kpis' && (() => {
          const k = kpiData
          const mrr = stripeRevenue?.mrr ?? null

          function KpiCard({ label, value, sub, color }) {
            return (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
                <div style={{ fontFamily: C.display, fontSize: 32, color: color || S.offwhite, lineHeight: 1 }}>{value ?? '—'}</div>
                {sub && <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>{sub}</div>}
              </div>
            )
          }

          function Section({ title, children }) {
            return (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>{title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>{children}</div>
              </div>
            )
          }

          if (kpiLoading) return (
            <div style={{ textAlign: 'center', padding: '80px 0', color: S.muted }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>📈</div>
              Loading KPI data…
            </div>
          )
          if (!k) return (
            <div style={{ textAlign: 'center', padding: '80px 0', color: S.muted, fontSize: 14 }}>
              Failed to load KPI data. Check edge function logs.
            </div>
          )

          const momColor = k.members.mom_growth_pct > 0 ? S.green : k.members.mom_growth_pct < 0 ? S.danger : S.muted
          const npsColor = k.nps.score === null ? S.muted : k.nps.score >= 50 ? S.green : k.nps.score >= 0 ? S.amber : S.danger

          return (
            <div>
              <Section title="Top Metrics">
                <KpiCard label="Paying Members" value={k.members.total_active}
                  sub={`${k.members.new_this_month} joined this month`} />
                <KpiCard label="MoM Member Growth" value={`${k.members.mom_growth_pct > 0 ? '+' : ''}${k.members.mom_growth_pct}%`}
                  color={momColor} sub={`${k.members.new_last_month} joined last month`} />
                <KpiCard label="Active Contractors" value={k.contractors.total_active} />
                <KpiCard label="MRR" value={mrr !== null ? `$${Math.round(mrr).toLocaleString()}` : '—'}
                  color={S.green} sub="From live Stripe data" />
                <KpiCard label="Active Markets" value={k.markets.active_count}
                  sub={k.markets.active_states.join(', ') || 'None yet'} />
              </Section>

              <Section title="Engagement">
                <KpiCard label="Jobs This Month" value={k.jobs.total_this_month}
                  sub={`${k.jobs.total_last_month} last month`} />
                <KpiCard label="Avg Jobs / Member" value={k.jobs.avg_per_member}
                  sub="Per member, last 30 days" />
                <KpiCard label="Lead Acceptance Rate" value={`${k.jobs.acceptance_rate}%`}
                  color={k.jobs.acceptance_rate >= 50 ? S.green : S.amber}
                  sub="Contractor accepted ÷ total leads sent" />
              </Section>

              <Section title="Health">
                <KpiCard label="NPS Score (90-day)" value={k.nps.score !== null ? k.nps.score : 'No data'}
                  color={npsColor} sub={`${k.nps.response_count} responses`} />
                <KpiCard label="Cancellations This Month" value={k.cancellations_this_month}
                  color={k.cancellations_this_month > 0 ? S.danger : S.green} />
                <KpiCard label="Contractor Retention (6mo)" value={k.contractors.retention_6mo !== null ? `${k.contractors.retention_6mo}%` : 'Not enough data'}
                  color={k.contractors.retention_6mo !== null ? (k.contractors.retention_6mo >= 75 ? S.green : S.amber) : S.muted}
                  sub="Still active of those 6mo+ on platform" />
                <KpiCard label="Referral Conversion" value={`${k.referrals.conversion_rate}%`}
                  color={k.referrals.conversion_rate >= 20 ? S.green : S.amber}
                  sub={`${k.referrals.converted} of ${k.referrals.total} referrals converted`} />
              </Section>

              <Section title="Growth">
                <KpiCard label="Total Waitlist" value={Object.values(k.markets.waitlist_by_state).reduce((a, b) => a + b, 0)}
                  sub="Across all states" />
                <KpiCard label="Referral Signups This Month" value={`${k.referrals.pct_signups_from_referral}%`}
                  color={S.blue} sub="New members from referral links" />
              </Section>

              {/* Waitlist by state table */}
              {Object.keys(k.markets.waitlist_by_state).length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Waitlist by State</div>
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {Object.entries(k.markets.waitlist_by_state)
                      .sort(([, a], [, b]) => b - a)
                      .map(([state, count], i, arr) => (
                        <div key={state} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                          <span style={{ fontSize: 14, color: S.offwhite, fontWeight: 600 }}>{state}</span>
                          <span style={{ fontSize: 13, color: S.muted }}>{count} {count === 1 ? 'person' : 'people'}</span>
                        </div>
                      ))}
                  </Card>
                </div>
              )}

              {/* NPS note */}
              {k.nps.response_count === 0 && (
                <Card style={{ padding: '20px 24px', background: S.surface }}>
                  <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.7 }}>
                    <span style={{ color: S.offwhite, fontWeight: 600 }}>NPS surveys are active.</span> Members receive an automated email at day 45 and day 180 after signup with a 1–10 rating prompt. Responses will appear here once the first surveys go out.
                  </div>
                </Card>
              )}
            </div>
          )
        })()}

        {/* ── STAFF MANAGEMENT TAB ── */}
        {tab === 'staff' && isAdmin && (() => {
          const handleAddStaff = async (e) => {
            e.preventDefault()
            setStaffFormError(null)
            if (!staffForm.full_name || !staffForm.email) { setStaffFormError('Name and email are required.'); return }
            setStaffFormLoading(true)
            try {
              const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(staffForm),
              })
              const data = await res.json()
              if (!res.ok) { setStaffFormError(data.error || 'Failed to add staff member'); return }
              setStaffMembers(prev => [data.staff, ...prev])
              setShowAddStaff(false)
              setStaffForm({ full_name: '', email: '', role: 'staff' })
            } catch { setStaffFormError('Network error') }
            finally { setStaffFormLoading(false) }
          }

          const handleRoleChange = async (id, role) => {
            setChangingStaffRole(id)
            try {
              const res = await fetch('/api/admin/staff', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, role }),
              })
              if (res.ok) setStaffMembers(prev => prev.map(s => s.id === id ? { ...s, role } : s))
            } finally { setChangingStaffRole(null) }
          }

          const handleRemoveStaff = async (id) => {
            const res = await fetch('/api/admin/staff', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
            })
            if (res.ok) setStaffMembers(prev => prev.filter(s => s.id !== id))
          }

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: S.offwhite }}>Staff Management</div>
                  <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>Staff can access this dashboard but cannot see KPI cards or revenue data.</div>
                </div>
                <button onClick={() => setShowAddStaff(true)} style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                  + Add Staff
                </button>
              </div>

              {/* Add Staff Modal */}
              {showAddStaff && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
                  <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: S.offwhite, marginBottom: 20 }}>Add Staff Member</div>
                    <form onSubmit={handleAddStaff}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                        {[['Full Name', 'full_name', 'text', 'Jane Smith'], ['Email', 'email', 'email', 'jane@example.com']].map(([label, field, type, placeholder]) => (
                          <div key={field}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                            <input type={type} placeholder={placeholder} value={staffForm[field]}
                              onChange={e => setStaffForm(f => ({ ...f, [field]: e.target.value }))}
                              style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, padding: '10px 12px', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Role</div>
                          <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                            style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, padding: '10px 12px', borderRadius: 8, outline: 'none', cursor: 'pointer' }}>
                            <option value="staff">Staff — no KPI or revenue data</option>
                            <option value="admin">Admin — full access</option>
                          </select>
                        </div>
                      </div>
                      {staffFormError && <div style={{ fontSize: 13, color: S.danger, marginBottom: 12 }}>{staffFormError}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" disabled={staffFormLoading}
                          style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: 11, borderRadius: 8, cursor: staffFormLoading ? 'not-allowed' : 'pointer', opacity: staffFormLoading ? 0.7 : 1 }}>
                          {staffFormLoading ? 'Sending…' : 'Send Invite'}
                        </button>
                        <button type="button" onClick={() => { setShowAddStaff(false); setStaffFormError(null) }}
                          style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, padding: '11px 18px', borderRadius: 8, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Staff list */}
              {staffLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: S.muted, fontSize: 14 }}>Loading…</div>
              ) : staffMembers.length === 0 ? (
                <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
                  <div style={{ fontSize: 14, color: S.muted }}>No staff members yet. Add one to give them dashboard access.</div>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {staffMembers.map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < staffMembers.length - 1 ? `1px solid ${S.border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{s.full_name}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{s.email}</div>
                        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
                          Added {s.added_at ? new Date(s.added_at).toLocaleDateString() : '—'}
                          {s.last_login ? ` · Last login ${new Date(s.last_login).toLocaleDateString()}` : ' · Never logged in'}
                          {s.status === 'invited' && ' · Invite pending'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <select value={s.role} onChange={e => handleRoleChange(s.id, e.target.value)} disabled={changingStaffRole === s.id}
                          style={{ background: S.surface, border: `1px solid ${S.border}`, color: s.role === 'admin' ? S.amber : S.blue, fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', outline: 'none' }}>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleRemoveStaff(s.id)}
                          style={{ background: S.danger + '22', border: `1px solid ${S.danger}44`, color: S.danger, fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              <div style={{ marginTop: 20, padding: '14px 18px', background: S.surface, borderRadius: 10, border: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7 }}>
                  <span style={{ color: S.amber, fontWeight: 700 }}>Reminder:</span> After adding a staff member, ensure the <span style={{ color: S.offwhite }}>'staff'</span> role is configured in your <span style={{ color: S.offwhite }}>Clerk dashboard → Roles & Permissions</span>. The invitation will set their role automatically on sign-up.
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── ENTERPRISE TAB ── */}
        {tab === 'enterprise' && (() => {
          const filteredLeads = enterpriseLeadFilter === 'all'
            ? enterpriseLeads
            : enterpriseLeads.filter(l => l.status === enterpriseLeadFilter)

          const handleLeadStatus = async (id, status) => {
            await supabase.from('enterprise_leads').update({ status }).eq('id', id)
            setEnterpriseLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
          }

          const handleAssignManager = async (memberId) => {
            if (!managerForm.name) return
            await supabase.from('enterprise_members').update({
              account_manager_name: managerForm.name,
              account_manager_email: managerForm.email,
              account_manager_phone: managerForm.phone,
            }).eq('id', memberId)
            setEnterpriseMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...{ account_manager_name: managerForm.name, account_manager_email: managerForm.email, account_manager_phone: managerForm.phone } } : m))
            setAssigningManager(null)
            setManagerForm({ name: '', email: '', phone: '' })
          }

          const handleMemberStatus = async (id, status) => {
            await supabase.from('enterprise_members').update({ status }).eq('id', id)
            setEnterpriseMembers(prev => prev.map(m => m.id === id ? { ...m, status } : m))
          }

          const enterpriseArr = enterpriseMembers.reduce((sum, m) => {
            const price = m.plan === 'professional' ? 1499 : m.plan === 'enterprise' ? 0 : 499
            return sum + price
          }, 0)

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Enterprise revenue summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {[
                  ['Enterprise Members', enterpriseMembers.filter(m => m.status === 'active').length, S.purple],
                  ['Enterprise ARR', `$${enterpriseArr.toLocaleString()}`, S.green],
                  ['Open Leads', enterpriseLeads.filter(l => !l.status || l.status === 'new').length, S.amber],
                ].map(([label, value, color]) => (
                  <Card key={label} style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                  </Card>
                ))}
              </div>

              {/* Enterprise members list */}
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>Enterprise Members</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{enterpriseMembers.length} total</div>
                </div>
                {enterpriseMembers.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: S.muted, fontSize: 13 }}>No enterprise members yet</div>
                ) : enterpriseMembers.map(m => (
                  <div key={m.id} style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{m.company_name || '—'}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{m.contact_name} · {m.email}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{m.unit_count} units · Joined {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</div>
                        {m.account_manager_name && (
                          <div style={{ fontSize: 12, color: S.blue, marginTop: 4 }}>AM: {m.account_manager_name} · {m.account_manager_email}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (m.plan === 'professional' ? S.blue : m.plan === 'enterprise' ? S.purple : S.green) + '22', color: m.plan === 'professional' ? S.blue : m.plan === 'enterprise' ? S.purple : S.green, border: `1px solid ${(m.plan === 'professional' ? S.blue : m.plan === 'enterprise' ? S.purple : S.green)}44` }}>
                          {m.plan || 'portfolio'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (m.status === 'active' ? S.green : S.danger) + '22', color: m.status === 'active' ? S.green : S.danger }}>
                          {m.status || 'pending'}
                        </span>
                        <button onClick={() => { setAssigningManager(m.id); setManagerForm({ name: m.account_manager_name || '', email: m.account_manager_email || '', phone: m.account_manager_phone || '' }) }} style={{ fontSize: 12, background: S.surface, border: `1px solid ${S.border}`, color: S.muted, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Assign AM</button>
                        {m.status !== 'active' && (
                          <button onClick={() => handleMemberStatus(m.id, 'active')} style={{ fontSize: 12, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Approve</button>
                        )}
                        {m.status === 'active' && (
                          <button onClick={() => handleMemberStatus(m.id, 'suspended')} style={{ fontSize: 12, background: S.danger + '22', border: `1px solid ${S.danger}44`, color: S.danger, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>Suspend</button>
                        )}
                      </div>
                    </div>
                    {/* Assign manager inline form */}
                    {assigningManager === m.id && (
                      <div style={{ marginTop: 12, padding: '14px 16px', background: S.surface, borderRadius: 8, border: `1px solid ${S.border}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assign Account Manager</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                          {[['Name', 'name'], ['Email', 'email'], ['Phone', 'phone']].map(([label, field]) => (
                            <input key={field} placeholder={label} value={managerForm[field]} onChange={e => setManagerForm(f => ({ ...f, [field]: e.target.value }))}
                              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, padding: '8px 10px', borderRadius: 6, outline: 'none' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleAssignManager(m.id)} style={{ background: S.green, color: S.black, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setAssigningManager(null)} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </Card>

              {/* Enterprise leads */}
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>Enterprise Leads</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['all', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']].map(([val, label]) => (
                      <button key={val} onClick={() => setEnterpriseLeadFilter(val)}
                        style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${enterpriseLeadFilter === val ? S.green : S.border}`, background: enterpriseLeadFilter === val ? S.green + '22' : 'transparent', color: enterpriseLeadFilter === val ? S.green : S.muted, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredLeads.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: S.muted, fontSize: 13 }}>No leads found</div>
                ) : filteredLeads.map(lead => (
                  <div key={lead.id} style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{lead.company_name || lead.full_name}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{lead.full_name} · {lead.email} · {lead.phone || '—'}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{lead.unit_count} units · Spend: {lead.monthly_spend || '—'} · {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</div>
                        {lead.message && <div style={{ fontSize: 12, color: S.muted, marginTop: 4, fontStyle: 'italic' }}>"{lead.message.slice(0, 120)}{lead.message.length > 120 ? '…' : ''}"</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: (!lead.status || lead.status === 'new' ? S.amber : lead.status === 'contacted' ? S.blue : S.green) + '22', color: !lead.status || lead.status === 'new' ? S.amber : lead.status === 'contacted' ? S.blue : S.green }}>
                          {lead.status || 'new'}
                        </span>
                        {(!lead.status || lead.status === 'new') && (
                          <button onClick={() => handleLeadStatus(lead.id, 'contacted')} style={{ fontSize: 11, background: S.blue + '22', border: `1px solid ${S.blue}44`, color: S.blue, padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>Mark Contacted</button>
                        )}
                        {lead.status === 'contacted' && (
                          <button onClick={() => handleLeadStatus(lead.id, 'closed')} style={{ fontSize: 11, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>Close</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
