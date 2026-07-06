import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import SavingsCalculator from '../components/SavingsCalculator'

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
  { icon: '🌊', name: 'Fire, Mold & Flood Restoration', discount: 'Contractor rates' },
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
  { icon: '🪟', name: 'Window Cleaning', discount: 'Member rates' },
]

const TIERS = [
  {
    id: 'member',
    name: 'Member',
    priceId: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
    price: 99,
    color: S.green,
    tagline: 'Access the SUBS contractor network.',
    perks: [
      'Access to the vetted SUBS contractor network',
      'Member discounts on every service',
      'Up to 5 service requests per year',
      'Digital membership card',
      'Concierge line — call us to find and book the right contractor',
      '30-day money back guarantee',
    ],
  },
  {
    id: 'plus',
    name: 'Member+',
    priceId: 'price_1TjQ8TAYDs9oVarWqCQyxLM5',
    price: 179,
    color: S.blue,
    tagline: 'Unlimited requests + priority access.',
    popular: true,
    perks: [
      'Everything in Member',
      'Unlimited service requests',
      'Better rates + priority access',
      'Priority concierge — skip the queue, faster response',
      'Full job history and account management',
      'Annual home maintenance checklist email on signup',
      'Early access to new contractors and trades',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    priceId: 'price_1TjQ7DAYDs9oVarWbJONkQ1P',
    price: 349,
    color: S.purple,
    tagline: 'Concierge booking. VIP priority.',
    perks: [
      'Everything in Member+',
      'Best available rates + VIP priority scheduling',
      'White glove concierge — we call, schedule, and coordinate everything. You do nothing.',
      'Same-week scheduling guaranteed',
      'Dedicated SUBS home advisor',
      'First access to top rated contractors in your area',
    ],
  },
]

const STEPS = [
  { icon: '🏠', title: 'Join as a member', body: 'Pay once a year. Your membership unlocks contractor-rate discounts across 30+ trades — the same pricing contractors charge each other, not the retail markup homeowners normally pay.' },
  { icon: '📋', title: 'Access your rate card', body: "Browse your member discount schedule across every trade category. See exactly what percentage off you're getting before you book anything." },
  { icon: '📲', title: 'Get a gut check or book', body: "Contact SUBS. We connect you with a vetted contractor in your trade. They come out, assess the job, and quote it — at your member rate, not retail." },
  { icon: '💰', title: 'Save thousands', body: 'Your member discount comes off the final quote. On a $25K roof, 15% off is $3,750 back in your pocket. Most members save more on a single job than a decade of membership fees.' },
]

const FAQS = [
  { q: 'How does the member discount actually work?', a: "Every contractor in the SUBS network has agreed to a member discount rate — typically 15–20% off their standard quote. When they come out and assess your job, the final price already reflects your membership. You're not negotiating. The discount is baked in by contract." },
  { q: 'Can I cancel anytime?', a: 'Memberships are annual and non-refundable after the first 14 days. If SUBS fails to deliver your included services, we\'ll prorate a refund for missed items. Most members renew — the savings on a single HVAC service typically cover the full annual fee.' },
  { q: 'How do you vet vendors?', a: "Every vendor in the SUBS network is licensed, insured, background-checked, and reviewed before joining. We monitor ratings after every job and remove partners who fall below 4.5. You're not calling a Yelp listing — you're calling our partner." },
  { q: 'Where is SUBS available?', a: 'SUBS currently serves the Salt Lake City metro and surrounding Utah communities. Enter your zip below to get notified when we reach your area.' },
  { q: "What's the difference between Member+ and Elite?", a: "Member+ gives you unlimited service requests, enhanced pricing, and priority access. Elite adds concierge booking (we call and schedule for you), same-week scheduling, a dedicated SUBS home advisor, and first access to top rated contractors in your area." },
]

function Nav({ setSection }) {
  const links = [['how', 'How It Works'], ['membership', 'Membership'], ['network', 'The Network'], ['vendors', 'For Vendors'], ['faq', 'FAQ']]
  const [open, setOpen] = useState(false)
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: S.black + 'E8', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={() => setSection('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'block', fontFamily: C.body, fontSize: 20, fontWeight: 800, color: S.green, letterSpacing: '0.06em', lineHeight: 1 }}>SUBS</span>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: S.green + '80', letterSpacing: '0.1em', lineHeight: 1, marginTop: 3 }}>Home Services Membership</span>
        </button>
        {/* Desktop nav links — hidden on mobile via .nav-links CSS class */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, fontSize: 13, fontWeight: 500, padding: '6px 10px', borderRadius: 6 }}>
              {label}
            </button>
          ))}
          <a href="tel:18884543019" style={{ fontSize: 13, fontWeight: 600, color: S.muted, textDecoration: 'none', marginLeft: 4, padding: '6px 10px' }}>
            1-888-454-3019
          </a>
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
          <a href="tel:18884543019" style={{ display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 600, color: S.green, textDecoration: 'none', padding: '13px 0', borderBottom: `1px solid ${S.border}`, minHeight: 44 }}>
            1-888-454-3019
          </a>
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

