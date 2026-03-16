import { spawnSync } from 'node:child_process'

function normalizeSegment(segment) {
  return segment.replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
}

const rawArgs = process.argv.slice(2)

if (rawArgs.length === 0) {
  console.error('用法: bun run commit:cn -- "type(scope): 描述" "- 变更点一" "- 变更点二"')
  console.error('也支持在单个参数中直接写入 \\n，脚本会自动转换为真实换行。')
  process.exit(1)
}

const args = rawArgs.map(normalizeSegment)
const [subject, ...bodyLines] = args
const message = bodyLines.length > 0 ? [subject, '', ...bodyLines].join('\n') : subject

const result = spawnSync('git', ['commit', '-F', '-'], {
  input: message,
  stdio: ['pipe', 'inherit', 'inherit'],
  encoding: 'utf-8',
})

if (result.error) {
  console.error(`提交失败: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
