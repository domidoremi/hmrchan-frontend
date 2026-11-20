import { Color, Group, Matrix4, Object3D, PerspectiveCamera, PlaneGeometry } from 'three'
import { cameraPose } from './cameraTrack'
import type { WebGLPlanes } from './webglPlanes'

type Tone = 'canvas' | 'paper' | 'metal' | 'light' | 'edge'
type HomeMaterial = { tone: Tone; image?: number }
type HomePlane = Object3D & { userData: HomeMaterial }

export function createHomeWorld(archive: boolean) {
  const hall = new Group()
  const camera = new PerspectiveCamera(53, 1, 0.18, 75)
  const plane = new PlaneGeometry(1, 1)
  const matrix = new Matrix4()
  const planes: HomePlane[] = []
  const tones: Record<Tone, Color> = {
    canvas: new Color(),
    paper: new Color(),
    metal: new Color(),
    light: new Color(),
    edge: new Color(),
  }
  const stride = archive ? 9.6 : 8.8

  function surface(
    parent: Group,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    tone: Tone,
    image?: number
  ) {
    const mesh = new Object3D() as HomePlane
    mesh.position.set(x, y, z)
    mesh.scale.set(width, height, 1)
    mesh.userData = image === undefined ? { tone } : { tone, image }
    parent.add(mesh)
    planes.push(mesh)
    return mesh
  }

  function exhibit(x: number, y: number, z: number, side: number, image: number) {
    const panel = new Group()
    const width = archive ? 3.4 : 3.75
    const height = archive ? 3.85 : 4.75
    panel.position.set(x, y, z)
    panel.rotation.y = side * (archive ? 0.58 : 0.46)
    panel.rotation.z = archive ? side * 0.1 : 0
    hall.add(panel)
    surface(panel, width, height, 0.1, -0.08, -0.18, 'metal')
    surface(panel, width, height, 0, 0, 0, 'paper')
    surface(panel, width - 0.22, height - 0.35, 0, 0.055, 0.02, 'metal', image)
    surface(panel, width * 0.27, 0.024, -width * 0.29, -height / 2 + 0.068, 0.021, 'edge')
    if (archive) {
      surface(panel, width + 0.6, height + 0.48, 0.43, 0.25, -0.45, 'metal')
      surface(panel, 0.027, height + 0.48, 0.73 + width / 2, 0.25, -0.44, 'light')
      surface(panel, width * 0.55, 0.027, -0.3, 0.5 + height / 2, -0.43, 'light')
    }
  }

  const floor = surface(hall, archive ? 18 : 17, 77, 0, -2.3, -28, 'canvas')
  floor.rotation.x = -Math.PI / 2
  for (let room = 0; room < 6; room++) {
    const z = 0.2 - room * stride
    const side = room % 2 === 0 ? 1 : -1
    exhibit(side * 3.9, archive ? 0.94 : 0.65, z, side, room)
    exhibit(side * -4.7, archive ? 0.1 : 0.32, z - stride * 0.47, -side, room + 1)
    for (const rail of [-1, 1]) {
      const ground = surface(hall, archive ? 0.048 : 0.024, stride, rail * 2.55, -2.29, z, 'light')
      ground.rotation.x = -Math.PI / 2
    }
    const seam = surface(hall, 15, 0.022, 0, -2.29, z + 1.7, 'edge')
    seam.rotation.x = -Math.PI / 2
    if (archive) {
      const beam = surface(hall, 11, 0.035, 0, 3.2, z, 'light')
      beam.rotation.z = side * 0.12
    } else {
      const wall = surface(hall, stride, 6.7, side * 6.15, 0.85, z - 1, 'paper')
      wall.rotation.y = Math.PI / 2
    }
  }

  function palette(style: CSSStyleDeclaration, preset: string) {
    const token = (name: string) => style.getPropertyValue(`--appearance-${name}`).trim()
    tones.canvas.setStyle(token('canvas'))
    tones.paper.setStyle(token('surface-1'))
    const accent = new Color(token('accent'))
    const energy = preset === 'gradient-narrative' ? 0.78 : preset === 'fluent-soft' ? 0.58 : 0.42
    tones.metal.copy(tones.paper).lerp(accent, archive ? energy * 0.62 : energy * 0.28)
    tones.edge.copy(tones.canvas).lerp(accent, archive ? 0.45 : 0.25)
    tones.light.copy(tones.canvas).lerp(accent, archive ? energy : energy * 0.7)
    for (const tone of Object.values(tones)) tone.convertLinearToSRGB()
  }

  function resize(aspect: number) {
    camera.aspect = aspect
    camera.fov = aspect < 1 ? 66 : 53
    hall.scale.x = Math.min(1, Math.max(0.38, aspect * 0.79))
    camera.updateProjectionMatrix()
    hall.updateMatrixWorld(true)
  }

  function render(painter: WebGLPlanes, phase: number, time: number, images: readonly string[]) {
    const { turn, approach } = cameraPose(phase)
    const breath = Math.sin(time * (archive ? 0.64 : 0.39))
    const forward = 9.2 - phase * stride
    const x = (turn * (archive ? 1.55 : 0.95) + breath * 0.09) * hall.scale.x
    camera.position.set(x, 0.8 - approach * 0.65 + breath * 0.05, forward)
    camera.lookAt(x + turn * (archive ? -1.05 : -0.62) * hall.scale.x, 0.24, forward - 6)
    camera.rotateZ(turn * (archive ? 0.1 : 0.038))
    camera.updateMatrixWorld()
    painter.clear(tones.canvas, camera.projectionMatrix)
    for (const item of planes) {
      const depth = forward - item.matrixWorld.elements[14]!
      if (depth < -5 || depth > 43) continue
      const { tone, image } = item.userData
      matrix.multiplyMatrices(camera.matrixWorldInverse, item.matrixWorld)
      painter.draw(
        matrix,
        tones[tone],
        image === undefined || !images.length ? undefined : images[image % images.length],
        item.scale.x / item.scale.y
      )
    }
  }

  return { palette, resize, render, dispose: () => plane.dispose(), plane }
}
