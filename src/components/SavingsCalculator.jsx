import { useState, useMemo, useEffect } from 'react'
import { S, C } from '../theme'

// National average retail prices (2025-26 ranges from HomeAdvisor/Angi/Thumbtack-style
// published data), adjusted per-state by a home-services cost index below.
const SERVICE_PRICING = {
  'Plumbing': [
    { name: 'Water heater replacement', retail: 1850 },
    { name: 'Drain cleaning / clog removal', retail: 275 },
    { name: 'Toilet replacement', retail: 480 },
    { name: 'Faucet install', retail: 300 },
    { name: 'Main water line repair', retail: 3400 },
  ],
  'HVAC': [
    { name: 'AC replacement', retail: 6400 },
    { name: 'Furnace replacement', retail: 5300 },
    { name: 'Seasonal tune-up', retail: 200 },
    { name: 'Duct cleaning', retail: 400 },
    { name: 'Mini-split install', retail: 3800 },
  ],
  'Electrical': [
    { name: 'Panel upgrade (200 amp)', retail: 2900 },
    { name: 'EV charger install', retail: 1250 },
    { name: 'Ceiling fan install', retail: 350 },
    { name: 'Light fixture install', retail: 260 },
    { name: 'Outlet / switch replacement', retail: 210 },
  ],
  'Roofing': [
    { name: 'Full roof replacement', retail: 11500 },
    { name: 'Roof repair', retail: 1050 },
    { name: 'Roof inspection + tune-up', retail: 350 },
  ],
  'Landscaping': [
    { name: 'Sprinkler system install', retail: 3600 },
    { name: 'Sod installation', retail: 2100 },
    { name: 'Landscape design + install', retail: 5200 },
    { name: 'Spring / fall yard cleanup', retail: 420 },
  ],
  'Lawn Care': [
    { name: 'Full-season mowing service', retail: 1450 },
    { name: 'Fertilization program (yearly)', retail: 430 },
    { name: 'Aeration + overseed', retail: 320 },
  ],
  'House Cleaning': [
    { name: 'Deep clean', retail: 360 },
    { name: 'Standard clean (recurring)', retail: 190 },
    { name: 'Move-in / move-out clean', retail: 460 },
  ],
  'Handyman': [
    { name: 'Half-day (4 hours)', retail: 380 },
    { name: 'Full day (8 hours)', retail: 700 },
    { name: 'TV mount + cable concealment', retail: 220 },
    { name: 'Drywall repair', retail: 320 },
  ],
  'Interior Painting': [
    { name: 'Single room', retail: 850 },
    { name: 'Whole home interior', retail: 4800 },
    { name: 'Cabinet painting', retail: 3100 },
  ],
  'Exterior Painting': [
    { name: 'Full exterior repaint', retail: 5600 },
    { name: 'Trim + doors only', retail: 1300 },
  ],
  'Flooring': [
    { name: 'LVP install (~500 sq ft)', retail: 3600 },
    { name: 'Carpet install (3 rooms)', retail: 2900 },
    { name: 'Hardwood refinishing', retail: 2500 },
  ],
  'Garage Doors': [
    { name: 'New door install (2-car)', retail: 2300 },
    { name: 'Opener install', retail: 580 },
    { name: 'Spring replacement', retail: 320 },
  ],
  'Pest Control': [
    { name: 'Quarterly plan (yearly)', retail: 620 },
    { name: 'One-time treatment', retail: 270 },
    { name: 'Rodent exclusion', retail: 550 },
  ],
  'Windows & Doors': [
    { name: 'Window replacement (5 windows)', retail: 4200 },
    { name: 'Entry door replacement', retail: 2600 },
    { name: 'Sliding patio door install', retail: 2200 },
  ],
  'Window Cleaning': [
    { name: 'Full home (inside + out)', retail: 280 },
    { name: 'Exterior only', retail: 180 },
  ],
  'Gutters': [
    { name: 'Gutter replacement', retail: 1750 },
    { name: 'Gutter cleaning', retail: 190 },
    { name: 'Gutter guards install', retail: 1200 },
  ],
  'Fencing': [
    { name: 'Vinyl fence (~150 ft)', retail: 6100 },
    { name: 'Wood fence (~150 ft)', retail: 4300 },
    { name: 'Fence repair', retail: 620 },
  ],
  'Concrete Work': [
    { name: 'Driveway replacement', retail: 6600 },
    { name: 'Patio pour', retail: 3900 },
    { name: 'Walkway', retail: 1850 },
  ],
  'Tree Service': [
    { name: 'Tree removal (medium)', retail: 1250 },
    { name: 'Tree trimming', retail: 580 },
    { name: 'Stump grinding', retail: 360 },
  ],
  'Carpet Cleaning': [
    { name: 'Whole house', retail: 360 },
    { name: '3 rooms', retail: 190 },
  ],
  'Water Filtration': [
    { name: 'Water softener install', retail: 2250 },
    { name: 'Reverse osmosis system', retail: 640 },
  ],
  'Bathroom Remodel': [
    { name: 'Full bathroom remodel', retail: 12500 },
    { name: 'Tub-to-shower conversion', retail: 7600 },
    { name: 'Vanity + fixtures update', retail: 3400 },
  ],
  'Solar': [
    { name: 'Solar panel system install', retail: 19500 },
    { name: 'Panel cleaning + inspection', retail: 320 },
  ],
}

export const CALCULATOR_TRADES = Object.keys(SERVICE_PRICING)

