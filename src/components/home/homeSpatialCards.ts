interface SpatialSourceCard {
  post: { id: string }
  title: string
  author: string
  thumbnail?: string | null
}

const coverFiles = [
  'hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
  'story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
  'story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
  'story-2-6d08e205-d2b3-4ad0-9a3c-9351702cca60.webp',
  'story-3-0e7e443b-af20-454d-b210-aefe166e90ca.webp',
]

export function resolveHomeSpatialCards(cards: SpatialSourceCard[], coverCaption: string) {
  if (cards.length)
    return cards.slice(0, 7).map((card) => ({
      id: card.post.id,
      title: card.title,
      author: card.author,
      thumbnail: card.thumbnail,
    }))
  return coverFiles.map((file, index) => ({
    id: `cover-${index}`,
    title: coverCaption,
    author: 'MomiChan',
    thumbnail: `/snapshot-media/home/${file}`,
  }))
}
