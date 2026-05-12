'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface ChartPoint { d: string; p: number }

export interface ChartEvent {
  d: string       // YYYY-MM or YYYY-MM-DD
  label: string   // short badge shown on chart
  detail: string  // full explanation in tooltip
  impact: 'pos' | 'neg'
}

interface SmaLine { n: number; color: string }

interface Tooltip {
  x: number
  date: string
  price: string
  chg: string | null
  event: ChartEvent | null
  flipLeft: boolean
}

interface Props {
  data: ChartPoint[]
  color: string
  height?: number
  events?: ChartEvent[]
  smaLines?: SmaLine[]
  isDaily?: boolean
  currencySymbol?: string
  allowFullscreen?: boolean
  title?: string
}

const PAD = { t: 22, r: 58, b: 34, l: 10 }

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtPrice(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(2)}万`
  if (v >= 1000)  return `${(v / 1000).toFixed(2)}k`
  return v >= 100 ? v.toFixed(1) : v.toFixed(2)
}

function makeCoords(W: number, H: number, vs: number, ve: number) {
  const cw = W - PAD.l - PAD.r
  const ch = H - PAD.t - PAD.b
  const xOf = (gi: number) => PAD.l + ((gi - vs) / Math.max(ve - vs, 1)) * cw
  return { cw, ch, xOf }
}

function visibleMinMax(pts: ChartPoint[]) {
  const vals = pts.map(d => d.p)
  const minP = Math.min(...vals), maxP = Math.max(...vals)
  const pad = (maxP - minP) * 0.05 || maxP * 0.02
  return { minP: minP - pad, maxP: maxP + pad }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function InteractiveChart({
  data, color, height = 200, events = [], smaLines = [], isDaily = false, currencySymbol = '',
  allowFullscreen = false, title = '',
}: Props) {
  const staticRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)

  const [view, setView]       = useState<[number, number]>([0, data.length - 1])
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Keep refs in sync to avoid stale closures in event handlers
  const viewRef    = useRef(view)
  const dataRef    = useRef(data)
  const eventsRef  = useRef(events)
  useEffect(() => { viewRef.current = view },    [view])
  useEffect(() => { dataRef.current = data },    [data])
  useEffect(() => { eventsRef.current = events }, [events])

  const dragRef = useRef<{ startX: number; v0: [number, number] } | null>(null)
  const isZoomed = view[0] > 0 || view[1] < data.length - 1
  const [fullscreen, setFullscreen] = useState(false)

  // Reset when data identity changes
  useEffect(() => {
    setView([0, data.length - 1])
    setTooltip(null)
  }, [data.length])

  // ── draw static chart ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = staticRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width  = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const [vs, ve] = view
    const visible = data.slice(vs, ve + 1)
    if (visible.length < 2) return

    const { minP, maxP } = visibleMinMax(visible)
    const rng = maxP - minP || 1
    const { cw, ch, xOf } = makeCoords(W, H, vs, ve)
    const yOf = (v: number) => PAD.t + ch - ((v - minP) / rng) * ch
    const chartRight = PAD.l + cw

    // Horizontal gridlines + y labels
    ctx.strokeStyle = '#e5e7eb28'; ctx.lineWidth = 0.5
    for (let s = 0; s <= 4; s++) {
      const y = PAD.t + (ch / 4) * s
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(chartRight, y); ctx.stroke()
      const v = maxP - (rng / 4) * s
      ctx.fillStyle = '#6b7280'; ctx.font = '9px system-ui'; ctx.textAlign = 'left'
      ctx.fillText(fmtPrice(v), chartRight + 4, y + 3)
    }

    // X-axis segments
    const labeledXs: number[] = []
    if (isDaily) {
      const step = visible.length <= 8 ? 1 : Math.ceil(visible.length / 5)
      visible.forEach((pt, li) => {
        const gi = vs + li
        if (li === 0 || gi === ve) return
        if (li % step !== 0) return
        const x = xOf(gi)
        if (x < PAD.l + 48 || x > chartRight - 60) return
        if (labeledXs.some(px => Math.abs(px - x) < 42)) return
        labeledXs.push(x)
        ctx.strokeStyle = '#e5e7eb20'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b + 4); ctx.stroke()
        ctx.setLineDash([])
        const [, mm, dd] = pt.d.split('-')
        ctx.fillStyle = '#9ca3af'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
        ctx.fillText(`${mm}/${dd}`, x, H - 3)
      })
    } else {
      const interval = visible.length > 84 ? 24 : visible.length > 36 ? 12 : visible.length > 18 ? 6 : 3
      visible.forEach((pt, li) => {
        const gi = vs + li
        if (li === 0 || gi === ve) return
        const [yr, mo] = pt.d.split('-').map(Number)
        const isSeg =
          (interval === 24 && mo === 1 && yr % 2 === 0) ||
          (interval === 12 && mo === 1) ||
          (interval === 6  && (mo === 1 || mo === 7)) ||
          (interval === 3  && mo % 3 === 1)
        if (!isSeg) return
        const x = xOf(gi)
        if (x < PAD.l + 50 || x > chartRight - 70) return
        if (labeledXs.some(px => Math.abs(px - x) < 36)) return
        labeledXs.push(x)
        ctx.strokeStyle = '#e5e7eb20'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b + 4); ctx.stroke()
        ctx.setLineDash([])
        const label = interval >= 12 ? String(yr) : `${yr}/${String(mo).padStart(2, '0')}`
        ctx.fillStyle = '#9ca3af'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
        ctx.fillText(label, x, H - 3)
      })
    }

    // SMA lines
    smaLines.forEach(({ n, color: sc }) => {
      if (data.length < n) return
      ctx.beginPath(); let started = false
      visible.forEach((_, li) => {
        const gi = vs + li
        if (gi < n - 1) return
        const avg = data.slice(gi - n + 1, gi + 1).map(d => d.p).reduce((a, b) => a + b, 0) / n
        const x = xOf(gi), y = yOf(avg)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = sc; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke()
      ctx.setLineDash([])
    })

    // Event markers (drawn before price line so line sits on top)
    events.forEach(ev => {
      const idx = data.findIndex(d => d.d === ev.d || d.d.slice(0, ev.d.length) === ev.d || ev.d.slice(0, d.d.length) === d.d)
      if (idx < vs || idx > ve) return
      const x = xOf(idx), y = yOf(data[idx].p)
      const mc = ev.impact === 'pos' ? '#22c55e' : '#ef4444'
      ctx.strokeStyle = mc + '50'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b); ctx.stroke()
      ctx.setLineDash([])
      // diamond
      ctx.beginPath()
      ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y)
      ctx.closePath(); ctx.fillStyle = mc; ctx.fill()
    })

    // Price line + gradient fill
    ctx.beginPath()
    visible.forEach((pt, li) => {
      const x = xOf(vs + li), y = yOf(pt.p)
      if (li === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color; ctx.lineWidth = isDaily ? 1.5 : 2; ctx.stroke()

    ctx.lineTo(xOf(ve), H - PAD.b); ctx.lineTo(xOf(vs), H - PAD.b); ctx.closePath()
    const grad = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b)
    grad.addColorStop(0, color + '30'); grad.addColorStop(1, color + '00')
    ctx.fillStyle = grad; ctx.fill()

    // End-point dot
    ctx.beginPath(); ctx.arc(xOf(ve), yOf(visible[visible.length - 1].p), 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()

    // Start / end date labels
    ctx.fillStyle = '#9ca3af'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'
    const startD = isDaily ? visible[0].d.slice(5) : visible[0].d.slice(0, 7)
    ctx.fillText(startD, PAD.l, H - 3)

    const lastD = visible[visible.length - 1].d
    const today = new Date().toISOString().slice(0, 10)
    const endLabel = isDaily ? lastD
      : (today.slice(0, 7) === lastD.slice(0, 7) ? today : lastD.slice(0, 7))
    ctx.font = 'bold 10px system-ui'; ctx.fillStyle = color; ctx.textAlign = 'right'
    ctx.fillText(endLabel, chartRight - 2, H - 3)

    // Change %
    const chg = ((visible[visible.length - 1].p - visible[0].p) / visible[0].p * 100).toFixed(1)
    ctx.fillStyle = parseFloat(chg) >= 0 ? '#16a34a' : '#dc2626'
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'right'
    ctx.fillText(`${parseFloat(chg) >= 0 ? '+' : ''}${chg}%`, W - 4, PAD.t - 4)

  }, [data, view, color, events, smaLines, isDaily])

  // ── draw crosshair overlay ─────────────────────────────────────────────────
  const drawCrosshair = useCallback((mx: number | null, my: number | null) => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (mx === null || my === null) return

    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const [vs, ve] = viewRef.current
    const d = dataRef.current
    const { cw, ch } = makeCoords(W, H, vs, ve)
    const chartRight = PAD.l + cw

    if (mx < PAD.l || mx > chartRight) return

    // Vertical line
    ctx.strokeStyle = '#94a3b840'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(mx, PAD.t); ctx.lineTo(mx, H - PAD.b); ctx.stroke()

    // Horizontal line
    if (my >= PAD.t && my <= H - PAD.b) {
      ctx.beginPath(); ctx.moveTo(PAD.l, my); ctx.lineTo(chartRight, my); ctx.stroke()
    }
    ctx.setLineDash([])

    // Highlight dot on the price line
    const frac = (mx - PAD.l) / cw
    const gi = Math.max(vs, Math.min(ve, vs + Math.round(frac * (ve - vs))))
    const pt = d[gi]
    if (!pt) return

    const visible = d.slice(vs, ve + 1)
    const { minP, maxP } = visibleMinMax(visible)
    const rng = maxP - minP || 1
    const ey = PAD.t + ch - ((pt.p - minP) / rng) * ch

    ctx.beginPath(); ctx.arc(mx < (mx - PAD.l) / cw * cw + PAD.l ? mx : xOf_local(gi, W, vs, ve), ey, 5, 0, Math.PI * 2)

    function xOf_local(i: number, W2: number, vs2: number, ve2: number) {
      return PAD.l + ((i - vs2) / Math.max(ve2 - vs2, 1)) * (W2 - PAD.l - PAD.r)
    }

    const ex = xOf_local(gi, W, vs, ve)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Redraw lines after clearing
    ctx.strokeStyle = '#94a3b840'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(ex, PAD.t); ctx.lineTo(ex, H - PAD.b); ctx.stroke()
    if (my >= PAD.t && my <= H - PAD.b) {
      ctx.beginPath(); ctx.moveTo(PAD.l, my); ctx.lineTo(chartRight, my); ctx.stroke()
    }
    ctx.setLineDash([])

    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
  }, [color])

  // ── mouse handlers ─────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const canvas = staticRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const [vs, ve] = viewRef.current
    const n = ve - vs + 1
    const total = dataRef.current.length

    const frac = Math.max(0, Math.min(1, (mx - PAD.l) / (canvas.offsetWidth - PAD.l - PAD.r)))
    const factor = e.deltaY > 0 ? 1.3 : 0.75
    const newN = Math.max(4, Math.min(total, Math.round(n * factor)))
    if (newN === n) return

    const pivot = vs + Math.round(frac * (ve - vs))
    const newVs = Math.max(0, Math.min(total - newN, pivot - Math.round(frac * (newN - 1))))
    setView([newVs, Math.min(total - 1, newVs + newN - 1)])
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = staticRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Pan if dragging
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX
      const cw = canvas.offsetWidth - PAD.l - PAD.r
      const [v0s, v0e] = dragRef.current.v0
      const n = v0e - v0s + 1
      const total = dataRef.current.length
      const dIdx = Math.round(-dx / cw * n)
      const newVs = Math.max(0, Math.min(total - n, v0s + dIdx))
      setView([newVs, newVs + n - 1])
      return
    }

    drawCrosshair(mx, my)

    // Compute tooltip
    const [vs, ve] = viewRef.current
    const d = dataRef.current
    const cw = canvas.offsetWidth - PAD.l - PAD.r
    if (mx < PAD.l || mx > PAD.l + cw) { setTooltip(null); return }

    const frac = Math.max(0, Math.min(1, (mx - PAD.l) / cw))
    const gi = Math.max(vs, Math.min(ve, vs + Math.round(frac * (ve - vs))))
    const pt = d[gi]
    if (!pt) return

    const prev = gi > 0 ? d[gi - 1] : null
    const chgPct = prev ? ((pt.p - prev.p) / prev.p * 100) : null
    const chgStr = chgPct !== null
      ? `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`
      : null

    const evt = eventsRef.current.find(ev => {
      const idx = d.findIndex(dp => dp.d === ev.d || dp.d.slice(0, ev.d.length) === ev.d)
      return Math.abs(idx - gi) <= 1
    }) ?? null

    setTooltip({
      x: mx,
      date: pt.d,
      price: currencySymbol + fmtPrice(pt.p),
      chg: chgStr,
      event: evt,
      flipLeft: mx > canvas.offsetWidth * 0.58,
    })
  }, [drawCrosshair, currencySymbol])

  const handleMouseLeave = useCallback(() => {
    drawCrosshair(null, null)
    setTooltip(null)
    if (dragRef.current) { dragRef.current = null; setIsDragging(false) }
  }, [drawCrosshair])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return
    dragRef.current = { startX: e.clientX, v0: [...viewRef.current] as [number, number] }
    setIsDragging(true)
  }, [isZoomed])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null; setIsDragging(false)
  }, [])

  const resetZoom = useCallback(() => {
    setView([0, dataRef.current.length - 1])
    setTooltip(null)
    drawCrosshair(null, null)
  }, [drawCrosshair])

  // Keep overlay canvas sized correctly
  useEffect(() => {
    const overlay = overlayRef.current
    const st = staticRef.current
    if (!overlay || !st) return
    const dpr = window.devicePixelRatio || 1
    overlay.width  = st.offsetWidth * dpr
    overlay.height = st.offsetHeight * dpr
    const ctx = overlay.getContext('2d')
    ctx?.scale(dpr, dpr)
  }, [view])

  const cursor = isDragging ? 'grabbing' : isZoomed ? 'grab' : 'crosshair'

  const chartBody = (h: number) => (
    <div
      ref={h === height ? wrapRef : undefined}
      style={{ position: 'relative', height: h, cursor, userSelect: 'none' }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={resetZoom}
    >
      <canvas ref={h === height ? staticRef : undefined} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <canvas ref={h === height ? overlayRef : undefined} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
      {isZoomed && (
        <button onClick={resetZoom} style={{ position: 'absolute', top: 4, right: PAD.r + 4, fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}>
          复原
        </button>
      )}
      {tooltip && (
        <div style={{
          position: 'absolute',
          ...(tooltip.flipLeft
            ? { right: `calc(100% - ${tooltip.x}px + 14px)` }
            : { left: tooltip.x + 14 }),
          top: 4,
          backgroundColor: 'rgba(15,23,42,0.93)',
          color: '#f1f5f9',
          padding: '7px 10px',
          borderRadius: '7px',
          fontSize: '0.7rem',
          pointerEvents: 'none',
          minWidth: '148px',
          maxWidth: '220px',
          zIndex: 20,
          boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
          border: `1px solid ${color}55`,
          lineHeight: 1.55,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, marginBottom: 4, fontSize: '0.72rem' }}>
            {tooltip.date}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: '#94a3b8' }}>价格</span>
            <span style={{ fontWeight: 700 }}>{tooltip.price}</span>
          </div>
          {tooltip.chg && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: '#94a3b8' }}>较上期</span>
              <span style={{ fontWeight: 700, color: tooltip.chg.startsWith('+') ? '#4ade80' : '#f87171' }}>
                {tooltip.chg}
              </span>
            </div>
          )}
          {tooltip.event && (
            <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ color: tooltip.event.impact === 'pos' ? '#4ade80' : '#f87171', fontWeight: 700, marginBottom: 3, fontSize: '0.72rem' }}>
                {tooltip.event.impact === 'pos' ? '▲' : '▼'} {tooltip.event.label}
              </div>
              <div style={{ color: '#94a3b8', lineHeight: 1.5, fontSize: '0.65rem' }}>
                {tooltip.event.detail}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div style={{ position: 'relative' }}>
        {allowFullscreen && (
          <button
            onClick={() => setFullscreen(true)}
            title="全屏查看"
            style={{ position: 'absolute', top: 0, right: 0, zIndex: 5, fontSize: '0.75rem', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4 }}
          >⛶</button>
        )}
        {chartBody(height)}
      </div>

      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '1.25rem', width: '100%', maxWidth: '1100px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{title || '图表放大视图'}</span>
              <button onClick={() => setFullscreen(false)} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕ 关闭</button>
            </div>
            <InteractiveChart
              data={data} color={color} height={460} events={events}
              smaLines={smaLines} isDaily={isDaily} currencySymbol={currencySymbol}
              allowFullscreen={false}
            />
            <p style={{ marginTop: '0.4rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              滚轮缩放 · 拖拽平移 · 双击复原 · 悬停查看数据 · 菱形标记 = 重大事件 · 按 Esc 关闭
            </p>
          </div>
        </div>
      )}
    </>
  )
}
