type ReadFrame = () => (() => void) | undefined

const pending = new Set<ReadFrame>()
let frame = 0

function flush() {
  frame = 0
  const batch = [...pending]
  pending.clear()
  // Sticky chapter geometry is shared by the section motion and the directory.
  // Read it for the whole page before any participant writes to the DOM.
  const writes = batch.map((read) => read())
  for (const write of writes) write?.()
}

export function queueHomeFrame(read: ReadFrame) {
  pending.add(read)
  if (!frame) frame = requestAnimationFrame(flush)
}

export function cancelHomeFrame(read: ReadFrame) {
  pending.delete(read)
  if (frame && pending.size === 0) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}
