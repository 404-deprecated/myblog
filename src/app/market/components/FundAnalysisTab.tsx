'use client'

import { useState, useCallback } from 'react'
import { FundImageAnalysis } from '@/components/FundImageAnalysis'
import SectionLabel from './SectionLabel'
import { PRESET_FUNDS, ZONE_COLORS } from '../market-data'

interface FundResult {
  fund_name: string; category: string; price_desc: string
  from_high_pct: number; from_low_pct: number
  zone: 'buy2' | 'buy1' | 'hold' | 'warn' | 'sell'
  zone_label: string; monthly_action: string
  buy_condition: string; sell_condition: string
  key_risk: string; key_opportunity: string
  confidence: 'high' | 'medium' | 'low'; note: string
}

export default function FundAnalysisTab() {
  const [fundInput, setFundInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FundResult | null>(null)
  const [error, setError] = useState('')

  const analyze = useCallback(async (name?: string) => {
    const fund = (name ?? fundInput).trim()
    if (!fund) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/fund-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fund }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [fundInput])

  const zc = result ? (ZONE_COLORS[result.zone] ?? ZONE_COLORS.hold) : null
  const needlePct = result ? Math.max(4, Math.min(96, result.from_high_pct <= -25 ? 8 : result.from_high_pct <= -15 ? 20 : result.from_low_pct >= 80 ? 90 : result.from_low_pct >= 50 ? 72 : 50)) : 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <SectionLabel>持仓截图 AI 分析</SectionLabel>
        <FundImageAnalysis />
      </section>
      <section>
        <SectionLabel>基金择时分析</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {PRESET_FUNDS.map(f => (
            <button key={f} onClick={() => { setFundInput(f); analyze(f) }} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {f.length > 8 ? f.slice(0, 8) + '…' : f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" value={fundInput} onChange={e => setFundInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') analyze() }}
            placeholder="输入基金名称，按 Enter 分析…" style={{ flex: 1, fontSize: '0.9rem', padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#1f2937', outline: 'none' }} />
          <button onClick={() => analyze()} disabled={loading || !fundInput.trim()}
            style={{ padding: '0.55rem 1.125rem', fontSize: '0.875rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.45 : 1 }}>{loading ? '分析中…' : '分析'}</button>
        </div>
        {error && <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: '#991b1b', backgroundColor: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.625rem 0.875rem' }}>分析失败：{error}</div>}
        {loading && <div style={{ marginTop: '1rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#fff', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[75, 50, 65, 40].map((w, i) => <div key={i} style={{ height: '12px', borderRadius: '6px', backgroundColor: '#f3f4f6', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>}
        {result && zc && (
          <div style={{ marginTop: '1rem', borderRadius: '10px', border: `1px solid ${zc.border}`, backgroundColor: zc.bg, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div><div style={{ fontSize: '0.95rem', fontWeight: 700, color: zc.text }}>{result.fund_name}</div><div style={{ fontSize: '0.78rem', color: zc.text, opacity: 0.65 }}>{result.category}</div></div>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, backgroundColor: zc.badge, color: zc.badgeText }}>{result.zone_label}</span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ flex: 1, backgroundColor: '#4ade80', opacity: 0.8 }} /><div style={{ flex: 1, backgroundColor: '#2dd4bf', opacity: 0.8 }} />
                <div style={{ flex: 2, backgroundColor: '#d1d5db' }} /><div style={{ flex: 1, backgroundColor: '#fbbf24', opacity: 0.8 }} /><div style={{ flex: 1, backgroundColor: '#f87171', opacity: 0.8 }} />
              </div>
              <div style={{ position: 'relative', height: '10px' }}><div style={{ position: 'absolute', top: 0, left: `${needlePct}%`, transform: 'translateX(-50%)', width: '2px', height: '10px', backgroundColor: zc.text }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: zc.text, opacity: 0.55, marginTop: '4px' }}><span>重仓买</span><span>轻仓买</span><span>持有</span><span>减仓</span><span>大减</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[{ label: '距近期高点', value: `${result.from_high_pct > 0 ? '+' : ''}${result.from_high_pct}%`, red: result.from_high_pct > -5 }, { label: '距近期低点', value: `+${result.from_low_pct}%`, red: result.from_low_pct > 60 }].map(item => (
                <div key={item.label} style={{ borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.4)', padding: '0.625rem 0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, color: zc.text }}>{item.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: item.red ? '#dc2626' : '#16a34a' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: zc.text, marginBottom: '0.875rem', lineHeight: 1.5 }}>{result.monthly_action}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[
                { label: '买入条件', value: result.buy_condition, color: '#16a34a' }, { label: '减仓条件', value: result.sell_condition, color: '#dc2626' },
                { label: '主要风险', value: result.key_risk, color: '#b45309' }, { label: '主要机会', value: result.key_opportunity, color: '#1d4ed8' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ color: zc.text, opacity: 0.5, flexShrink: 0, width: '4rem' }}>{row.label}</span>
                  <span style={{ color: row.color, lineHeight: 1.5 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
