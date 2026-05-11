'use client'

import { useState, useCallback, useRef } from 'react'

interface AnalysisResult {
  image_type: string
  summary: string
  holdings: { name: string; weight?: string; return?: string }[]
  total_return?: string
  risk_level: string
  risks: string[]
  suggestions: string[]
  timing_advice: string
  note?: string
}

const RISK_COLOR: Record<string, string> = {
  低: '#16a34a', 中: '#d97706', 高: '#dc2626',
}

export function FundImageAnalysis() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('请上传图片文件'); return }
    if (f.size > 5 * 1024 * 1024) { setError('图片不超过 5MB'); return }
    setFile(f)
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const analyze = useCallback(async () => {
    if (!file) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await fetch('/api/fund-image-analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.status === 422 && data.error === 'vision_unsupported') {
        setError('当前 AI 模型不支持图片识别，请将持仓信息复制为文字后使用下方基金分析工具')
        return
      }
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [file])

  const reset = () => { setPreview(null); setFile(null); setResult(null); setError('') }

  return (
    <div>
      {/* 上传区 */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: '10px',
            padding: '2rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
            拖拽或点击上传持仓截图
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            支持 JPG / PNG / WebP，最大 5MB
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      )}

      {/* 预览 + 操作 */}
      {preview && !result && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <img
            src={preview}
            alt="预览"
            style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file?.name}</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={analyze}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '8px',
                  border: 'none', backgroundColor: 'var(--accent)', color: '#fff',
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'AI 分析中…' : '开始分析'}
              </button>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                换图
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载骨架 */}
      {loading && (
        <div style={{ marginTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[80, 60, 70, 45].map((w, i) => (
            <div key={i} style={{
              height: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)',
              width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div style={{
          marginTop: '0.875rem', fontSize: '0.8rem', color: '#991b1b',
          backgroundColor: '#fff1f2', border: '1px solid #fca5a5',
          borderRadius: '8px', padding: '0.625rem 0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{
            borderRadius: '10px', border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)', overflow: 'hidden',
          }}>
            {/* 顶部摘要 */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{result.image_type}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {result.total_return && (
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.625rem', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                      {result.total_return}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.625rem', borderRadius: '20px',
                    backgroundColor: (RISK_COLOR[result.risk_level] ?? '#6b7280') + '18',
                    color: RISK_COLOR[result.risk_level] ?? '#6b7280',
                    border: `1px solid ${(RISK_COLOR[result.risk_level] ?? '#6b7280')}40`,
                    fontWeight: 600,
                  }}>
                    风险：{result.risk_level}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>
                {result.summary}
              </p>
            </div>

            {/* 持仓列表 */}
            {result.holdings?.length > 0 && (
              <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                  持仓明细
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {result.holdings.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8rem' }}>
                      <span style={{ flex: 1, color: 'var(--text)' }}>{h.name}</span>
                      {h.weight && <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{h.weight}</span>}
                      {h.return && <span style={{ color: parseFloat(h.return) >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{h.return}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 风险 + 建议 */}
            <div style={{ padding: '0.875rem', borderBottom: result.timing_advice ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                  风险提示
                </div>
                {result.risks?.map((r, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, paddingLeft: '0.75rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#dc2626' }}>·</span>{r}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                  操作建议
                </div>
                {result.suggestions?.map((s, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, paddingLeft: '0.75rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#16a34a' }}>·</span>{s}
                  </div>
                ))}
              </div>
            </div>

            {/* 择时建议 */}
            {result.timing_advice && (
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>当前择时：</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginLeft: '0.5rem' }}>{result.timing_advice}</span>
              </div>
            )}
          </div>

          {result.note && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              注：{result.note}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: '0.75rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem',
              borderRadius: '8px', border: '1px solid var(--border)', background: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            重新上传
          </button>
        </div>
      )}
    </div>
  )
}
