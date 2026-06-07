'use client'

import { useState } from 'react'

interface Props {
  stageNumber: number
  title: string
  subtitle: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function WorkflowStage({ stageNumber, title, subtitle, icon, defaultOpen, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen || stageNumber === 1)
  const [isCompleted, setIsCompleted] = useState(false)

  return (
    <div style={{ marginBottom: '0.75rem', borderRadius: '12px', border: `2px solid ${isCompleted ? '#86efac' : isOpen ? '#6366f1' : '#d1d5db'}`,
      backgroundColor: '#fff', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Header */}
      <div onClick={() => setIsOpen(!isOpen)} style={{
        padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: isOpen ? 'linear-gradient(135deg, #faf5ff, #eff6ff)' : '#f9fafb',
        borderBottom: isOpen ? '1px solid #e5e7eb' : 'none',
      }}>
        <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: isCompleted ? '#16a34a' : '#6366f1', color: '#fff',
          fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
          {isCompleted ? '✓' : stageNumber}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{icon} {title}</div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.1rem' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isCompleted && <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 600 }}>✅ 已完成</span>}
          <button onClick={e => { e.stopPropagation(); setIsCompleted(!isCompleted) }}
            title="标记完成"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '12px', border: `1px solid ${isCompleted ? '#86efac' : '#d1d5db'}`,
              backgroundColor: isCompleted ? '#f0fdf4' : '#fff', color: isCompleted ? '#16a34a' : '#6b7280', cursor: 'pointer' }}>
            {isCompleted ? '✓ 完成' : '标记完成'}
          </button>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>
      {/* Content */}
      {isOpen && <div style={{ padding: '1rem' }}>{children}</div>}
    </div>
  )
}
