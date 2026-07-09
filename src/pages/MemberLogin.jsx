import { useSearchParams } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
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
    identityPreviewText: { color: '#1E2A23' },
    identityPreviewEditButtonIcon: { color: '#175A41' },
    alertText: { color: '#1E2A23' },
    footer: { color: '#6A7466' },
    footerActionLink: { color: '#175A41' },
  },
}

export default function MemberLogin() {
  const [searchParams] = useSearchParams()
  const isSignUp = searchParams.get('mode') === 'signup'
  const plan = searchParams.get('plan')

  const afterUrl = plan ? `/dashboard?plan=${plan}` : '/dashboard'
  const signUpUrl = plan ? `/login?mode=signup&plan=${plan}` : '/login?mode=signup'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F3E9', padding: '24px 12px' }}>
      <style>{`.member-login-card { padding: 28px; } @media (max-width: 480px) { .member-login-card { padding: 20px 10px; } }`}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>
            {isSignUp ? 'Join SUBS.' : 'Welcome back.'}
          </div>
        </div>

        <div className="member-login-card" style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16 }}>
          {isSignUp ? (
            <SignUp
              routing="virtual"
              forceRedirectUrl={afterUrl}
              signInUrl="/login"
              appearance={appearance}
            />
          ) : (
            <SignIn
              routing="virtual"
              fallbackRedirectUrl={afterUrl}
              signUpUrl={signUpUrl}
              appearance={appearance}
            />
          )}
        </div>
      </div>
    </div>
  )
}
