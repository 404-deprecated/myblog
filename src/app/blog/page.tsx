import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/PostCard'
import { CATEGORIES } from '@/lib/categories'
import type { PostCategory } from '@/types/post'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: '文章' }

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { category } = await searchParams
  const validCategory = category && category in CATEGORIES ? (category as PostCategory) : undefined

  const allPosts = getAllPosts()
  const posts = validCategory ? allPosts.filter((p) => p.category === validCategory) : allPosts

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem',
          }}
        >
          文章
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          共 {posts.length} 篇{validCategory ? `「${CATEGORIES[validCategory].label}」` : ''}文章
        </p>
      </div>

      {/* Category filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link href="/blog" className={`filter-btn${!validCategory ? ' active' : ''}`}>
          全部
        </Link>
        {(Object.keys(CATEGORIES) as PostCategory[]).map((cat) => (
          <Link
            key={cat}
            href={`/blog?category=${cat}`}
            className={`filter-btn${validCategory === cat ? ' active' : ''}`}
          >
            {CATEGORIES[cat].label}
          </Link>
        ))}
      </div>

      {posts.length > 0 ? (
        <div>
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          该分类下暂无文章。
        </p>
      )}
    </div>
  )
}
