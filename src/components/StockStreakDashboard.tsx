'use client'

import { useState, useEffect } from 'react'

interface StockStreakData {
  ticker: string
  name: string
  price: number
  prevClose: number
  dayChange: number
  dayChangePct: number
  streak: number
  streakPct: number
  ma20: number | null
  ma50: number | null
  recentLow: number | null
  recentHigh: number | null
  error?: string
}

const WATCHLIST_TICKERS = 'NVDA,0700.HK,ORCL,PDD,600036.SS,002142.SZ,MU,005930.KS,000660.KS'

const STOCK_NAMES: Record<string, string> = {
  NVDA: '英伟达', '0700.HK': '腾讯', ORCL: '甲骨文', PDD: '拼多多',
  '600036.SS': '招商银行', '002142.SZ': '宁波银行', MU: '美光',
  '005930.KS': '三星', '000660.KS': 'SK海力士',
}

const STOCK_FLAGS: Record<string, string> = {
  NVDA: '🇺🇸', '0700.HK': '🇭🇰', ORCL: '🇺🇸', PDD: '🇺🇸',
  '600036.SS': '🇨🇳', '002142.SZ': '🇨🇳', MU: '🇺🇸',
  '005930.KS': '🇰🇷', '000660.KS': '🇰🇷',
}

function fmtPrice(n: number, ticker: string): string {
  if (!n) return '—'
  if (ticker === '005930.KS' || ticker === '000660.KS') return `₩${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  if (ticker === '0700.HK') return `HK$${n.toFixed(2)}`
  if (ticker === '600036.SS' || ticker === '002142.SZ') return `¥${n.toFixed(2)}`
  return `$${n.toFixed(2)}`
}

function supportPct(price: number, support: number | null): string {
  if (!support || !price) return '—'
  return `${((price / support - 1) * 100).toFixed(1)}%`
}

export function StockStreakDashboard() {
  const [data, setData] = useState<StockStreakData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetch(`/api/stock-streak?tickers=${WATCHLIST_TICKERS}`)
        .then(r => r.json())
        .then((d: StockStreakData[]) => {
          if (cancelled) return
          setData(d)
          setLoading(false)
          setLastUpdated(new Date().toLocaleString('zh-CN', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }))
        })
        .catch(() => { if (!cancelled) setLoading(false) })
    }

    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  if (loading) {
    return (
      <div style={{ margin: '2rem 0', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        正在获取每日涨跌数据...
      </div>
    )
  }

  const upCount = data.filter(d => d.dayChangePct > 0).length
  const downCount = data.filter(d => d.dayChangePct < 0).length
  const avgChange = data.length ? +(data.reduce((s, d) => s + d.dayChangePct, 0) / data.length).toFixed(2) : 0

  return (
    <div style={{ margin: '2rem 0', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            每日涨跌趋势 · 连续天数 · 支撑位
          </span>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            数据来源 Yahoo Finance · 每 5 分钟自动刷新
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* Summary */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.85rem', fontWeight: 700,
              color: avgChange > 0 ? '#22c55e' : avgChange < 0 ? '#ef4444' : 'var(--text-muted)',
            }}>
              整体 {avgChange > 0 ? '+' : ''}{avgChange}%
            </span>
            <span style={{ fontSize: '0.72rem', color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
              涨 {upCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
              跌 {downCount}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              更新于 {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
        {data.map(d => {
          const isUp = d.dayChangePct > 0
          const isStreakUp = d.streak > 0
          const hasStreak = Math.abs(d.streak) >= 2

          return (
            <div
              key={d.ticker}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                opacity: d.error ? 0.6 : 1,
              }}
            >
              {/* Top row: ticker + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {STOCK_FLAGS[d.ticker] ?? ''} {d.ticker}
                  </span>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.08rem' }}>
                    {STOCK_NAMES[d.ticker] ?? d.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {fmtPrice(d.price, d.ticker)}
                  </div>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                    color: isUp ? '#22c55e' : d.dayChangePct < 0 ? '#ef4444' : 'var(--text-muted)',
                  }}>
                    {isUp ? '+' : ''}{d.dayChangePct}%
                  </div>
                </div>
              </div>

              {/* Streak row */}
              <div style={{
                background: d.error ? 'transparent' : isStreakUp ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                  {d.error ? d.error : hasStreak
                    ? `连续${Math.abs(d.streak)}天${isStreakUp ? '上涨' : '下跌'}`
                    : d.streak === 0 ? '今日持平' : '首日变动'
                  }
                </span>
                {hasStreak && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: isStreakUp ? '#22c55e' : '#ef4444',
                  }}>
                    {isStreakUp ? '+' : ''}{d.streakPct}%
                  </span>
                )}
              </div>

              {/* Support levels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.05rem' }}>
                  支撑位 · 距当前价格
                </div>
                {/* MA20 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', marginRight: '4px', verticalAlign: 'middle' }} />
                    MA20
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {d.ma20 ? fmtPrice(d.ma20, d.ticker) : '—'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                    color: d.ma20 && d.price > d.ma20 ? '#22c55e' : '#ef4444',
                  }}>
                    {supportPct(d.price, d.ma20)}
                  </span>
                </div>
                {/* 20-day low */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginRight: '4px', verticalAlign: 'middle' }} />
                    20日低
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {d.recentLow ? fmtPrice(d.recentLow, d.ticker) : '—'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                    color: d.recentLow && d.price > d.recentLow ? '#22c55e' : '#ef4444',
                  }}>
                    {supportPct(d.price, d.recentLow)}
                  </span>
                </div>
                {/* MA50 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', marginRight: '4px', verticalAlign: 'middle' }} />
                    MA50
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {d.ma50 ? fmtPrice(d.ma50, d.ticker) : '—'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                    color: d.ma50 && d.price > d.ma50 ? '#22c55e' : '#ef4444',
                  }}>
                    {supportPct(d.price, d.ma50)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '0.85rem', fontSize: '0.63rem', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '0.7rem' }}>
        MA20 / 20日低 / MA50 为动态支撑位参考。价格高于支撑位时以绿色标注距离，跌破支撑位时以红色标注。仅供参考，不构成投资建议。
      </div>
    </div>
  )
}
