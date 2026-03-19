export interface BubbleRevealRectLike {
  top: number
  bottom: number
}

export interface BubbleRevealWindow {
  shouldReveal: boolean
  shouldReset: boolean
}

const ENTER_BOTTOM_RATIO = 0.28
const ENTER_TOP_RATIO = 0.86
const RESET_BOTTOM_RATIO = -0.18
const RESET_TOP_RATIO = 1.18

export function resolveBubbleRevealWindow(
  rect: BubbleRevealRectLike | null,
  viewportHeight: number,
  itemCount: number
): BubbleRevealWindow {
  if (!rect || viewportHeight <= 0 || itemCount <= 0) {
    return {
      shouldReveal: false,
      shouldReset: true,
    }
  }

  const shouldReveal =
    rect.bottom > viewportHeight * ENTER_BOTTOM_RATIO && rect.top < viewportHeight * ENTER_TOP_RATIO

  const stillWithinResetBand =
    rect.bottom > viewportHeight * RESET_BOTTOM_RATIO && rect.top < viewportHeight * RESET_TOP_RATIO

  return {
    shouldReveal,
    shouldReset: !stillWithinResetBand,
  }
}