// Relative home-services cost index by state (1.00 = national average)
const STATE_MULTIPLIERS = {
  AL: 0.88, AK: 1.22, AZ: 0.98, AR: 0.87, CA: 1.32, CO: 1.06, CT: 1.18, DE: 1.05,
  FL: 1.00, GA: 0.94, HI: 1.40, ID: 0.96, IL: 1.04, IN: 0.90, IA: 0.89, KS: 0.90,
  KY: 0.89, LA: 0.92, ME: 1.06, MD: 1.12, MA: 1.25, MI: 0.93, MN: 1.02, MS: 0.85,
  MO: 0.90, MT: 0.98, NE: 0.91, NV: 1.02, NH: 1.09, NJ: 1.20, NM: 0.93, NY: 1.28,
  NC: 0.95, ND: 0.93, OH: 0.91, OK: 0.87, OR: 1.08, PA: 1.02, RI: 1.14, SC: 0.93,
  SD: 0.92, TN: 0.92, TX: 0.97, UT: 0.98, VT: 1.08, VA: 1.04, WA: 1.14, WV: 0.86,
  WI: 0.96, WY: 0.95,
}

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

const DISCOUNT = 0.20 // estimated member discount
const MEMBERSHIP_PRICE = 99

function roundPrice(n) {
  if (n < 500) return Math.round(n / 5) * 5
  if (n < 5000) return Math.round(n / 25) * 25
  return Math.round(n / 100) * 100
}

export default function SavingsCalculator({ onJoin, joinLabel = 'Join now →', defaultState = 'UT', showStatePicker = true, onSelectionChange, belowResult }) {
  const [stateCode, setStateCode] = useState(defaultState)
  const [trade, setTrade] = useState('HVAC')
  const [serviceIdx, setServiceIdx] = useState(0)

  const services = SERVICE_PRICING[trade]
  const service = services[Math.min(serviceIdx, services.length - 1)]

  const { retail, member, savings, payback } = useMemo(() => {
    const mult = STATE_MULTIPLIERS[stateCode] || 1
    const retail = roundPrice(service.retail * mult)
    const member = roundPrice(retail * (1 - DISCOUNT))
    const savings = retail - member
    return { retail, member, savings, payback: savings / MEMBERSHIP_PRICE }
  }, [stateCode, service])

  useEffect(() => {
    onSelectionChange?.({ stateCode, stateName: STATE_NAMES[stateCode], trade, service: service.name, retail, member, savings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode, trade, service, retail, member, savings])

  const sel = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite,
    fontSize: 15, padding: '12px 14px', borderRadius: 10, outline: 'none',
    fontFamily: C.body, cursor: 'pointer', boxSizing: 'border-box',
  }
  const label = {
    display: 'block', fontSize: 11, color: S.muted, marginBottom: 7, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.09em',
  }

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 18, padding: 'clamp(22px, 4vw, 36px)' }}>
      <style>{`
        .calc-selects { display: grid; grid-template-columns: ${showStatePicker ? '1fr 1fr 1.4fr' : '1fr 1.4fr'}; gap: 14px; }
        .calc-result { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 12px; }
        @media (max-width: 640px) {
          .calc-selects { grid-template-columns: 1fr; }
          .calc-result { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="calc-selects" style={{ marginBottom: 24 }}>
        {showStatePicker && (
          <div>
            <label style={label}>Your state</label>
            <select value={stateCode} onChange={e => setStateCode(e.target.value)} style={sel}>
              {Object.keys(STATE_NAMES).map(code => <option key={code} value={code}>{STATE_NAMES[code]}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={label}>Service type</label>
          <select value={trade} onChange={e => { setTrade(e.target.value); setServiceIdx(0) }} style={sel}>
            {CALCULATOR_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>What do you need?</label>
          <select value={serviceIdx} onChange={e => setServiceIdx(Number(e.target.value))} style={sel}>
            {services.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="calc-result">
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Avg. retail price</div>
          <div style={{ fontFamily: C.display, fontSize: 'clamp(26px, 3.5vw, 34px)', color: S.muted, textDecoration: 'line-through', textDecorationColor: '#FF5A5A88' }}>
            ${retail.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>what non-members pay</div>
        </div>

        <div style={{ background: S.surface, border: `1px solid ${S.green}55`, borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.green, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>SUBS member price</div>
          <div style={{ fontFamily: C.display, fontSize: 'clamp(26px, 3.5vw, 34px)', color: S.offwhite }}>
            ${member.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: S.muted, marginTop: 6 }}>est. member rate</div>
        </div>

        <div style={{ background: '#0A1C0E', border: `1px solid ${S.green}`, borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.green, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>You save</div>
            <div style={{ fontFamily: C.display, fontSize: 'clamp(30px, 4vw, 40px)', color: S.green, lineHeight: 1 }}>
              ${savings.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: S.offwhite, marginTop: 8, fontWeight: 600 }}>
              {payback >= 1
                ? `This one job pays for your membership ${payback >= 2 ? `${Math.floor(payback)}× over` : '— and then some'}.`
                : `That's ${Math.round((savings / MEMBERSHIP_PRICE) * 100)}% of your membership back on one job.`}
            </div>
          </div>
          {onJoin && (
            <button onClick={onJoin} style={{ marginTop: 16, background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 800, padding: '13px 0', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
              {joinLabel}
            </button>
          )}
        </div>
      </div>

      {belowResult}

      <p style={{ fontSize: 11.5, color: S.muted, marginTop: 18, marginBottom: 0, lineHeight: 1.5 }}>
        * Estimates based on published national pricing data adjusted for {STATE_NAMES[stateCode] || 'your area'}, assuming a typical ~20% member discount.
        Actual prices and savings vary by job scope, home, and contractor. Not a quote.
      </p>
    </div>
  )
}
