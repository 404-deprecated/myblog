import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { fund } = body
    if (!fund || typeof fund !== 'string') {
      return NextResponse.json({ error: 'Invalid fund name' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const prompt = `你是一位专业基金分析师。今天是${today}。
请对【${fund}】进行低吸高减策略分析，基于你对该基金的了解和当前市场状态给出判断。

请严格返回以下JSON格式，不要有任何其他文字或代码块标记：
{
  "fund_name": "基金全称",
  "category": "基金类型",
  "price_desc": "当前净值所处位置描述（如历史高位/近期低位/中间区域等）",
  "from_high_pct": 数字（距近期高点跌幅，0表示在高点，-15表示跌了15%）,
  "from_low_pct": 数字（距近期低点涨幅，正数，如50表示距低点涨了50%）,
  "zone": "buy2或buy1或hold或warn或sell",
  "zone_label": "重仓买入或轻仓买入或持有观望或注意减仓或大幅减仓",
  "monthly_action": "本月操作建议一句话",
  "buy_condition": "建议买入加仓的净值条件",
  "sell_condition": "建议减仓的净值条件",
  "key_risk": "当前最大风险一句话",
  "key_opportunity": "当前最大机会一句话",
  "confidence": "high或medium或low",
  "note": "补充说明或数据局限提示，可为空字符串"
}`

    const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.minimaxi.com/anthropic').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Anthropic error: ${err}` }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.content?.map((b: { type: string; text?: string }) => b.text || '').join('') || ''

    // strip markdown fences, then extract the first {...} block
    const stripped = raw.replace(/```json|```/g, '').trim()
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : stripped

    try {
      const parsed = JSON.parse(jsonStr)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
