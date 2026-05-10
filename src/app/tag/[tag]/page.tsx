import { getPostsByTag, getAllTags } from '@/lib/posts'
import { PostCard } from '@/components/PostCard'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: encodeURIComponent(tag) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  return { title: `#${decodeURIComponent(tag)}` }
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const posts = getPostsByTag(decoded)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Link
        href="/blog"
        className="link-muted"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', marginBottom: '2rem' }}
      >
        ← 全部文章
      </Link>

      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            tag:
          </span>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            #{decoded}
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{posts.length} 篇文章</p>
      </div>

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.slug} post={post} />)
      ) : (
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          该标签下暂无文章。
        </p>
      )}
    </div>
  )
}
