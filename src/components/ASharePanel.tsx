'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStockRegistry } from '@/lib/stock-registry'

interface BidAsk { price: number; vol: number }

interface Indicators {
  rsi: number
  macd: { dif: number; dea: number; hist: number; signal: string }
  kdj: { k: number; d: number; j: number }
  ma: { ma5: number; ma10: number; ma20: number; ma60: number }
  volRatio: number
  amplitude: number
  pricePosition: { vsMA5: number; vsMA20: number; vsMA60: number }
}

interface FundFlowDay {
  date: string
  mainNetInflow: number    // 主力净流入(亿)
  superLargeNet: number     // 超大单(亿)
  largeNet: number          // 大单(亿)
  mediumNet: number         // 中单(亿)
  smallNet: number          // 小单(亿)
}

interface Strategy {
  signals: string[]
  risks: string[]
  score: number
  action: string
  buyZone: string
  sellZone: string
  summary: string
}

interface AStock {
  code: string
  name: string
  price: number
  open: number
  high: number
  low: number
  preClose: number
  change: number
  changePct: number
  volume: number
  amount: number
  bid: BidAsk[]
  ask: BidAsk[]
  indicators: Indicators | null
  klines: any[]
  fundflow: FundFlowDay[]
  strategy: Strategy | null
  source: string
}

interface IndexData {
  code: string
  name: string
  price: number
  changePct: number
}

const DEFAULT_CODES = '600036,002142,000725,688256,002371,688017,002050,300750,601012,688981'

// Name→code lookup from 十五五 watchlist + common aliases
const NAME_TO_CODE: Record<string, string> = {
  '京东方': '000725', '京东方a': '000725', 'boe': '000725', '000725': '000725',
  '招商银行': '600036', '招行': '600036', '600036': '600036',
  '宁波银行': '002142', '002142': '002142',
  '寒武纪': '688256', '688256': '688256',
  '北方华创': '002371', '002371': '002371',
  '绿的谐波': '688017', '688017': '688017',
  '三花智控': '002050', '002050': '002050',
  '宁德时代': '300750', '宁德': '300750', '300750': '300750',
  '隆基绿能': '601012', '隆基': '601012', '601012': '601012',
  '中芯国际': '688981', '中芯': '688981', '688981': '688981',
  '中科曙光': '603019', '曙光': '603019', '603019': '603019',
  '浪潮信息': '000977', '浪潮': '000977', '000977': '000977',
  '科大讯飞': '002230', '讯飞': '002230', '002230': '002230',
  '海光信息': '688041', '海光': '688041', '688041': '688041',
  '金山办公': '688111', '688111': '688111',
  '中微公司': '688012', '中微': '688012', '688012': '688012',
  '沪硅产业': '688126', '688126': '688126',
  '安集科技': '688019', '688019': '688019',
  '兆易创新': '603986', '603986': '603986',
  '三花': '002050', '绿的': '688017', '华创': '002371',
  '招': '600036', '宁': '300750',
}

function resolveCodes(input: string): string {
  // Accept comma/space separated names or codes
  return input.split(/[,，\s]+/).filter(Boolean).map(part => {
    const trimmed = part.trim().toLowerCase()
    // Direct code match
    if (/^\d{6}$/.test(trimmed)) return trimmed
    // Name lookup
    return NAME_TO_CODE[trimmed] || NAME_TO_CODE[part.trim()] || trimmed
  }).filter(c => /^\d{6}$/.test(c)).join(',')
}

