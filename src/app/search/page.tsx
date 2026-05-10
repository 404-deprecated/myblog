import { getAllPosts } from '@/lib/posts'
import { SearchClient } from '@/components/SearchClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '搜索' }

export default function SearchPage() {
  const posts = getAllPosts()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '2rem',
        }}
      >
        搜索
      </h1>
      <SearchClient posts={posts} />
    </div>
  )
}
