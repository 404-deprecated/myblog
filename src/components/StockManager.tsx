'use client'

import { useState } from 'react'
import { useStockRegistry, type StockEntry } from '@/lib/stock-registry'

const EXCHANGE_COLORS: Record<string, string> = {
  'A股': '#eff6ff', '港股': '#fef3c7', '美股': '#f0fdf4',
}
const EXCHANGE_TEXT: Record<string, string> = {
  'A股': '#1e40af', '港股': '#92400e', '美股': '#166534',
}

export default function StockManager() {
  const { stocks, toggleActive, updateStock, addStock, deleteStock, getSectors } = useStockRegistry()
  const [filter, setFilter] = useState<'all'|'active'|'inactive'>('all')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newStock, setNewStock] = useState({ code: '', name: '', exchange: 'A股' as StockEntry['exchange'], sector: '', notes: '' })

  const sectors = getSectors()

  const filtered = stocks.filter(s => {
    if (filter === 'active' && !s.active) return false
    if (filter === 'inactive' && s.active) return false
    if (search && !s.name.includes(search) && !s.code.includes(search)) return false
    if (sectorFilter && s.sector !== sectorFilter) return false
    return true
  })

  const stats = {
    total: stocks.length,
    active: stocks.filter(s => s.active).length,
    aShare: stocks.filter(s => s.exchange === 'A股' && s.active).length,
    hk: stocks.filter(s => s.exchange === '港股' && s.active).length,
    us: stocks.filter(s => s.exchange === '美股' && s.active).length,
  }

  const handleAdd = () => {
    if (!newStock.code || !newStock.name) return
    addStock({ ...newStock, tags: [], active: true })
    setNewStock({ code: '', name: '', exchange: 'A股', sector: '', notes: '' })
    setShowAdd(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>总计: <strong style={{ color: 'var(--text)' }}>{stats.total}</strong></span>
        <span>激活: <strong style={{ color: '#16a34a' }}>{stats.active}</strong></span>
        <span>A股: {stats.aShare}</span>
        <span>港股: {stats.hk}</span>
        <span>美股: {stats.us}</span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'all', label: '全部' },
          { key: 'active', label: '✅ 激活' },
          { key: 'inactive', label: '❌ 未激活' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)} style={{
            padding: '0.2rem 0.55rem', fontSize: '0.62rem', borderRadius: '12px',
            border: '1px solid', borderColor: filter === f.key ? 'var(--accent)' : 'var(--border)',
            backgroundColor: filter === f.key ? 'var(--accent)' : 'transparent',
            color: filter === f.key ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
          }}>
            {f.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索名称/代码..."
          style={{ padding: '0.2rem 0.4rem', fontSize: '0.62rem', width: '130px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
          style={{ padding: '0.2rem', fontSize: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          <option value="">全部行业</option>
          {sectors.map(([name]) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '6px',
          border: 'none', backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto',
        }}>
          + 添加
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--accent)', backgroundColor: 'var(--surface)', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={newStock.code} onChange={e => setNewStock(p => ({ ...p, code: e.target.value }))}
            placeholder="代码" style={{ width: '70px', padding: '0.2rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }} />
          <input value={newStock.name} onChange={e => setNewStock(p => ({ ...p, name: e.target.value }))}
            placeholder="名称" style={{ width: '80px', padding: '0.2rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <select value={newStock.exchange} onChange={e => setNewStock(p => ({ ...p, exchange: e.target.value as StockEntry['exchange'] }))}
            style={{ padding: '0.2rem', fontSize: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option>A股</option><option>港股</option><option>美股</option>
          </select>
          <input value={newStock.sector} onChange={e => setNewStock(p => ({ ...p, sector: e.target.value }))}
            placeholder="行业" style={{ width: '80px', padding: '0.2rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <input value={newStock.notes} onChange={e => setNewStock(p => ({ ...p, notes: e.target.value }))}
            placeholder="备注" style={{ width: '120px', padding: '0.2rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <button onClick={handleAdd}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '4px', border: 'none', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer' }}>
            确定
          </button>
        </div>
      )}

      {/* Sector groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sectors
          .filter(([name]) => !sectorFilter || name === sectorFilter)
          .map(([sectorName, sectorStocks]) => {
            const displayStocks = sectorStocks.filter(s => {
              if (filter === 'active' && !s.active) return false
              if (filter === 'inactive' && s.active) return false
              if (search && !s.name.includes(search) && !s.code.includes(search)) return false
              return true
            })
            if (displayStocks.length === 0) return null
            const activeCount = displayStocks.filter(s => s.active).length
            return (
              <div key={sectorName} style={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
                <div style={{ padding: '0.35rem 0.65rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{sectorName}</span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {displayStocks.length}只 (激活{activeCount})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', padding: '0.3rem 0.5rem' }}>
                  {displayStocks.map(s => (
                    <div key={`${s.exchange}-${s.code}`} style={{
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                      padding: '0.15rem 0.4rem', borderRadius: '6px', fontSize: '0.58rem',
                      backgroundColor: s.active ? EXCHANGE_COLORS[s.exchange] : 'var(--bg-secondary)',
                      border: `1px solid ${s.active ? 'var(--border)' : 'transparent'}`,
                      opacity: s.active ? 1 : 0.4, cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                      onClick={() => toggleActive(s.code, s.exchange)}
                      title={`${s.code} ${s.name}\n${s.notes}`}
                    >
                      <span style={{
                        fontSize: '0.5rem', padding: '0.05rem 0.25rem', borderRadius: '3px',
                        backgroundColor: EXCHANGE_COLORS[s.exchange], color: EXCHANGE_TEXT[s.exchange],
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {s.exchange === 'A股' ? 'A' : s.exchange === '港股' ? '港' : '美'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{s.code}</span>
                      <span style={{ fontWeight: s.active ? 600 : 400 }}>{s.name.length > 5 ? s.name.slice(0,5)+'…' : s.name}</span>
                      <button onClick={e => { e.stopPropagation(); deleteStock(s.code, s.exchange) }}
                        style={{ fontSize: '0.5rem', border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, opacity: 0.5 }}
                        title="删除">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