function StockCard({ stock }: { stock: AStock }) {
  const [showDetail, setShowDetail] = useState(false)
  const isUp = stock.changePct >= 0
  const color = isUp ? '#dc2626' : '#16a34a'

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: '8px',
      backgroundColor: 'var(--surface)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setShowDetail(!showDetail)}
        style={{
          padding: '0.5rem 0.75rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          flexWrap: 'wrap', borderBottom: showDetail ? '1px solid var(--border)' : 'none',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
          {stock.name}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {stock.code}
        </span>
        <span style={{
          fontSize: '0.95rem', fontWeight: 800, color, marginLeft: 'auto',
          fontFamily: 'var(--font-mono)',
        }}>
          ¥{stock.price.toFixed(2)}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: '#fff', backgroundColor: color,
          padding: '0.1rem 0.5rem', borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
        }}>
          {stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          {showDetail ? '▲' : '▼'}
        </span>
      </div>

      {/* Quick stats */}
      <div style={{
        padding: '0.35rem 0.75rem', display: 'flex', gap: '1rem',
        fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        flexWrap: 'wrap',
      }}>
        <span>开 ¥{stock.open.toFixed(2)}</span>
        <span>高 ¥{stock.high.toFixed(2)}</span>
        <span>低 ¥{stock.low.toFixed(2)}</span>
        <span>额 {(stock.amount / 1e8).toFixed(1)}亿</span>
        {stock.indicators && (
          <>
            <span style={{ color: stock.indicators.rsi > 70 ? '#dc2626' : stock.indicators.rsi < 30 ? '#16a34a' : 'var(--text-muted)' }}>
              RSI {stock.indicators.rsi}
            </span>
            <span style={{ color: stock.indicators.macd.signal === 'golden_cross' ? '#dc2626' : '#16a34a' }}>
              {stock.indicators.macd.signal === 'golden_cross' ? '金叉' : '死叉'}
            </span>
          </>
        )}
      </div>

      {/* Strategy bar — always visible */}
      {stock.strategy && (
        <div style={{
          margin: '0 0.75rem 0.35rem', padding: '0.4rem 0.6rem', borderRadius: '6px',
          background: stock.strategy.score >= 60 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' :
                      stock.strategy.score >= 45 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' :
                      'linear-gradient(135deg, #fff1f2, #fee2e2)',
          border: `1px solid ${stock.strategy.score >= 60 ? '#86efac' : stock.strategy.score >= 45 ? '#fcd34d' : '#fca5a5'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {stock.strategy.action}
            </span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: stock.strategy.score >= 60 ? '#16a34a' : stock.strategy.score >= 45 ? '#b45309' : '#dc2626',
            }}>
              综合评分 {stock.strategy.score}/100
            </span>
          </div>
          {stock.strategy.buyZone && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              <span>🟢 买入区: <strong style={{ color: '#16a34a' }}>{stock.strategy.buyZone}</strong></span>
              <span>🔴 卖出区: <strong style={{ color: '#dc2626' }}>{stock.strategy.sellZone}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {showDetail && stock.indicators && (
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          {/* 5-level order book */}
          {stock.bid.length > 0 && stock.ask.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#16a34a', marginBottom: '0.15rem' }}>买盘</div>
                {stock.bid.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#16a34a' }}>买{i+1} ¥{b.price.toFixed(2)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{b.vol}手</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.15rem' }}>卖盘</div>
                {stock.ask.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#dc2626' }}>卖{i+1} ¥{a.price.toFixed(2)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{a.vol}手</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fund Flow */}
          {stock.fundflow && stock.fundflow.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                💰 主力资金
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {stock.fundflow.slice(-3).reverse().map((ff, i) => {
                  const mainIn = ff.mainNetInflow
                  const flowColor = mainIn > 0 ? '#dc2626' : '#16a34a'
                  return (
                    <div key={i} style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px',
                      backgroundColor: mainIn > 0 ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${mainIn > 0 ? '#fecaca' : '#bbf7d0'}`,
                      fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                    }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>{ff.date.slice(5)}</div>
                      <div style={{ color: flowColor, fontWeight: 700 }}>
                        主力 {mainIn > 0 ? '+' : ''}{mainIn.toFixed(1)}亿
                      </div>
                      {ff.superLargeNet !== 0 && (
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                          超大单 {ff.superLargeNet > 0 ? '+' : ''}{ff.superLargeNet.toFixed(1)}亿
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Strategy signals */}
          {stock.strategy && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                📋 明日策略分析
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text)', lineHeight: 1.5, margin: '0 0 0.3rem 0' }}>
                {stock.strategy.summary}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {stock.strategy.signals.map((s, i) => (
                  <span key={i} style={{
                    fontSize: '0.58rem', padding: '0.1rem 0.4rem', borderRadius: '8px',
                    backgroundColor: s.includes('📈') || s.includes('🟢') || s.includes('💰') || s.includes('🐋') ? '#f0fdf4' :
                                     s.includes('📉') || s.includes('🔴') || s.includes('💸') ? '#fff1f2' : '#fffbeb',
                    color: 'var(--text)', border: '1px solid var(--border)',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
              {stock.strategy.risks.length > 0 && (
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {stock.strategy.risks.map((r, i) => (
                    <span key={i} style={{
                      fontSize: '0.55rem', padding: '0.1rem 0.35rem', borderRadius: '6px',
                      backgroundColor: '#fff1f2', color: '#991b1b', border: '1px solid #fca5a5',
                    }}>
                      ⚠ {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Indicators grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.35rem', fontSize: '0.62rem' }}>
            {[
              { l: 'MACD DIF', v: stock.indicators.macd.dif.toFixed(3), c: stock.indicators.macd.signal === 'golden_cross' ? '#dc2626' : '#16a34a' },
              { l: 'MACD DEA', v: stock.indicators.macd.dea.toFixed(3), c: 'var(--text-muted)' },
              { l: 'MACD柱', v: stock.indicators.macd.hist.toFixed(3), c: stock.indicators.macd.hist > 0 ? '#dc2626' : '#16a34a' },
              { l: 'RSI(14)', v: stock.indicators.rsi, c: stock.indicators.rsi > 70 ? '#dc2626' : stock.indicators.rsi < 30 ? '#16a34a' : 'var(--text)' },
              { l: 'KDJ-K', v: stock.indicators.kdj.k, c: 'var(--text)' },
              { l: 'KDJ-D', v: stock.indicators.kdj.d, c: 'var(--text)' },
              { l: 'KDJ-J', v: stock.indicators.kdj.j, c: stock.indicators.kdj.j > 80 ? '#dc2626' : stock.indicators.kdj.j < 20 ? '#16a34a' : 'var(--text)' },
              { l: 'MA5', v: stock.indicators.ma.ma5, c: stock.price > stock.indicators.ma.ma5 ? '#dc2626' : '#16a34a' },
              { l: 'MA20', v: stock.indicators.ma.ma20, c: stock.price > stock.indicators.ma.ma20 ? '#dc2626' : '#16a34a' },
              { l: 'MA60', v: stock.indicators.ma.ma60, c: stock.price > stock.indicators.ma.ma60 ? '#dc2626' : '#16a34a' },
              { l: '量比', v: stock.indicators.volRatio, c: stock.indicators.volRatio > 1.5 ? '#dc2626' : 'var(--text)' },
            ].map(({ l, v, c }) => (
              <div key={l}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>{' '}
                <span style={{ color: c, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {typeof v === 'number' ? v : v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDetail && !stock.indicators && (
        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          技术指标数据加载中...
        </div>
      )}
    </div>
  )
}

export default function ASharePanel({ externalCodes, onCodesChange }: {
  externalCodes?: string[]
  onCodesChange?: (codes: string[]) => void
}) {
  const [stocks, setStocks] = useState<AStock[]>([])
  const [indices, setIndices] = useState<IndexData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const { getActiveCodes } = useStockRegistry()
  const registryDefault = getActiveCodes('A股').slice(0, 12).join(',')
  const initCodes = externalCodes && externalCodes.length > 0 ? externalCodes.join(',') : (registryDefault || DEFAULT_CODES)
  const [codes, setCodes] = useState(initCodes)
  const [customCodes, setCustomCodes] = useState('')

  const fetchData = useCallback(async (codesStr: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/ashare?cmd=all&codes=${codesStr}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setStocks(data.stocks || [])
      setIndices(data.indices || [])
      setUpdatedAt(data.updatedAt || '')
    } catch (e: any) {
      setError(e.message || '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(codes) }, [])
  // Sync external codes
  useEffect(() => {
    if (externalCodes && externalCodes.length > 0) {
      const newCodes = externalCodes.join(',')
      if (newCodes !== codes) {
        setCodes(newCodes)
        fetchData(newCodes)
      }
    }
  }, [externalCodes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Index bar */}
      {indices.length > 0 && (
        <div style={{
          display: 'flex', gap: '1.25rem', padding: '0.5rem 0.75rem',
          borderRadius: '8px', border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)', flexWrap: 'wrap',
        }}>
          {indices.map(idx => {
            const isUp = idx.changePct >= 0
            return (
              <div key={idx.code} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)' }}>{idx.name}</span>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: isUp ? '#dc2626' : '#16a34a',
                }}>
                  {idx.price.toFixed(0)}
                </span>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                  color: isUp ? '#dc2626' : '#16a34a',
                }}>
                  {idx.changePct > 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
                </span>
              </div>
            )
          })}
          {updatedAt && (
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              更新 {updatedAt}
            </span>
          )}
        </div>
      )}

      {/* Custom code input */}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <input
          type="text" value={customCodes}
          onChange={e => setCustomCodes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { const resolved = resolveCodes(customCodes) || DEFAULT_CODES; setCodes(resolved); fetchData(resolved) }}}
          placeholder="输入代码或名称，如 京东方,招行,000725"
          style={{
            flex: 1, fontSize: '0.72rem', padding: '0.3rem 0.6rem',
            borderRadius: '6px', border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)', color: 'var(--text)',
            fontFamily: 'var(--font-mono)', outline: 'none',
          }}
        />
        <button onClick={() => { const resolved = resolveCodes(customCodes) || DEFAULT_CODES; setCodes(resolved); fetchData(resolved) }}
          style={{
            padding: '0.3rem 0.75rem', fontSize: '0.72rem', borderRadius: '6px',
            border: 'none', backgroundColor: 'var(--accent)', color: '#fff',
            cursor: 'pointer', fontWeight: 600,
          }}>
          查询
        </button>
        <button onClick={() => { fetchData(codes) }}
          style={{
            padding: '0.3rem 0.75rem', fontSize: '0.72rem', borderRadius: '6px',
            border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>
          🔄 刷新
        </button>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          加载A股实时数据...
        </div>
      )}
      {error && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#991b1b', fontSize: '0.72rem' }}>
          {error}
        </div>
      )}

      {/* Stock cards */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
          {stocks.map(stock => (
            <StockCard key={stock.code} stock={stock} />
          ))}
        </div>
      )}

      {!loading && !error && stocks.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>暂无数据</p>
      )}

      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        数据来源: 新浪财经 + 东方财富 · 技术指标仅供参考 · 不构成投资建议
      </p>
    </div>
  )
}
