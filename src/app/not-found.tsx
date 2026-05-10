import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '6rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(4rem, 2rem + 10vw, 8rem)',
          fontWeight: 900,
          color: 'var(--accent)',
          lineHeight: 1,
          marginBottom: '1rem',
          letterSpacing: '-0.05em',
        }}
      >
        404
      </p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        页面不见了
      </h1>
      <p
        style={{
          color: 'var(--text-muted)',
          marginBottom: '2.5rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
        }}
      >
        Error: Page_Not_Found — 这正是博客名字的来历。
      </p>
      <Link href="/" className="btn-primary">
        回到首页
      </Link>
    </div>
  )
}
