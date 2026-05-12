export interface Heading {
  id: string
  text: string
  level: 2 | 3
}

export function extractHeadings(content: string): Heading[] {
  const lines = content.split('\n')
  const headings: Heading[] = []
  const seen = new Map<string, number>()

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    const match = h2 || h3
    if (!match) continue

    const text = match[1].trim()
    // Match rehype-slug: lowercase, replace spaces/special chars with hyphens
    let id = text
      .toLowerCase()
      .replace(/[^\w\s一-鿿-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Deduplicate: rehype-slug appends -1, -2, etc. for duplicate IDs
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) {
      id = `${id}-${count}`
      seen.set(id, 1)
    }

    headings.push({ id, text, level: h2 ? 2 : 3 })
  }

  return headings
}
