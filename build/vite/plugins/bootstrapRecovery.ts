import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { designEdition } from '../../../src/config/designEdition.ts'

// Inline the independent recovery path so a failed entry cannot prevent it loading.
export function bootstrapRecoveryPlugin(): Plugin {
  return {
    name: 'momichan-bootstrap-recovery',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const charset = html.match(/<meta\s+charset=["']utf-8["']\s*\/?>/i)?.[0]
        if (!charset) throw new Error('Bootstrap recovery requires an early UTF-8 declaration')
        const script = readFileSync(
          new URL('../../../src/bootstrap/recovery.js', import.meta.url),
          'utf8'
        )
        const style = readFileSync(
          new URL('../../../src/bootstrap/recovery.css', import.meta.url),
          'utf8'
        )
        const shellStyle = readFileSync(
          new URL('../../../src/bootstrap/prerender.css', import.meta.url),
          'utf8'
        )
        // Keep charset in the first 1024 bytes, ahead of translated recovery copy.
        return html.replace(
          charset,
          () =>
            `${charset}\n<style data-bootstrap-style>${shellStyle}\n${style}</style>\n<script data-bootstrap-script data-edition="${designEdition}">${script}</script>`
        )
      },
    },
  }
}
