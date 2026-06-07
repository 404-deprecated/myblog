import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execFileAsync = promisify(execFile)

// Resolve script path from this file's location
const SCRIPT = path.resolve(process.cwd(), 'scripts', 'serenity_scan.py')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get('sector') || 'sectors'

  // Verify script exists
  if (!fs.existsSync(SCRIPT)) {
    return NextResponse.json({ error: `Script not found: ${SCRIPT}` }, { status: 500 })
  }

  try {
    const { stdout, stderr } = await execFileAsync('python3', [SCRIPT, sector], {
      timeout: 30000, maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, no_proxy: '*', PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
    })
    if (stderr) console.warn('[serenity-scan] stderr:', stderr.slice(0, 300))
    return NextResponse.json(JSON.parse(stdout))
  } catch (err: any) {
    const msg = err.stderr || err.message || String(err)
    console.error('[serenity-scan] error:', msg.slice(0, 500))
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}
