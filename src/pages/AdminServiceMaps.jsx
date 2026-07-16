import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import { STATE_COUNTIES, parseServiceArea, coversCounty } from '../lib/utGeo'

const TRADES_LIST = [
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

function cellColor(count) {
  if (count === 0) return { bg: '#F6E7E2', border: '#E3BEB3', text: '#B3402F' }
  if (count <= 2) return { bg: '#F3ECD7', border: '#DCC98F', text: '#8F701F' }
  return { bg: '#E7EFE0', border: '#1e4a28', text: S.green }
}

export default function AdminServiceMaps() {
  const [contractors, setContractors] = useState(null)
  const [trade, setTrade] = useState('Plumbing')
  const [stateCode, setStateCode] = useState('UT')
  const [showAllCounties, setShowAllCounties] = useState(false)
  const [includeApproved, setIncludeApproved] = useState(false)
  const [view, setView] = useState('trade') // 'trade' | 'matrix'
  const [expandedCounty, setExpandedCounty] = useState(null)

  useEffect(() => {
    supabase
      .from('contractors')
      .select('id, name, trade, trades, status, service_area')
      .in('status', ['active', 'approved'])
      .then(({ data }) => setContractors(data || []))
  }, [])

  const pool = useMemo(() => {
    if (!contractors) return []
    return contractors
      .filter(c => includeApproved ? true : c.status === 'active')
      .map(c => ({ ...c, sa: parseServiceArea(c.service_area), tradeList: (c.trades?.length ? c.trades : [c.trade]).filter(Boolean) }))
  }, [contractors, includeApproved])

  const counties = useMemo(() => {
    const list = STATE_COUNTIES[stateCode]
    if (!list) return [{ name: 'Statewide', statewide: true }]
    return showAllCounties ? list : list.filter(c => c.primary)
  }, [stateCode, showAllCounties])

  const hasCountyData = !!STATE_COUNTIES[stateCode]

  // For the selected trade: county → matching contractors
  const tradeCoverage = useMemo(() => {
    const matching = pool.filter(c => c.tradeList.includes(trade))
    return counties.map(county => ({
      county,
      contractors: matching.filter(c => coversCounty(c.sa, county, stateCode)),
    }))
  }, [pool, trade, counties, stateCode])

  // Matrix: trade → per-county counts
  const matrix = useMemo(() => {
    if (view !== 'matrix') return []
    return TRADES_LIST.map(t => {
      const matching = pool.filter(c => c.tradeList.includes(t))
      return {
        trade: t,
        counts: counties.map(county => matching.filter(c => coversCounty(c.sa, county, stateCode)).length),
      }
    })
  }, [view, pool, counties, stateCode])

  const gapCount = tradeCoverage.filter(x => x.contractors.length === 0).length
  const thinCount = tradeCoverage.filter(x => x.contractors.length >= 1 && x.contractors.length <= 2).length
  const coveredCount = tradeCoverage.filter(x => x.contractors.length >= 3).length

  const sel = {
    background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite,
    fontSize: 14, padding: '9px 12px', borderRadius: 9, outline: 'none', fontFamily: C.body, cursor: 'pointer',
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F0', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><span style={{ fontFamily: C.display, fontSize: 24, fontWeight: 400, color: S.green, lineHeight: 1, letterSpacing: '0.02em' }}>SUBS</span></Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: S.danger, background: S.danger + '22', padding: '3px 10px', borderRadius: 100 }}>Admin</span>
        </div>
        <Link to="/admin/dashboard" style={{ fontSize: 13, color: S.muted, textDecoration: 'none', border: `1px solid ${S.border}`, padding: '7px 14px', borderRadius: 8 }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite }}>🗺 Service Maps</div>
          <div style={{ fontSize: 14, color: S.muted, marginTop: 4 }}>Contractor coverage by trade and area — find recruitment gaps fast.</div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 2, background: S.surface, borderRadius: 9, padding: 3, border: `1px solid ${S.border}` }}>
            {[['trade', 'By Trade'], ['matrix', 'All Trades Matrix']].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} style={{ background: view === id ? S.card : 'transparent', border: view === id ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: view === id ? S.offwhite : S.muted, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {view === 'trade' && (
            <select value={trade} onChange={e => setTrade(e.target.value)} style={sel}>
              {TRADES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <select value={stateCode} onChange={e => { setStateCode(e.target.value); setExpandedCounty(null) }} style={sel}>
            {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>

          {hasCountyData && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: S.muted, cursor: 'pointer' }}>
              <input type="checkbox" checked={showAllCounties} onChange={e => setShowAllCounties(e.target.checked)} style={{ accentColor: S.green }} />
              All {STATE_COUNTIES[stateCode].length} counties
            </label>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: S.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeApproved} onChange={e => setIncludeApproved(e.target.checked)} style={{ accentColor: S.green }} />
            Include approved (not yet subscribed)
          </label>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 24, fontSize: 12.5, color: S.muted, flexWrap: 'wrap' }}>
          {[['#B3402F', '0 — gap'], ['#8F701F', '1–2 — thin'], [S.green, '3+ — covered']].map(([color, label]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
            </span>
          ))}
        </div>

        {!contractors && (
          <div style={{ color: S.muted, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Loading contractors…</div>
        )}

        {contractors && !hasCountyData && (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: S.muted }}>
            County-level data isn't loaded for this state yet — showing statewide coverage.
          </div>
        )}

        {/* By-trade view */}
        {contractors && view === 'trade' && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 13, color: S.muted, flexWrap: 'wrap' }}>
              <span><b style={{ color: '#B3402F' }}>{gapCount}</b> gaps</span>
              <span><b style={{ color: '#8F701F' }}>{thinCount}</b> thin</span>
              <span><b style={{ color: S.green }}>{coveredCount}</b> covered</span>
              <span>· {trade} · {pool.filter(c => c.tradeList.includes(trade)).length} contractor{pool.filter(c => c.tradeList.includes(trade)).length === 1 ? '' : 's'} in pool</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {tradeCoverage.map(({ county, contractors: covering }) => {
                const colors = cellColor(covering.length)
                const isExpanded = expandedCounty === county.name
                return (
                  <div key={county.name}
                    onClick={() => setExpandedCounty(isExpanded ? null : county.name)}
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{county.name}{!county.statewide && ' County'}</div>
                      <div style={{ fontFamily: C.display, fontSize: 26, color: colors.text }}>{covering.length}</div>
                    </div>
                    <div style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>
                      {covering.length === 0 ? 'No coverage — recruit here' : covering.length <= 2 ? 'Thin coverage' : 'Covered'}
                    </div>
                    {isExpanded && covering.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                        {covering.map(c => (
                          <div key={c.id} style={{ fontSize: 12.5, color: S.offwhite, padding: '3px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            {c.status !== 'active' && <span style={{ fontSize: 10.5, color: '#8F701F', flexShrink: 0 }}>approved</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* All-trades matrix view */}
        {contractors && view === 'matrix' && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: `1px solid ${S.border}`, borderRadius: 12 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: counties.length * 84 + 180 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: S.card, textAlign: 'left', fontSize: 12, color: S.muted, fontWeight: 600, padding: '10px 14px', borderBottom: `1px solid ${S.border}`, zIndex: 2, minWidth: 180 }}>Trade</th>
                  {counties.map(c => (
                    <th key={c.name} style={{ background: S.card, fontSize: 11.5, color: S.muted, fontWeight: 600, padding: '10px 6px', borderBottom: `1px solid ${S.border}`, whiteSpace: 'nowrap' }}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.trade}>
                    <td style={{ position: 'sticky', left: 0, background: S.card, fontSize: 12.5, color: S.offwhite, fontWeight: 600, padding: '8px 14px', borderBottom: `1px solid ${S.border}`, whiteSpace: 'nowrap', zIndex: 1 }}>
                      {row.trade}
                    </td>
                    {row.counts.map((count, i) => {
                      const colors = cellColor(count)
                      return (
                        <td key={i}
                          title={`${row.trade} — ${counties[i].name}: ${count}`}
                          onClick={() => { setTrade(row.trade); setView('trade') }}
                          style={{ background: colors.bg, color: colors.text, fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '8px 6px', borderBottom: `1px solid ${S.border}`, borderLeft: `1px solid ${S.border}`, cursor: 'pointer' }}>
                          {count}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
