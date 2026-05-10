'use client'

import Giscus from '@giscus/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { GISCUS_CONFIG } from '@/lib/giscus.config'

export function GiscusComments() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // Skip rendering if not configured yet
  if (GISCUS_CONFIG.repoId === 'TODO_REPO_ID') {
    return (
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px dashed var(--border)',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        评论功能待配置 — 参考{' '}
        <a
          href="https://giscus.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          giscus.app
        </a>{' '}
        填写 <code>src/lib/giscus.config.ts</code> 中的 repoId 和 categoryId
      </div>
    )
  }

  return (
    <Giscus
      {...GISCUS_CONFIG}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}
