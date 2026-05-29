import { EDGE_SNAP, PET_SIZE } from './config'

export type DeskPetPoint = {
  x: number
  y: number
}

export type DeskPetViewport = {
  width: number
  height: number
}

export type DeskPetInsets = {
  top: number
  right: number
  bottom: number
  left: number
}

export type DeskPetRect = {
  left: number
  right: number
  top: number
  bottom: number
}

export function clampDeskPetPosition(
  pos: DeskPetPoint,
  viewport: DeskPetViewport,
  petSize = PET_SIZE
): DeskPetPoint {
  return {
    x: Math.max(-petSize / 2, Math.min(pos.x, viewport.width - petSize / 2)),
    y: Math.max(0, Math.min(pos.y, viewport.height - petSize / 2)),
  }
}

export function clampDeskPetPeekPosition(
  pos: DeskPetPoint,
  viewport: DeskPetViewport,
  petSize = PET_SIZE
): DeskPetPoint {
  return {
    x: Math.max(-petSize * 0.45, Math.min(pos.x, viewport.width - petSize * 0.55)),
    y: Math.max(0, Math.min(pos.y, viewport.height - petSize * 0.8)),
  }
}

export function snapDeskPetToEdge(
  pos: DeskPetPoint,
  viewport: DeskPetViewport,
  petSize = PET_SIZE,
  edgeSnap = EDGE_SNAP
): DeskPetPoint {
  let { x, y } = pos

  if (x < edgeSnap) x = 0
  else if (x > viewport.width - petSize - edgeSnap) x = viewport.width - petSize

  if (y < edgeSnap) y = 0
  else if (y > viewport.height - petSize - edgeSnap) y = viewport.height - petSize

  return { x, y }
}

export function deskPetRectsIntersect(a: DeskPetRect, b: DeskPetRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function clampDeskPetDefaultPlacement(
  pos: DeskPetPoint,
  petSize: number,
  insets: DeskPetInsets,
  viewport: DeskPetViewport
): DeskPetPoint {
  return {
    x: Math.max(insets.left, Math.min(pos.x, viewport.width - petSize - insets.right)),
    y: Math.max(insets.top, Math.min(pos.y, viewport.height - petSize - insets.bottom)),
  }
}

export function resolveDeskPetDefaultPosition({
  viewport,
  petSize,
  boundaryPetSize = PET_SIZE,
  insets,
  obstacleRects,
}: {
  viewport: DeskPetViewport
  petSize: number
  boundaryPetSize?: number
  insets: DeskPetInsets
  obstacleRects: DeskPetRect[]
}): DeskPetPoint {
  const candidates = [
    {
      x: viewport.width - petSize - insets.right,
      y: viewport.height - petSize - insets.bottom,
    },
    {
      x: insets.left,
      y: viewport.height - petSize - insets.bottom,
    },
    {
      x: viewport.width - petSize - insets.right,
      y: insets.top,
    },
    {
      x: insets.left,
      y: insets.top,
    },
  ].map((candidate) => clampDeskPetDefaultPlacement(candidate, petSize, insets, viewport))

  const [bestCandidate] = candidates
    .map((candidate, index) => {
      const petRect = {
        left: candidate.x,
        right: candidate.x + petSize,
        top: candidate.y,
        bottom: candidate.y + petSize,
      }

      const overlapCount = obstacleRects.reduce(
        (count, rect) => count + Number(deskPetRectsIntersect(petRect, rect)),
        0
      )

      return { candidate, overlapCount, index }
    })
    .sort((a, b) => a.overlapCount - b.overlapCount || a.index - b.index)

  return clampDeskPetPosition(
    bestCandidate?.candidate ?? { x: insets.left, y: insets.top },
    viewport,
    boundaryPetSize
  )
}
