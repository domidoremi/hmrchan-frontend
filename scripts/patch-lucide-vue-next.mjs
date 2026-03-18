import fs from 'node:fs'
import path from 'node:path'

const PATCH_TARGETS = [
  path.join(process.cwd(), 'node_modules/lucide-vue-next/dist/esm/createLucideIcon.js'),
  path.join(process.cwd(), 'node_modules/lucide-vue-next/dist/cjs/lucide-vue-next.js'),
  path.join(process.cwd(), 'node_modules/.vite/deps/lucide-vue-next.js'),
]

const SLOT_PATCH = 'slots && slots.default ? { default: slots.default } : void 0'
const SLOT_REGEX = /},\s*slots\s*\);/

let patchedCount = 0

for (const target of PATCH_TARGETS) {
  if (!fs.existsSync(target)) continue

  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(SLOT_PATCH)) continue
  if (!SLOT_REGEX.test(source)) continue

  const next = source.replace(SLOT_REGEX, `}, ${SLOT_PATCH});`)
  if (next === source) continue

  fs.writeFileSync(target, next, 'utf8')
  patchedCount += 1
}

if (patchedCount > 0) {
  console.log(`patched lucide-vue-next slot forwarding in ${patchedCount} file(s)`)
}
