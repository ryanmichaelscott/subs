import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { S, C } from '../theme'

// ─── Scroll helper ───────────────────────────────────────────────────────────
const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ─── Responsive style tag ────────────────────────────────────────────────────
const ResponsiveStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    *, *::before, *::after { box-sizing: border-box; }

    .pm-hero-headline {
      font-size: 52px;
      line-height: 1.1;
    }
    .pm-steps-row {
      display: flex;
      flex-direction: row;
      gap: 0;
      align-items: flex-start;
    }
    .pm-step-connector {
      display: flex;
      flex: 1;
      height: 2px;
      background: ${S.border};
      margin-top: 28px;
    }
    .pm-pricing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .pm-stats-row {
      display: flex;
      flex-direction: row;
      gap: 40px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .pm-pain-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .pm-cta-row {
      display: flex;
      flex-direction: row;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .pm-footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 40px;
    }
    .pm-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .pm-nav-right {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .pm-hero-headline {
        font-size: 36px !important;
      }
      .pm-steps-row {
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
      .pm-steps-row > div {
        width: 100%;
        justify-content: center;
      }
      .pm-step-connector {
        display: none;
      }
      .pm-pricing-grid {
        grid-template-columns: 1fr;
      }
      .pm-stats-row {
        gap: 24px;
      }
      .pm-pain-grid {
        grid-template-columns: 1fr;
      }
      .pm-cta-row {
        flex-direction: column;
        align-items: stretch;
      }
      .pm-footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }
      .pm-form-row {
        grid-template-columns: 1fr;
      }
      .pm-nav-sales-btn {
        display: none;
      }
    }
    @media (max-width: 480px) {
      .pm-footer-grid {
        grid-template-columns: 1fr;
      }
    }
  ` }} />
)

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: S.black,
      borderBottom: `1px solid ${S.border}`,
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: C.body,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: S.green, letterSpacing: '-0.5px' }}>SUBS</span>
        </Link>
        <span style={{ color: S.border, fontSize: 16 }}>|</span>
        <span style={{ fontSize: 13, color: S.muted, fontWeight: 500, letterSpacing: '0.02em' }}>
          Property Managers
        </span>
      </div>

      {/* Right */}
      <div className="pm-nav-right">
        <button
          className="pm-nav-sales-btn"
          onClick={() => scrollTo('pm-contact')}
          style={{
            background: 'transparent',
            border: 'none',
            color: S.muted,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: C.body,
            padding: '8px 4px',
          }}
        >
          Talk to Sales
        </button>
        <button
          onClick={() => scrollTo('pm-pricing')}
          style={{
            background: S.green,
            border: 'none',
            color: S.black,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: C.body,
            padding: '9px 20px',
            borderRadius: 8,
          }}
        >
          View Plans
        </button>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      background: S.black,
      padding: '96px 24px 80px',
      textAlign: 'center',
      fontFamily: C.body,
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(93,255,138,0.1)',
          border: `1px solid rgba(93,255,138,0.3)`,
          color: S.green,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          padding: '5px 14px',
          borderRadius: 20,
          marginBottom: 28,
        }}>
          ENTERPRISE SOLUTION
        </div>

        {/* Headline */}
        <h1
          className="pm-hero-headline"
          style={{
            fontFamily: C.display,
            fontWeight: 400,
            color: S.offwhite,
            margin: '0 0 24px',
          }}
        >
          Every property. Every trade. One Membership.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 18,
          lineHeight: 1.7,
          color: S.muted,
          margin: '0 0 40px',
          maxWidth: 620,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Property managers save 20–35% on maintenance costs across their entire portfolio.
          Vetted contractors. Member pricing. One call for every job.
        </p>

        {/* CTAs */}
        <div className="pm-cta-row" style={{ marginBottom: 56 }}>
          <button
            onClick={() => scrollTo('pm-pricing')}
            style={{
              background: S.green,
              border: 'none',
              color: S.black,
              fontSize: 16,
              fontWeight: 700,
              padding: '15px 36px',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: C.body,
            }}
          >
            View Plans
          </button>
          <button
            onClick={() => scrollTo('pm-contact')}
            style={{
              background: 'transparent',
              border: `1.5px solid ${S.border}`,
              color: S.offwhite,
              fontSize: 16,
              fontWeight: 600,
              padding: '15px 36px',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: C.body,
            }}
          >
            Talk to Sales
          </button>
        </div>

        {/* Stats row */}
        <div className="pm-stats-row" style={{ borderTop: `1px solid ${S.border}`, paddingTop: 40 }}>
          {[
            { value: '20–35%', label: 'avg savings' },
            { value: '50+', label: 'trades covered' },
            { value: '100%', label: 'Licensed & vetted contractors' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: C.display,
                fontSize: 32,
                color: S.green,
                marginBottom: 4,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────
function Problem() {
  const painPoints = [
    {
      icon: '💸',
      title: 'Overpaying retail rates on every job',
      body: 'Without contractor-level purchasing power, property managers pay top dollar on every service call — margin that goes straight to the vendor.',
    },
    {
      icon: '🔍',
      title: 'Chasing down reliable licensed contractors',
      body: 'Every new job means vetting a new vendor. Insurance, license checks, reviews — hours spent before a single nail is driven.',
    },
    {
      icon: '📊',
      title: 'No visibility into maintenance spend across properties',
      body: 'Invoices scattered across email and spreadsheets make it impossible to understand true portfolio maintenance costs.',
    },
  ]

  return (
    <section style={{
      background: S.surface,
      padding: '80px 24px',
      fontFamily: C.body,
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: C.display,
          fontSize: 36,
          fontWeight: 400,
          color: S.offwhite,
          textAlign: 'center',
          margin: '0 0 56px',
          lineHeight: 1.25,
          maxWidth: 720,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Managing maintenance across multiple properties is expensive, time-consuming, and unpredictable.{' '}
          <span style={{ color: S.green }}>SUBS changes that.</span>
        </h2>

        <div className="pm-pain-grid">
          {painPoints.map((p) => (
            <div
              key={p.title}
              style={{
                background: S.card,
                border: `1px solid ${S.border}`,
                borderRadius: 14,
                padding: '32px 28px',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{p.icon}</div>
              <h3 style={{
                fontFamily: C.display,
                fontSize: 20,
                fontWeight: 400,
                color: S.offwhite,
                margin: '0 0 12px',
                lineHeight: 1.3,
              }}>
                {p.title}
              </h3>
              <p style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: S.muted,
                margin: 0,
              }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Choose your plan',
      body: 'Pick the tier that fits your portfolio. Instant access, no setup fees.',
    },
    {
      number: '02',
      title: 'Submit a job request',
      body: 'Give us the address and the issue. We handle everything else.',
    },
    {
      number: '03',
      title: 'Vetted pros show up',
      body: 'Licensed, insured, background-checked — at rates you couldn\'t negotiate solo.',
    },
    {
      number: '04',
      title: 'Track spend by property',
      body: 'Full job history and savings vs. retail, broken down per property.',
    },
  ]

  return (
    <section style={{
      background: S.black,
      padding: '80px 24px',
      fontFamily: C.body,
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: S.green,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            HOW IT WORKS
          </div>
          <h2 style={{
            fontFamily: C.display,
            fontSize: 36,
            fontWeight: 400,
            color: S.offwhite,
            margin: 0,
            lineHeight: 1.2,
          }}>
            Simple from day one
          </h2>
        </div>

        <div className="pm-steps-row">
          {steps.map((step, i) => (
            <div key={step.number} style={{ display: 'flex', flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
              {/* Step card */}
              <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(93,255,138,0.08)',
                  border: `1.5px solid rgba(93,255,138,0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontFamily: C.body,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: S.green,
                }}>
                  {step.number}
                </div>
                <h3 style={{
                  fontFamily: C.display,
                  fontSize: 21,
                  fontWeight: 400,
                  color: S.offwhite,
                  margin: '0 0 12px',
                  lineHeight: 1.25,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: S.muted,
                  margin: 0,
                  maxWidth: 200,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}>
                  {step.body}
                </p>
              </div>

              {/* Connector line (between steps, not after last) */}
              {i < steps.length - 1 && (
                <div className="pm-step-connector" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      id: 'portfolio',
      name: 'Portfolio',
      price: '$749',
      period: '/yr',
      tagline: 'For growing portfolios up to 5 units.',
      highlighted: false,
      badge: null,
      perks: [
        'Up to 5 units',
        'All trades at member pricing',
        'Concierge booking line',
        'Job history by property',
        '30-day money back guarantee',
      ],
      cta: 'Talk to Sales',
      ctaAction: () => scrollTo('pm-contact'),
      isSales: true,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$1,899',
      period: '/yr',
      tagline: 'For active property managers up to 20 units.',
      highlighted: true,
      badge: 'MOST POPULAR',
      perks: [
        'Up to 20 units',
        'Priority scheduling across all properties',
        'Dedicated SUBS account manager',
        'Monthly maintenance report',
        'Bulk job request submission',
        'Everything in Portfolio',
      ],
      cta: 'Talk to Sales',
      ctaAction: () => scrollTo('pm-contact'),
      isSales: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      tagline: 'Unlimited units. Tailored to your portfolio.',
      highlighted: false,
      badge: null,
      perks: [
        'Unlimited units',
        'White glove concierge',
        'Custom contractor rates for your portfolio',
        'Quarterly business review',
        'API access for property management software',
      ],
      cta: 'Talk to Sales',
      ctaAction: () => scrollTo('pm-contact'),
      isSales: true,
    },
  ]

  return (
    <section
      id="pm-pricing"
      style={{
        background: S.surface,
        padding: '80px 24px',
        fontFamily: C.body,
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: S.green,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            PLANS & PRICING
          </div>
          <h2 style={{
            fontFamily: C.display,
            fontSize: 36,
            fontWeight: 400,
            color: S.offwhite,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            Choose your portfolio plan
          </h2>
          <p style={{ fontSize: 15, color: S.muted, margin: 0 }}>
            All plans include member pricing on every trade. Cancel anytime.
          </p>
        </div>

        <div className="pm-pricing-grid">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                background: tier.highlighted ? S.card : S.black,
                border: tier.highlighted
                  ? `2px solid ${S.green}`
                  : `1px solid ${S.border}`,
                borderRadius: 16,
                padding: '36px 28px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: 'absolute',
                  top: -13,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: S.green,
                  color: S.black,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  padding: '4px 14px',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                }}>
                  {tier.badge}
                </div>
              )}

              {/* Tier name */}
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: tier.highlighted ? S.green : S.muted,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                {tier.name}
              </div>

              {/* Price */}
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  fontFamily: C.display,
                  fontSize: 42,
                  color: S.offwhite,
                  lineHeight: 1,
                }}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span style={{ fontSize: 15, color: S.muted, marginLeft: 4 }}>
                    {tier.period}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <p style={{
                fontSize: 13,
                color: S.muted,
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}>
                {tier.tagline}
              </p>

              {/* Perks */}
              <ul style={{
                listStyle: 'none',
                margin: '0 0 32px',
                padding: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {tier.perks.map((perk) => (
                  <li key={perk} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 14,
                    color: S.offwhite,
                    lineHeight: 1.4,
                  }}>
                    <span style={{ color: S.green, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {perk}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={tier.ctaAction}
                style={{
                  width: '100%',
                  background: tier.highlighted ? S.green : S.purple + '18',
                  border: tier.highlighted ? 'none' : `1.5px solid ${S.purple}66`,
                  color: tier.highlighted ? S.black : S.purple,
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '13px 20px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: C.body,
                  opacity: 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    unitsManaged: '',
    monthlySpend: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/enterprise/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: S.black,
    border: `1px solid ${S.border}`,
    borderRadius: 8,
    color: S.offwhite,
    fontSize: 15,
    padding: '12px 14px',
    fontFamily: C.body,
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: S.muted,
    marginBottom: 6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  }

  return (
    <section
      id="pm-contact"
      style={{
        background: S.black,
        padding: '80px 24px',
        fontFamily: C.body,
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{
            fontFamily: C.display,
            fontSize: 36,
            fontWeight: 400,
            color: S.offwhite,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            Talk to our team
          </h2>
          <p style={{ fontSize: 16, color: S.muted, margin: 0, lineHeight: 1.6 }}>
            Tell us about your portfolio and we'll put together a custom plan.
          </p>
        </div>

        {success ? (
          <div style={{
            background: 'rgba(93,255,138,0.08)',
            border: `1.5px solid rgba(93,255,138,0.35)`,
            borderRadius: 14,
            padding: '32px 28px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 16, color: S.green, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
              Thanks — we'll be in touch within one business day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: 16,
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Row 1: Full Name + Email */}
            <div className="pm-form-row">
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Jane Smith"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="jane@company.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Row 2: Phone + Company Name */}
            <div className="pm-form-row">
              <div>
                <label style={labelStyle}>Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 000-0000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  placeholder="Smith Property Group"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Row 3: Units + Spend */}
            <div className="pm-form-row">
              <div>
                <label style={labelStyle}>Number of Units Managed *</label>
                <input
                  type="text"
                  name="unitsManaged"
                  value={form.unitsManaged}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 12"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Current Monthly Maintenance Spend *</label>
                <select
                  name="monthlySpend"
                  value={form.monthlySpend}
                  onChange={handleChange}
                  required
                  style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                >
                  <option value="" disabled>Select a range</option>
                  <option value="under_5k">Under $5k</option>
                  <option value="5k_20k">$5k–$20k</option>
                  <option value="20k_50k">$20k–$50k</option>
                  <option value="50k_plus">$50k+</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={labelStyle}>Message (optional)</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={4}
                placeholder="Tell us about your properties, current contractors, or any specific needs…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(255,90,90,0.08)',
                border: `1px solid rgba(255,90,90,0.3)`,
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 14,
                color: S.danger,
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: S.green,
                border: 'none',
                color: S.black,
                fontSize: 16,
                fontWeight: 700,
                padding: '15px 20px',
                borderRadius: 10,
                cursor: submitting ? 'wait' : 'pointer',
                fontFamily: C.body,
                opacity: submitting ? 0.7 : 1,
                transition: 'opacity 0.2s',
                marginTop: 4,
              }}
            >
              {submitting ? 'Sending…' : 'Request a Demo'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear()

  const linkStyle = {
    color: S.muted,
    textDecoration: 'none',
    fontSize: 14,
    lineHeight: 2,
    display: 'block',
  }

  const colHeadStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: S.offwhite,
    marginBottom: 14,
  }

  return (
    <footer style={{
      background: S.surface,
      borderTop: `1px solid ${S.border}`,
      padding: '56px 24px 32px',
      fontFamily: C.body,
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="pm-footer-grid" style={{ marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: 22,
              color: S.green,
              letterSpacing: '-0.5px',
              marginBottom: 12,
            }}>
              SUBS
            </div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 280 }}>
              The contractor membership that saves homeowners and property managers 20–35% on every trade.
            </p>
          </div>

          {/* Solutions */}
          <div>
            <div style={colHeadStyle}>Solutions</div>
            <Link to="/signup" style={linkStyle}>For Homeowners</Link>
            <Link to="/contractor/apply" style={linkStyle}>For Contractors</Link>
            <Link to="/property-managers" style={{ ...linkStyle, color: S.green }}>For Property Managers</Link>
          </div>

          {/* Company */}
          <div>
            <div style={colHeadStyle}>Company</div>
            <Link to="/" style={linkStyle}>Home</Link>
            <a href="mailto:hello@subsapp.com" style={linkStyle}>Contact Us</a>
          </div>

          {/* Legal */}
          <div>
            <div style={colHeadStyle}>Legal</div>
            <a href="/privacy" style={linkStyle}>Privacy Policy</a>
            <a href="/terms" style={linkStyle}>Terms of Service</a>
          </div>
        </div>

        <div style={{
          borderTop: `1px solid ${S.border}`,
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <p style={{ fontSize: 12, color: S.muted, margin: 0 }}>
            © {year} SUBS. All rights reserved.
          </p>
          <p style={{ fontSize: 12, color: S.muted, margin: 0 }}>
            Licensed contractors. Real savings.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PropertyManagers() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <div style={{ background: S.black, minHeight: '100vh', fontFamily: C.body }}>
      <ResponsiveStyles />
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Pricing />
      <ContactForm />
      <Footer />
    </div>
  )
}
