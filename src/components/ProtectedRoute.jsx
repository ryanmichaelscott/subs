import { useAuth, useUser } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { S } from '../theme'

const LOGIN_PATHS = {
  member: '/login',
  contractor: '/contractor/login',
  admin: '/admin/login',
}

const DASHBOARD_PATHS = {
  member: '/dashboard',
  contractor: '/contractor/dashboard',
  admin: '/admin/dashboard',
}

export default function ProtectedRoute({ children, role }) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return (
      <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: `3px solid ${S.border}`,
          borderTopColor: S.green,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to={LOGIN_PATHS[role] || '/login'} replace />
  }

  const userRole = user?.publicMetadata?.role
  if (role && userRole && userRole !== role) {
    return <Navigate to={DASHBOARD_PATHS[userRole] || '/dashboard'} replace />
  }

  return children
}
