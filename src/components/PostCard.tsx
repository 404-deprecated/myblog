import Link from 'next/link'
import { CategoryTag } from './CategoryTag'
import type { PostMeta } from '@/types/post'

interface PostCardProps {
  post: PostMeta
  featured?: boolean
}

export function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <article
      style={{
        padding: featured ? '1.5rem' : '1.25rem 0',
        borderBottom: featured ? 'none' : '1px solid var(--border)',
        borderRadius: featured ? '10px' : '0',
        backgroundColor: featured ? 'var(--surface)' : 'transparent',
        border: featured ? '1px solid var(--border)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <CategoryTag category={post.category} />
        <time
          dateTime={post.date}
          style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {formatDate(post.date)}
        </time>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>·</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{post.readingTime}</span>
      </div>

      <h2
        style={{
          fontSize: featured ? 'clamp(1.2rem, 1rem + 1vw, 1.5rem)' : '1.1rem',
          fontWeight: 700,
          marginBottom: '0.4rem',
          lineHeight: 1.3,
        }}
      >
        <Link href={`/blog/${post.slug}`} className="link-heading">
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            marginBottom: post.tags.length > 0 ? '0.75rem' : '0',
          }}
        >
          {post.excerpt}
        </p>
      )}

      {post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tag/${encodeURIComponent(tag)}`}
              className="tag-pill"
              style={{
                fontSize: '0.78rem',
                padding: '0.15em 0.55em',
                borderRadius: '4px',
              }}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
