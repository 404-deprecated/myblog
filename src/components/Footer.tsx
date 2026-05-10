export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', marginTop: 'auto' }}>
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>© {year} 404_Not_Found</span>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <a
            href="https://github.com/EvilsoulMMM"
            target="_blank"
            rel="noopener noreferrer"
            className="link-muted"
          >
            GitHub
          </a>
          <span>用文字记录，用代码表达</span>
        </div>
      </div>
    </footer>
  )
}
