import { notFound } from 'next/navigation'
import { getAllPostSlugs, getPostBySlug, getPrevNextPosts } from '@/lib/posts'
import { extractHeadings } from '@/lib/toc'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { CategoryTag } from '@/components/CategoryTag'
import { TableOfContents } from '@/components/TableOfContents'
import { PostNav } from '@/components/PostNav'
import { GiscusComments } from '@/components/GiscusComments'
import { MarketIndicators } from '@/components/MarketIndicators'
import { Callout } from '@/components/Callout'
import { StockTracker } from '@/components/StockTracker'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { MDXRemoteProps } from 'next-mdx-remote/rsc'

interface PageProps {
  params: Promise<{ slug: string }>
}

const mdxOptions: MDXRemoteProps['options'] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: { dark: 'github-dark', light: 'github-light' }, keepBackground: false }],
    ],
  },
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const ogUrl = `/og?title=${encodeURIComponent(post.title)}&category=${post.category}`
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const headings = extractHeadings(post.content)
  const { prev, next } = getPrevNextPosts(slug)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Link
        href="/blog"
        className="link-muted"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', marginBottom: '2.5rem' }}
      >
        ← 返回文章列表
      </Link>

      <div style={{ display: 'flex', gap: '4rem', alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <header style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <CategoryTag category={post.category} />
              <time
                dateTime={post.date}
                style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {formatDate(post.date)}
              </time>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>·</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{post.readingTime}</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.75rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '1rem',
              }}
            >
              {post.title}
            </h1>

            {post.excerpt && (
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {post.excerpt}
              </p>
            )}

            {post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem' }}>
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className="tag-pill"
                    style={{ fontSize: '0.8rem', padding: '0.2em 0.6em', borderRadius: '4px' }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '3rem' }} />

          <div className="prose">
            <MDXRemote source={post.content} options={mdxOptions} components={{ MarketIndicators, Callout, StockTracker }} />
          </div>

          <PostNav prev={prev} next={next} />

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <GiscusComments />
          </div>
        </div>

        {/* TOC sidebar */}
        <TableOfContents headings={headings} />
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
