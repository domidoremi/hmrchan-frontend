export function chapterPosition(offset: number, overflow: number, travel: number, height: number) {
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return {
    enter: clamp(1 + offset / Math.max(1, height)),
    leave: clamp((offset - overflow - travel) / Math.max(1, height)),
    flow: clamp((offset + height) / Math.max(1, overflow + travel + height * 2)),
    shift: Math.max(0, Math.min(overflow, offset)),
    progress: travel > 0 ? clamp((offset - overflow) / travel) : 0,
  }
}
