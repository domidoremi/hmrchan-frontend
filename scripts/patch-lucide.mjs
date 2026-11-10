import fs from 'node:fs'
import path from 'node:path'

// Lucide 1.71 already preserves default slots; keep only the context guard.
const rules = [
  {
    target: path.join(process.cwd(), 'node_modules/@lucide/vue/dist/esm/context.mjs'),
    expected: 'getCurrentInstance() ? inject(LUCIDE_CONTEXT, {}) : {}',
    apply(source) {
      let next = source

      if (!next.includes('getCurrentInstance')) {
        next = next.replace(
          "import { provide, inject } from 'vue';",
          "import { provide, inject, getCurrentInstance } from 'vue';"
        )
      }

      if (next.includes('  return inject(LUCIDE_CONTEXT, {});')) {
        next = next.replace(
          '  return inject(LUCIDE_CONTEXT, {});',
          '  return getCurrentInstance() ? inject(LUCIDE_CONTEXT, {}) : {};'
        )
      }

      return next
    },
  },
  {
    target: path.join(process.cwd(), 'node_modules/@lucide/vue/dist/cjs/lucide-vue.js'),
    expected: 'vue.getCurrentInstance() ? vue.inject(LUCIDE_CONTEXT, {}) : {}',
    apply(source) {
      let next = source

      if (next.includes('  return vue.inject(LUCIDE_CONTEXT, {});')) {
        next = next.replace(
          '  return vue.inject(LUCIDE_CONTEXT, {});',
          '  return vue.getCurrentInstance() ? vue.inject(LUCIDE_CONTEXT, {}) : {};'
        )
      }

      return next
    },
  },
]

let patchedCount = 0

for (const rule of rules) {
  if (!fs.existsSync(rule.target)) {
    throw new Error(`Lucide compatibility target is missing: ${rule.target}`)
  }

  const source = fs.readFileSync(rule.target, 'utf8')
  const next = rule.apply(source)
  if (!next.includes(rule.expected)) {
    throw new Error(`Lucide context implementation changed: ${rule.target}`)
  }
  if (next === source) continue

  fs.writeFileSync(rule.target, next, 'utf8')
  patchedCount += 1
}

if (patchedCount > 0) {
  console.log(`patched @lucide/vue compatibility in ${patchedCount} file(s)`)
}
