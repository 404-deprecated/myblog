import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/GIF/WebP 格式' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不超过 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const today = new Date().toISOString().split('T')[0]
    const prompt = `你是一位专业基金投资分析师。今天是${today}。
请仔细分析这张基金相关图片（可能是持仓截图、净值走势图、基金账户截图或基金详情页）。

请严格返回以下JSON格式，不要有任何其他文字或代码块标记：
{
  "image_type": "图片类型描述（如：基金持仓截图/净值走势/账户总览等）",
  "summary": "整体情况一句话总结",
  "holdings": [
    { "name": "基金/股票名称", "weight": "占比（如有）", "return": "收益率（如有）" }
  ],
  "total_return": "总收益率（如能识别）",
  "risk_level": "风险等级评估：低/中/高",
  "risks": ["风险点1", "风险点2"],
  "suggestions": ["操作建议1", "操作建议2", "操作建议3"],
  "timing_advice": "当前时点的择时建议（持有/减仓/加仓）",
  "note": "补充说明，如图片不清晰或信息有限请在此说明"
}`

    const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.minimaxi.com/anthropic').replace(/\/$/, '')

    const body = JSON.stringify({
      model: 'MiniMax-M2.7',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    })

    if (!response.ok) {
      const errText = await response.text()
      // vision not supported by this model
      if (response.status === 400 && errText.toLowerCase().includes('image')) {
        return NextResponse.json({ error: 'vision_unsupported' }, { status: 422 })
      }
      return NextResponse.json({ error: `API error: ${errText}` }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.content?.map((b: { type: string; text?: string }) => b.text || '').join('') || ''
    const stripped = raw.replace(/```json|```/g, '').trim()
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : stripped

    try {
      return NextResponse.json(JSON.parse(jsonStr))
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
