import fs from 'node:fs'
import path from 'node:path'

const SLOT_PATCH = 'slots && slots.default ? { default: slots.default } : void 0'
const SLOT_REGEX = /},\s*slots\s*\);/

const rules = [
  {
    target: path.join(process.cwd(), 'node_modules/@lucide/vue/dist/esm/createLucideIcon.js'),
    apply(source) {
      if (source.includes(SLOT_PATCH) || !SLOT_REGEX.test(source)) return source
      return source.replace(SLOT_REGEX, `}, ${SLOT_PATCH});`)
    },
  },
  {
    target: path.join(process.cwd(), 'node_modules/@lucide/vue/dist/esm/context.js'),
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
    apply(source) {
      let next = source

      if (!next.includes(SLOT_PATCH) && SLOT_REGEX.test(next)) {
        next = next.replace(SLOT_REGEX, `}, ${SLOT_PATCH});`)
      }

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
  if (!fs.existsSync(rule.target)) continue

  const source = fs.readFileSync(rule.target, 'utf8')
  const next = rule.apply(source)
  if (next === source) continue

  fs.writeFileSync(rule.target, next, 'utf8')
  patchedCount += 1
}

if (patchedCount > 0) {
  console.log(`patched @lucide/vue compatibility in ${patchedCount} file(s)`)
}
