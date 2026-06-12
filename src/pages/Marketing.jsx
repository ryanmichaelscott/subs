import { useState } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const TRADES = [
  { icon: '❄️', name: 'HVAC', discount: '15–20% off' },
  { icon: '🔧', name: 'Plumbing', discount: '10–15% off' },
  { icon: '🏠', name: 'Roofing', discount: 'Up to 15% off' },
  { icon: '⚡', name: 'Electrical', discount: '15–20% off' },
  { icon: '🪟', name: 'Windows & Doors', discount: '~35% off retail' },
  { icon: '🧱', name: 'Concrete Work', discount: 'Contractor rates' },
  { icon: '🚗', name: 'Driveway Paving', discount: 'Contractor rates' },
  { icon: '🎨', name: 'Interior Painting', discount: '10–15% off' },
  { icon: '🖌️', name: 'Exterior Painting', discount: '10–15% off' },
  { icon: '🌿', name: 'Lawn Care', discount: 'Contractor rates' },
  { icon: '🌳', name: 'Tree Service', discount: '10–15% off' },
  { icon: '🍂', name: 'Landscaping', discount: 'Contractor rates' },
  { icon: '🐛', name: 'Pest Control', discount: '~40% off' },
  { icon: '🔬', name: 'Mold Detection', discount: 'Contractor rates' },
  { icon: '💧', name: 'Water Filtration', discount: 'Contractor rates' },
  { icon: '🔨', name: 'Handyman', discount: '$65–75/hr' },
  { icon: '🏊', name: 'Pool Service', discount: 'Contractor rates' },
  { icon: '🔥', name: 'Fireplace & Chimney', discount: 'Contractor rates' },
  { icon: '🚿', name: 'Bathroom Remodel', discount: 'Contractor rates' },
  { icon: '🍳', name: 'Kitchen Remodel', discount: 'Contractor rates' },
  { icon: '🪜', name: 'Siding & Stucco', discount: 'Up to 15% off' },
  { icon: '💡', name: 'Smart Home / AV', discount: 'Contractor rates' },
  { icon: '🏗️', name: 'Additions & ADUs', discount: 'Contractor rates' },
  { icon: '🪞', name: 'Flooring', discount: '10–15% off' },
  { icon: '🧊', name: 'Insulation', discount: 'Contractor rates' },
  { icon: '🌊', name: 'Waterproofing', discount: 'Contractor rates' },
  { icon: '🔩', name: 'Fencing', discount: 'Contractor rates' },
  { icon: '🏡', name: 'Decks & Patios', discount: 'Contractor rates' },
  { icon: '🪵', name: 'Framing', discount: 'Contractor rates' },
  { icon: '🧹', name: 'House Cleaning', discount: 'Member rates' },
]

