import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { S, C } from '../theme'

const PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
]

const CURRENT_LABEL = { week: 'This week', month: 'This month', quarter: 'This quarter', year: 'This year' }
const PREV_LABEL = { week: 'Last week', month: 'Last month', quarter: 'Last quarter', year: 'Last year' }

const GREEN = '#5DFF8A'
const BLUE = '#4DA6FF'

function fmtY(v) {
  if (v === 0) return '$0'
  if (v >= 1000) return `$${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${v}`
}

function fmtDollar(v) {
  return `$${Math.abs(v).toLocaleString()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#141814', border: '1px solid #252A23', borderRadius: 10,
      padding: '10px 14px', minWidth: 170, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 11, color: S.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 13, color: p.color, marginBottom: 3 }}>
          <span style={{ color: S.muted }}>{p.name}</span>
          <strong style={{ color: p.color }}>{fmtDollar(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function RevenueChart({ supabase }) {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (p) => {
    setLoading(true)
    setError(null)
    const { data: d, error: e } = await supabase.functions.invoke('get-revenue-chart-data', {
      body: { period: p },
    })
    if (e || d?.error) {
      setError(e?.message || d?.error || 'Failed to load revenue data')
      setData(null)
    } else {
      setData(d)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load(period) }, [period, load])

  const summary = data?.summary
  const points = data?.points ?? []
  const pct = summary?.pct_change ?? 0
  const diff = summary ? summary.current_total - summary.previous_total : 0

  // X axis: only tick every Nth label to avoid crowding for month/quarter
  const xInterval = period === 'month' ? 4 : period === 'quarter' ? 1 : 0

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite }}>Member Revenue</div>

        {/* Period toggle */}
        <div style={{ display: 'flex', gap: 3, background: S.surface, borderRadius: 8, padding: 3 }}>
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                background: period === key ? GREEN : 'transparent',
                border: 'none',
                color: period === key ? S.black : S.muted,
                fontSize: 12, fontWeight: 600, padding: '5px 11px',
                borderRadius: 6, cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px 14px', marginBottom: 20 }}>
        <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, lineHeight: 1 }}>
          {summary ? fmtDollar(summary.current_total) : '—'}
        </div>

        {summary && (
          <div style={{
            fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 20, lineHeight: 1.4,
            background: pct >= 0 ? `${GREEN}25` : '#FF5A5A25',
            color: pct >= 0 ? GREEN : '#FF5A5A',
          }}>
            {pct >= 0 ? '+' : ''}{pct}%
          </div>
        )}

        {summary && (
          <div style={{ fontSize: 12, color: S.muted }}>
            vs {fmtDollar(summary.previous_total)} {PREV_LABEL[period].toLowerCase()}
            <span style={{ color: diff >= 0 ? GREEN : '#FF5A5A', marginLeft: 5, fontWeight: 600 }}>
              {diff >= 0 ? '+' : '−'}{fmtDollar(diff)}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 2, background: GREEN, borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: S.muted }}>{CURRENT_LABEL[period]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="22" height="4" style={{ flexShrink: 0, display: 'block' }}>
            <line x1="0" y1="2" x2="22" y2="2" stroke={BLUE} strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          <span style={{ fontSize: 11, color: S.muted }}>{PREV_LABEL[period]}</span>
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: S.muted }}>Loading…</span>
        </div>
      ) : error ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: '#FF5A5A' }}>{error}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={S.border} vertical={false} />
            <XAxis
              dataKey="label"
              stroke="transparent"
              tick={{ fill: S.muted, fontSize: 11, fontFamily: 'system-ui' }}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: S.muted, fontSize: 11, fontFamily: 'system-ui' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtY}
              width={52}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: S.border, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={GREEN}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: GREEN, stroke: S.card, strokeWidth: 2 }}
              name={CURRENT_LABEL[period]}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke={BLUE}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: BLUE, stroke: S.card, strokeWidth: 2 }}
              name={PREV_LABEL[period]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Contractor revenue — only shown if there's any */}
      {summary && (summary.contractor_current > 0 || summary.contractor_previous > 0) && (
        <div style={{
          marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Contractor Revenue
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: BLUE, fontWeight: 600 }}>{fmtDollar(summary.contractor_current)}</span>
            <span style={{ color: S.muted, marginLeft: 5 }}>this {period}</span>
          </div>
          <div style={{ fontSize: 12, color: S.muted }}>
            vs {fmtDollar(summary.contractor_previous)} {PREV_LABEL[period].toLowerCase()}
          </div>
        </div>
      )}
    </div>
  )
}
