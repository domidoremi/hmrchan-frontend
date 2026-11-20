const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function cameraPose(phase: number) {
  return {
    turn: Math.sin(phase * 1.5),
    approach: (1 - Math.cos(phase * Math.PI * 2)) / 2,
  }
}

export function cameraTrack(scroll: number, end: number, stops: readonly number[]) {
  if (end <= 0) return 0
  const position = Math.max(0, Math.min(end, scroll))
  let start = 0
  let section = 0
  for (const stop of stops) {
    if (position < stop) return blend(position, end, section, start, stop, stops.length + 1)
    start = stop
    section++
  }
  return blend(position, end, section, start, end, section + 1)
}

function blend(
  position: number,
  end: number,
  section: number,
  start: number,
  stop: number,
  rooms: number
) {
  const t = clamp((position - start) / (stop - start))
  // The distance term keeps the camera moving through chapter boundaries.
  return (position / end) * rooms * 0.38 + (section + t * t * (3 - 2 * t)) * 0.62
}
