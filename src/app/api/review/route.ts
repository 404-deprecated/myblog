import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  readReviewStore, writeReviewStore, reviewPending, computeStats, generateCorrections,
  logPrediction, type ReviewRecord, type ReviewType, type ReviewGroup,
} from '@/lib/review-store'
import { autoTune } from '@/lib/auto-tune'

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

// ─── Price fetcher for review ──────────────────────────────────────────────────
async function fetchPriceForDate(
  ticker: string,
  targetDate: string,
): Promise<{ price: number; changePct: number } | null> {
  const enc = encodeURIComponent(ticker)
  // Fetch 1 month of data around the target date
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?range=3mo&interval=1d&includePrePost=false`
  try {
    const { stdout } = await execAsync(
      `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`
    )
    const result = JSON.parse(stdout).chart?.result?.[0]
    if (!result) return null
    const ts: number[] = result.timestamp || []
    const closes: number[] =
      result.indicators?.adjclose?.[0]?.adjclose ||
      result.indicators?.quote?.[0]?.close || []

    const prices = ts
      .map((t, i) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), p: closes[i] }))
      .filter(x => x.p != null && !isNaN(x.p) && x.p > 0)

    if (prices.length < 2) return null

    // Find the price at or closest after targetDate
    const targetPt = prices.find(p => p.d >= targetDate)
    if (!targetPt) return null

    // Find the price just before targetDate for change calculation
    const prevIdx = prices.findIndex(p => p.d >= targetDate) - 1
    const prevPrice = prevIdx >= 0 ? prices[prevIdx].p : targetPt.p
    const changePct = prevPrice > 0 ? +((targetPt.p - prevPrice) / prevPrice * 100).toFixed(2) : 0

    return { price: +targetPt.p.toFixed(2), changePct }
  } catch {
    return null
  }
}

// ─── GET: Stats + corrections ─────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'stats'

  if (action === 'records') {
    const store = await readReviewStore()
    const type = url.searchParams.get('type')
    const group = url.searchParams.get('group')
    const limit = parseInt(url.searchParams.get('limit') ?? '100')

    let records = store.records
    if (type) records = records.filter(r => r.type === type)
    if (group) records = records.filter(r => r.group === group)

    // Sort by createdAt desc
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    records = records.slice(0, limit)

    return NextResponse.json({ records, count: records.length })
  }

  const store = await readReviewStore()

  // Auto-review pending
  const { reviewed } = await reviewPending(fetchPriceForDate)
  // Re-read after review
  const updatedStore = reviewed > 0 ? await readReviewStore() : store

  const stats = computeStats(updatedStore.records)
  const corrections = generateCorrections(updatedStore)

  // Auto-tune prediction parameters based on review data
  let tunedParams = null
  try {
    tunedParams = await autoTune()
  } catch { /* non-critical */ }

  return NextResponse.json(
    {
      stats, corrections,
      correctionsHistory: updatedStore.corrections.slice(-10),
      lastReviewCount: reviewed,
      ...(tunedParams?.adjustmentLog?.length ? {
        lastTune: tunedParams.tunedAt,
        tuneAdjustments: tunedParams.adjustmentLog.slice(-3),
      } : {}),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  )
}

// ─── POST: Trigger review ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const action = body.action ?? 'review'

  if (action === 'log') {
    // Log a new prediction for future review
    const record = body.record as Omit<ReviewRecord, 'result'>
    if (!record.id || !record.type || !record.ticker) {
      return NextResponse.json({ error: 'id, type, and ticker are required' }, { status: 400 })
    }
    await logPrediction(record)
    return NextResponse.json({ ok: true, id: record.id })
  }

  if (action === 'review') {
    const { reviewed } = await reviewPending(fetchPriceForDate)
    const store = await readReviewStore()
    const stats = computeStats(store.records)
    const corrections = generateCorrections(store)
    return NextResponse.json({ reviewed, stats, corrections })
  }

  if (action === 'apply_correction') {
    const { description, beforeAccuracy } = body
    if (!description) {
      return NextResponse.json({ error: 'description required' }, { status: 400 })
    }
    const store = await readReviewStore()
    store.corrections.push({
      appliedAt: new Date().toISOString(),
      description,
      beforeAccuracy: beforeAccuracy ?? 0,
    })
    await writeReviewStore(store)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ─── DELETE: Clear all records (dev reset) ────────────────────────────────────
export async function DELETE() {
  await writeReviewStore({ records: [], corrections: [] })
  return NextResponse.json({ ok: true })
}
