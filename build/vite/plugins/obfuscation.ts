import type { Plugin } from 'vite'

type ObfuscationProfile = 'safe' | 'aggressive'
type StringArrayEncoding = 'none' | 'base64' | 'rc4'

interface ObfuscationPluginOptions {
  enabled: boolean
  profile?: ObfuscationProfile
  include?: RegExp
  stringArray?: boolean
  stringArrayEncoding?: StringArrayEncoding
  antiFormatting?: boolean
  infiniteDebugger?: boolean
  infiniteDebuggerInterval?: number
  codeEncryption?: boolean
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
    stringArray = true,
    stringArrayEncoding = 'base64',
    antiFormatting = false,
    infiniteDebugger = false,
    infiniteDebuggerInterval = 0,
    codeEncryption = false,
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

      if (infiniteDebugger) {
        this.warn(
          '[Obfuscation] VITE_OBFUSCATION_INFINITE_DEBUGGER=true 可能显著影响用户体验，请仅在高对抗场景短期灰度。'
        )
      }

      if (antiFormatting) {
        this.warn(
          '[Obfuscation] VITE_OBFUSCATION_ANTI_FORMATTING=true 可能影响可维护性与兼容性，请仅用于关键 chunk。'
        )
      }

      if (codeEncryption) {
        this.warn(
          '[Obfuscation] VITE_OBFUSCATION_CODE_ENCRYPTION=true 为提高逆向门槛的“伪加密”方案，不能替代后端签名校验。'
        )
      }
    },

    renderChunk(code, chunk) {
      if (!enabled || !obfuscator) return null
      if (!chunk.fileName.endsWith('.js')) return null
      if (!include.test(chunk.fileName)) return null

      const isAggressive = profile === 'aggressive'
      const effectiveStringArray = stringArray || codeEncryption
      const effectiveEncoding =
        codeEncryption || stringArrayEncoding === 'rc4'
          ? (['rc4'] as const)
          : stringArrayEncoding === 'base64'
            ? (['base64'] as const)
            : ([] as const)
      const effectiveStringArrayThreshold = codeEncryption ? 1 : isAggressive ? 0.9 : 0.65
      const effectiveSplitStrings = codeEncryption || isAggressive
      const effectiveAntiFormatting = antiFormatting || isAggressive
      const effectiveDebugProtection = infiniteDebugger
      const effectiveDebugProtectionInterval = effectiveDebugProtection
        ? Math.max(infiniteDebuggerInterval, 1000)
        : 0

      const obfuscated = obfuscator.obfuscate(code, {
        compact: true,
        simplify: true,
        sourceMap: false,
        renameGlobals: false,
        identifierNamesGenerator: 'hexadecimal',
        splitStrings: effectiveSplitStrings,
        splitStringsChunkLength: effectiveSplitStrings ? 8 : 0,
        stringArray: effectiveStringArray,
        stringArrayEncoding: effectiveEncoding,
        stringArrayThreshold: effectiveStringArrayThreshold,
        rotateStringArray: true,
        shuffleStringArray: true,
        stringArrayWrappersCount: isAggressive ? 2 : 1,
        stringArrayWrappersType: 'function',
        stringArrayIndexShift: true,
        unicodeEscapeSequence: false,
        disableConsoleOutput: true,
        selfDefending: effectiveAntiFormatting,
        debugProtection: effectiveDebugProtection,
        debugProtectionInterval: effectiveDebugProtectionInterval,
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
