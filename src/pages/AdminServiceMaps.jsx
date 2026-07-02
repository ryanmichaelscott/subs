import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

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

// Utah counties — population-center anchor coords + "reach" (miles from anchor that
// still counts as inside the county, sized roughly to the populated area)
const UT_COUNTIES = [
  { name: 'Salt Lake',  lat: 40.67, lng: -111.92, reach: 15, primary: true },
  { name: 'Utah',       lat: 40.25, lng: -111.68, reach: 20, primary: true },
  { name: 'Davis',      lat: 41.00, lng: -111.95, reach: 12, primary: true },
  { name: 'Weber',      lat: 41.24, lng: -111.97, reach: 12, primary: true },
  { name: 'Washington', lat: 37.10, lng: -113.55, reach: 20, primary: true },
  { name: 'Cache',      lat: 41.74, lng: -111.83, reach: 15 },
  { name: 'Tooele',     lat: 40.53, lng: -112.30, reach: 20 },
  { name: 'Summit',     lat: 40.65, lng: -111.50, reach: 20 },
  { name: 'Wasatch',    lat: 40.51, lng: -111.41, reach: 15 },
  { name: 'Box Elder',  lat: 41.51, lng: -112.02, reach: 20 },
  { name: 'Iron',       lat: 37.68, lng: -113.06, reach: 20 },
  { name: 'Morgan',     lat: 41.04, lng: -111.68, reach: 12 },
  { name: 'Juab',       lat: 39.71, lng: -111.84, reach: 20 },
  { name: 'Sanpete',    lat: 39.37, lng: -111.58, reach: 20 },
  { name: 'Sevier',     lat: 38.77, lng: -112.08, reach: 20 },
  { name: 'Carbon',     lat: 39.60, lng: -110.81, reach: 20 },
  { name: 'Emery',      lat: 39.02, lng: -110.96, reach: 25 },
  { name: 'Grand',      lat: 38.57, lng: -109.55, reach: 25 },
  { name: 'San Juan',   lat: 37.62, lng: -109.48, reach: 30 },
  { name: 'Uintah',     lat: 40.46, lng: -109.53, reach: 25 },
  { name: 'Duchesne',   lat: 40.30, lng: -110.01, reach: 25 },
  { name: 'Millard',    lat: 39.06, lng: -112.45, reach: 25 },
  { name: 'Beaver',     lat: 38.28, lng: -112.64, reach: 20 },
  { name: 'Garfield',   lat: 37.82, lng: -112.44, reach: 25 },
  { name: 'Kane',       lat: 37.05, lng: -112.53, reach: 25 },
  { name: 'Piute',      lat: 38.31, lng: -112.19, reach: 20 },
  { name: 'Wayne',      lat: 38.40, lng: -111.64, reach: 25 },
  { name: 'Rich',       lat: 41.83, lng: -111.32, reach: 20 },
  { name: 'Daggett',    lat: 40.99, lng: -109.72, reach: 25 },
]

const STATE_COUNTIES = { UT: UT_COUNTIES }

// Utah zip → approx coords for radius-type contractors (major cities), with
// 3-digit prefix fallback for anything not listed
const UT_ZIP_COORDS = {
  // Salt Lake County
  '84020': [40.52, -111.86], '84044': [40.70, -112.10], '84047': [40.61, -111.90],
  '84065': [40.52, -111.98], '84070': [40.58, -111.89], '84084': [40.62, -111.96],
  '84088': [40.60, -111.97], '84092': [40.57, -111.83], '84093': [40.59, -111.83],
  '84094': [40.57, -111.86], '84095': [40.56, -111.98], '84096': [40.51, -112.03],
  '84006': [40.61, -112.10], '84009': [40.54, -112.02], '84118': [40.65, -111.99],
  '84119': [40.69, -111.94], '84120': [40.69, -112.00], '84121': [40.62, -111.82],
  '84123': [40.66, -111.92], '84106': [40.71, -111.85], '84109': [40.70, -111.81],
  '84117': [40.66, -111.83], '84124': [40.68, -111.82], '84128': [40.70, -112.05],
  // Utah County
  '84003': [40.38, -111.80], '84004': [40.46, -111.77], '84005': [40.31, -112.01],
  '84042': [40.34, -111.72], '84043': [40.39, -111.85], '84045': [40.35, -111.90],
  '84057': [40.31, -111.71], '84058': [40.28, -111.72], '84059': [40.31, -111.72],
  '84062': [40.36, -111.74], '84097': [40.31, -111.67], '84601': [40.23, -111.66],
  '84604': [40.27, -111.65], '84606': [40.22, -111.63], '84651': [40.03, -111.73],
  '84653': [40.05, -111.67], '84655': [39.97, -111.79], '84660': [40.11, -111.65],
  '84663': [40.17, -111.61], '84664': [40.13, -111.58],
  // Davis County
  '84010': [40.89, -111.88], '84014': [40.92, -111.87], '84015': [41.11, -112.03],
  '84025': [40.98, -111.89], '84037': [41.03, -111.94], '84040': [41.09, -111.94],
  '84041': [41.06, -111.97], '84054': [40.85, -111.91], '84056': [41.12, -111.99],
  '84075': [41.09, -112.06], '84087': [40.87, -111.90],
  // Weber County
  '84067': [41.16, -112.03], '84401': [41.22, -111.97], '84403': [41.19, -111.94],
  '84404': [41.27, -112.00], '84405': [41.17, -111.97], '84414': [41.31, -111.96],
  '84315': [41.16, -112.12], '84310': [41.31, -111.83],
  // Washington County
  '84770': [37.10, -113.58], '84780': [37.13, -113.51], '84790': [37.07, -113.55],
  '84765': [37.13, -113.65], '84737': [37.18, -113.29], '84745': [37.20, -113.27],
  '84738': [37.17, -113.68], '84767': [37.19, -112.99],
  // Cache / Box Elder
  '84321': [41.74, -111.83], '84341': [41.77, -111.81], '84335': [41.84, -111.83],
  '84302': [41.51, -112.02], '84337': [41.71, -112.17],
  // Tooele
  '84074': [40.53, -112.30], '84029': [40.60, -112.46],
  // Summit / Wasatch / Morgan
  '84060': [40.65, -111.50], '84098': [40.69, -111.54], '84036': [40.64, -111.28],
  '84017': [40.92, -111.40], '84032': [40.51, -111.41], '84049': [40.51, -111.47],
  '84050': [41.04, -111.68],
  // Southern / rural
  '84720': [37.68, -113.06], '84721': [37.71, -113.06], '84648': [39.71, -111.84],
  '84627': [39.36, -111.59], '84642': [39.27, -111.64], '84701': [38.77, -112.08],
  '84501': [39.60, -110.81], '84532': [38.57, -109.55], '84535': [37.87, -109.34],
  '84511': [37.62, -109.48], '84078': [40.46, -109.53], '84066': [40.30, -109.99],
  '84021': [40.16, -110.40], '84624': [39.35, -112.58], '84631': [38.97, -112.32],
  '84713': [38.28, -112.64], '84759': [37.82, -112.44], '84741': [37.05, -112.53],
  '84028': [41.95, -111.39], '84023': [40.99, -109.72], '84775': [38.30, -111.42],
  '84747': [38.40, -111.64],
}

