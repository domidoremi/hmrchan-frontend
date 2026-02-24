import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Read the source index.html to extract exact inline content
const html = readFileSync('index.html', 'utf8')

// Extract frame-guard script content (between <script> and </script> after frame-guard style)
const scriptMatch = html.match(/<style id="frame-guard">[^<]*<\/style>\s*<script>([\s\S]*?)<\/script>/)
if (scriptMatch) {
  const scriptContent = scriptMatch[1]
  const hash = createHash('sha256').update(scriptContent, 'utf8').digest('base64')
  console.log('Script content repr:', JSON.stringify(scriptContent).slice(0, 80) + '...')
  console.log('Frame-guard script hash: sha256-' + hash)
} else {
  console.log('ERROR: Could not find frame-guard script')
}

// Extract frame-guard style content
const styleMatch = html.match(/<style id="frame-guard">([^<]*)<\/style>/)
if (styleMatch) {
  const styleContent = styleMatch[1]
  const hash = createHash('sha256').update(styleContent, 'utf8').digest('base64')
  console.log('Style content:', JSON.stringify(styleContent))
  console.log('Frame-guard style hash: sha256-' + hash)
}

// Also check the built dist/index.html to see if the script content is identical
try {
  const distHtml = readFileSync('dist/index.html', 'utf8')
  const distScriptMatch = distHtml.match(/<style id="frame-guard">[^<]*<\/style>\s*<script>([\s\S]*?)<\/script>/)
  if (distScriptMatch) {
    const distScriptContent = distScriptMatch[1]
    const hash = createHash('sha256').update(distScriptContent, 'utf8').digest('base64')
    console.log('\nDist script content repr:', JSON.stringify(distScriptContent).slice(0, 80) + '...')
    console.log('Dist frame-guard script hash: sha256-' + hash)
    console.log('Script identical to source:', distScriptContent === (scriptMatch && scriptMatch[1]))
  }
} catch {
  console.log('dist/index.html not found, skipping')
}
