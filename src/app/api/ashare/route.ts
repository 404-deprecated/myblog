import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const SCRIPT = path.join(process.cwd(), 'scripts', 'ashare_data.py')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cmd = searchParams.get('cmd') || 'quote'
  const codes = searchParams.get('codes') || ''

  try {
    const args = [SCRIPT, cmd]
    if (codes) args.push(codes)

    const { stdout, stderr } = await execFileAsync('python3', args, {
      timeout: 60000,  // 10 stocks × 1s delay + overhead
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env, no_proxy: 'eastmoney.com,push2.eastmoney.com,*.eastmoney.com' },
    })

    if (stderr) console.warn('[ashare] stderr:', stderr.slice(0, 200))

    const data = JSON.parse(stdout)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60', // 60s cache
      },
    })
  } catch (err: any) {
    console.error('[ashare] error:', err.message)
    return NextResponse.json({ error: err.message || 'Failed to fetch A-share data' }, { status: 500 })
  }
}
