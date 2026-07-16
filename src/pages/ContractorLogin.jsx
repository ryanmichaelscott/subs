import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignIn, useAuth } from '@clerk/clerk-react'
import { S, C } from '../theme'

const appearance = {
  variables: {
    colorBackground: '#FFFDF7',
    colorInputBackground: '#EFE9DB',
    colorPrimary: '#175A41',
    colorPrimaryForeground: '#F7F3E9',
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
    socialButtonsRoot: { display: 'none' },
    socialButtonsBlockButton: { display: 'none' },
    socialButtonsBlockButtonText: { display: 'none' },
    formFieldInput: {
      background: '#EFE9DB',
      border: '1px solid #DCD3BF',
      color: '#1E2A23',
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    otpCodeFieldInput: {
      background: '#E9EFE2',
      border: '1px solid #A9B8A4',
      color: '#1E2A23',
      borderRadius: '8px',
    },
    formFieldLabel: { color: '#6A7466', fontWeight: 500 },
    formButtonPrimary: {
      background: '#175A41',
      color: '#F7F3E9',
      fontWeight: 700,
      borderRadius: '10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    formButtonSecondary: {
      background: 'transparent',
      border: '1px solid #DCD3BF',
      color: '#1E2A23',
      borderRadius: '10px',
    },
    alternativeMethodsBlockButton: {
      background: '#EFE9DB',
      border: '1px solid #DCD3BF',
      color: '#1E2A23',
      borderRadius: '10px',
    },
    alternativeMethodsBlockButtonText: { color: '#1E2A23' },
    alternativeMethodsBlockButtonArrow: { color: '#175A41' },
    dividerLine: { background: '#DCD3BF' },
    dividerText: { color: '#6A7466' },
    alertText: { color: '#1E2A23' },
  },
}

export default function ContractorLogin() {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/contractor/dashboard', { replace: true })
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || isSignedIn) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`.contractor-login-card { padding: 28px; } @media (max-width: 480px) { .contractor-login-card { padding: 20px 10px; } }`}</style>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
        <Link to="/" style={{ display: 'inline-flex' }}><span style={{ fontFamily: C.display, fontSize: 24, fontWeight: 400, color: S.green, lineHeight: 1, letterSpacing: '0.02em' }}>SUBS</span></Link>
        <Link to="/login" style={{ fontSize: 13, color: S.muted }}>Homeowner? Member login</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 12px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Contractor Portal</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>Partner sign in.</div>
          </div>

          <div className="contractor-login-card" style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16 }}>
            <SignIn
              routing="virtual"
              fallbackRedirectUrl="/contractor/dashboard"
              appearance={appearance}
            />
          </div>

          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite, marginBottom: 8 }}>Not a SUBS partner yet?</div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.5, margin: '0 0 14px' }}>Join our vetted contractor network. Pre-qualified homeowners sent directly to you. Zero lead cost.</p>
            <Link to="/contractor/apply">
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
