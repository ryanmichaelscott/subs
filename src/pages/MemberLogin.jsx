import { useSearchParams } from 'react-router-dom'
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
    dividerRow: { display: 'none' },
    dividerLine: { background: '#252A23' },
    dividerText: { color: '#8A9088' },
    identityPreviewText: { color: '#F0EEE8' },
    identityPreviewEditButtonIcon: { color: '#5DFF8A' },
    alertText: { color: '#F0EEE8' },
    footer: { color: '#8A9088' },
    footerActionLink: { color: '#5DFF8A' },
  },
}

export default function MemberLogin() {
  const [searchParams] = useSearchParams()
  const isSignUp = searchParams.get('mode') === 'signup'
  const plan = searchParams.get('plan')

  const afterUrl = plan ? `/dashboard?plan=${plan}` : '/dashboard'
  const signUpUrl = plan ? `/login?mode=signup&plan=${plan}` : '/login?mode=signup'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0C0F0A', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite }}>
            Join SUBS.
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, display: 'flex', justifyContent: 'center' }}>
          {isSignUp ? (
            <SignUp
              routing="virtual"
              fallbackRedirectUrl={afterUrl}
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
