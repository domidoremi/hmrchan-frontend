export interface DropdownRectLike {
  width: number
  height: number
}

export interface TriggerRectLike {
  left: number
  right: number
  top: number
  bottom: number
}

export interface NavbarDropdownPositionInput {
  triggerRect: TriggerRectLike
  dropdownRect: DropdownRectLike
  viewportWidth: number
  viewportHeight: number
  margin?: number
  offsetY?: number
}

export interface NavbarDropdownPositionResult {
  left: number
  top: number
  maxInlineSize: number
  maxBlockSize: number
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

export function resolveNavbarDropdownPosition({
  triggerRect,
  dropdownRect,
  viewportWidth,
  viewportHeight,
  margin = 16,
  offsetY = 8,
}: NavbarDropdownPositionInput): NavbarDropdownPositionResult {
  const safeViewportWidth = Math.max(0, viewportWidth - margin * 2)
  const safeViewportHeight = Math.max(0, viewportHeight - margin * 2)
  const dropdownWidth = Math.min(dropdownRect.width || safeViewportWidth, safeViewportWidth)
  const dropdownHeight = Math.min(dropdownRect.height || safeViewportHeight, safeViewportHeight)

  const maxLeft = Math.max(margin, viewportWidth - dropdownWidth - margin)
  const maxTop = Math.max(margin, viewportHeight - dropdownHeight - margin)

  return {
    left: clamp(triggerRect.right - dropdownWidth, margin, maxLeft),
    top: clamp(triggerRect.bottom + offsetY, margin, maxTop),
    maxInlineSize: safeViewportWidth,
    maxBlockSize: safeViewportHeight,
  }
}
