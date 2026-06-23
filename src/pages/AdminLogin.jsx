import { Link } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { S, C } from '../theme'

const appearance = {
  variables: {
    colorBackground: '#101410',
    colorInputBackground: '#141814',
    colorPrimary: '#FF5A5A',
    colorPrimaryForeground: '#ffffff',
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
    rootBox: { width: '100%' },
    card: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0, margin: 0, width: '100%' },
    header: { paddingBottom: '4px' },
    headerTitle: { color: '#F0EEE8', fontSize: '18px', fontWeight: 700 },
    headerSubtitle: { color: '#8A9088', fontSize: '13px' },
    footer: { display: 'none' },
    socialButtonsBlockButton: {
      background: '#141814',
      border: '1px solid #252A23',
      color: '#F0EEE8',
      borderRadius: '10px',
    },
    socialButtonsBlockButtonText: { color: '#F0EEE8', fontWeight: 600 },
    formFieldInput: {
      background: '#141814',
      border: '1px solid #252A23',
      color: '#F0EEE8',
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    otpCodeFieldInput: {
      background: '#2E2020',
      border: '1px solid #7A5A5A',
      color: '#F0EEE8',
      borderRadius: '8px',
    },
    formFieldLabel: { color: '#8A9088', fontWeight: 500 },
    formButtonPrimary: {
      background: '#FF5A5A',
      color: '#ffffff',
      fontWeight: 700,
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    dividerLine: { background: '#252A23' },
    dividerText: { color: '#8A9088' },
    alertText: { color: '#F0EEE8' },
  },
}

export default function AdminLogin() {
  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
      </nav>

      <style>{`.admin-login-card { padding: 28px; } @media (max-width: 480px) { .admin-login-card { padding: 20px 16px; } }`}</style>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a0f0f', border: '1px solid #3a1a1a', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ color: S.danger, fontSize: 12, fontWeight: 600 }}>Admin Access Only</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 0 }}>Admin login.</div>
          </div>

          <div className="admin-login-card" style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16 }}>
            <SignIn
              routing="hash"
              afterSignInUrl="/admin/dashboard"
              appearance={appearance}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
