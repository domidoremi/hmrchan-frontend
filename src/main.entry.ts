import { markClientInitDisabled, shouldEnableClientInit } from './utils/clientInit'

if (shouldEnableClientInit(import.meta.env)) {
  await import('./main')
} else if (typeof document !== 'undefined') {
  markClientInitDisabled(document)
}
