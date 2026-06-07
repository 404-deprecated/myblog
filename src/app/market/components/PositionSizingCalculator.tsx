'use client'

import { useState } from 'react'

export default function PositionSizingCalculator() {
  const [equity, setEquity] = useState(100000)
  const [riskPct, setRiskPct] = useState(2)
  const [entryPrice, setEntryPrice] = useState(6.0)
  const [stopLossPrice, setStopLossPrice] = useState(5.70)

  const riskAmount = equity * riskPct / 100
  const riskPerShare = Math.abs(entryPrice - stopLossPrice)
  const maxShares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0
  const positionValue = maxShares * entryPrice
  const positionPct = equity > 0 ? positionValue / equity * 100 : 0
  const riskReward = riskPerShare > 0 ? '--' : '≥2:1'

  return (
    <div style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1f2937' }}>🎯 仓位计算器 · 2%原则</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.58rem', color: '#6b7280', display: 'block' }}>账户总资金 (¥)</label>
          <input type="number" value={equity} onChange={e => setEquity(Number(e.target.value))}
            style={{ width: '100%', padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.58rem', color: '#6b7280', display: 'block' }}>单笔风险 (%)</label>
          <input type="number" value={riskPct} onChange={e => setRiskPct(Number(e.target.value))} step="0.5"
            style={{ width: '100%', padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.58rem', color: '#6b7280', display: 'block' }}>入场价 (¥)</label>
          <input type="number" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} step="0.01"
            style={{ width: '100%', padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.58rem', color: '#6b7280', display: 'block' }}>止损价 (¥)</label>
          <input type="number" value={stopLossPrice} onChange={e => setStopLossPrice(Number(e.target.value))} step="0.01"
            style={{ width: '100%', padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'var(--font-mono)' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.4rem', marginTop: '0.5rem' }}>
        {[
          { l: '单笔风险金额', v: `¥${riskAmount.toFixed(0)}`, c: '#dc2626' },
          { l: '每股风险', v: `¥${riskPerShare.toFixed(2)}`, c: '#6b7280' },
          { l: '最大买入股数', v: `${maxShares}股`, c: '#6366f1' },
          { l: '仓位金额', v: `¥${positionValue.toFixed(0)}`, c: '#1f2937' },
          { l: '仓位占比', v: `${positionPct.toFixed(1)}%`, c: positionPct > 30 ? '#dc2626' : '#16a34a' },
          { l: '盈亏比目标', v: riskReward, c: '#16a34a' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ padding: '0.3rem', borderRadius: '6px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', color: '#6b7280' }}>{l}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.55rem', color: '#6b7280', marginTop: '0.4rem', lineHeight: 1.4 }}>
        💡 单笔亏损不超过总资金{riskPct}%（¥{riskAmount.toFixed(0)}）。止损价¥{stopLossPrice.toFixed(2)}以下{riskPerShare.toFixed(2)}元时触发止损，最大亏损¥{riskAmount.toFixed(0)}。
      </p>
    </div>
  )
}
