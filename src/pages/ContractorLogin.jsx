import { Link } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { S, C } from '../theme'

const appearance = {
  variables: {
    colorBackground: '#101410',
    colorInputBackground: '#141814',
    colorPrimary: '#5DFF8A',
    colorPrimaryForeground: '#0C0F0A',
    colorText: '#F0EEE8',
    colorTextSecondary: '#8A9088',
    colorNeutral: '#252A23',
    colorDanger: '#FF5A5A',
    colorSuccess: '#5DFF8A',
    borderRadius: '10px',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '15px',
  },
  elements: {
    card: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0, margin: 0 },
    header: { display: 'none' },
    footer: { display: 'none' },
    socialButtonsRoot: { display: 'none' },
    socialButtonsBlockButton: { display: 'none' },
    socialButtonsBlockButtonText: { display: 'none' },
    formFieldInput: {
      background: '#141814',
      border: '1px solid #252A23',
      color: '#F0EEE8',
      borderRadius: '10px',
    },
    formFieldLabel: { color: '#8A9088', fontWeight: 500 },
    formButtonPrimary: {
      background: '#5DFF8A',
      color: '#0C0F0A',
      fontWeight: 700,
      borderRadius: '10px',
    },
    dividerLine: { background: '#252A23' },
    dividerText: { color: '#8A9088' },
    alertText: { color: '#F0EEE8' },
  },
}

export default function ContractorLogin() {
  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', width: '100%' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <Link to="/login" style={{ fontSize: 13, color: S.muted }}>Homeowner? Member login</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 40px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Contractor Portal</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>Partner sign in.</div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Access your lead inbox and rate card.</p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, display: 'flex', justifyContent: 'center' }}>
            <SignIn
              routing="virtual"
              fallbackRedirectUrl="/contractor/dashboard"
              appearance={appearance}
            />
          </div>

          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite, marginBottom: 8 }}>Not a SUBS partner yet?</div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.5, margin: '0 0 14px' }}>Join our vetted contractor network. Pre-qualified homeowners sent directly to you. Zero lead cost.</p>
            <Link to="/">
              <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }}>
                Apply to join →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
