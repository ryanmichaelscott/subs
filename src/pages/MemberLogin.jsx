import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
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
    identityPreviewText: { color: '#F0EEE8' },
    identityPreviewEditButtonIcon: { color: '#5DFF8A' },
    alertText: { color: '#F0EEE8' },
  },
}

export default function MemberLogin() {
  const [mode, setMode] = useState('login')

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <Link to="/contractor/login" style={{ fontSize: 13, color: S.muted }}>Contractor? Sign in here</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>
              {mode === 'login' ? 'Welcome back.' : 'Join SUBS.'}
            </div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>
              {mode === 'login' ? 'Sign in to access your member dashboard.' : 'Unlock contractor pricing on every trade.'}
            </p>
          </div>

          <div style={{ display: 'flex', background: S.surface, borderRadius: 12, padding: 4, border: `1px solid ${S.border}`, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? S.card : 'transparent', border: mode === m ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, color: mode === m ? S.offwhite : S.muted, cursor: 'pointer' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            {mode === 'login' ? (
              <SignIn
                routing="hash"
                afterSignInUrl="/dashboard"
                signUpUrl="/login"
                appearance={appearance}
              />
            ) : (
              <SignUp
                routing="hash"
                afterSignUpUrl="/dashboard"
                signInUrl="/login"
                appearance={appearance}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
