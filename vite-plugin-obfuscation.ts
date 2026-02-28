import type { Plugin } from 'vite'

type ObfuscationProfile = 'safe' | 'aggressive'

interface ObfuscationPluginOptions {
  enabled: boolean
  profile?: ObfuscationProfile
  include?: RegExp
  controlFlowFlattening?: boolean
  deadCodeInjection?: boolean
}

type JavaScriptObfuscatorModule = {
  obfuscate: (
    sourceCode: string,
    options: Record<string, unknown>
  ) => {
    getObfuscatedCode: () => string
  }
}

export function obfuscationPlugin(options: ObfuscationPluginOptions): Plugin {
  const {
    enabled,
    profile = 'safe',
    include = /assets\/js\/.*\.js$/,
    controlFlowFlattening = false,
    deadCodeInjection = false,
  } = options

  let obfuscator: JavaScriptObfuscatorModule | null = null

  return {
    name: 'vite-plugin-obfuscation',
    apply: 'build',
    enforce: 'post',

    async buildStart() {
      if (!enabled) return

      try {
        const moduleName = 'javascript-obfuscator'
        const mod = (await import(moduleName)) as { default?: unknown } & Record<string, unknown>
        const maybeDefault = mod.default as unknown
        obfuscator = (maybeDefault || mod) as JavaScriptObfuscatorModule
      } catch {
        this.error(
          [
            '[Obfuscation] 已启用 VITE_ENABLE_OBFUSCATION=true，但未安装 javascript-obfuscator。',
            '请先执行：bun add -d javascript-obfuscator',
          ].join('\n')
        )
      }
    },

    renderChunk(code, chunk) {
      if (!enabled || !obfuscator) return null
      if (!chunk.fileName.endsWith('.js')) return null
      if (!include.test(chunk.fileName)) return null

      const isAggressive = profile === 'aggressive'
      const obfuscated = obfuscator.obfuscate(code, {
        compact: true,
        simplify: true,
        sourceMap: false,
        renameGlobals: false,
        identifierNamesGenerator: 'hexadecimal',
        splitStrings: isAggressive,
        splitStringsChunkLength: isAggressive ? 8 : 0,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: isAggressive ? 0.9 : 0.65,
        rotateStringArray: true,
        shuffleStringArray: true,
        stringArrayWrappersCount: isAggressive ? 2 : 1,
        stringArrayWrappersType: 'function',
        stringArrayIndexShift: true,
        unicodeEscapeSequence: false,
        disableConsoleOutput: true,
        selfDefending: isAggressive,
        debugProtection: false,
        debugProtectionInterval: 0,
        controlFlowFlattening,
        controlFlowFlatteningThreshold: isAggressive ? 0.75 : 0.35,
        deadCodeInjection,
        deadCodeInjectionThreshold: isAggressive ? 0.35 : 0.1,
      })

      return {
        code: obfuscated.getObfuscatedCode(),
        map: null,
      }
    },
  }
}
