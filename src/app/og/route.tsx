import { ImageResponse } from 'next/og'
import { CATEGORIES } from '@/lib/categories'
import type { PostCategory } from '@/types/post'

export const runtime = 'edge'

const CAT_COLORS: Record<PostCategory, string> = {
  tech: '#3b82f6',
  life: '#10b981',
  finance: '#f59e0b',
  resources: '#8b5cf6',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? '404_Not_Found'
  const categoryRaw = searchParams.get('category') ?? ''
  const category = categoryRaw in CATEGORIES ? (categoryRaw as PostCategory) : null
  const catLabel = category ? CATEGORIES[category].label : null
  const catColor = category ? CAT_COLORS[category] : '#6d28d9'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 72px',
          backgroundColor: '#0c0c0c',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: catColor,
          }}
        />

        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Site name */}
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '72px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: catColor, fontWeight: 800, fontSize: '20px', fontFamily: 'monospace' }}>
            404
          </span>
          <span style={{ color: '#555', fontSize: '20px', fontFamily: 'monospace' }}>_</span>
          <span style={{ color: '#e8e6e3', fontWeight: 800, fontSize: '20px', fontFamily: 'monospace' }}>
            Not_Found
          </span>
        </div>

        {/* Category badge */}
        {catLabel && (
          <div
            style={{
              display: 'flex',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                backgroundColor: catColor + '22',
                color: catColor,
                fontSize: '14px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}
            >
              {catLabel}
            </span>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? '48px' : '60px',
            fontWeight: 800,
            color: '#f0ece6',
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* Bottom line */}
        <div
          style={{
            marginTop: '32px',
            fontSize: '16px',
            color: '#555',
            fontFamily: 'monospace',
          }}
        >
          404notfound.blog
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
