import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

const spawnMock = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', () => ({
  default: {
    spawn: spawnMock,
  },
  spawn: spawnMock,
}))

const { PreviewShellManager, parseListeningProcessIdsFromNetstat } =
  await import('../../../scripts/lib/preview-shell.js')

function createMockProcess({
  stdout = '',
  stderr = '',
  closeCode = 0,
}: {
  stdout?: string
  stderr?: string
  closeCode?: number
} = {}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
    unref: ReturnType<typeof vi.fn>
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()
  child.unref = vi.fn()

  queueMicrotask(() => {
    if (stdout) child.stdout.emit('data', Buffer.from(stdout))
    if (stderr) child.stderr.emit('data', Buffer.from(stderr))
    child.emit('close', closeCode)
  })

  return child
}

describe('PreviewShellManager', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('retries process-tree cleanup when the child pid remains visible after the first stop', async () => {
    vi.useFakeTimers()
    const pid = 12345
    const bridgeStop = vi.fn().mockResolvedValue(undefined)
    const tasklistResults = [true, false]

    spawnMock.mockImplementation((command: string, args: string[]) => {
      if (command === 'taskkill') {
        return createMockProcess()
      }

      if (command === 'tasklist') {
        const isRunning = tasklistResults.shift() ?? false
        return createMockProcess({
          stdout: isRunning
            ? `"node.exe","${pid}","Console","1","1,024 K"\r\n`
            : 'INFO: No tasks are running which match the specified criteria.\r\n',
        })
      }

      if (command === 'netstat') {
        return createMockProcess()
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
    })

    const manager = new PreviewShellManager({
      localApiBridgeFactory: () => ({ stop: bridgeStop }),
    }) as InstanceType<typeof PreviewShellManager> & {
      child: EventEmitter & {
        pid: number
        exitCode: number | null
        killed: boolean
        stdout: { destroy: ReturnType<typeof vi.fn> }
        stderr: { destroy: ReturnType<typeof vi.fn> }
        unref: ReturnType<typeof vi.fn>
      }
      localApiBridge: { stop: ReturnType<typeof vi.fn> }
    }
    manager.localApiBridge = { stop: bridgeStop }
    manager.child = Object.assign(new EventEmitter(), {
      pid,
      exitCode: null,
      killed: false,
      stdout: { destroy: vi.fn() },
      stderr: { destroy: vi.fn() },
      unref: vi.fn(),
    })

    const stopPromise = manager.stop()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(2_000)
    await vi.advanceTimersByTimeAsync(750)
    await stopPromise

    const taskkillCalls = spawnMock.mock.calls.filter(([command]) => command === 'taskkill')
    expect(taskkillCalls).toHaveLength(2)
    expect(bridgeStop).toHaveBeenCalledOnce()
  })

  it('cleans up a preview process that still owns the assigned port after the wrapper exits', async () => {
    const wrapperPid = 12345
    const previewPid = 23456
    const previewPort = 57057
    const bridgeStop = vi.fn().mockResolvedValue(undefined)
    const netstatResults = [
      [
        `  TCP    127.0.0.1:${previewPort}     0.0.0.0:0       LISTENING       ${previewPid}`,
        `  TCP    [::1]:${previewPort}          [::]:0          LISTENING       ${previewPid}`,
      ].join('\r\n'),
      '',
    ]

    spawnMock.mockImplementation((command: string, args: string[]) => {
      if (command === 'taskkill') {
        return createMockProcess()
      }

      if (command === 'tasklist') {
        return createMockProcess({
          stdout: 'INFO: No tasks are running which match the specified criteria.\r\n',
        })
      }

      if (command === 'netstat') {
        return createMockProcess({
          stdout: netstatResults.shift() ?? '',
        })
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
    })

    const manager = new PreviewShellManager({
      localApiBridgeFactory: () => ({ stop: bridgeStop }),
    }) as InstanceType<typeof PreviewShellManager> & {
      child: EventEmitter & {
        pid: number
        exitCode: number | null
        killed: boolean
        stdout: { destroy: ReturnType<typeof vi.fn> }
        stderr: { destroy: ReturnType<typeof vi.fn> }
        unref: ReturnType<typeof vi.fn>
      }
      localApiBridge: { stop: ReturnType<typeof vi.fn> }
      port: number
    }
    manager.localApiBridge = { stop: bridgeStop }
    manager.port = previewPort
    manager.child = Object.assign(new EventEmitter(), {
      pid: wrapperPid,
      exitCode: 0,
      killed: false,
      stdout: { destroy: vi.fn() },
      stderr: { destroy: vi.fn() },
      unref: vi.fn(),
    })

    await manager.stop()

    const taskkillPids = spawnMock.mock.calls
      .filter(([command]) => command === 'taskkill')
      .map(([, args]) => args[1])
    expect(taskkillPids).toEqual([String(wrapperPid), String(previewPid)])
    expect(bridgeStop).toHaveBeenCalledOnce()
  })

  it('runs a second port cleanup pass after wrapper shutdown settles', async () => {
    vi.useFakeTimers()
    const wrapperPid = 12345
    const latePreviewPid = 34567
    const previewPort = 52849
    const bridgeStop = vi.fn().mockResolvedValue(undefined)
    const netstatResults = [
      '',
      `  TCP    127.0.0.1:${previewPort}     0.0.0.0:0       LISTENING       ${latePreviewPid}`,
    ]

    spawnMock.mockImplementation((command: string, args: string[]) => {
      if (command === 'taskkill') {
        return createMockProcess()
      }

      if (command === 'tasklist') {
        return createMockProcess({
          stdout: 'INFO: No tasks are running which match the specified criteria.\r\n',
        })
      }

      if (command === 'netstat') {
        return createMockProcess({
          stdout: netstatResults.shift() ?? '',
        })
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
    })

    const manager = new PreviewShellManager({
      localApiBridgeFactory: () => ({ stop: bridgeStop }),
    }) as InstanceType<typeof PreviewShellManager> & {
      child: EventEmitter & {
        pid: number
        exitCode: number | null
        killed: boolean
        stdout: { destroy: ReturnType<typeof vi.fn> }
        stderr: { destroy: ReturnType<typeof vi.fn> }
        unref: ReturnType<typeof vi.fn>
      }
      localApiBridge: { stop: ReturnType<typeof vi.fn> }
      port: number
    }
    manager.localApiBridge = { stop: bridgeStop }
    manager.port = previewPort
    manager.child = Object.assign(new EventEmitter(), {
      pid: wrapperPid,
      exitCode: 0,
      killed: false,
      stdout: { destroy: vi.fn() },
      stderr: { destroy: vi.fn() },
      unref: vi.fn(),
    })

    const stopPromise = manager.stop()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(750)
    await stopPromise

    const taskkillPids = spawnMock.mock.calls
      .filter(([command]) => command === 'taskkill')
      .map(([, args]) => args[1])
    expect(taskkillPids).toEqual([String(wrapperPid), String(latePreviewPid)])
    expect(bridgeStop).toHaveBeenCalledOnce()
  })

  it('deduplicates Windows netstat listeners for the requested port', () => {
    expect(
      parseListeningProcessIdsFromNetstat(
        [
          '  TCP    127.0.0.1:57057     0.0.0.0:0       LISTENING       23456',
          '  TCP    [::1]:57057          [::]:0          LISTENING       23456',
          '  TCP    127.0.0.1:4173      0.0.0.0:0       LISTENING       99999',
          '  UDP    127.0.0.1:57057     *:*                             99999',
        ].join('\r\n'),
        57057
      )
    ).toEqual([23456])
  })
})
