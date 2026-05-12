import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: '404_Not_Found', template: '%s | 404_Not_Found' },
  description: '记录技术、生活、理财与学习资源的个人博客',
  authors: [{ name: '404_Not_Found' }],
  openGraph: {
    siteName: '404_Not_Found',
    images: [{ url: '/og', width: 1200, height: 630 }],
  },
  alternates: {
    types: { 'application/rss+xml': '/feed.xml' },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light';document.documentElement.classList.add(d);document.documentElement.style.colorScheme=d}catch(e){}})()`,
        }} />
      </head>
      <body suppressHydrationWarning style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ThemeProvider>
          <Nav />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
