import Link from 'next/link'
import type { PostMeta } from '@/types/post'

interface PostNavProps {
  prev: PostMeta | null
  next: PostMeta | null
}

export function PostNav({ prev, next }: PostNavProps) {
  if (!prev && !next) return null

  return (
    <nav
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginTop: '3rem',
        paddingTop: '2rem',
        borderTop: '1px solid var(--border)',
      }}
      aria-label="文章导航"
    >
      <div>
        {prev && (
          <Link href={`/blog/${prev.slug}`} className="post-nav-link" style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              ← 上一篇
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
              {prev.title}
            </span>
          </Link>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        {next && (
          <Link href={`/blog/${next.slug}`} className="post-nav-link" style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              下一篇 →
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  )
}
