import type { Page } from 'puppeteer'

interface PageRouteState {
  url: string
  pathname: string | null
  title: string | null
}

interface LoginShellSelectorWaiterOptions {
  routeDriftPrefix?: string
}

type LoginShellSelectorWaiter = (
  page: Page,
  selector: string,
  context: string,
  timeout?: number
) => Promise<void>

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function readPageRouteState(page: Page): Promise<PageRouteState> {
  const [pathname, title] = await Promise.all([
    page.evaluate(() => window.location.pathname).catch(() => null),
    page.title().catch(() => null),
  ])

  return {
    url: page.url(),
    pathname,
    title,
  }
}

export async function waitForRoutePath(
  page: Page,
  expectedPath: string,
  context: string,
  timeout = 5_000
): Promise<void> {
  await page
    .waitForFunction((path) => window.location.pathname === path, { timeout }, expectedPath)
    .catch(async () => {
      const state = await readPageRouteState(page)
      throw new Error(
        `${context}: expected browser path ${expectedPath}, got ${state.pathname ?? 'unknown'} (${state.url}, title: ${state.title ?? 'unknown'})`
      )
    })
}

export function createLoginShellSelectorWaiter(
  options: LoginShellSelectorWaiterOptions = {}
): LoginShellSelectorWaiter {
  const routeDriftPrefix = options.routeDriftPrefix ?? ''

  return async function waitForLoginShellSelector(
    page: Page,
    selector: string,
    context: string,
    timeout = 15_000
  ): Promise<void> {
    try {
      await page.waitForSelector(selector, { timeout })
    } catch (error) {
      const state = await readPageRouteState(page)
      if (state.pathname !== '/login') {
        throw new Error(
          `${context}: ${routeDriftPrefix}login route left /login before auth shell rendered; current path ${state.pathname ?? 'unknown'} (${state.url}, title: ${state.title ?? 'unknown'})`
        )
      }

      throw new Error(
        `${context}: LoginPage mount/runtime failure; selector ${selector} was not found on /login (title: ${state.title ?? 'unknown'}) after ${timeout}ms. Original error: ${formatError(error)}`
      )
    }
  }
}

export const waitForLoginShellSelector = createLoginShellSelectorWaiter()
