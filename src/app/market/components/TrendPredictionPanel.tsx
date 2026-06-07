'use client'

import { predictTrend } from '../market-data'

interface Props {
  nasdaqData: { m: string; p: number }[]
  shanghaiData: { m: string; p: number }[]
  hangSengData: { m: string; p: number }[]
}

export default function TrendPredictionPanel({ nasdaqData, shanghaiData, hangSengData }: Props) {
  const nasdaq = predictTrend(nasdaqData)
  const shanghai = predictTrend(shanghaiData)
  const hangSeng = predictTrend(hangSengData)
  if (!nasdaq || !shanghai) return null

  const markets = [
    { name: '纳斯达克', ticker: 'NASDAQ', pred: nasdaq, color: '#2563eb' },
    { name: '上证指数', ticker: 'SSE', pred: shanghai, color: '#d97706' },
    ...(hangSeng ? [{ name: '恒生指数', ticker: 'HSI', pred: hangSeng, color: '#7c3aed' }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {markets.map(({ name, ticker, pred, color }) => (
        <div key={ticker} style={{ borderRadius: '10px', border: `1px solid ${pred.color}40`, backgroundColor: '#fff', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #d1d5db', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>{name}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '20px', backgroundColor: pred.color + '18', color: pred.color, border: `1px solid ${pred.color}40` }}>{pred.label}</span>
              <span style={{ fontSize: '0.68rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>历史准确率 {pred.accuracy}%/{pred.samples}次</span>
            </div>
          </div>
          <div style={{ padding: '0.875rem 1rem' }}>
            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fee2e2' }}>
                <div style={{ width: `${pred.bullPct}%`, backgroundColor: pred.bullPct >= 60 ? '#16a34a' : pred.bullPct >= 50 ? '#d97706' : '#6b7280', borderRadius: '4px 0 0 4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '0.62rem', color: '#6b7280' }}>
                <span>看跌</span><span>看涨 {pred.bullPct}%</span>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#1f2937', lineHeight: 1.6, marginBottom: '0.75rem', borderLeft: `3px solid ${pred.color}`, paddingLeft: '0.625rem' }}>{pred.reason}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.375rem' }}>
              {pred.signals.map(s => (
                <div key={s.name} style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', backgroundColor: s.bullish ? '#f0fdf4' : '#fff1f2', border: `1px solid ${s.bullish ? '#86efac' : '#fca5a5'}` }}>
                  <div style={{ fontSize: '0.6rem', color: s.bullish ? '#15803d' : '#991b1b', marginBottom: '0.15rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '0.72rem', color: s.bullish ? '#166534' : '#7f1d1d', lineHeight: 1.4 }}>{s.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
