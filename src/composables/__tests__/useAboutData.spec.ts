import { describe, expect, it } from 'vitest'
import { extractVersion } from '../useAboutData'

describe('extractVersion', () => {
  it('空值应返回 N/A', () => {
    expect(extractVersion(undefined)).toBe('N/A')
    expect(extractVersion('')).toBe('N/A')
    expect(extractVersion('   ')).toBe('N/A')
  })

  it('应提取常见 semver 前缀版本', () => {
    expect(extractVersion('^3.5.26')).toBe('3.5')
    expect(extractVersion('~5.9.3')).toBe('5.9')
    expect(extractVersion('1.2.3')).toBe('1.2')
    expect(extractVersion('1')).toBe('1')
  })

  it('应兼容 npm alias 依赖版本', () => {
    expect(extractVersion('npm:rolldown-vite@^7.3.1')).toBe('7.3')
    expect(extractVersion('npm:@scope/pkg@~1.2.9')).toBe('1.2')
  })

  it('应处理范围表达式与无效值', () => {
    expect(extractVersion('>=24.11.1 <25')).toBe('24.11')
    expect(extractVersion('workspace:*')).toBe('N/A')
  })
})
