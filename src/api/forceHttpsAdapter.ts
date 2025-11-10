/**
 * Custom Axios XHR adapter that forces HTTPS at the lowest possible level
 * This adapter wraps the standard XHR adapter and intercepts URL just before native XHR.open()
 */

import type { AxiosAdapter, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

// Get the default XHR adapter from axios
const xhrAdapter = axios.getAdapter('xhr') as AxiosAdapter

export const forceHttpsAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  // Build the full URL that will be used
  const fullUrl = axios.getUri(config)
  
  console.log('[ForceHttpsAdapter] Intercepting request:', fullUrl)
  
  // If it's HTTP to api.momichan.xyz, force HTTPS
  if (fullUrl.startsWith('http://') && fullUrl.includes('api.momichan.xyz')) {
    const httpsUrl = fullUrl.replace('http://', 'https://')
    console.error('🚨🚨🚨 [ForceHttpsAdapter] FORCING HTTP → HTTPS:', fullUrl, '→', httpsUrl)
    
    // Completely rewrite the config to use the HTTPS URL
    config.baseURL = ''
    config.url = httpsUrl
    config.params = undefined // params already in the URL
  }
  
  // Call the original XHR adapter
  return xhrAdapter(config)
}
