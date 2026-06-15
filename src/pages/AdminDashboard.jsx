import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const MEMBERS = [
  { id: 'M-001', name: 'Ryan Scott', email: 'ryan@neumi.com', tier: 'Member+', since: 'Jan 2026', jobs: 5, status: 'Active' },
  { id: 'M-002', name: 'Sarah K.', email: 'sarah.k@gmail.com', tier: 'Member+', since: 'Feb 2026', jobs: 8, status: 'Active' },
  { id: 'M-003', name: 'Tom B.', email: 'tomb@outlook.com', tier: 'Elite', since: 'Jan 2026', jobs: 12, status: 'Active' },
  { id: 'M-004', name: 'Dana M.', email: 'danam@yahoo.com', tier: 'Member', since: 'Mar 2026', jobs: 3, status: 'Active' },
  { id: 'M-005', name: 'Chris W.', email: 'chrisw@gmail.com', tier: 'Member', since: 'Apr 2026', jobs: 1, status: 'Active' },
  { id: 'M-006', name: 'James R.', email: 'jamesr@icloud.com', tier: 'Elite', since: 'Jan 2026', jobs: 7, status: 'Churned' },
  { id: 'M-007', name: 'Lisa T.', email: 'lisat@gmail.com', tier: 'Member+', since: 'May 2026', jobs: 0, status: 'Active' },
  { id: 'M-008', name: 'Mark C.', email: 'markc@hotmail.com', tier: 'Member', since: 'Jun 2026', jobs: 0, status: 'Trial' },
]

const CONTRACTOR_QUEUE = [
  { id: 'CA-041', company: 'Summit HVAC', trade: 'HVAC', contact: 'Dave Hill', email: 'dave@summithvac.com', years: 12, licensed: true, submitted: 'Jun 10', status: 'pending' },
  { id: 'CA-040', company: 'Valley Plumbing', trade: 'Plumbing', contact: 'Maria Cruz', email: 'maria@valleyplumb.com', years: 8, licensed: true, submitted: 'Jun 8', status: 'pending' },
  { id: 'CA-039', company: 'CleanCut Lawn', trade: 'Lawn Care', contact: 'Jake Torres', email: 'jake@cleancut.co', years: 5, licensed: false, submitted: 'Jun 6', status: 'pending' },
  { id: 'CA-038', company: 'Apex Roofing', trade: 'Roofing', contact: 'Sam Nguyen', email: 'sam@apexroofing.com', years: 15, licensed: true, submitted: 'Jun 5', status: 'approved' },
  { id: 'CA-037', company: 'FastFix Electric', trade: 'Electrical', contact: 'Tony Kim', email: 'tony@fastfix.com', years: 3, licensed: true, submitted: 'Jun 3', status: 'rejected' },
]

const LEAD_ACTIVITY = [
  { time: '2m ago', event: 'Lead accepted', detail: 'Peak HVAC accepted L-1041 — Sarah K. · AC Tune-Up', type: 'accept' },
  { time: '14m ago', event: 'Lead dispatched', detail: 'L-1041 sent to Peak HVAC — Sarah K. at 4821 Maple Dr', type: 'dispatch' },
  { time: '1h ago', event: 'Job completed', detail: 'J-1035 confirmed — Dana M. · HVAC Tune-Up · $165 · member pricing verified', type: 'complete' },
  { time: '2h ago', event: 'New member', detail: 'Mark C. joined as Member — Salt Lake City, UT', type: 'member' },
  { time: '3h ago', event: 'Job requested', detail: 'Tom B. (Elite) requested HVAC repair — 339 Birch Ln, SLC', type: 'request' },
  { time: '5h ago', event: 'Job completed', detail: 'J-1029 confirmed — Chris W. · Filter Swap · $65 · member pricing verified', type: 'complete' },
  { time: '8h ago', event: 'Contractor applied', detail: "Summit HVAC applied to join the network — Dave Hill, 12 yrs exp, licensed", type: 'apply' },
  { time: '1d ago', event: 'Lead declined', detail: 'Peak HVAC declined L-1038 — Lisa T. · AC Repair', type: 'decline' },
]