// w/h are each logo's actual pixel dimensions — reserving them via aspect-ratio keeps
// the marquee's track width stable before images load, avoiding a layout-shift/flicker.
// maxWidth reins in the couple of ultra-wide wordmark logos so they don't dominate the row.
const CONTRACTOR_LOGOS = [
  { src: '/contractor-logos/1.png', w: 946, h: 280 },
  { src: '/contractor-logos/2.png', w: 280, h: 280 },
  { src: '/contractor-logos/3.png', w: 392, h: 280 },
  { src: '/contractor-logos/4.png', w: 396, h: 280 },
  { src: '/contractor-logos/5.png', w: 2585, h: 280, maxWidth: 300 },
  { src: '/contractor-logos/6.png', w: 1232, h: 280 },
  { src: '/contractor-logos/7.png', w: 376, h: 280 },
  { src: '/contractor-logos/8.png', w: 648, h: 280 },
  { src: '/contractor-logos/9.png', w: 2039, h: 280, maxWidth: 300 },
]

const UGC_VIDEOS = [
  { src: '/videos/UGC_1.mp4' },
  { src: '/videos/UGC_2.mp4' },
  { src: '/videos/UGC_3.mp4' },
]

function Hero() {
  return (
    <section style={{
      background: S.black,
      minHeight: 'calc(100vh - 58px)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'clamp(32px, 5vw, 64px) clamp(24px, 6vw, 80px)',
      boxSizing: 'border-box',
    }}>
      <style>{`
        .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; flex: 1; align-items: center; }
        .hero-invoice { display: flex; border-radius: 12px; overflow: hidden; border: 1px solid ${S.border}; }
        .hero-video-card { align-items: center; }
        .hero-video-frame { width: min(100%, 320px); }
        @media (max-width: 820px) {
          .hero-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .hero-invoice { flex-direction: column; }
        }
      `}</style>

      <div className="hero-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <h1 style={{ fontFamily: C.display, fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 400, color: S.offwhite, lineHeight: 1.05, margin: '0 0 16px' }}>
              Wholesale pricing<br />on every home service.
            </h1>
            <p style={{ fontSize: 16, color: S.muted, margin: 0, lineHeight: 1.65 }}>
              From weekly lawn care to emergency plumbing — one membership covers every home service at wholesale pricing.
            </p>
          </div>

          {/* Invoice comparison */}
          <div className="hero-invoice">
            <div style={{ flex: 1, background: S.surface, padding: '22px 26px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Without SUBS</div>
              <div style={{ fontFamily: C.display, fontSize: 46, color: S.muted, lineHeight: 1, textDecoration: 'line-through', marginBottom: 10 }}>$380</div>
              <div style={{ fontSize: 12, color: S.muted }}>HVAC tune-up · standard rate</div>
            </div>
            <div style={{ flex: 1, background: '#0A1C0E', padding: '22px 26px', borderLeft: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: S.green, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Member Price</div>
              <div style={{ fontFamily: C.display, fontSize: 46, color: S.offwhite, lineHeight: 1, marginBottom: 10 }}>$165</div>
              <div style={{ fontSize: 12, color: S.green }}>You saved $215 on one call</div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => { const el = document.getElementById('section-membership'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={{ background: S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 10, cursor: 'pointer' }}>
              Start saving today
            </button>
          </div>
        </div>

        {/* Right column — owner video */}
        <div className="hero-video-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.green, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              Our Story
            </div>
            <div style={{ fontFamily: C.display, fontSize: 24, color: S.offwhite, fontWeight: 400 }}>
              Why We Started SUBS
            </div>
          </div>
          <div className="hero-video-frame" style={{ position: 'relative', aspectRatio: '9 / 16', background: '#141A12', border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <video
              src="/videos/subs_owner_video.mp4"
              autoPlay
              muted
              loop
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ContractorMarquee() {
  const logos = [...CONTRACTOR_LOGOS, ...CONTRACTOR_LOGOS]
  return (
    <section style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: '26px 0', overflow: 'hidden' }}>
      <style>{`
        @keyframes subs-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track { animation: subs-marquee-scroll 35s linear infinite; will-change: transform; }
        .marquee-viewport:hover .marquee-track { animation-play-state: paused; }
      `}</style>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase' }}>
          Our Vetted Utah Contractor Network
        </span>
      </div>
      <div
        className="marquee-viewport"
        style={{
          overflow: 'hidden',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
        }}
      >
        <div className="marquee-track" style={{ display: 'flex', alignItems: 'center', gap: 60, width: 'max-content' }}>
          {logos.map((logo, i) => (
            <img
              key={i}
              src={logo.src}
              width={logo.w}
              height={logo.h}
              alt="Vetted SUBS contractor partner logo"
              style={{
                height: 90,
                width: logo.maxWidth || 'auto',
                maxWidth: logo.maxWidth || 'none',
                display: 'block',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function SavingsSection() {
  const scrollToPlans = () => {
    const el = document.getElementById('section-membership')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '80px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 12 }}>Savings Calculator</div>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 48px)', color: S.offwhite, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.1 }}>
            See what you'd save<br />on your next job
          </h2>
          <p style={{ fontSize: 15, color: S.muted, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Pick a service. See the retail price, the member price, and what stays in your pocket.
          </p>
        </div>

        <SavingsCalculator onJoin={scrollToPlans} joinLabel="Join now →" />

        <div style={{
          marginTop: 24, background: '#0A1C0E', border: `1px solid ${S.green}44`,
          borderRadius: 12, padding: '20px 28px', textAlign: 'center',
        }}>
          <span style={{ fontSize: 15, color: S.offwhite, fontWeight: 600 }}>
            Your SUBS membership pays for itself on the very first service call.
          </span>
          <span style={{ fontSize: 14, color: S.muted, display: 'block', marginTop: 6 }}>
            $99/year — less than the tip on most contractor visits.
          </span>
        </div>
      </div>
    </section>
  )
}

function StickyJoinButton() {
  const [plansVisible, setPlansVisible] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const target = document.getElementById('section-membership')
    if (!target || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([entry]) => setPlansVisible(entry.isIntersecting),
      { threshold: 0.15 }
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const hero = document.getElementById('section-home')
    const onScroll = () => setPastHero(window.scrollY > (hero?.offsetHeight || 600) * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!pastHero || plansVisible) return null

  return (
    <div style={{ position: 'fixed', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 90, pointerEvents: 'none', padding: '0 16px' }}>
      <button
        onClick={() => { const el = document.getElementById('section-membership'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
        style={{
          pointerEvents: 'auto', background: S.green, border: 'none', color: S.black,
          fontSize: 15, fontWeight: 800, padding: '15px 42px', borderRadius: 100,
          cursor: 'pointer', boxShadow: '0 10px 34px rgba(93,255,138,0.35), 0 4px 14px rgba(0,0,0,0.5)',
          width: '100%', maxWidth: 340,
        }}
      >
        Join now →
      </button>
    </div>
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
            <a href={`/api/checkout?plan=${tier.id}${localStorage.getItem('subs_ref') ? `&ref=${encodeURIComponent(localStorage.getItem('subs_ref'))}` : ''}`} onClick={() => { if (window.fbq) window.fbq('track', 'InitiateCheckout'); sessionStorage.setItem('subs_checkout_plan', tier.id) }} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', background: tier.popular ? tier.color : S.surface, border: `1px solid ${tier.popular ? 'transparent' : S.border}`, color: tier.popular ? S.black : S.offwhite, fontSize: 14, fontWeight: 700, padding: '12px 0', borderRadius: 10, cursor: 'pointer' }}>
                Join {tier.name}
              </button>
            </a>
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

function MemberVideoCard({ video }) {
  return (
    <div className="member-video-frame" style={{ position: 'relative', aspectRatio: '9 / 16', background: '#141A12', border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <video
        src={video.src}
        autoPlay
        muted
        loop
        controls
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

function Testimonials() {
  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <style>{`
        .ugc-grid { display: grid; grid-template-columns: 1fr; gap: 20px; justify-items: center; }
        .member-video-frame { width: min(100%, 320px); }
        @media (min-width: 768px) { .ugc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1280px) { .ugc-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 12 }}>
            Real Members
          </div>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 44px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>
            What Our Members Are Saying
          </h2>
        </div>
        <div className="ugc-grid">
          {UGC_VIDEOS.map((v, i) => <MemberVideoCard key={i} video={v} />)}
        </div>
      </div>
    </section>
  )
}

const VENDOR_US_STATES = [
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

function ForVendors() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '' })
  const [trades, setTrades] = useState([])
  const [saType, setSaType] = useState('county')
  const [saState, setSaState] = useState('UT')
  const [saCounties, setSaCounties] = useState('')
  const [saZip, setSaZip] = useState('')
  const [saRadius, setSaRadius] = useState('25')

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError(null) }
  const addTrade = (t) => { if (t && !trades.includes(t)) setTrades(ts => [...ts, t]) }
  const removeTrade = (t) => setTrades(ts => ts.filter(x => x !== t))

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '11px 13px', color: S.offwhite, fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
  }

  async function handleApply() {
    if (!form.company_name.trim()) { setError('Please enter your company name.'); return }
    if (!form.email.trim()) { setError('Please enter your email address.'); return }
    if (!trades.length) { setError('Please select at least one trade.'); return }
    if (saType === 'county' && !saCounties.trim()) { setError('Please enter the counties you serve.'); return }
    if (saType === 'radius' && !saZip.trim()) { setError('Please enter your zip code.'); return }

    const service_area = saType === 'county'
      ? { type: 'county', state: saState, counties: saCounties.trim() }
      : { type: 'radius', zip: saZip.trim(), radius: parseInt(saRadius), state: saState }

    setError(null)
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('create-contractor-account', {
      body: { ...form, trades, service_area },
    })
    let msg = null
    if (fnError?.context) {
      try { const b = await fnError.context.json(); msg = b.error } catch {}
    } else if (data?.error) {
      msg = data.error
    } else if (fnError?.message) {
      msg = fnError.message
    }
    if (msg) { setError(msg); setLoading(false); return }
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px' }}>
        <div className="vendors-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 16 }}>For Contractors</div>
            <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 48px)', color: S.offwhite, fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>
              Zero lead cost.<br /><span style={{ color: S.green }}>Pre-qualified homeowners.</span>
            </h2>
            <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, marginBottom: 36 }}>
              SUBS uses AI to match pre-qualified homeowners with the right partner based on ratings, response time, and expertise. No bidding, no slow seasons, no lead gen cost. The better you perform, the more leads you receive.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {[['500+', 'Members by end of 2026'], ['$0', 'Lead gen cost to you'], ['48hr', 'Guaranteed payment'], ['AI', 'Performance-based routing']].map(([stat, label]) => (
                <div key={stat} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontFamily: C.display, fontSize: 28, color: S.green }}>{stat}</div>
                  <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            {['Pre-sold customers — zero marketing cost', 'Route density — multiple jobs per neighborhood', 'AI-matched leads based on ratings and response rate', 'Portal: jobs, payouts, and performance metrics'].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: S.offwhite, marginBottom: 10 }}>
                <span style={{ color: S.green }}>✓</span> {item}
              </div>
            ))}
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite, marginBottom: 8 }}>Application submitted!</div>
                <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.6, marginBottom: 20 }}>
                  Check your inbox — we sent login instructions to <strong style={{ color: S.offwhite }}>{form.email}</strong>. Log in to upload your documents while we review.
                </p>
                <Link to="/contractor/login" style={{ textDecoration: 'none' }}>
                  <button style={{ background: S.green, border: 'none', color: S.black, fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 10, cursor: 'pointer' }}>
                    Log in to dashboard →
                  </button>
                </Link>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: C.display, fontSize: 20, color: S.offwhite, marginBottom: 20 }}>Apply to join the network</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[['Company Name', 'company_name', 'text', 'Peak HVAC LLC'], ['Contact Name', 'contact_name', 'text', 'Jake Morrison']].map(([label, key, type, ph]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                      <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} style={inp} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[['Email', 'email', 'email', 'jake@peakhvac.com'], ['Phone', 'phone', 'tel', '(801) 555-0100']].map(([label, key, type, ph]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                      <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} style={inp} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Trade(s)</label>
                  {trades.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {trades.map(t => (
                        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: S.green + '22', border: `1px solid ${S.green}44`, color: S.green, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100 }}>
                          {t}
                          <button onClick={() => removeTrade(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.green, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select value="" onChange={e => { addTrade(e.target.value); setError(null) }} style={{ ...inp, color: S.muted }}>
                    <option value="">{trades.length === 0 ? 'Select your primary trade...' : '+ Add another trade'}</option>
                    {TRADES.filter(t => !trades.includes(t.name)).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Service Area</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[['county', '📍 By County', 'Select counties you cover'], ['radius', '📡 By Radius', 'Distance from your location']].map(([val, title, desc]) => (
                      <button key={val} type="button" onClick={() => { setSaType(val); setError(null) }} style={{ background: saType === val ? S.green + '18' : S.surface, border: `1px solid ${saType === val ? S.green : S.border}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: saType === val ? S.green : S.offwhite, marginBottom: 2 }}>{title}</div>
                        <div style={{ fontSize: 11, color: S.muted }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: saType === 'radius' ? '1fr 1fr' : '110px 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>State</label>
                      <select value={saState} onChange={e => { setSaState(e.target.value); setError(null) }} style={{ ...inp, color: S.offwhite }}>
                        {VENDOR_US_STATES.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
                      </select>
                    </div>
                    {saType === 'county' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Counties <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
                        <input type="text" value={saCounties} onChange={e => { setSaCounties(e.target.value); setError(null) }} placeholder="Salt Lake, Utah, Davis" style={inp} />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your Zip Code</label>
                          <input type="text" value={saZip} onChange={e => { setSaZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setError(null) }} placeholder="84101" maxLength={5} style={inp} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Radius</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['10', '25', '50', '75', '100'].map(r => (
                              <button key={r} type="button" onClick={() => setSaRadius(r)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: saRadius === r ? S.green + '18' : S.surface, border: `1px solid ${saRadius === r ? S.green : S.border}`, color: saRadius === r ? S.green : S.muted }}>
                                {r} mi
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#2D1010', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: S.danger, fontSize: 13 }}>
                    {error}
                  </div>
                )}
                <button onClick={handleApply} disabled={loading} style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontFamily: C.body, fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? (
                    <><div style={{ width: 14, height: 14, border: `2px solid ${S.black}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Submitting...</>
                  ) : 'Submit Application →'}
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
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 16 }}>Start Saving Today</div>
        <h2 style={{ fontFamily: C.display, fontSize: 'clamp(28px, 4vw, 48px)', color: S.offwhite, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.15 }}>
          The most obvious purchase<br />a homeowner can make.
        </h2>
        <p style={{ fontSize: 15, color: '#A8C4A0', lineHeight: 1.7, marginBottom: 36 }}>
          One roof. One HVAC system. One plumbing job. At member discount rates, any single job saves more than a decade of membership fees.
        </p>
        <button onClick={() => { const el = document.getElementById('section-membership'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={{ background: S.green, border: 'none', color: S.black, fontSize: 16, fontWeight: 700, padding: '16px 32px', borderRadius: 12, cursor: 'pointer' }}>
          Join today →
        </button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: S.black, borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 32px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', marginBottom: 12 }}>SUBS</div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6, maxWidth: 260, margin: 0 }}>The membership that unlocks contractor pricing on every trade that touches your home.</p>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase', marginBottom: 14 }}>Membership</div>
            {['Member', 'Member+', 'Elite', 'How It Works'].map(link => (
              <div key={link} style={{ fontSize: 13, color: S.muted, marginBottom: 10 }}>{link}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase', marginBottom: 14 }}>Company</div>
            {['How It Works', 'Vendor Network', 'FAQ', 'For Vendors'].map(link => (
              <div key={link} style={{ fontSize: 13, color: S.muted, marginBottom: 10 }}>{link}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase', marginBottom: 14 }}>Legal</div>
            <div style={{ marginBottom: 10 }}><Link to="/terms" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>Terms of Service</Link></div>
            <div style={{ marginBottom: 10 }}><Link to="/privacy" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>Privacy Policy</Link></div>
            <div style={{ marginBottom: 10 }}><Link to="/refund-policy" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>Refund Policy</Link></div>
            <div style={{ marginBottom: 10 }}><Link to="/member-agreement" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>Member Agreement</Link></div>
            <div style={{ marginBottom: 10 }}><Link to="/sms-consent" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>SMS Consent</Link></div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase', marginBottom: 14 }}>Solutions</div>
            <div style={{ marginBottom: 10 }}><a href="/api/checkout?plan=member" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>For Homeowners</a></div>
            <div style={{ marginBottom: 10 }}><Link to="/contractor/apply" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>For Contractors</Link></div>
            <div style={{ marginBottom: 10 }}><Link to="/property-managers" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>For Property Managers</Link></div>
          </div>
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

  // Support /#plans deep links (e.g. from the /calculator page)
  useEffect(() => {
    if (window.location.hash === '#plans') {
      setTimeout(() => {
        const el = document.getElementById('section-membership')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [])

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <Nav setSection={scrollTo} />
      <div id="section-home"><Hero /></div>
      <ContractorMarquee />
      <SavingsSection />
      <Testimonials />
      <div id="section-how"><HowItWorks /></div>
      <div id="section-membership"><Membership /></div>
      <div id="section-network"><Network /></div>
      <div id="section-vendors"><ForVendors /></div>
      <div id="section-faq"><FAQ /></div>
      <BottomCTA />
      <Footer />
      <StickyJoinButton />
    </div>
  )
}
