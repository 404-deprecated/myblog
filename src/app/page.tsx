import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/PostCard'
import { CategoryTag } from '@/components/CategoryTag'
import { CATEGORIES } from '@/lib/categories'
import type { PostCategory } from '@/types/post'

export default function HomePage() {
  const posts = getAllPosts()
  const featured = posts[0]
  const recent = posts.slice(1, 6)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Hero */}
      <section style={{ marginBottom: '4rem' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--accent)',
            marginBottom: '0.75rem',
            letterSpacing: '0.05em',
          }}
        >
          $ whoami
        </p>
        <h1
          style={{
            fontSize: 'clamp(2rem, 1.5rem + 2.5vw, 3.25rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
          }}
        >
          Hi, I&apos;m{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            404_Not_Found
          </span>
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-muted)',
            maxWidth: '52ch',
            lineHeight: 1.7,
            marginBottom: '2rem',
          }}
        >
          客户端开发者，AI 工具探索者。这里记录技术思考、生活感悟、理财笔记和值得收藏的学习资源。
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {(Object.keys(CATEGORIES) as PostCategory[]).map((cat) => (
            <Link key={cat} href={`/blog?category=${cat}`} className="surface-link">
              <CategoryTag category={cat} linked={false} />
              <span>{CATEGORIES[cat].description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Market dashboard entry */}
      <section style={{ marginBottom: '3.5rem' }}>
        <Link
          href="/market"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
          className="market-entry-link"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>📈</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>
                市场仪表盘
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                指数走势 · 风险指标 · AI 基金择时分析
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', flexShrink: 0 }}>查看 →</span>
        </Link>
      </section>

      {/* Featured post */}
      {featured && (
        <section style={{ marginBottom: '3.5rem' }}>
          <h2
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            最新文章
          </h2>
          <PostCard post={featured} featured />
        </section>
      )}

      {/* Recent posts */}
      {recent.length > 0 && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              近期文章
            </h2>
            <Link
              href="/blog"
              style={{
                fontSize: '0.875rem',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              查看全部 →
            </Link>
          </div>
          <div>
            {recent.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 0',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>_</p>
          <p>还没有文章，开始写第一篇吧。</p>
        </div>
      )}
    </div>
  )
}