const TIER_COLORS = { Member: S.green, 'Member+': S.blue, Elite: S.purple }
const STATUS_COLORS = { Active: S.green, Churned: S.danger, Trial: S.amber }
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
  const [memberSearch, setMemberSearch] = useState('')
  const [actionError, setActionError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [expandedContractor, setExpandedContractor] = useState(null)
  const [adminDocUploading, setAdminDocUploading] = useState(null)
  const [adminDocError, setAdminDocError] = useState(null)

  useEffect(() => {
    supabase
      .from('contractors')
      .select('*')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setContractors(data || []))
  }, [])

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

  const handleImpersonate = (name, email, role) => {
    localStorage.setItem('subs_impersonating', JSON.stringify({ name, email, role }))
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
      const { error: dbErr } = await supabase.from('contractors').update({ [col]: publicUrl }).eq('id', contractorId)
      if (dbErr) throw dbErr
      setContractors(cs => cs.map(c => c.id === contractorId ? { ...c, [col]: publicUrl } : c))
    } catch (e) {
      setAdminDocError(`Upload failed: ${e.message}`)
    } finally {
      setAdminDocUploading(null)
    }
  }

  const filteredMembers = MEMBERS.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const activeMembers = MEMBERS.filter(m => m.status === 'Active').length
  const mrr = MEMBERS.filter(m => m.status === 'Active').reduce((sum, m) => sum + (m.tier === 'Elite' ? 399 : m.tier === 'Member+' ? 199 : 99), 0) / 12
  const arr = mrr * 12
  const churnCount = MEMBERS.filter(m => m.status === 'Churned').length
  const churnRate = ((churnCount / MEMBERS.length) * 100).toFixed(1)

  const tabs = [['stats', '📊 Revenue Stats'], ['members', '👥 Members'], ['approvals', '🛠 Approvals'], ['contractors', '🔧 Contractors'], ['activity', '⚡ Activity']]

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '3px 10px', borderRadius: 100 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: S.muted }}>{user?.primaryEmailAddress?.emailAddress || 'admin@subs.co'}</span>
          <button onClick={() => signOut().then(() => navigate('/admin/login'))} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 12, padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>SUBS Admin</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>Operations dashboard · Jun 11, 2026</div>
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
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === 'stats' && (
          <div>
            <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                ['MRR', `$${Math.round(mrr).toLocaleString()}`, S.green, 'Monthly recurring revenue'],
                ['ARR', `$${Math.round(arr).toLocaleString()}`, S.blue, 'Annual recurring revenue'],
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
                  const count = MEMBERS.filter(m => m.tier === tier && m.status === 'Active').length
                  const pct = (count / activeMembers) * 100
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
                  ['8', 'Total members'],
                  ['5', 'Active contractors'],
                  ['3', 'Pending approvals'],
                  ['52', 'Jobs this month'],
                  ['100%', 'Pricing compliance'],
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
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 100px 80px 60px 80px 110px', padding: '10px 20px', borderBottom: `1px solid ${S.border}` }}>
                {['ID', 'Name', 'Email', 'Tier', 'Since', 'Jobs', 'Status', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {filteredMembers.map((m, i) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 100px 80px 60px 80px 110px', padding: '14px 20px', borderBottom: i < filteredMembers.length - 1 ? `1px solid ${S.border}` : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: S.muted }}>{m.id}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: S.offwhite }}>{m.name}</span>
                  <span style={{ fontSize: 13, color: S.muted }}>{m.email}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TIER_COLORS[m.tier] || S.green }}>{m.tier}</span>
                  <span style={{ fontSize: 13, color: S.muted }}>{m.since}</span>
                  <span style={{ fontSize: 14, color: S.offwhite }}>{m.jobs}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: (STATUS_COLORS[m.status] || S.muted) + '22', color: STATUS_COLORS[m.status] || S.muted }}>
                    {m.status}
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
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => handleContractor(c.id, 'approved')} disabled={actionLoading === c.id} style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.6 : 1 }}>
                            {actionLoading === c.id ? '…' : '✓ Approve'}
                          </button>
                          <button onClick={() => handleContractor(c.id, 'rejected')} disabled={actionLoading === c.id} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.danger, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: actionLoading === c.id ? 'not-allowed' : 'pointer', opacity: actionLoading === c.id ? 0.6 : 1 }}>
                            Reject
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
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100, background: c.status === 'approved' ? S.green + '22' : S.danger + '22', color: c.status === 'approved' ? S.green : S.danger }}>
                      {c.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
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
            {['approved', 'rejected'].map(statusGroup => {
              const group = contractors.filter(c => c.status === statusGroup)
              if (!group.length) return null
              return (
                <div key={statusGroup} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: statusGroup === 'approved' ? S.green : S.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    {statusGroup === 'approved' ? '✓ Active Partners' : '✗ Removed'}
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
                              <button onClick={() => handleImpersonate(c.name, c.contact_email, 'contractor')} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
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
                              {statusGroup === 'approved' ? (
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

        {/* Lead Activity */}
        {tab === 'activity' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {LEAD_ACTIVITY.map((event, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 16px', background: S.card, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: (EVENT_COLORS[event.type] || S.muted) + '22', border: `1px solid ${(EVENT_COLORS[event.type] || S.muted)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: EVENT_COLORS[event.type] || S.muted, flexShrink: 0, marginTop: 1 }}>
                    {EVENT_ICONS[event.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: S.offwhite }}>{event.event}</span>
                      <span style={{ fontSize: 11, color: S.muted, flexShrink: 0 }}>{event.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: S.muted, marginTop: 2, lineHeight: 1.4 }}>{event.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
