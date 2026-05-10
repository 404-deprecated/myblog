export interface Heading {
  id: string
  text: string
  level: 2 | 3
}

export function extractHeadings(content: string): Heading[] {
  const lines = content.split('\n')
  const headings: Heading[] = []

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    const match = h2 || h3
    if (!match) continue

    const text = match[1].trim()
    // Match rehype-slug: lowercase, replace spaces/special chars with hyphens
    const id = text
      .toLowerCase()
      .replace(/[^\w\s一-鿿-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    headings.push({ id, text, level: h2 ? 2 : 3 })
  }

  return headings
}
