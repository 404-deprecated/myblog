'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/archive', label: '归档' },
  { href: '/about', label: '关于' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--text)',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'var(--accent)' }}>404</span>
          <span style={{ color: 'var(--text-muted)' }}>_</span>
          <span>Not_Found</span>
        </Link>

        <nav
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          aria-label="主导航"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 400,
                  transition: 'color 0.15s',
                  backgroundColor: active ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
          <Link
            href="/search"
            aria-label="搜索"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'border-color 0.2s, color 0.2s',
              flexShrink: 0,
            }}
            className="nav-icon-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <div style={{ marginLeft: '0.25rem' }}>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  )
}
