import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'
import SavingsCalculator from '../components/SavingsCalculator'

const UGC_VIDEOS = ['/videos/UGC_1.mp4', '/videos/UGC_2.mp4', '/videos/UGC_3.mp4']

const TRUST_LOGOS = [
  { src: '/contractor-logos/2.png', w: 280, h: 280 },
  { src: '/contractor-logos/3.png', w: 392, h: 280 },
  { src: '/contractor-logos/4.png', w: 396, h: 280 },
  { src: '/contractor-logos/7.png', w: 376, h: 280 },
  { src: '/contractor-logos/8.png', w: 648, h: 280 },
]

const FAQS = [
  { q: 'Is this number a real quote?', a: "It's an estimate based on published pricing data for your state and a typical ~20% member discount. Your exact price comes from the contractor's assessment — but the member discount is contractual, so it's baked into whatever they quote you." },
  { q: 'What does the membership cost?', a: 'Plans start at $99/year. Most members save more than that on their very first service call — the savings number above is usually bigger than the annual fee.' },
  { q: 'What happens after I submit my number?', a: 'Our concierge team calls or texts you, confirms your member pricing for the service you picked, and can connect you with a vetted contractor right away. No obligation — if the numbers don\'t make sense for you, no hard feelings.' },
  { q: 'Who are the contractors?', a: "Every contractor in the SUBS network is licensed, insured, and background-checked before their first job. We monitor ratings after every job and remove anyone who falls below 4.5 stars." },
]

