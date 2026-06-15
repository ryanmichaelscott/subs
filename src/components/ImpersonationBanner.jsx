import { S } from '../theme'

export default function ImpersonationBanner({ name, role, onExit }) {
  return (
    <div style={{ background: '#1A0E00', borderBottom: `2px solid ${S.amber}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 58, zIndex: 49 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13 }}>👁</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: S.amber }}>Impersonating:</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: S.offwhite }}>{name}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0C0F0A', background: S.amber, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role}</span>
        <span style={{ fontSize: 12, color: S.muted }}>· Read/write mode as this user</span>
      </div>
      <button onClick={onExit} style={{ background: S.amber, border: 'none', color: '#0C0F0A', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 7, cursor: 'pointer' }}>
        Exit impersonation
      </button>
    </div>
  )
}
