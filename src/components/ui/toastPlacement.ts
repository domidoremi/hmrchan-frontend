type Bounds = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>

export function findToastShift(
  notice: Bounds & Pick<DOMRect, 'height'>,
  controls: readonly Bounds[],
  dock: 'top' | 'bottom',
  viewportHeight: number,
  gap: number
): number | null {
  const minimum = dock === 'top' ? notice.top : viewportHeight / 2
  const maximum = dock === 'top' ? viewportHeight / 2 : notice.bottom
  let top = notice.top
  const blocked = controls
    .filter(
      (control) =>
        control.right > notice.left && control.left < notice.right && control.bottom > control.top
    )
    .toSorted((left, right) => (dock === 'top' ? left.top - right.top : right.top - left.top))

  for (const control of blocked) {
    if (top + notice.height <= control.top - gap || top >= control.bottom + gap) continue
    top = dock === 'top' ? control.bottom + gap : control.top - gap - notice.height
    if (top < minimum || top + notice.height > maximum) return null
  }
  return top >= minimum && top + notice.height <= maximum ? top - notice.top : null
}
