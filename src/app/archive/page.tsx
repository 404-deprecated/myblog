import { getAllPosts } from '@/lib/posts'
import { CategoryTag } from '@/components/CategoryTag'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '归档' }

export default function ArchivePage() {
  const posts = getAllPosts()

  const byYear = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    const year = post.date.slice(0, 4)
    if (!acc[year]) acc[year] = []
    acc[year].push(post)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem',
          }}
        >
          归档
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          共 {posts.length} 篇文章，横跨 {years.length} 年
        </p>
      </div>

      {years.map((year) => (
        <section key={year} style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {year}
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
              {byYear[year].length} 篇
            </span>
          </h2>

          <div>
            {byYear[year].map((post) => (
              <div
                key={post.slug}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '1rem',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                <time
                  dateTime={post.date}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                    minWidth: '5rem',
                  }}
                >
                  {post.date.slice(5)}
                </time>
                <CategoryTag category={post.category} linked={false} />
                <Link
                  href={`/blog/${post.slug}`}
                  className="link-heading"
                  style={{ fontSize: '0.95rem', flex: 1 }}
                >
                  {post.title}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
