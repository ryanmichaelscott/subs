import { Link, useSearchParams } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { S, C } from '../theme'

const appearance = {
  variables: {
    colorBackground: '#FFFDF7',
    colorInputBackground: '#EFE9DB',
    colorPrimary: '#B3402F',
    colorPrimaryForeground: '#ffffff',
    colorText: '#1E2A23',
    colorTextSecondary: '#6A7466',
    colorNeutral: '#DCD3BF',
    colorDanger: '#B3402F',
    colorSuccess: '#175A41',
    borderRadius: '10px',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '15px',
  },
  elements: {
    rootBox: { width: '100%' },
    card: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0, margin: 0, width: '100%' },
    header: { paddingBottom: '4px' },
    headerTitle: { color: '#1E2A23', fontSize: '18px', fontWeight: 700 },
    headerSubtitle: { color: '#6A7466', fontSize: '13px' },
    footer: { display: 'none' },
    socialButtonsBlockButton: {
      background: '#EFE9DB',
      border: '1px solid #DCD3BF',
      color: '#1E2A23',
      borderRadius: '10px',
    },
    socialButtonsBlockButtonText: { color: '#1E2A23', fontWeight: 600 },
    formFieldInput: {
      background: '#EFE9DB',
      border: '1px solid #DCD3BF',
      color: '#1E2A23',
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    otpCodeFieldInput: {
      background: '#2E2020',
      border: '1px solid #7A5A5A',
      color: '#1E2A23',
      borderRadius: '8px',
    },
    formFieldLabel: { color: '#6A7466', fontWeight: 500 },
    formButtonPrimary: {
      background: '#B3402F',
      color: '#ffffff',
      fontWeight: 700,
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    dividerLine: { background: '#DCD3BF' },
    dividerText: { color: '#6A7466' },
    alertText: { color: '#1E2A23' },
  },
}

export default function AdminLogin() {
  const [searchParams] = useSearchParams()
  // Invitation links include __clerk_ticket — these users need to sign UP, not sign in
  const hasTicket = !!searchParams.get('__clerk_ticket')

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
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 0 }}>
              {hasTicket ? 'Create your account.' : 'Admin login.'}
            </div>
          </div>

          <div className="admin-login-card" style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16 }}>
            {hasTicket ? (
              <SignUp
                routing="virtual"
                forceRedirectUrl="/admin/dashboard"
                signInUrl="/admin/login"
                appearance={appearance}
              />
            ) : (
              <SignIn
                routing="virtual"
                fallbackRedirectUrl="/admin/dashboard"
                signUpUrl="/admin/login"
                appearance={appearance}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
