import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import { UT_COUNTIES, zipToState, zipToCountyName, parseServiceArea, coversCounty, serviceAreaLabel } from '../lib/utGeo'

const DAYS_30 = 30 * 24 * 60 * 60 * 1000

function Card({ children, style }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }}>{children}</div>
}

function demandColor(requests, contractors) {
  if (contractors === 0) return { bg: '#2D1010', text: '#FF5A5A', label: 'GAP' }
  const ratio = requests / contractors
  if (ratio >= 3) return { bg: '#2D1010', text: '#FF5A5A', label: 'High demand' }
  if (ratio >= 1.5) return { bg: '#2b230d', text: '#FFC24B', label: 'Tight' }
  return { bg: '#0a1c0e', text: S.green, label: 'Covered' }
}

const th = { padding: '11px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.muted, textAlign: 'left', whiteSpace: 'nowrap' }
const td = { padding: '11px 14px', fontSize: 13, color: S.muted, whiteSpace: 'nowrap' }

export default function AdminMarketIntel() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'

  const [jobRequests, setJobRequests] = useState(null)
  const [contractors, setContractors] = useState(null)
  const [leads, setLeads] = useState(null)
  const [reviews, setReviews] = useState(null)

  // Admin only — staff can reach other /admin routes, not this one
  useEffect(() => {
    if (isLoaded && !isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [isLoaded, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('job_requests').select('id, trade, zip, status, submitted_at, contractor_id')
      .order('submitted_at', { ascending: false }).limit(2000)
      .then(({ data }) => setJobRequests(data || []))
    supabase.from('contractors').select('id, name, trade, trades, status, service_area, rating')
      .in('status', ['active', 'approved'])
      .then(({ data }) => setContractors(data || []))
    supabase.from('leads').select('contractor_id, status, dispatched_at').limit(3000)
      .then(({ data }) => setLeads(data || []))
    supabase.from('reviews').select('contractor_id, rating').limit(3000)
      .then(({ data }) => setReviews(data || []))
  }, [isAdmin])

  const loading = !jobRequests || !contractors || !leads || !reviews

  const pool = useMemo(() => (contractors || []).map(c => ({
    ...c,
    sa: parseServiceArea(c.service_area),
    tradeList: (c.trades?.length ? c.trades : [c.trade]).filter(Boolean),
  })), [contractors])

  const activePool = useMemo(() => pool.filter(c => c.status === 'active'), [pool])

  // ── 1. Top trades by lead volume (last 30 days), grouped trade × state × county ──
  const demandRows = useMemo(() => {
    if (loading) return []
    const cutoff = Date.now() - DAYS_30
    const groups = {}
    for (const jr of jobRequests) {
      if (new Date(jr.submitted_at).getTime() < cutoff) continue
      const state = zipToState(jr.zip) || '—'
      const county = state === 'UT' ? (zipToCountyName(jr.zip) || 'Unknown') : 'Statewide'
      const key = `${jr.trade}|${state}|${county}`
      groups[key] = groups[key] || { trade: jr.trade, state, county, requests: 0 }
      groups[key].requests++
    }
    const countyObj = (name) => UT_COUNTIES.find(c => c.name === name) || { name, statewide: true }
    return Object.values(groups)
      .map(g => {
        const active = activePool.filter(c =>
          c.tradeList.includes(g.trade) &&
          (g.state === 'UT' ? coversCounty(c.sa, countyObj(g.county), 'UT') : (!c.sa.state || c.sa.state === g.state))
        ).length
        return { ...g, contractors: active, ratio: active > 0 ? g.requests / active : null }
      })
      .sort((a, b) => b.requests - a.requests)
  }, [loading, jobRequests, activePool])

  // ── 2. Coverage gaps: demand exists, zero active contractors ──
  const gaps = useMemo(() => demandRows.filter(r => r.contractors === 0), [demandRows])

  // ── 3. Contractor performance ──
  const performance = useMemo(() => {
    if (loading) return []
    const jrByContractor = {}
    for (const jr of jobRequests) {
      if (!jr.contractor_id) continue
      jrByContractor[jr.contractor_id] = jrByContractor[jr.contractor_id] || { assigned: 0, completed: 0, cancelled: 0 }
      jrByContractor[jr.contractor_id].assigned++
      if (jr.status === 'Complete') jrByContractor[jr.contractor_id].completed++
      if (jr.status === 'Cancelled') jrByContractor[jr.contractor_id].cancelled++
    }
    const lastLead = {}
    for (const l of leads) {
      const t = new Date(l.dispatched_at).getTime()
      if (!lastLead[l.contractor_id] || t > lastLead[l.contractor_id]) lastLead[l.contractor_id] = t
    }
    const ratingByContractor = {}
    for (const r of reviews) {
      ratingByContractor[r.contractor_id] = ratingByContractor[r.contractor_id] || { sum: 0, n: 0 }
      ratingByContractor[r.contractor_id].sum += r.rating
      ratingByContractor[r.contractor_id].n++
    }
    return activePool.map(c => {
      const jr = jrByContractor[c.id] || { assigned: 0, completed: 0, cancelled: 0 }
      const decided = jr.assigned - jr.cancelled
      const completionRate = decided > 0 ? jr.completed / decided : null
      const rev = ratingByContractor[c.id]
      const rating = rev ? rev.sum / rev.n : (Number(c.rating) > 0 ? Number(c.rating) : null)
      const swapCandidate = decided >= 3 && completionRate !== null && completionRate < 0.5
      return {
        id: c.id, name: c.name,
        trade: c.tradeList[0] || '—',
        area: serviceAreaLabel(c.sa),
        assigned: jr.assigned, completed: jr.completed,
        completionRate, rating,
        lastActive: lastLead[c.id] || null,
        swapCandidate,
      }
    }).sort((a, b) => (b.swapCandidate - a.swapCandidate) || b.assigned - a.assigned)
  }, [loading, jobRequests, leads, reviews, activePool])

  if (!isLoaded || !isAdmin) return null

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '3px 10px', borderRadius: 100 }}>Admin</span>
        </div>
        <Link to="/admin/dashboard" style={{ fontSize: 13, color: S.muted, textDecoration: 'none', border: `1px solid ${S.border}`, padding: '7px 14px', borderRadius: 8 }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>📡 Market Intelligence</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>Demand vs. supply by trade and county — where to recruit, and who to swap.</div>
        </div>

        {loading ? (
          <div style={{ color: S.muted, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Loading market data…</div>
        ) : (
          <>
            {/* ── 2. Coverage gaps (most urgent — shown first) ── */}
            <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>🚨 Coverage gaps</div>
            <p style={{ fontSize: 13, color: S.muted, margin: '0 0 14px' }}>Job requests in the last 30 days with zero active contractors — sign someone or swap someone in.</p>
            {gaps.length === 0 ? (
              <Card style={{ padding: '20px 24px', marginBottom: 32, fontSize: 14, color: S.green }}>
                ✓ No gaps — every trade with recent demand has at least one active contractor covering it.
              </Card>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 32 }}>
                {gaps.map(g => (
                  <div key={`${g.trade}|${g.state}|${g.county}`} style={{ background: '#2D1010', border: '1px solid #5a2525', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: S.offwhite }}>{g.trade}</div>
                    <div style={{ fontSize: 12.5, color: '#FF5A5A', marginTop: 2 }}>{g.county}{g.county !== 'Statewide' ? ' County' : ''}, {g.state}</div>
                    <div style={{ fontSize: 13, color: S.muted, marginTop: 8 }}>
                      <b style={{ color: '#FF5A5A' }}>{g.requests}</b> request{g.requests === 1 ? '' : 's'} · <b style={{ color: '#FF5A5A' }}>0</b> contractors
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 1. Top trades by lead volume ── */}
            <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>📊 Top trades by lead volume</div>
            <p style={{ fontSize: 13, color: S.muted, margin: '0 0 14px' }}>Job requests in the last 30 days vs. active contractors covering that trade + county.</p>
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
              {demandRows.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: S.muted, fontSize: 14 }}>No job requests in the last 30 days.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                        <th style={th}>Trade</th><th style={th}>State</th><th style={th}>County</th>
                        <th style={th}>Requests (30d)</th><th style={th}>Active Contractors</th>
                        <th style={th}>Leads / Contractor</th><th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandRows.map(r => {
                        const color = demandColor(r.requests, r.contractors)
                        return (
                          <tr key={`${r.trade}|${r.state}|${r.county}`} style={{ borderBottom: `1px solid ${S.border}` }}>
                            <td style={{ ...td, color: S.offwhite, fontWeight: 600 }}>{r.trade}</td>
                            <td style={td}>{r.state}</td>
                            <td style={td}>{r.county}</td>
                            <td style={{ ...td, color: S.offwhite, fontWeight: 700 }}>{r.requests}</td>
                            <td style={{ ...td, color: r.contractors === 0 ? '#FF5A5A' : S.offwhite }}>{r.contractors}</td>
                            <td style={td}>{r.ratio === null ? '∞' : r.ratio.toFixed(1)}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: color.text, background: color.bg, padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{color.label}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* ── 3. Contractor performance ── */}
            <div style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, marginBottom: 4 }}>🔧 Contractor performance</div>
            <p style={{ fontSize: 13, color: S.muted, margin: '0 0 14px' }}>Assigned vs. completed jobs (cancellations excluded from the rate). Contractors with under 50% completion on 3+ decided jobs are flagged as swap candidates.</p>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {performance.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: S.muted, fontSize: 14 }}>No active contractors.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                        <th style={th}>Contractor</th><th style={th}>Trade</th><th style={th}>Area</th>
                        <th style={th}>Assigned</th><th style={th}>Completed</th><th style={th}>Rate</th>
                        <th style={th}>Rating</th><th style={th}>Last Active</th><th style={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map(p => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}`, background: p.swapCandidate ? '#2D101033' : 'transparent' }}>
                          <td style={{ ...td, color: S.offwhite, fontWeight: 600 }}>{p.name}</td>
                          <td style={td}>{p.trade}</td>
                          <td style={{ ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.area}</td>
                          <td style={{ ...td, color: S.offwhite }}>{p.assigned}</td>
                          <td style={{ ...td, color: S.offwhite }}>{p.completed}</td>
                          <td style={{ ...td, color: p.completionRate === null ? S.muted : p.completionRate < 0.5 ? '#FF5A5A' : p.completionRate < 0.8 ? '#FFC24B' : S.green, fontWeight: 700 }}>
                            {p.completionRate === null ? '—' : `${Math.round(p.completionRate * 100)}%`}
                          </td>
                          <td style={td}>{p.rating ? `★ ${p.rating.toFixed(1)}` : '—'}</td>
                          <td style={td}>{p.lastActive ? new Date(p.lastActive).toLocaleDateString() : 'Never'}</td>
                          <td style={{ padding: '11px 14px' }}>
                            {p.swapCandidate && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#FF5A5A', background: '#2D1010', border: '1px solid #5a2525', padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                                ⚠ Swap candidate
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
