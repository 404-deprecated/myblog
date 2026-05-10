import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import type { PostCategory } from '@/types/post'

export const metadata: Metadata = { title: '关于' }

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '60ch' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--accent)',
            marginBottom: '0.75rem',
            letterSpacing: '0.05em',
          }}
        >
          $ cat about.md
        </p>

        <h1
          style={{
            fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '2rem',
          }}
        >
          关于我
        </h1>

        <div className="prose">
          <p>
            Hi，我是 <code>404_Not_Found</code>——一个在代码世界里迷路又总能找到路的人。
          </p>
          <p>
            主业是客户端开发，平时会折腾 Android、iOS 以及各类跨平台方案。
            近年来对 AI 工具越来越感兴趣，喜欢把 LLM 插进日常工作流里看看能擦出什么火花。
          </p>
          <p>
            这个博客是我的「数字花园」，想到什么就写什么，没有更新频率的压力，只有真实的记录：
          </p>
          <ul>
            <li><strong>技术</strong>：客户端踩坑、AI 工具测评、工程实践，偶尔也聊架构和效率。</li>
            <li><strong>生活</strong>：读过的书、看过的电影、走过的地方，以及一些没人问但我想说的话。</li>
            <li><strong>理财</strong>：普通人视角的资产配置思考，不荐股，只记录自己的学习过程。</li>
            <li><strong>学习资源</strong>：持续整理觉得有价值的网站、工具和书单，希望对你也有用。</li>
          </ul>

          <h2>联系方式</h2>
          <p>
            目前主要在 GitHub 上活动。如果你发现文章有错误，或者想交流某个话题，欢迎通过
            GitHub Issues 联系我。
          </p>
          <p>
            <a href="https://github.com/EvilsoulMMM" target="_blank" rel="noopener noreferrer">
              github.com/EvilsoulMMM
            </a>
          </p>

          <h2>关于博客</h2>
          <p>
            用 <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">Next.js</a> 构建，
            文章以 MDX 格式存储，部署在 Vercel。
            代码开源，设计上参考了 cassidoo 的极简风格，加了一点属于自己的「404 气质」。
          </p>
        </div>

        <div
          style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            直接去看文章 →
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {(Object.keys(CATEGORIES) as PostCategory[]).map((cat) => (
              <Link key={cat} href={`/blog?category=${cat}`} className="surface-link">
                {CATEGORIES[cat].label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
