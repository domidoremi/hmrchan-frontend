import type { Color, Matrix4, PlaneGeometry } from 'three'

const vertexShader = `#version 300 es
in vec3 aPosition;
in vec2 aUv;
uniform mat4 uProjection, uViewModel;
out vec2 vUv;
out float vDepth;
void main() {
  vec4 point = uViewModel * vec4(aPosition, 1.0);
  gl_Position = uProjection * point;
  vUv = aUv;
  vDepth = -point.z;
}`

const fragmentShader = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vDepth;
uniform vec3 uColor, uFog;
uniform vec2 uCrop;
uniform float uPhoto;
uniform sampler2D uImage;
out vec4 pixel;
void main() {
  vec2 uv = (vUv - 0.5) * uCrop + 0.5;
  vec3 color = mix(uColor, texture(uImage, uv).rgb, uPhoto);
  float shade = mix(0.95, 1.0, vUv.y);
  float haze = smoothstep(2.0, 34.0, vDepth);
  pixel = vec4(mix(color * shade, uFog, haze), 1.0);
}`

function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram()
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragmentShader],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to allocate homepage shader')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      gl.attachShader(program, shader)
      gl.deleteShader(shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) || 'Unable to link homepage shader')
    return program
  } catch (error) {
    gl.deleteProgram(program)
    throw error
  }
}

export function createWebGLPlanes(canvas: HTMLCanvasElement, plane: PlaneGeometry) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true })
  if (!context) return
  const gl = context

  const program = createProgram(gl)
  const vao = gl.createVertexArray()
  const buffers: WebGLBuffer[] = []
  gl.useProgram(program)
  gl.bindVertexArray(vao)
  for (const [name, attribute] of [
    ['aPosition', plane.getAttribute('position')],
    ['aUv', plane.getAttribute('uv')],
  ] as const) {
    const buffer = gl.createBuffer()
    buffers.push(buffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, attribute.array, gl.STATIC_DRAW)
    const location = gl.getAttribLocation(program, name)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, attribute.itemSize, gl.FLOAT, false, 0, 0)
  }
  const indices = gl.createBuffer()
  buffers.push(indices)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.getIndex()!.array, gl.STATIC_DRAW)
  gl.enable(gl.DEPTH_TEST)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const transform = uniform('uViewModel')
  const projection = uniform('uProjection')
  const tint = uniform('uColor')
  const fog = uniform('uFog')
  const crop = uniform('uCrop')
  const photo = uniform('uPhoto')
  gl.uniform1i(uniform('uImage'), 0)

  const blank = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, blank)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  const textures = new Map<string, { image: HTMLImageElement; texture?: WebGLTexture }>()

  function release(key: string) {
    const entry = textures.get(key)
    if (!entry) return
    entry.image.onload = null
    gl.deleteTexture(entry.texture ?? null)
    textures.delete(key)
  }

  return {
    resize(width: number, height: number) {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1, 1600 / width, 1200 / height)
      const pixelWidth = Math.max(1, Math.round(width * ratio))
      const pixelHeight = Math.max(1, Math.round(height * ratio))
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    images(sources: readonly string[]) {
      for (const key of textures.keys()) if (!sources.includes(key)) release(key)
      for (const key of sources) {
        if (textures.has(key)) continue
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.fetchPriority = 'low'
        const entry: { image: HTMLImageElement; texture?: WebGLTexture } = { image }
        textures.set(key, entry)
        image.onload = () => {
          if (gl.isContextLost()) return
          const texture = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, texture)
          try {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              textureSource(image)
            )
            gl.generateMipmap(gl.TEXTURE_2D)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            entry.texture = texture
          } catch {
            gl.deleteTexture(texture)
          }
        }
        image.src = key
      }
    },
    clear(color: Color, matrix: Matrix4) {
      gl.clearColor(color.r, color.g, color.b, 1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.uniform3f(fog, color.r, color.g, color.b)
      gl.uniformMatrix4fv(projection, false, matrix.elements)
    },
    draw(matrix: Matrix4, color: Color, source: string | undefined, aspect: number) {
      const entry = source ? textures.get(source) : undefined
      const imageAspect = entry?.texture ? entry.image.naturalWidth / entry.image.naturalHeight : 1
      gl.uniformMatrix4fv(transform, false, matrix.elements)
      gl.uniform3f(tint, color.r, color.g, color.b)
      gl.uniform2f(crop, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect))
      gl.uniform1f(photo, entry?.texture ? 1 : 0)
      gl.bindTexture(gl.TEXTURE_2D, entry?.texture ?? blank)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    },
    dispose() {
      for (const key of textures.keys()) release(key)
      for (const buffer of buffers) gl.deleteBuffer(buffer)
      gl.deleteTexture(blank)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    },
  }
}

function textureSource(image: HTMLImageElement) {
  // The world uses thumbnails as decorative textures, independent of reading quality.
  const scale = 768 / Math.max(image.naturalWidth, image.naturalHeight)
  if (scale >= 1) return image
  const thumbnail = document.createElement('canvas')
  thumbnail.width = Math.max(1, Math.round(image.naturalWidth * scale))
  thumbnail.height = Math.max(1, Math.round(image.naturalHeight * scale))
  thumbnail.getContext('2d')?.drawImage(image, 0, 0, thumbnail.width, thumbnail.height)
  return thumbnail
}

export type WebGLPlanes = NonNullable<ReturnType<typeof createWebGLPlanes>>
