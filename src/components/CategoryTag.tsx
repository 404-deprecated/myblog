import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import type { PostCategory } from '@/types/post'

interface CategoryTagProps {
  category: PostCategory
  linked?: boolean
}

const COLOR_MAP: Record<PostCategory, { color: string; bg: string }> = {
  tech:      { color: 'var(--cat-tech)',      bg: 'var(--cat-tech-bg)' },
  life:      { color: 'var(--cat-life)',      bg: 'var(--cat-life-bg)' },
  finance:   { color: 'var(--cat-finance)',   bg: 'var(--cat-finance-bg)' },
  resources: { color: 'var(--cat-resources)', bg: 'var(--cat-resources-bg)' },
}

export function CategoryTag({ category, linked = true }: CategoryTagProps) {
  const meta = CATEGORIES[category]
  const { color, bg } = COLOR_MAP[category]

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.2em 0.65em',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color,
    backgroundColor: bg,
    textDecoration: 'none',
  } as const

  if (linked) {
    return (
      <Link href={`/blog?category=${category}`} style={{ ...style, opacity: 1 }}>
        {meta.label}
      </Link>
    )
  }

  return <span style={style}>{meta.label}</span>
}
