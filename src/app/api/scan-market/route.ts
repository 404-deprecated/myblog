import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)
const SCRIPT = path.join(process.cwd(), 'scripts', 'scan_market.py')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cmd = searchParams.get('cmd') || 'all'
  const codes = searchParams.get('codes') || '000725,600036'

  try {
    const args = [SCRIPT, cmd]
    if (codes) args.push(codes)

    const { stdout } = await execFileAsync('python3', args, {
      timeout: 45000, maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, no_proxy: '*' },
    })

    const data = JSON.parse(stdout)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