function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function LeadForm({ selection }) {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [ownsHome, setOwnsHome] = useState(null)
  const [website, setWebsite] = useState('') // honeypot — hidden from humans
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const inp = {
    width: '100%', background: S.surface, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '13px 14px', color: S.offwhite, fontSize: 16,
    outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
  }

  async function handleSubmit() {
    if (!firstName.trim()) { setError('Please enter your first name.'); return }
    if (phone.replace(/\D/g, '').length < 10) { setError('Please enter a valid 10-digit phone number.'); return }
    if (ownsHome === null) { setError('Please let us know if you own your home.'); return }

    setError(null)
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('submit-calculator-lead', {
      body: {
        firstName: firstName.trim(),
        phone,
        ownsHome,
        website,
        trade: selection?.trade,
        service: selection?.service,
        stateCode: selection?.stateCode,
        stateName: selection?.stateName,
        retail: selection?.retail,
        member: selection?.member,
        savings: selection?.savings,
      },
    })
    let msg = null
    if (fnError?.context) {
      try { const b = await fnError.context.json(); msg = b.error } catch { msg = null }
    } else if (data?.error) {
      msg = data.error
    } else if (fnError?.message) {
      msg = fnError.message
    }
    if (msg) { setError(msg); setLoading(false); return }

    if (window.fbq) window.fbq('track', 'Lead')
    if (window.gtag) window.gtag('event', 'generate_lead', { source: 'calculator_lead' })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div id="lead-form" style={{ marginTop: 20, background: '#0A1C0E', border: `1px solid ${S.green}`, borderRadius: 14, padding: 'clamp(24px, 4vw, 32px)', textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 12 }}>🎉</div>
        <div style={{ fontFamily: C.display, fontSize: 'clamp(22px, 3vw, 28px)', color: S.offwhite, marginBottom: 10 }}>
          You're locked in, {firstName.trim()}.
        </div>
        <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.65, maxWidth: 440, margin: '0 auto 20px' }}>
          Our concierge team will call or text you shortly to confirm your member pricing
          on <strong style={{ color: S.offwhite }}>{selection?.service}</strong>. Keep an eye on your phone.
        </p>
        <Link to="/#plans" style={{ textDecoration: 'none' }}>
          <button style={{ background: S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 800, padding: '13px 28px', borderRadius: 10, cursor: 'pointer' }}>
            Want it faster? Join now — from $99/yr →
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div id="lead-form" style={{ marginTop: 20, background: '#0A1C0E', border: `1px solid ${S.green}66`, borderRadius: 14, padding: 'clamp(22px, 4vw, 30px)' }}>
      <style>{`
        @keyframes lead-form-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        #lead-form { animation: lead-form-in 0.35s ease; }
        .lead-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 560px) { .lead-fields { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: C.display, fontSize: 'clamp(20px, 3vw, 26px)', color: S.offwhite, marginBottom: 6 }}>
          Lock in <span style={{ color: S.green }}>${(selection?.savings ?? 0).toLocaleString()}</span> in savings on your {selection?.service?.toLowerCase() || 'next job'}
        </div>
        <p style={{ fontSize: 13.5, color: S.muted, margin: 0, lineHeight: 1.6 }}>
          Drop your name and number — our concierge confirms your member price and can have a vetted contractor reach out same-day.
        </p>
      </div>

      <div className="lead-fields" style={{ marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>First name</label>
          <input type="text" value={firstName} autoComplete="given-name" onChange={e => { setFirstName(e.target.value); setError(null) }} placeholder="Mike" style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone number</label>
          <input type="tel" inputMode="tel" value={phone} autoComplete="tel" onChange={e => { setPhone(formatPhoneInput(e.target.value)); setError(null) }} placeholder="(801) 555-0100" style={inp} />
        </div>
      </div>

      {/* Honeypot — visually hidden, tab-skipped; bots auto-fill it */}
      <input type="text" value={website} onChange={e => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, color: S.muted, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Do you own your home?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[[true, 'Yes'], [false, 'No']].map(([val, text]) => (
            <button
              key={text}
              type="button"
              onClick={() => { setOwnsHome(val); setError(null) }}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: C.body,
                background: ownsHome === val ? S.green + '22' : S.surface,
                border: `1px solid ${ownsHome === val ? S.green : S.border}`,
                color: ownsHome === val ? S.green : S.muted,
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#2D1010', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: S.danger, fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ width: '100%', background: S.green, border: 'none', color: S.black, fontFamily: C.body, fontSize: 16, fontWeight: 800, padding: '15px 0', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.8 : 1, boxShadow: '0 8px 28px rgba(93,255,138,0.28)' }}
      >
        {loading ? 'Locking in your pricing…' : 'Get my member pricing locked in →'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
        {['No spam, ever', 'No obligation', 'Takes 15 seconds'].map(t => (
          <span key={t} style={{ fontSize: 12, color: S.muted }}>
            <span style={{ color: S.green }}>✓</span> {t}
          </span>
        ))}
      </div>

      <p style={{ fontSize: 10.5, color: S.muted + 'CC', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
        By submitting, you agree that SUBS may call or text you at the number provided about your member pricing and services.
        Message and data rates may apply. Reply STOP to opt out.
        See our <Link to="/privacy" target="_blank" style={{ color: S.muted, textDecoration: 'underline' }}>Privacy Policy</Link> and{' '}
        <Link to="/sms-consent" target="_blank" style={{ color: S.muted, textDecoration: 'underline' }}>SMS Consent Policy</Link>.
      </p>
    </div>
  )
}

export default function CalculatorPage() {
  const [selection, setSelection] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const prevSelectionKey = useRef(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'SUBS — See What You\'d Save on Your Next Home Service'
    return () => { document.title = prev }
  }, [])

  const handleSelectionChange = (sel) => {
    setSelection(sel)
    // Reveal the form once the visitor actually changes a selection — comparing
    // values (not counting calls) so StrictMode's double mount doesn't trip it
    const key = `${sel.stateCode}|${sel.trade}|${sel.service}`
    if (prevSelectionKey.current === null) {
      prevSelectionKey.current = key
    } else if (prevSelectionKey.current !== key) {
      prevSelectionKey.current = key
      setRevealed(true)
    }
  }

  const revealAndScroll = () => {
    setRevealed(true)
    if (window.fbq) window.fbq('track', 'InitiateCheckout')
    setTimeout(() => {
      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  const scrollToCalc = () => {
    document.getElementById('calc-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <style>{`
        .calc-ugc-grid { display: grid; grid-template-columns: 1fr; gap: 20px; justify-items: center; }
        .calc-ugc-frame { width: min(100%, 300px); }
        @media (min-width: 700px) { .calc-ugc-grid { grid-template-columns: repeat(3, 1fr); } }
        .calc-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .calc-trust-strip { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
      `}</style>

      {/* Minimal nav — no exits except the logo, phone as trust signal */}
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px, 4vw, 28px)', position: 'sticky', top: 0, zIndex: 50, background: S.black + 'E8', backdropFilter: 'blur(12px)' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ display: 'block', fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', lineHeight: 1 }}>SUBS</span>
          <span style={{ display: 'block', fontSize: 10, color: S.green + '80', letterSpacing: '0.1em', lineHeight: 1, marginTop: 3 }}>Home Services Membership</span>
        </Link>
        <a href="tel:18884543019" style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, textDecoration: 'none' }}>
          📞 1-888-454-3019
        </a>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(40px, 7vw, 72px) 20px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: S.green, textTransform: 'uppercase', marginBottom: 14 }}>
          Free savings check · No signup needed
        </div>
        <h1 style={{ fontFamily: C.display, fontSize: 'clamp(34px, 6vw, 58px)', color: S.offwhite, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.08 }}>
          See what you'd save before<br />you book your next home service.
        </h1>
        <p style={{ fontSize: 16, color: S.muted, maxWidth: 540, margin: '0 auto 22px', lineHeight: 1.65 }}>
          SUBS members get wholesale pricing from a vetted contractor network.
          Pick your service — your member price shows instantly.
        </p>
        <div className="calc-trust-strip" style={{ marginBottom: 8 }}>
          {['Licensed & insured', 'Background-checked', '4.8★ avg contractor rating'].map(t => (
            <span key={t} style={{ fontSize: 13, color: S.muted, fontWeight: 600 }}>
              <span style={{ color: S.green }}>✓</span> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Calculator + lead form */}
      <section id="calc-section" style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px 24px', scrollMarginTop: 70 }}>
        <SavingsCalculator
          onSelectionChange={handleSelectionChange}
          onJoin={revealAndScroll}
          joinLabel="Lock in this price →"
          belowResult={revealed ? <LeadForm selection={selection} /> : (
            <div style={{ marginTop: 20, textAlign: 'center', padding: '14px 16px', background: S.surface, border: `1px dashed ${S.border}`, borderRadius: 12 }}>
              <span style={{ fontSize: 13.5, color: S.muted }}>
                👆 Pick the service you actually need — then lock in your member pricing below.
              </span>
            </div>
          )}
        />
      </section>

      {/* Contractor logo trust strip */}
      <section style={{ borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, background: S.surface, padding: '26px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: S.muted, textTransform: 'uppercase' }}>
            The network behind your pricing
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(20px, 4vw, 44px)', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
          {TRUST_LOGOS.map((logo) => (
            <img key={logo.src} src={logo.src} width={logo.w} height={logo.h} alt="Vetted SUBS contractor partner logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          ))}
        </div>
      </section>

      {/* Social proof — real member videos */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: S.green, textTransform: 'uppercase', marginBottom: 10 }}>Real Members</div>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(26px, 4vw, 40px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>
            Utah homeowners are already saving.
          </h2>
        </div>
        <div className="calc-ugc-grid">
          {UGC_VIDEOS.map(src => (
            <div key={src} className="calc-ugc-frame" style={{ position: 'relative', aspectRatio: '9 / 16', background: '#141A12', border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <video src={src} autoPlay muted loop controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontFamily: C.display, fontSize: 'clamp(24px, 4vw, 36px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>
              From this page to money saved, in 3 steps.
            </h2>
          </div>
          <div className="calc-steps">
            {[
              ['1', 'Lock in your pricing', 'Submit your name and number above — takes 15 seconds, costs nothing.'],
              ['2', 'We call you', 'Our concierge confirms your member price and answers any questions.'],
              ['3', 'A vetted pro shows up', 'Your member discount is baked into the final quote by contract. No haggling.'],
            ].map(([num, title, body]) => (
              <div key={num} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: S.green, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {num}</div>
                <div style={{ fontFamily: C.display, fontSize: 19, color: S.offwhite, marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: 13.5, color: S.muted, lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — objection handling */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(24px, 4vw, 36px)', color: S.offwhite, fontWeight: 400, margin: 0 }}>
            Fair questions.
          </h2>
        </div>
        <CalcFaq />
      </section>

      {/* Final CTA */}
      <section style={{ background: S.forest, borderTop: `1px solid ${S.greenDim}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: C.display, fontSize: 'clamp(26px, 4vw, 40px)', color: S.offwhite, fontWeight: 400, margin: '0 0 14px', lineHeight: 1.15 }}>
            Ready to stop overpaying?
          </h2>
          <p style={{ fontSize: 15, color: '#A8C4A0', lineHeight: 1.65, marginBottom: 28 }}>
            Your savings number is 10 seconds away — and locking it in costs nothing.
          </p>
          <button onClick={scrollToCalc} style={{ background: S.green, border: 'none', color: S.black, fontSize: 16, fontWeight: 800, padding: '16px 40px', borderRadius: 100, cursor: 'pointer', boxShadow: '0 10px 34px rgba(93,255,138,0.3)' }}>
            Calculate my savings ↑
          </button>
        </div>
      </section>

      {/* Minimal footer */}
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: 1000, margin: '0 auto' }}>
        <span style={{ fontSize: 12, color: S.muted }}>© 2026 SUBS Membership. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 18 }}>
          <Link to="/terms" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>Terms</Link>
          <Link to="/privacy" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>Privacy</Link>
          <Link to="/sms-consent" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>SMS Consent</Link>
        </div>
      </footer>
    </div>
  )
}

function CalcFaq() {
  const [open, setOpen] = useState(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {FAQS.map((item, i) => (
        <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', textAlign: 'left', gap: 14 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: S.offwhite, fontFamily: C.body }}>{item.q}</span>
            <span style={{ color: S.green, fontSize: 17, flexShrink: 0, display: 'inline-block', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
          </button>
          {open === i && <div style={{ padding: '0 18px 16px', fontSize: 13.5, color: S.muted, lineHeight: 1.7 }}>{item.a}</div>}
        </div>
      ))}
    </div>
  )
}