const TIERS = [
  {
    id: 'member',
    name: 'Member',
    price: 99,
    color: S.green,
    tagline: 'Contractor pricing on every trade.',
    perks: [
      'Contractor pricing on every trade in the SUBS network',
      'Member discount schedule — see your savings rate across all 30+ trades',
      'Contractor-rate discounts applied to every job — never pay retail again',
      'Priority dispatch across all vetted SUBS vendors',
      "'Is this quote fair?' concierge — text us any quote for a gut check",
    ],
  },
  {
    id: 'plus',
    name: 'Member+',
    price: 199,
    color: S.blue,
    tagline: 'Deeper discounts + concierge coordination.',
    popular: true,
    perks: [
      'Everything in Member',
      '10% off your first major project per year',
      'Enhanced contractor pricing — deeper discounts across all trades',
      'Dedicated concierge line — we coordinate every job',
      'No markup on parts or materials',
      'Vendor introductions — we make the call for you',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 399,
    color: S.purple,
    tagline: 'Maximum savings. One call does it all.',
    perks: [
      'Everything in Member+',
      '15% off all projects — no cap, no limit',
      'Dedicated home manager — one call, we handle everything',
      'Emergency priority dispatch across all trades',
      'Quarterly home maintenance briefing',
      'First access to new vendor categories as SUBS expands',
    ],
  },
]

const STEPS = [
  { icon: '🏠', title: 'Join as a member', body: 'Pay once a year. Your membership unlocks contractor-rate discounts across 30+ trades — the same pricing contractors charge each other, not the retail markup homeowners normally pay.' },
  { icon: '📋', title: 'Access your rate card', body: "Browse your member discount schedule across every trade category. See exactly what percentage off you're getting before you book anything." },
  { icon: '📲', title: 'Get a gut check or book', body: "Contact SUBS. We connect you with a vetted contractor in your trade. They come out, assess the job, and quote it — at your member rate, not retail." },
  { icon: '💰', title: 'Save thousands', body: 'Your member discount comes off the final quote. On a $25K roof, 15% off is $3,750 back in your pocket. Most members save more on a single job than a decade of membership fees.' },
]

const TESTIMONIALS = [
  { name: 'Sarah K.', tier: 'Member+', location: 'Draper, UT', quote: 'Needed a new roof. Called through SUBS, contractor came out — the quote already had my member discount baked in. Saved $3,800 vs the other two quotes I got. Membership paid for itself 40× over.' },
  { name: 'Tom B.', tier: 'Elite', location: 'South Jordan, UT', quote: "I have zero time to manage contractors. I text SUBS, they handle it. My HVAC, lawn, and pest are all on autopilot. It's like having an EA for my house." },
  { name: 'Dana M.', tier: 'Member', location: 'Murray, UT', quote: "Joined for the plumbing rate. My last emergency call was $380/hr. SUBS's rate card for the same company is $175. The $99 membership paid for itself twice in one call." },
]

const FAQS = [
  { q: 'How does the member discount actually work?', a: "Every contractor in the SUBS network has agreed to a member discount rate — typically 15–20% off their standard quote. When they come out and assess your job, the final price already reflects your membership. You're not negotiating. The discount is baked in by contract." },
  { q: 'Can I cancel anytime?', a: 'Memberships are annual and non-refundable after the first 14 days. If SUBS fails to deliver your included services, we\'ll prorate a refund for missed items. Most members renew — the savings on a single HVAC service typically cover the full annual fee.' },
  { q: 'How do you vet vendors?', a: "Every vendor in the SUBS network is licensed, insured, background-checked, and reviewed before joining. We monitor ratings after every job and remove partners who fall below 4.5. You're not calling a Yelp listing — you're calling our partner." },
  { q: 'Where is SUBS available?', a: 'SUBS currently serves the Salt Lake City metro and surrounding Utah communities. Enter your zip below to get notified when we reach your area.' },
  { q: "What's covered by the project discount?", a: "Member+ gets 10% off their first major project per year. Elite gets 15% off all work with no cap — roofing, siding, windows, HVAC, plumbing, and more. On a $25,000 roof, that's $3,750 back in your pocket." },
]

function Nav({ setSection }) {
  const links = [['how', 'How It Works'], ['membership', 'Membership'], ['network', 'The Network'], ['vendors', 'For Vendors'], ['faq', 'FAQ']]
  const [open, setOpen] = useState(false)
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: S.black + 'E8', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={() => setSection('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontFamily: C.body, fontSize: 20, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</span>
        </button>
        {/* Desktop nav links — hidden on mobile via .nav-links CSS class */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, fontSize: 13, fontWeight: 500, padding: '6px 10px', borderRadius: 6 }}>
              {label}
            </button>
          ))}
          <Link to="/contractor/login">
            <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginLeft: 4 }}>
              Partner Login
            </button>
          </Link>
          <Link to="/login">
            <button style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginLeft: 4 }}>
              Member Login
            </button>
          </Link>
        </div>
        {/* Hamburger — visible on mobile only via .nav-hamburger CSS class */}
        <button className="nav-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu" style={{ background: 'none', border: `1px solid ${S.border}`, cursor: 'pointer', gap: 4, padding: '8px 10px', borderRadius: 8, flexShrink: 0 }}>
          <span style={{ display: 'block', width: 18, height: 2, background: S.offwhite, borderRadius: 1 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: S.offwhite, borderRadius: 1 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: S.offwhite, borderRadius: 1 }} />
        </button>
      </div>
      {/* Mobile dropdown menu */}
      {open && (
        <div style={{ background: S.surface, borderTop: `1px solid ${S.border}`, padding: '8px 20px 16px', display: 'flex', flexDirection: 'column' }}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => { setSection(id); setOpen(false) }} style={{ background: 'none', border: 'none', borderBottom: `1px solid ${S.border}`, cursor: 'pointer', color: S.offwhite, fontSize: 15, fontWeight: 500, padding: '13px 4px', textAlign: 'left', minHeight: 44, width: '100%' }}>
              {label}
            </button>
          ))}
          <Link to="/contractor/login" style={{ display: 'block', marginTop: 12 }}>
            <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 14, fontWeight: 600, padding: '13px 0', borderRadius: 8, cursor: 'pointer', width: '100%', minHeight: 44 }}>
              Partner Login
            </button>
          </Link>
          <Link to="/login" style={{ display: 'block', marginTop: 8 }}>
            <button style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 8, cursor: 'pointer', width: '100%', minHeight: 44 }}>
              Member Login
            </button>
          </Link>
        </div>
      )}
    </nav>
  )
}

