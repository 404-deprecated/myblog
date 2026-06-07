export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', fontFamily: 'var(--font-mono)' }}>
      {children}
    </div>
  )
}
