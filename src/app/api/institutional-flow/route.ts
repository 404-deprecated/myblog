import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execFileAsync = promisify(execFile)
const SCRIPT = path.resolve(process.cwd(), 'scripts', 'institutional_flow.py')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codes = searchParams.get('codes') || '000725,600036'
  if (!fs.existsSync(SCRIPT)) return NextResponse.json({ error: `Script not found` }, { status: 500 })
  try {
    const { stdout } = await execFileAsync('python3', [SCRIPT, codes], {
      timeout: 60000, maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, no_proxy: '*', PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
    })
    return NextResponse.json(JSON.parse(stdout))
  } catch (err: any) {
    return NextResponse.json({ error: (err.stderr || err.message || String(err)).slice(0, 500) }, { status: 500 })
  }
}
