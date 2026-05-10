export type PostCategory = 'tech' | 'life' | 'finance' | 'resources'

export interface PostMeta {
  slug: string
  title: string
  date: string
  excerpt: string
  category: PostCategory
  tags: string[]
  readingTime: string
}

export interface Post extends PostMeta {
  content: string
}
