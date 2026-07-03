import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = { pending: S.amber, confirmed: S.blue, paid: S.green }
const STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed (unpaid)', paid: 'Paid' }

function Card({ children, style }) {
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, ...style }}>{children}</div>
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState(null)
  const [contractors, setContractors] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      const [{ data: refs }, { data: cons }] = await Promise.all([
        supabase.from('contractor_referrals').select('*').order('created_at', { ascending: false }),
        supabase.from('contractors').select('id, name, referral_code'),
      ])
      setReferrals(refs || [])
      setContractors(Object.fromEntries((cons || []).map(c => [c.id, c])))
    }
    load()
  }, [])

  const rows = useMemo(() => {
    if (!referrals) return []
    return statusFilter === 'all' ? referrals : referrals.filter(r => r.status === statusFilter)
  }, [referrals, statusFilter])

  const totals = useMemo(() => {
    const all = referrals || []
    const sum = arr => arr.reduce((s, r) => s + Number(r.commission_amount), 0)
    return {
      count: all.length,
      pending: sum(all.filter(r => r.status === 'pending')),
      unpaid: sum(all.filter(r => r.status === 'confirmed')),
      paid: sum(all.filter(r => r.status === 'paid')),
      revenue: all.reduce((s, r) => s + Number(r.sale_amount), 0),
    }
  }, [referrals])

  const topReferrers = useMemo(() => {
    const byContractor = {}
    for (const r of referrals || []) {
      byContractor[r.contractor_id] = byContractor[r.contractor_id] || { count: 0, commission: 0 }
      byContractor[r.contractor_id].count++
      byContractor[r.contractor_id].commission += Number(r.commission_amount)
    }
    return Object.entries(byContractor)
      .map(([id, v]) => ({ id, name: contractors[id]?.name || '—', code: contractors[id]?.referral_code || '', ...v }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 8)
  }, [referrals, contractors])

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
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>🤝 Contractor Referrals</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>Every referral, commissions owed, and top referring partners.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            [String(totals.count), 'Total referrals', S.offwhite],
            [`$${totals.revenue.toFixed(2)}`, 'Referred revenue', S.offwhite],
            [`$${totals.pending.toFixed(2)}`, 'Pending commissions', S.amber],
            [`$${totals.unpaid.toFixed(2)}`, 'Confirmed — unpaid', S.blue],
            [`$${totals.paid.toFixed(2)}`, 'Commissions paid', S.green],
          ].map(([val, label, color]) => (
            <Card key={label} style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: C.display, fontSize: 24, color, marginBottom: 4 }}>{val}</div>
              <div style={{ fontSize: 12, color: S.muted }}>{label}</div>
            </Card>
          ))}
        </div>

        {topReferrers.length > 0 && (
          <Card style={{ padding: 22, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, marginBottom: 14 }}>Top referring contractors</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
              {topReferrers.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontFamily: C.display, fontSize: 18, color: i === 0 ? S.green : S.muted, minWidth: 24 }}>#{i + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: S.offwhite, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: S.muted }}>{t.count} referral{t.count === 1 ? '' : 's'} · <span style={{ color: S.green, fontWeight: 700 }}>${t.commission.toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'paid'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{ background: statusFilter === f ? S.card : 'transparent', border: `1px solid ${statusFilter === f ? S.border : 'transparent'}`, borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: statusFilter === f ? S.offwhite : S.muted, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {!referrals ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: S.muted, fontSize: 14 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: S.muted, fontSize: 14 }}>No referrals{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ' yet'}.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Date', 'Contractor', 'Referred', 'Type', 'Plan', 'Sale', 'Commission', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.muted, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.muted, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.offwhite, fontWeight: 600 }}>{contractors[r.contractor_id]?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.muted }}>{r.member_email || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.muted, textTransform: 'capitalize' }}>{r.referral_type}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.muted, textTransform: 'capitalize' }}>{r.plan || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: S.offwhite }}>${Number(r.sale_amount).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: S.green }}>${Number(r.commission_amount).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLORS[r.status], background: STATUS_COLORS[r.status] + '22', padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
