import type { HtmlDocumentConfig, HtmlDocumentShellLink } from './htmlDocument.ts'
import { buildTitle } from './documentTitle.ts'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function publicLinks(links: HtmlDocumentShellLink[]): string {
  if (!links.length) return ''
  return `<nav class="prerender-shell__links" aria-label="Public route shortcuts">${links.map((link, index) => `<a href="${escapeHtml(link.href)}"><span class="prerender-shell__link-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(link.label)}</span><span aria-hidden="true">↗</span></a>`).join('')}</nav>`
}

export function renderPublicShell(
  config: HtmlDocumentConfig,
  edition: 'editorial' | 'archive'
): string {
  const archive = edition === 'archive'
  if (archive)
    return `<section class="prerender-shell" data-prerender-shell="true" data-prerender-shell-variant="${config.shellVariant}" data-edition="archive" aria-label="${escapeHtml(buildTitle(config.title))}">
      <div class="prerender-shell__body" data-prerender-shell-content="true">
        <div class="prerender-shell__intro"><h1>${escapeHtml(buildTitle(config.title))}</h1>
          <span class="prerender-shell__loading" role="status" aria-live="polite"><i aria-hidden="true"></i><span>Loading</span></span>
          <noscript><p class="prerender-shell__note" lang="en">Enable JavaScript to use interactive features.</p></noscript>
          ${publicLinks(config.shellLinks)}
        </div>
        ${config.ogImage && config.shellVariant !== 'home' ? `<figure class="prerender-shell__visual"><img src="${escapeHtml(config.ogImage)}" alt="${escapeHtml(config.shellTitle)}" decoding="async" /></figure>` : ''}
      </div>
    </section>`
  return `<section class="prerender-shell" data-prerender-shell="true" data-prerender-shell-variant="${config.shellVariant}" data-edition="${edition}" aria-label="MomiChan">
    <header class="prerender-shell__header"><a class="prerender-shell__brand" href="/" aria-label="MomiChan home">MomiChan</a></header>
    <div class="prerender-shell__body" data-prerender-shell-content="true">
      <div class="prerender-shell__intro"><p class="prerender-shell__eyebrow">${escapeHtml(config.shellEyebrow)}</p><h1>${escapeHtml(config.shellTitle)}</h1><p class="prerender-shell__description">${escapeHtml(config.shellBody)}</p>
        <span class="prerender-shell__loading" role="status" aria-live="polite"><i aria-hidden="true"></i><span>Opening this page</span></span>
        <noscript><p class="prerender-shell__note" lang="en">JavaScript is disabled. You can follow the public links below. Search, account actions and other interactive features need JavaScript.</p></noscript>
        ${publicLinks(config.shellLinks)}
      </div>
    </div>
    <footer class="prerender-shell__footer"><span>MOMICHAN</span><span>PHOTOS · POSTS · PEOPLE</span></footer>
  </section>`
}