const UT_PREFIX_COORDS = {
  '840': [40.72, -111.95], '841': [40.76, -111.89], '842': [41.22, -111.97],
  '843': [41.74, -111.83], '844': [41.22, -111.97], '845': [39.30, -110.50],
  '846': [40.23, -111.66], '847': [38.00, -112.50],
}

function zipToCoords(zip) {
  const z = String(zip || '').replace(/\D/g, '').slice(0, 5)
  if (z.length < 5) return null
  if (UT_ZIP_COORDS[z]) return UT_ZIP_COORDS[z]
  return UT_PREFIX_COORDS[z.slice(0, 3)] || null
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Normalize a contractor's service_area (JSON, legacy joined-string, or null)
// into { kind: 'counties'|'radius'|'statewide', state, counties?, coords?, radius? }
function parseServiceArea(raw) {
  if (!raw) return { kind: 'statewide', state: null }

  let sa = raw
  if (typeof sa === 'string') {
    try { sa = JSON.parse(sa) } catch { sa = null }
    if (!sa) {
      // Legacy admin-created format: "City, ST · 84043 · 25 radius"
      const str = String(raw)
      const zipMatch = str.match(/\b(\d{5})\b/)
      const stateMatch = str.match(/\b([A-Z]{2})\b/)
      const radiusMatch = str.match(/(\d+)\s*(?:mi|mile|radius)/i)
      if (zipMatch) {
        const coords = zipToCoords(zipMatch[1])
        if (coords) return { kind: 'radius', state: stateMatch?.[1] || 'UT', coords, radius: radiusMatch ? parseInt(radiusMatch[1]) : 25 }
      }
      return { kind: 'statewide', state: stateMatch?.[1] || null }
    }
  }

  const state = sa.state || null
  if (sa.type === 'radius' && sa.zip) {
    const coords = zipToCoords(sa.zip)
    if (coords) return { kind: 'radius', state, coords, radius: parseInt(sa.radius) || 25 }
    return { kind: 'statewide', state }
  }
  if (sa.type === 'county' && sa.counties) {
    const list = (Array.isArray(sa.counties) ? sa.counties : String(sa.counties).split(','))
      .map(c => String(c).replace(/county/i, '').trim().toLowerCase())
      .filter(Boolean)
    if (list.length) return { kind: 'counties', state, counties: list }
  }
  return { kind: 'statewide', state }
}

function coversCounty(sa, county, stateCode) {
  if (sa.state && sa.state !== stateCode) return false
  if (county.statewide) return true
  if (sa.kind === 'statewide') return true
  if (sa.kind === 'counties') return sa.counties.includes(county.name.toLowerCase())
  if (sa.kind === 'radius') {
    return haversineMiles(sa.coords[0], sa.coords[1], county.lat, county.lng) <= sa.radius + county.reach
  }
  return false
}

function cellColor(count) {
  if (count === 0) return { bg: '#2D1010', border: '#5a2525', text: '#FF5A5A' }
  if (count <= 2) return { bg: '#2b230d', border: '#5c4a1a', text: '#FFC24B' }
  return { bg: '#0a1c0e', border: '#1e4a28', text: S.green }
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
          <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
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
          {[['#FF5A5A', '0 — gap'], ['#FFC24B', '1–2 — thin'], [S.green, '3+ — covered']].map(([color, label]) => (
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
              <span><b style={{ color: '#FF5A5A' }}>{gapCount}</b> gaps</span>
              <span><b style={{ color: '#FFC24B' }}>{thinCount}</b> thin</span>
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
                            {c.status !== 'active' && <span style={{ fontSize: 10.5, color: '#FFC24B', flexShrink: 0 }}>approved</span>}
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
