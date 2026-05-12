'use client'

import { useEffect, useRef, useState } from 'react'
import type { MacroResponse, MacroSignal } from '@/app/api/macro-signals/route'

function ScoreBar({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const pct = Math.round(((score + 1) / 2) * 100)
  const color = pct >= 60 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444'
  const h = size === 'lg' ? 10 : 6
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: h, background: 'var(--border)', borderRadius: h, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: size === 'lg' ? 13 : 11, color, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function ImpactDot({ impact }: { impact: MacroSignal['impact'] }) {
  const c = impact === 'bullish' ? '#22c55e' : impact === 'bearish' ? '#ef4444' : '#f59e0b'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
}

function TrendIcon({ trend }: { trend: MacroSignal['trend'] }) {
  if (trend === 'up') return <span style={{ color: '#22c55e', fontSize: 11 }}>↑</span>
  if (trend === 'down') return <span style={{ color: '#ef4444', fontSize: 11 }}>↓</span>
  return <span style={{ color: '#6b7280', fontSize: 11 }}>→</span>
}

function SignalCard({ sig }: { sig: MacroSignal }) {
  const borderColor = sig.impact === 'bullish' ? '#22c55e33' : sig.impact === 'bearish' ? '#ef444433' : '#f59e0b33'
  const hasValue = sig.value !== 0 || sig.unit !== ''
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 8,
      border: `1px solid ${borderColor}`,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ImpactDot impact={sig.impact} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{sig.name}</span>
        {hasValue && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {sig.value}{sig.unit}
          </span>
        )}
        <TrendIcon trend={sig.trend} />
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sig.note}</p>
      <ScoreBar score={sig.score} size="sm" />
    </div>
  )
}

function LayerColumn({
  label, weight, score, signals, accent,
}: {
  label: string; weight: string; score: number; signals: MacroSignal[]; accent: string
}) {
  const pct = Math.round(((score + 1) / 2) * 100)
  const label2 = pct >= 60 ? '偏多' : pct >= 45 ? '中性' : '偏空'
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: `${accent}18`,
        border: `1px solid ${accent}44`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: accent }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>权重 {weight}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: accent }}>{pct}%</span>
          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: `${accent}22`, color: accent }}>{label2}</span>
        </div>
        <ScoreBar score={score} size="sm" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signals.map(s => <SignalCard key={s.key} sig={s} />)}
      </div>
    </div>
  )
}

export default function MacroScorePanel() {
  const [data, setData] = useState<MacroResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/macro-signals', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: MacroResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 60 * 60 * 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  if (loading && !data) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      加载宏观信号中…
    </div>
  )

  if (error && !data) return (
    <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>数据加载失败：{error}</p>
      <button onClick={load} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↻ 重试</button>
    </div>
  )

  if (!data) return null

  const macroSigs = data.signals.filter(s => s.layer === 'macro')
  const sectorSigs = data.signals.filter(s => s.layer === 'sector')
  const sentimentSigs = data.signals.filter(s => s.layer === 'sentiment')

  const bullPct = data.compositeScore
  const barColor = bullPct >= 60 ? '#22c55e' : bullPct >= 45 ? '#f59e0b' : '#ef4444'
  const updatedAt = new Date(data.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Composite score header */}
      <div style={{
        padding: '20px 24px',
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>综合市场评分</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: barColor, lineHeight: 1 }}>{bullPct}<span style={{ fontSize: 20 }}>%</span></span>
              <span style={{
                fontSize: 15, fontWeight: 700, color: barColor,
                padding: '3px 10px', borderRadius: 6,
                background: `${barColor}22`,
              }}>{data.compositeLabel}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              上次更新 {updatedAt} · 每小时自动刷新
              {loading && <span style={{ marginLeft: 6, opacity: 0.6 }}>刷新中…</span>}
            </span>
            <button
              onClick={load}
              disabled={loading}
              style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >↻ 立即刷新</button>
          </div>
        </div>

        {/* Composite bar */}
        <div style={{ position: 'relative', height: 14, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${bullPct}%`, height: '100%', background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 45%, #22c55e 100%)`, borderRadius: 8, transition: 'width 0.8s ease' }} />
          <div style={{ position: 'absolute', top: 0, left: `${bullPct}%`, transform: 'translateX(-50%)', height: '100%', width: 2, background: 'white', opacity: 0.8 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
          <span>强烈看空 0%</span><span>中性 50%</span><span>100% 强烈看多</span>
        </div>

        {/* Layer mini scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {[
            { label: '宏观层', score: data.macroScore, weight: '40%', color: '#6366f1' },
            { label: '行业/中观', score: data.sectorScore, weight: '30%', color: '#f59e0b' },
            { label: '市场情绪', score: data.sentimentScore, weight: '30%', color: '#22c55e' },
          ].map(({ label, score, weight, color }) => {
            const p = Math.round(((score + 1) / 2) * 100)
            return (
              <div key={label} style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: `${color}11`, border: `1px solid ${color}33` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label} <span style={{ opacity: 0.6 }}>{weight}</span></div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{p}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Three-column signal grid */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <LayerColumn
          label="宏观层"
          weight="40%"
          score={data.macroScore}
          signals={macroSigs}
          accent="#6366f1"
        />
        <LayerColumn
          label="行业/中观"
          weight="30%"
          score={data.sectorScore}
          signals={sectorSigs}
          accent="#f59e0b"
        />
        <LayerColumn
          label="市场情绪"
          weight="30%"
          score={data.sentimentScore}
          signals={sentimentSigs}
          accent="#22c55e"
        />
      </div>

      {data.errors && data.errors.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
          实时经济数据暂不可用，已用静态估值替代 · 不影响评分计算
        </div>
      )}
    </div>
  )
}
