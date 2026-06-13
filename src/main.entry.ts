import { markClientInitDisabled, shouldEnableClientInit } from './utils/clientInit'

if (!shouldEnableClientInit(import.meta.env) && typeof document !== 'undefined') {
  markClientInitDisabled(document)
}

await import('./main')
