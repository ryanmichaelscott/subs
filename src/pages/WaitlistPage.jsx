import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function WaitlistPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [zip, setZip] = useState(searchParams.get('zip') || '')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/login')
    }
  }, [isLoaded, isSignedIn])

  const name = user?.fullName || user?.firstName || ''
  const email = user?.primaryEmailAddress?.emailAddress || ''

  const handleJoin = async () => {
    if (!zip || zip.replace(/\D/g, '').length < 5) {
      setError('Please enter your 5-digit zip code.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fnError } = await supabase.functions.invoke('join-waitlist', {
      body: { name, email, zip: zip.replace(/\D/g, '').slice(0, 5) },
    })
    if (fnError || data?.error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (!isLoaded) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em', textDecoration: 'none' }}>SUBS</Link>
        <span style={{ fontSize: 13, color: S.muted }}>{email}</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {submitted ? (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: S.green + '22', border: `1px solid ${S.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>
                ✓
              </div>
              <div style={{ fontFamily: C.display, fontSize: 28, color: S.offwhite, marginBottom: 12 }}>You're on the list.</div>
              <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.7, margin: '0 0 28px' }}>
                We'll email <strong style={{ color: S.offwhite }}>{email}</strong> the moment we launch in your area. Most members save more on their first job than a full year of membership fees.
              </p>
              <Link to="/">
                <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.muted, fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 10, cursor: 'pointer' }}>
                  Back to home
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.amber + '22', border: `1px solid ${S.amber}44`, borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
                  <span style={{ color: S.amber, fontSize: 12 }}>●</span>
                  <span style={{ color: S.amber, fontSize: 12, fontWeight: 600 }}>Coming soon to your area</span>
                </div>
                <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 12, lineHeight: 1.1 }}>
                  We're not live in<br />your zip yet.
                </div>
                <p style={{ fontSize: 15, color: S.muted, lineHeight: 1.65, margin: 0 }}>
                  SUBS is expanding. Confirm your spot and we'll notify you the moment vetted contractors are available in your area.
                </p>
              </div>

              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Name</label>
                    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 14 }}>
                      {name || '—'}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email</label>
                    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 14 }}>
                      {email}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={zip}
                      onChange={e => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setError(null) }}
                      placeholder="84101"
                      maxLength={5}
                      style={{
                        width: '100%', background: S.surface, border: `1px solid ${error ? S.danger : S.border}`,
                        borderRadius: 10, padding: '12px 14px', color: S.offwhite, fontSize: 14,
                        outline: 'none', boxSizing: 'border-box', fontFamily: C.body,
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#2D1010', border: `1px solid ${S.danger}`, borderRadius: 8, padding: '10px 14px', marginTop: 16, color: S.danger, fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={loading}
                  style={{
                    width: '100%', background: S.green, border: 'none', color: S.black,
                    fontFamily: C.body, fontSize: 15, fontWeight: 700, padding: '14px 0',
                    borderRadius: 10, cursor: loading ? 'wait' : 'pointer', marginTop: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.8 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 14, height: 14, border: `2px solid ${S.black}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Saving your spot...
                    </>
                  ) : 'Notify me when my area launches →'}
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                {['No spam, ever', 'One email when we launch', 'Cancel anytime after'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: S.muted }}>
                    <span style={{ color: S.green }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
