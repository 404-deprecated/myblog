import type { PostCategory } from '@/types/post'

export const CATEGORIES: Record<PostCategory, { label: string; color: string; description: string }> = {
  tech: {
    label: '技术',
    color: 'category-tech',
    description: '客户端开发 · AI · 工程实践',
  },
  life: {
    label: '生活',
    color: 'category-life',
    description: '日常记录 · 随笔 · 思考',
  },
  finance: {
    label: '理财',
    color: 'category-finance',
    description: '投资 · 资产配置 · 财务规划',
  },
  resources: {
    label: '学习资源',
    color: 'category-resources',
    description: '精选网站 · 工具 · 书单',
  },
}
