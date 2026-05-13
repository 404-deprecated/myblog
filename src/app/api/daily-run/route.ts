import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Daily automation: generate → review → tune → attribute ──────────────────
export async function GET() {
  const base = process.env.SITE_URL ?? 'http://localhost:3001'
  const results: Record<string, unknown> = {}

  // Step 1: Generate today's predictions
  try {
    const predRes = await fetch(`${base}/api/predictions`, { method: 'POST' })
    const pred = await predRes.json()
    results.predictions = pred.message || `Generated ${pred.generated} predictions`
  } catch (e) {
    results.predictions = `Failed: ${String(e)}`
  }

  // Step 2: Review past predictions (auto-fetch actual prices + evaluate)
  try {
    const reviewRes = await fetch(`${base}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review' }),
    })
    const review = await reviewRes.json()
    results.review = {
      reviewed: review.reviewed,
      accuracy: review.stats?.accuracy + '%',
      suggestions: review.corrections?.length + ' suggestions',
    }
  } catch (e) {
    results.review = `Failed: ${String(e)}`
  }

  // Step 3: Auto-annotate market events
  try {
    const eventsRes = await fetch(`${base}/api/market-events?action=auto-annotate`)
    const events = await eventsRes.json()
    results.events = `Annotated ${events.newEvents} new events`
  } catch (e) {
    results.events = `Skipped: ${String(e)}`
  }

  // Step 4: Get final review stats
  try {
    const statsRes = await fetch(`${base}/api/review`)
    const stats = await statsRes.json()
    results.finalStats = {
      totalPredictions: stats.stats.total,
      reviewed: stats.stats.reviewed,
      accuracy: stats.stats.accuracy + '%',
      corrections: stats.corrections?.length + ' pending',
      lastTune: stats.lastTune || 'not yet',
    }
  } catch (e) {
    results.finalStats = `Failed: ${String(e)}`
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    results,
  })
}
