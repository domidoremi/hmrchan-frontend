import { createHomeWorld } from './homeWorld'
import { createWebGLPlanes } from './webglPlanes'

export function createHomeSpace(canvas: HTMLCanvasElement, archive: boolean) {
  const world = createHomeWorld(archive)
  try {
    const painter = createWebGLPlanes(canvas, world.plane)
    if (!painter) {
      world.dispose()
      return
    }
    let images: readonly string[] = []
    return {
      palette: world.palette,
      resize(width: number, height: number) {
        painter.resize(width, height)
        world.resize(width / height)
      },
      images(sources: readonly string[]) {
        images = sources
        painter.images(sources)
      },
      render(phase: number, time: number) {
        world.render(painter, phase, time, images)
      },
      dispose() {
        painter.dispose()
        world.dispose()
      },
    }
  } catch (error) {
    world.dispose()
    throw error
  }
}

export type HomeSpace = NonNullable<ReturnType<typeof createHomeSpace>>
