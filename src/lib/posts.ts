import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import type { Post, PostMeta, PostCategory } from '@/types/post'

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const rt = readingTime(content)

  return {
    slug,
    title: data.title ?? 'Untitled',
    date: data.date ?? '',
    excerpt: data.excerpt ?? '',
    category: (data.category ?? 'tech') as PostCategory,
    tags: data.tags ?? [],
    readingTime: rt.text,
    content,
  }
}

export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is Post => p !== null)
    .map(({ content: _, ...meta }) => meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPostsByCategory(category: PostCategory): PostMeta[] {
  return getAllPosts().filter((p) => p.category === category)
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((p) => p.tags.includes(tag))
}

export function getAllTags(): string[] {
  const tags = getAllPosts().flatMap((p) => p.tags)
  return [...new Set(tags)].sort()
}

export function getPrevNextPosts(slug: string): { prev: PostMeta | null; next: PostMeta | null } {
  const posts = getAllPosts()
  const idx = posts.findIndex((p) => p.slug === slug)
  return {
    prev: idx < posts.length - 1 ? posts[idx + 1] : null,
    next: idx > 0 ? posts[idx - 1] : null,
  }
}
