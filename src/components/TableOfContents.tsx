import type { Heading } from '@/lib/toc'

interface TableOfContentsProps {
  headings: Heading[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length < 2) return null

  return (
    <aside
      style={{
        position: 'sticky',
        top: '80px',
        width: '220px',
        flexShrink: 0,
        alignSelf: 'flex-start',
        display: 'none',
      }}
      className="toc-sidebar"
    >
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        目录
      </p>
      <nav>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="toc-link"
            style={{
              display: 'block',
              paddingLeft: h.level === 3 ? '0.75rem' : '0',
              marginBottom: '0.4rem',
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              lineHeight: 1.4,
              borderLeft: h.level === 3 ? '1px solid var(--border)' : 'none',
              transition: 'color 0.15s',
            }}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
