import { Link } from 'react-router-dom'
import { S, C } from '../theme'

const MESSAGES = [
  { label: 'Booking confirmations', desc: 'When a contractor is assigned to your service request.' },
  { label: 'Service updates', desc: 'Status changes on active or upcoming jobs.' },
  { label: 'Scheduling reminders', desc: 'Upcoming appointment reminders and scheduling changes.' },
  { label: 'Concierge support', desc: 'Replies and follow-ups from our SUBS concierge team.' },
]

export default function SmsConsent() {
  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Logo */}
        <div style={{ marginBottom: 52 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <img src="/logo-wordmark.png" alt="SUBS" style={{ height: 24, width: 'auto', display: 'block' }} />
          </Link>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: C.display, fontSize: 44, fontWeight: 400, color: S.offwhite, margin: '0 0 10px', lineHeight: 1.05 }}>
          SMS Notifications
        </h1>
        <p style={{ fontSize: 13, color: S.muted, margin: '0 0 40px' }}>Last updated June 2026</p>
        <div style={{ height: 1, background: S.border, marginBottom: 40 }} />

        {/* Message types */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
            Types of Messages We Send
          </h2>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.75, margin: '0 0 18px' }}>
            When you provide your phone number, SUBS may send you SMS messages related to your membership and service activity:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MESSAGES.map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, flexShrink: 0, marginTop: 7 }} />
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 600, color: S.offwhite }}>{label}</span>
                  <span style={{ color: S.muted }}> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Frequency */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Message Frequency
          </h2>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.75, margin: 0 }}>
            Message frequency varies based on your service activity. You may receive messages when you submit a service request, when a contractor is matched or confirmed, when a job status changes, or when our concierge team follows up.
          </p>
        </section>

        {/* TCPA disclosure */}
        <section style={{ marginBottom: 40, padding: '20px 22px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Consent &amp; Disclosure
          </h2>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.8, margin: 0 }}>
            By providing your phone number and checking this box, you consent to receive SMS text messages from SUBS, Inc. regarding your membership, service updates, contractor updates, and promotional offers. Message and data rates may apply. Message frequency varies. Reply <strong style={{ color: S.offwhite, fontWeight: 700 }}>STOP</strong> to opt out at any time. Reply <strong style={{ color: S.offwhite, fontWeight: 700 }}>HELP</strong> for help. View our <Link to="/privacy" style={{ color: S.green, textDecoration: 'none' }}>Privacy Policy</Link> at subs.app/privacy and <Link to="/sms-consent" style={{ color: S.green, textDecoration: 'none' }}>SMS Consent Policy</Link> at subs.app/sms-consent.
          </p>
        </section>

        {/* Rates note */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Rates &amp; Carriers
          </h2>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.75, margin: 0 }}>
            Standard message and data rates may apply depending on your mobile carrier and plan. SUBS does not charge for SMS messages, but your carrier may. Check with your carrier for details.
          </p>
        </section>

        {/* Contact */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: S.offwhite, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Contact Us
          </h2>
          <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.75, margin: 0 }}>
            Questions about our SMS program? Reach us at{' '}
            <a href="mailto:support@subs.app" style={{ color: S.green, textDecoration: 'none' }}>support@subs.app</a>
            {' '}or call{' '}
            <a href="tel:18884543019" style={{ color: S.green, textDecoration: 'none' }}>1-888-454-3019</a>.
          </p>
        </section>

        {/* Back */}
        <div style={{ paddingTop: 24, borderTop: `1px solid ${S.border}` }}>
          <Link to="/" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>
            ← Back to SUBS
          </Link>
        </div>

      </div>
    </div>
  )
}
