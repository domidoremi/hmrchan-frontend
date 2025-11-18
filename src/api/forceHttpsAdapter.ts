/**
 * Custom Axios FETCH adapter that forces HTTPS and bypasses XHR completely
 * XHR is being intercepted by something (browser extension, CSP, etc.), so we use Fetch instead
 */

import type { AxiosAdapter, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

// Try to get fetch adapter first, fallback to XHR if not available
const fetchAdapter = axios.getAdapter('fetch') as AxiosAdapter | null
const xhrAdapter = axios.getAdapter('xhr') as AxiosAdapter

export const forceHttpsAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => {
  // Build the full URL that will be used
  const fullUrl = axios.getUri(config)

  console.log('[ForceHttpsAdapter] Intercepting request:', fullUrl)
  console.log('[ForceHttpsAdapter] Using adapter:', fetchAdapter ? 'FETCH' : 'XHR')

  // If it's HTTP to api.momichan.xyz, force HTTPS
  if (fullUrl.startsWith('http://') && fullUrl.includes('api.momichan.xyz')) {
    const httpsUrl = fullUrl.replace('http://', 'https://')
    console.error('🚨🚨🚨 [ForceHttpsAdapter] FORCING HTTP → HTTPS:', fullUrl, '→', httpsUrl)

    // Completely rewrite the config to use the HTTPS URL
    config.baseURL = ''
    config.url = httpsUrl
    config.params = undefined // params already in the URL
  }

  // Prefer fetch adapter over XHR (fetch is less likely to be intercepted)
  if (fetchAdapter) {
    console.log('[ForceHttpsAdapter] Using native Fetch API (bypassing XHR)')
    return fetchAdapter(config)
  }

  // Fallback to XHR if fetch not available
  console.log('[ForceHttpsAdapter] Using XHR adapter (fetch not available)')
  return xhrAdapter(config)
}
