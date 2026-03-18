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
  transformOrigin: string
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
  const left = clamp(triggerRect.right - dropdownWidth, margin, maxLeft)
  const top = clamp(triggerRect.bottom + offsetY, margin, maxTop)
  const triggerCenterInline = triggerRect.left + (triggerRect.right - triggerRect.left) / 2
  const transformOriginInline = clamp(
    triggerCenterInline - left,
    1.5 * 16,
    dropdownWidth - 1.5 * 16
  )
  const transformOriginBlock = clamp(triggerRect.bottom + offsetY - top, 0, dropdownHeight)

  return {
    left,
    top,
    maxInlineSize: safeViewportWidth,
    maxBlockSize: safeViewportHeight,
    transformOrigin: `${transformOriginInline}px ${transformOriginBlock}px`,
  }
}
