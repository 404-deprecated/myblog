'use client'

import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import Link from 'next/link'
import type { PostMeta } from '@/types/post'
import { CategoryTag } from './CategoryTag'

interface SearchClientProps {
  posts: PostMeta[]
}

export function SearchClient({ posts }: SearchClientProps) {
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () =>
      new Fuse(posts, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'excerpt', weight: 1 },
          { name: 'tags', weight: 1.5 },
        ],
        threshold: 0.4,
        includeScore: true,
      }),
    [posts]
  )

  const results = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : []

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <svg
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文章标题、摘要、标签…"
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.75rem',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="清除搜索"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        )}
      </div>

      {query && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {results.length > 0
            ? `找到 ${results.length} 篇文章`
            : '没有找到相关文章'}
        </p>
      )}

      {!query && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontFamily: 'var(--font-mono)' }}>
          输入关键词搜索全部 {posts.length} 篇文章
        </p>
      )}

      <div>
        {results.map((post) => (
          <article
            key={post.slug}
            style={{ padding: '1.25rem 0', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <CategoryTag category={post.category} />
              <time style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {new Date(post.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem', lineHeight: 1.3 }}>
              <Link href={`/blog/${post.slug}`} className="link-heading">
                {post.title}
              </Link>
            </h2>
            {post.excerpt && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {post.excerpt}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
