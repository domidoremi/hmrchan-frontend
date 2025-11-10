/**
 * Pure Native Fetch adapter - completely bypass Axios XHR
 * This is the nuclear option to avoid any XHR interception
 */

import type { AxiosAdapter, InternalAxiosRequestConfig, AxiosResponse, AxiosHeaders } from 'axios'
import axios from 'axios'

export const nativeFetchAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  // Build the full URL
  const fullUrl = axios.getUri(config)
  
  // CRITICAL: Force HTTPS if HTTP detected
  const finalUrl = fullUrl.startsWith('http://') && fullUrl.includes('api.momichan.xyz')
    ? fullUrl.replace('http://', 'https://')
    : fullUrl
  
  if (finalUrl !== fullUrl) {
    console.error('🚨🚨🚨 [NativeFetchAdapter] FORCED HTTP → HTTPS:', fullUrl, '→', finalUrl)
  }
  
  console.log('[NativeFetchAdapter] Making request with native fetch():', finalUrl)
  
  // Build headers
  const headers: Record<string, string> = {}
  if (config.headers) {
    const axiosHeaders = config.headers as unknown as AxiosHeaders
    if (typeof axiosHeaders.toJSON === 'function') {
      const headersObj = axiosHeaders.toJSON()
      Object.assign(headers, headersObj)
    }
  }
  
  // Build fetch options
  const fetchOptions: RequestInit = {
    method: config.method?.toUpperCase() || 'GET',
    headers,
    mode: 'cors',
    credentials: config.withCredentials ? 'include' : 'same-origin',
  }
  
  // Add body for non-GET requests
  if (config.data && config.method?.toUpperCase() !== 'GET') {
    if (typeof config.data === 'string') {
      fetchOptions.body = config.data
    } else if (config.data instanceof FormData) {
      fetchOptions.body = config.data
    } else {
      fetchOptions.body = JSON.stringify(config.data)
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }
  }
  
  // Make the request with native fetch
  try {
    const startTime = Date.now()
    const response = await window.fetch(finalUrl, fetchOptions)
    const duration = Date.now() - startTime
    
    console.log(`[NativeFetchAdapter] Response received: ${response.status} in ${duration}ms`)
    
    // Parse response data
    const contentType = response.headers.get('content-type')
    let data: any
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
    
    // Build Axios-compatible response
    const axiosResponse: AxiosResponse = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: { responseURL: response.url },
    }
    
    // Check if response is successful
    if (response.ok) {
      return axiosResponse
    } else {
      // Throw error for non-2xx responses
      const error: any = new Error(`Request failed with status ${response.status}`)
      error.response = axiosResponse
      error.config = config
      error.request = { responseURL: response.url }
      throw error
    }
  } catch (error: any) {
    console.error('[NativeFetchAdapter] Request failed:', error)
    
    // Re-throw with Axios-compatible error
    if (!error.response) {
      error.config = config
      error.code = 'ERR_NETWORK'
    }
    throw error
  }
}
