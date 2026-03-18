export interface ScrollAnchorTarget {
  id: string
  top: number
  element?: HTMLElement
}

export interface ResolveNextScrollAnchorInput {
  scrollY: number
  navbarOffset: number
  targets: ScrollAnchorTarget[]
  tolerance?: number
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

export function resolveNextScrollAnchor({
  scrollY,
  navbarOffset,
  targets,
  tolerance = 24,
}: ResolveNextScrollAnchorInput): ScrollAnchorTarget | null {
  const orderedTargets = [...targets]
    .filter((target) => Number.isFinite(target.top))
    .sort((left, right) => left.top - right.top)

  const currentBaseline = scrollY + navbarOffset + tolerance
  return orderedTargets.find((target) => target.top > currentBaseline) ?? null
}

export function computeScrollAnchorTop(anchorTop: number, navbarOffset: number): number {
  return Math.max(0, anchorTop - Math.max(0, navbarOffset))
}

function getAnchorId(element: HTMLElement, index: number): string {
  return (
    element.dataset.scrollAnchor ||
    element.id ||
    `${element.tagName.toLowerCase()}-${element.className || 'anchor'}-${index}`
  )
}

function isRenderableAnchor(element: HTMLElement): boolean {
  if (element.hidden) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 || rect.height > 0
}

export function collectDocumentScrollTargets(doc: Document = document): ScrollAnchorTarget[] {
  const explicitAnchors = Array.from(doc.querySelectorAll<HTMLElement>('[data-scroll-anchor]'))
  const footerAnchors = Array.from(doc.querySelectorAll<HTMLElement>('footer.footer'))

  const fallbackAnchors =
    explicitAnchors.length > 0
      ? []
      : Array.from(
          doc.querySelectorAll<HTMLElement>(
            'main section, main [data-scroll-section], main h2, main [role="heading"], footer.footer'
          )
        )

  const candidates = [
    ...(explicitAnchors.length > 0 ? explicitAnchors : fallbackAnchors),
    ...footerAnchors,
  ].filter(isRenderableAnchor)

  const scrollY = window.scrollY || doc.documentElement.scrollTop || 0
  const seen = new Set<string>()

  return candidates
    .map((element, index) => {
      const id = getAnchorId(element, index)
      const top = scrollY + element.getBoundingClientRect().top
      return {
        id,
        top,
        element,
      }
    })
    .filter((target) => {
      if (seen.has(target.id)) return false
      seen.add(target.id)
      return true
    })
    .sort((left, right) => left.top - right.top)
}

export function readNavbarVisibleOffset(doc: Document = document): number {
  const root = doc.documentElement
  const inlineValue = root.style.getPropertyValue('--navbar-visible-height').trim()
  if (inlineValue === '0px') return 0

  const navbar = doc.querySelector<HTMLElement>('.navbar')
  if (navbar) {
    return Math.max(0, navbar.getBoundingClientRect().height)
  }

  return 0
}

export function isNearDocumentBottom(
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
  threshold = 96
): boolean {
  return scrollY + viewportHeight >= documentHeight - clamp(threshold, 0, documentHeight)
}