function Hero({ setSection }) {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px 60px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 32 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
        <span style={{ color: S.green, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>Founding member pricing — limited availability</span>
      </div>
      <h1 style={{ fontFamily: C.display, fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 400, lineHeight: 1.05, color: S.offwhite, margin: '0 0 8px' }}>
        Stop paying retail
      </h1>
      <h1 style={{ fontFamily: C.display, fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 400, lineHeight: 1.05, color: S.green, margin: '0 0 32px' }}>
        for home services.
      </h1>
      <p style={{ fontSize: 18, color: S.muted, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6 }}>
        SUBS is a membership that unlocks contractor pricing on every trade that touches your home. Whatever the job costs — you pay the contractor rate, not the retail rate. Over 30 trades. One annual fee.
      </p>
      <div className="hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
        <Link to="/login">
          <button style={{ background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 10, cursor: 'pointer' }}>
            Sign Up Today →
          </button>
        </Link>
        <button onClick={() => setSection('vendors')} style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 15, fontWeight: 500, padding: '14px 28px', borderRadius: 10, cursor: 'pointer' }}>
          Join as a vendor
        </button>
      </div>
      <div className="stat-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${S.border}`, borderLeft: `1px solid ${S.border}` }}>
        {[['$1,300', 'avg annual savings at member rates'], ['$3,750', 'saved on a single $25K roof at 15% off'], ['30+', 'trade categories at contractor rates']].map(([stat, label], i) => (
          <div key={i} style={{ padding: '28px 24px', borderRight: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, textAlign: 'center' }}>
            <div style={{ fontFamily: C.display, fontSize: 40, color: S.green, marginBottom: 8 }}>{stat}</div>
            <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.4 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 12 }}>How SUBS Works</div>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(32px, 5vw, 52px)', color: S.offwhite, fontWeight: 400, margin: '0 0 16px' }}>
            Costco cracked this model.<br />SUBS brings it to your home.
          </h2>
          <p style={{ fontSize: 15, color: S.muted, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Costco negotiates wholesale rates and passes the savings to members. SUBS does exactly that for home services — every trade, every job, contractor pricing.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 2 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{step.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: S.green, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {i + 1}</div>
              <div style={{ fontFamily: C.display, fontSize: 20, color: S.offwhite, marginBottom: 10 }}>{step.title}</div>
              <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Membership() {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontFamily: C.display, fontSize: 'clamp(32px, 5vw, 52px)', color: S.offwhite, fontWeight: 400, margin: '0 0 16px' }}>
          One membership.<br />Every trade. Contractor rates.
        </h2>
        <p style={{ fontSize: 14, color: S.muted }}>Annual billing only. Cancel in the first 14 days for a full refund.</p>
      </div>
      <div className="tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
        {TIERS.map((tier) => (
          <div key={tier.id} style={{ background: S.card, border: `2px solid ${tier.popular ? tier.color : S.border}`, borderRadius: 16, padding: 28, position: 'relative' }}>
            {tier.popular && (
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: tier.color, color: S.black, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                ⭐ MOST POPULAR
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: tier.color, marginBottom: 8 }}>{tier.name}</div>
            <div style={{ fontFamily: C.display, fontSize: 44, color: S.offwhite, lineHeight: 1, marginBottom: 4 }}>
              ${tier.price}<span style={{ fontSize: 16, color: S.muted, fontFamily: C.body }}>/yr</span>
            </div>
            <p style={{ fontSize: 13, color: S.muted, margin: '4px 0 24px' }}>{tier.tagline}</p>
            <ul style={{ listStyle: 'none', marginBottom: 28, padding: 0 }}>
              {tier.perks.map((perk, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, fontSize: 13, color: S.offwhite, lineHeight: 1.4 }}>
                  <span style={{ color: S.green, flexShrink: 0, marginTop: 1 }}>✓</span>{perk}
                </li>
              ))}
            </ul>
            <Link to="/login">
              <button style={{ width: '100%', background: tier.popular ? tier.color : S.surface, border: `1px solid ${tier.popular ? 'transparent' : S.border}`, color: tier.popular ? S.black : S.offwhite, fontSize: 14, fontWeight: 700, padding: '12px 0', borderRadius: 10, cursor: 'pointer' }}>
                Join {tier.name}
              </button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function Network() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? TRADES : TRADES.slice(0, 10)

  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(32px, 5vw, 52px)', color: S.offwhite, fontWeight: 400, margin: '0 0 16px' }}>
            Vetted contractors.<br />Published member rates.
          </h2>
          <p style={{ fontSize: 15, color: S.muted, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Every contractor in the SUBS network is licensed, insured, and has agreed to honor published member pricing. Rates are verified after every job.
          </p>
        </div>
        <div className="trades-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
          {visible.map((trade, i) => (
            <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 14px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{trade.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite, marginBottom: 4 }}>{trade.name}</div>
              <div style={{ fontSize: 11, color: S.green }}>{trade.discount}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 13, fontWeight: 600, padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}
          >
            {expanded ? 'Show less ▲' : `View all ${TRADES.length} trades ▼`}
          </button>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 44px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>What members say</h2>
      </div>
      <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {TESTIMONIALS.map((t, i) => (
          <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 28 }}>
            <p style={{ fontSize: 15, color: S.offwhite, lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic' }}>"{t.quote}"</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.offwhite }}>{t.name}</div>
                <div style={{ fontSize: 12, color: S.muted }}>{t.location}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.greenDim + '44', padding: '4px 10px', borderRadius: 100 }}>{t.tier}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ForVendors() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', category: '', years: '' })
  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 12px', color: S.offwhite, fontSize: 14, outline: 'none' }

  async function handleApply() {
    setError(null)
    setSubmitting(true)
    const { error: err } = await supabase.from('contractors').insert({
      name: form.company,
      contact_name: form.name,
      contact_email: form.email,
      trade: form.category,
      years_experience: form.years ? parseInt(form.years) : null,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSubmitted(true)
  }

  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <div className="vendors-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 16 }}>For Contractors</div>
            <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 48px)', color: S.offwhite, fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>
              Zero lead cost.<br /><span style={{ color: S.green }}>Pre-qualified homeowners.</span>
            </h2>
            <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, marginBottom: 36 }}>
              SUBS sends pre-qualified, pre-sold homeowners directly to our partners. No bidding, no slow seasons, no lead gen cost. Just booked jobs.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {[['500+', 'Members by end of 2026'], ['$0', 'Lead gen cost to you'], ['48hr', 'Guaranteed payment'], ['1', 'Exclusive per category']].map(([stat, label]) => (
                <div key={stat} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontFamily: C.display, fontSize: 28, color: S.green }}>{stat}</div>
                  <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            {['Pre-sold customers — zero marketing cost', 'Route density — multiple jobs per neighborhood', 'Exclusive territory in your category', 'Portal: jobs, payouts, and performance'].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: S.offwhite, marginBottom: 10 }}>
                <span style={{ color: S.green }}>✓</span> {item}
              </div>
            ))}
          </div>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 32 }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 8 }}>Application received</div>
                <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6 }}>We review every application personally. You'll hear back within 2 business days.</p>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 24 }}>Apply to join the network</div>
                {[['Your name', 'name', 'text'], ['Company name', 'company', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ['Years in business', 'years', 'number']].map(([label, key, type]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>{label}</label>
                    <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 5, fontWeight: 500 }}>Service category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, background: S.surface }}>
                    <option value="">Select trade...</option>
                    {TRADES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                {error && <div style={{ fontSize: 13, color: '#FF5A5A', marginBottom: 12 }}>{error}</div>}
                <button onClick={handleApply} disabled={submitting} style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting…' : 'Apply Now'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <Link to="/contractor/login" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>
                    Already a partner? <span style={{ color: S.green, fontWeight: 600 }}>Log in →</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section style={{ maxWidth: 800, margin: '0 auto', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div>
        <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 44px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>Everything about how SUBS works.</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {FAQS.map((item, i) => (
          <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', textAlign: 'left', gap: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: S.offwhite }}>{item.q}</span>
              <span style={{ color: S.green, fontSize: 18, flexShrink: 0, display: 'inline-block', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
            </button>
            {open === i && <div style={{ padding: '0 20px 18px', fontSize: 14, color: S.muted, lineHeight: 1.7 }}>{item.a}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}

function BottomCTA() {
  return (
    <section style={{ background: S.forest, borderTop: `1px solid ${S.greenDim}` }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 16 }}>Limited Founding Member Pricing</div>
        <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 48px)', color: S.offwhite, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.15 }}>
          The most obvious purchase<br />a homeowner can make.
        </h2>
        <p style={{ fontSize: 15, color: '#A8C4A0', lineHeight: 1.7, marginBottom: 36 }}>
          One roof. One HVAC system. One plumbing job. At member discount rates, any single job saves more than a decade of membership fees.
        </p>
        <Link to="/login">
          <button style={{ background: S.green, border: 'none', color: S.black, fontSize: 16, fontWeight: 700, padding: '16px 32px', borderRadius: 12, cursor: 'pointer' }}>
            See all plans →
          </button>
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: S.black, borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 32px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', marginBottom: 12 }}>SUBS</div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6, maxWidth: 260, margin: 0 }}>The membership that unlocks contractor pricing on every trade that touches your home.</p>
          </div>
          {[
            { title: 'Membership', links: ['Member', 'Member+', 'Elite', 'Founding Rate'] },
            { title: 'Company', links: ['How It Works', 'Vendor Network', 'FAQ', 'For Vendors'] },
            { title: 'Legal', links: ['Terms', 'Privacy', 'Licensing'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
              {col.links.map(link => (
                <div key={link} style={{ fontSize: 13, color: S.muted, marginBottom: 10, cursor: 'pointer' }}>{link}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: S.muted }}>© 2026 SUBS Membership. All rights reserved.</span>
          <span style={{ fontSize: 12, color: S.muted }}>SUBS.co</span>
        </div>
      </div>
    </footer>
  )
}

export default function Marketing() {
  const scrollTo = (id) => {
    setTimeout(() => {
      const el = document.getElementById('section-' + id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <Nav setSection={scrollTo} />
      <div id="section-home"><Hero setSection={scrollTo} /></div>
      <div id="section-how"><HowItWorks /></div>
      <div id="section-membership"><Membership /></div>
      <div id="section-network"><Network /></div>
      <Testimonials />
      <div id="section-vendors"><ForVendors /></div>
      <div id="section-faq"><FAQ /></div>
      <BottomCTA />
      <Footer />
    </div>
  )
}
