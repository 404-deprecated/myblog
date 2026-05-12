'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DailyPrediction, EarningsPrediction, PredictionStore, PredDir } from '@/app/api/predictions/route'

// ─── Upcoming earnings (manually maintained) ──────────────────────────────────
const UPCOMING_EARNINGS: Omit<EarningsPrediction, 'id' | 'createdAt' | 'priceAtCreation'>[] = [
  {
    ticker: '0700.HK', name: '腾讯控股', earningsDate: '2026-05-14', season: 'Q1 2026',
    predictedReaction: 'up', confidence: 68,
    reasoning: '微信广告ARPU持续提升，游戏版号恢复正常后版图扩张；AI助手商业化初步落地带来新增长点。分析师预期收入同比+12%，若实际超预期概率高于50%。',
    keyFactors: ['微信广告ARPU', 'AI功能变现进展', '游戏新版号收入'],
    expectedEPS: '约 HKD 5.80–6.10',
  },
  {
    ticker: 'NVDA', name: '英伟达', earningsDate: '2026-05-28', season: 'Q1 FY2027',
    predictedReaction: 'up', confidence: 72,
    reasoning: 'Blackwell架构超级周期延续，数据中心资本开支创纪录，H20替代品需求旺盛；指引上调概率高。唯一风险是估值已高，超预期幅度决定上涨空间。',
    keyFactors: ['数据中心收入指引', 'Blackwell出货量', 'AI推理芯片竞争'],
    expectedEPS: '约 $0.90–0.96',
  },
  {
    ticker: 'PDD', name: '拼多多', earningsDate: '2026-06-03', season: 'Q1 2026',
    predictedReaction: 'flat', confidence: 52,
    reasoning: 'Temu关税影响不确定性仍存，国内竞争格局稳固但增速放缓。市场预期保守，若实际仍能超预期则有向上空间，否则可能因指引谨慎小幅收跌。',
    keyFactors: ['Temu关税最新实际影响', '国内GMV同比增速', '利润率趋势'],
    expectedEPS: '约 $3.50–3.90',
  },
  {
    ticker: 'ORCL', name: '甲骨文', earningsDate: '2026-06-24', season: 'Q4 FY2026',
    predictedReaction: 'up', confidence: 63,
    reasoning: '云基础设施积压订单（RPO）连续创历史新高，OCI增速超预期；AI数据库工作负载加速迁移。大客户AI合同续约是关键观察指标。',
    keyFactors: ['OCI收入增速', '积压订单RPO', 'AI合作生态进展'],
    expectedEPS: '约 $1.75–1.90',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
type SubTab = 'today' | 'history' | 'earnings' | 'stats'

const DIR_LABEL: Record<PredDir, string> = { up: '📈 看涨', down: '📉 看跌', flat: '➡️ 震荡' }
const DIR_COLOR: Record<PredDir, string> = { up: '#16a34a', down: '#dc2626', flat: '#d97706' }
const DIR_BG:    Record<PredDir, string> = { up: '#f0fdf4', down: '#fff1f2', flat: '#fffbeb' }
const DIR_BD:    Record<PredDir, string> = { up: '#86efac', down: '#fca5a5', flat: '#fcd34d' }

const REACT_LABEL: Record<string, string> = {
  strong_up: '🚀 大涨', up: '📈 上涨', flat: '➡️ 震荡', down: '📉 下跌', strong_down: '💥 大跌',
}

function fmtPrice(p: number, currency: string) {
  const sym = currency === 'USD' ? '$' : currency === 'HKD' ? 'HK$' : '¥'
  return `${sym}${p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p.toFixed(2)}`
}

function fmtPct(p: number) {
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  const d = Math.ceil(diff / 86400000)
  return d > 0 ? `${d}天后` : d === 0 ? '今天' : `${Math.abs(d)}天前`
}

// ─── PredictionCard ───────────────────────────────────────────────────────────
function PredCard({ pred }: { pred: DailyPrediction }) {
  const [open, setOpen] = useState(false)
  const dir = pred.predictedDirection
  const reviewed = pred.result !== 'pending'

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${DIR_BD[dir]}`,
      backgroundColor: reviewed ? (pred.result === 'correct' ? '#f0fdf4' : pred.result === 'incorrect' ? '#fff1f2' : DIR_BG[dir]) : DIR_BG[dir],
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '0.75rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}
      >
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 80 }}>
          {pred.type === 'index' ? '指数' : '个股'} · {pred.currency}
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', flex: 1 }}>{pred.name}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          backgroundColor: DIR_BG[dir], color: DIR_COLOR[dir], border: `1px solid ${DIR_BD[dir]}` }}>
          {DIR_LABEL[dir]} {pred.bullPct}%
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>置信 {pred.confidence}%</span>
        {reviewed && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700,
            color: pred.result === 'correct' ? '#15803d' : '#dc2626',
            backgroundColor: pred.result === 'correct' ? '#dcfce7' : '#fee2e2',
            padding: '2px 8px', borderRadius: 20 }}>
            {pred.result === 'correct' ? '✓ 正确' : '✗ 错误'}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 0.875rem 0.875rem', borderTop: `1px solid ${DIR_BD[dir]}` }}>
          {/* Price context */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.625rem', marginBottom: '0.625rem' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>预测日价格</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{fmtPrice(pred.currentPrice, pred.currency)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>目标区间</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: DIR_COLOR[dir] }}>
                {fmtPrice(pred.targetLow, pred.currency)} – {fmtPrice(pred.targetHigh, pred.currency)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>目标日期</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pred.targetDate}</div>
            </div>
            {reviewed && pred.actualPrice != null && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>实际收盘</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700,
                  color: (pred.actualChangeP ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                  {fmtPrice(pred.actualPrice, pred.currency)}
                  <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>
                    ({fmtPct(pred.actualChangeP ?? 0)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Score bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginBottom: '0.625rem' }}>
            {[
              { label: '技术得分', val: pred.technicalScore },
              { label: '宏观得分', val: pred.macroScore },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.375rem 0.5rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${val}%`, height: '100%', background: val >= 55 ? '#22c55e' : val <= 45 ? '#ef4444' : '#f59e0b', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{val}%</div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          <div style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.5rem',
            borderLeft: `3px solid ${DIR_COLOR[dir]}`, paddingLeft: '0.5rem' }}>
            {pred.reasoning}
          </div>

          {/* Risks */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: pred.postMortem ? '0.625rem' : 0 }}>
            {pred.keyRisks.map(r => (
              <span key={r} style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4,
                backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }}>
                ⚠ {r}
              </span>
            ))}
          </div>

          {/* Post-mortem */}
          {pred.postMortem && (
            <div style={{ marginTop: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: 8,
              backgroundColor: '#fff1f2', border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.2rem' }}>
                复盘分析
              </div>
              <p style={{ margin: 0, fontSize: '0.73rem', color: '#7f1d1d', lineHeight: 1.6 }}>
                {pred.postMortem}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Earnings card ────────────────────────────────────────────────────────────
function EarningsCard({ ep, priceMap }: {
  ep: Omit<EarningsPrediction, 'id' | 'createdAt' | 'priceAtCreation'>
  priceMap: Record<string, number>
}) {
  const [open, setOpen] = useState(false)
  const past = new Date(ep.earningsDate) < new Date()
  const react = ep.predictedReaction
  const c = react.includes('up') ? '#16a34a' : react.includes('down') ? '#dc2626' : '#d97706'
  const bg = react.includes('up') ? '#f0fdf4' : react.includes('down') ? '#fff1f2' : '#fffbeb'
  const bd = react.includes('up') ? '#86efac' : react.includes('down') ? '#fca5a5' : '#fcd34d'

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${bd}`, backgroundColor: bg, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '0.75rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', flex: 1 }}>{ep.name}</span>
        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {ep.season} · {ep.earningsDate} ({daysUntil(ep.earningsDate)})
        </span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: c, border: `1px solid ${bd}`, backgroundColor: bg }}>
          {REACT_LABEL[react]}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>置信 {ep.confidence}%</span>
        {past && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>已过期 · 待复盘</span>}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 0.875rem 0.875rem', borderTop: `1px solid ${bd}` }}>
          <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
            {priceMap[ep.ticker] && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>当前价格</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{priceMap[ep.ticker]}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>预期EPS</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ep.expectedEPS}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', lineHeight: 1.6, borderLeft: `3px solid ${c}`,
            paddingLeft: '0.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            {ep.reasoning}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {ep.keyFactors.map(f => (
              <span key={f} style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20,
                backgroundColor: `${c}18`, color: c, border: `1px solid ${c}44` }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Accuracy stats ───────────────────────────────────────────────────────────
function AccuracyStats({ daily }: { daily: DailyPrediction[] }) {
  const reviewed = daily.filter(p => p.result !== 'pending')
  const correct  = reviewed.filter(p => p.result === 'correct')
  const overall  = reviewed.length > 0 ? Math.round(correct.length / reviewed.length * 100) : null

  const byTicker = TICKER_NAMES.map(({ ticker, name }) => {
    const rows = reviewed.filter(p => p.ticker === ticker)
    const ok   = rows.filter(p => p.result === 'correct').length
    return { name, total: rows.length, correct: ok, pct: rows.length > 0 ? Math.round(ok / rows.length * 100) : null }
  })

  const byDir = (['up', 'down', 'flat'] as PredDir[]).map(dir => {
    const rows = reviewed.filter(p => p.predictedDirection === dir)
    const ok   = rows.filter(p => p.result === 'correct').length
    return { dir, total: rows.length, correct: ok, pct: rows.length > 0 ? Math.round(ok / rows.length * 100) : null }
  })

  if (!reviewed.length) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      暂无已复盘数据，生成预测并等待次日自动复盘后查看统计
    </div>
  )

  const barColor = (pct: number | null) =>
    pct == null ? '#6b7280' : pct >= 65 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Overall */}
      <div style={{ padding: '1rem 1.125rem', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>综合预测准确率</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: barColor(overall) }}>{overall ?? '--'}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ width: `${overall ?? 0}%`, height: '100%', background: barColor(overall), borderRadius: 5, transition: 'width 0.6s' }} />
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {correct.length} 次正确 / {reviewed.length} 次总计
          </div>
        </div>
      </div>

      {/* By ticker */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem', fontFamily: 'var(--font-mono)' }}>
          各标的准确率
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {byTicker.filter(r => r.total > 0).map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 0.5rem', borderRadius: 6, backgroundColor: 'var(--bg-secondary)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 72 }}>{r.name}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${r.pct ?? 0}%`, height: '100%', background: barColor(r.pct), borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor(r.pct), minWidth: 36, textAlign: 'right' }}>
                {r.pct ?? '--'}%
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', minWidth: 40 }}>({r.correct}/{r.total})</span>
            </div>
          ))}
        </div>
      </div>

      {/* By direction */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem', fontFamily: 'var(--font-mono)' }}>
          各方向准确率
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {byDir.filter(r => r.total > 0).map(r => (
            <div key={r.dir} style={{ padding: '0.625rem', borderRadius: 8, border: `1px solid ${DIR_BD[r.dir]}`,
              backgroundColor: DIR_BG[r.dir], textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>{DIR_LABEL[r.dir]}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: barColor(r.pct) }}>{r.pct ?? '--'}%</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{r.correct}/{r.total}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent wrong predictions */}
      {reviewed.filter(p => p.result === 'incorrect').slice(0, 3).length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem', fontFamily: 'var(--font-mono)' }}>
            最近错误预测摘要
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reviewed.filter(p => p.result === 'incorrect').slice(0, 3).map(p => (
              <div key={p.id} style={{ padding: '0.625rem 0.75rem', borderRadius: 8, backgroundColor: '#fff1f2', border: '1px solid #fca5a5' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b' }}>{p.name}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.targetDate}</span>
                  <span style={{ fontSize: '0.62rem', color: '#991b1b' }}>
                    预测{DIR_LABEL[p.predictedDirection]} → 实际{p.actualChangeP != null ? fmtPct(p.actualChangeP) : '?'}
                  </span>
                </div>
                {p.postMortem && <p style={{ margin: 0, fontSize: '0.7rem', color: '#7f1d1d', lineHeight: 1.55 }}>{p.postMortem}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const TICKER_NAMES = [
  { ticker: '^IXIC',     name: '纳斯达克' },
  { ticker: '000001.SS', name: '上证指数' },
  { ticker: 'NVDA',      name: '英伟达'   },
  { ticker: '0700.HK',   name: '腾讯控股' },
  { ticker: 'ORCL',      name: '甲骨文'   },
  { ticker: 'PDD',       name: '拼多多'   },
]

// ─── Main component ───────────────────────────────────────────────────────────
export function PredictionReview() {
  const [subTab, setSubTab] = useState<SubTab>('today')
  const [store, setStore] = useState<PredictionStore | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/predictions', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStore(await res.json())
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const generate = useCallback(async () => {
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/predictions', { method: 'POST', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStore(data.store)
    } catch (e) { setError(String(e)) }
    finally { setGenerating(false) }
  }, [])

  // Today's predictions = generated today
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayPreds  = store?.daily.filter(p => p.createdAt.startsWith(todayStr)) ?? []
  const historyPreds = store?.daily.filter(p => !p.createdAt.startsWith(todayStr)) ?? []
  const pendingCount = store?.daily.filter(p => p.result === 'pending' && p.targetDate < todayStr).length ?? 0
  const incorrectCount = store?.daily.filter(p => p.result === 'incorrect').length ?? 0

  const SUBTABS: { id: SubTab; label: string; badge?: number | string }[] = [
    { id: 'today',    label: '今日预测', badge: todayPreds.length || undefined },
    { id: 'history',  label: '历史复盘', badge: incorrectCount > 0 ? `${incorrectCount}错` : undefined },
    { id: 'earnings', label: '财报预测' },
    { id: 'stats',    label: '准确率统计' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '0.45rem 0.875rem', fontSize: '0.82rem', fontWeight: subTab === t.id ? 700 : 400,
            border: 'none', borderBottom: `2px solid ${subTab === t.id ? 'var(--accent)' : 'transparent'}`,
            background: 'none', color: subTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap',
          }}>
            {t.label}
            {t.badge != null && (
              <span style={{ marginLeft: 5, fontSize: '0.6rem', padding: '1px 5px', borderRadius: 10,
                backgroundColor: typeof t.badge === 'string' ? '#fca5a5' : 'var(--accent)', color: '#fff' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', backgroundColor: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
          {error}
        </div>
      )}

      {/* ── 今日预测 ── */}
      {subTab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                {todayPreds.length > 0
                  ? `已为 ${todayStr} 生成 ${todayPreds.length} 条预测，目标日期 ${todayPreds[0]?.targetDate}`
                  : '点击按钮生成今日预测（基于技术信号×60% + 宏观评分×40%）'}
              </div>
              {pendingCount > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {pendingCount} 条历史预测等待自动复盘（刷新时处理）
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={load} disabled={loading}
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                {loading ? '加载中…' : '↻ 刷新复盘'}
              </button>
              <button onClick={generate} disabled={generating || loading}
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 7,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  cursor: generating || loading ? 'not-allowed' : 'pointer', opacity: generating || loading ? 0.5 : 1 }}>
                {generating ? '生成中…' : '⚡ 生成今日预测'}
              </button>
            </div>
          </div>

          {loading && !store && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>加载中…</div>
          )}

          {todayPreds.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.85rem',
              border: '1px dashed var(--border)', borderRadius: 10 }}>
              今日尚未生成预测<br/>
              <span style={{ fontSize: '0.75rem' }}>每天开盘前点击「生成今日预测」，次日自动复盘结果</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todayPreds.map(p => <PredCard key={p.id} pred={p} />)}
          </div>
        </div>
      )}

      {/* ── 历史复盘 ── */}
      {subTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {historyPreds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem',
              border: '1px dashed var(--border)', borderRadius: 10 }}>
              暂无历史复盘记录<br/>
              <span style={{ fontSize: '0.75rem' }}>生成预测后，次日自动拉取实际价格并复盘</span>
            </div>
          ) : (
            historyPreds.map(p => <PredCard key={p.id} pred={p} />)
          )}
        </div>
      )}

      {/* ── 财报预测 ── */}
      {subTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6,
            padding: '0.625rem 0.875rem', backgroundColor: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
            财报预测基于当前宏观环境+行业景气+历史超预期概率建立，财报发布后系统自动拉取价格变化并标记准确性。
            点击每张卡片展开详细分析思路。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {UPCOMING_EARNINGS
              .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))
              .map(ep => <EarningsCard key={ep.ticker} ep={ep} priceMap={{}} />)
            }
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
            财报日期为预估 · 实际日期请以官方公告为准 · 仅供参考，不构成投资建议
          </p>
        </div>
      )}

      {/* ── 准确率统计 ── */}
      {subTab === 'stats' && (
        <AccuracyStats daily={store?.daily ?? []} />
      )}
    </div>
  )
}
