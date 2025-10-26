/**
 * API客户端配置
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'

// API基础URL
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证Token
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response) {
      const { status } = error.response

      // 401 未授权 - Token过期或无效
      if (status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/login'
      }

      // 403 权限不足
      if (status === 403) {
        console.error('Permission denied')
      }

      // 429 请求过于频繁
      if (status === 429) {
        console.error('Too many requests')
      }

      // 500 服务器错误
      if (status >= 500) {
        console.error('Server error')
      }
    } else if (error.request) {
      console.error('Network error:', error.message)
    }

    return Promise.reject(error)
  },
)

/**
 * API请求封装
 */
export const api = {
  // GET请求
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get(url, config).then((res) => res.data)
  },

  // POST请求
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, config).then((res) => res.data)
  },

  // PUT请求
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, config).then((res) => res.data)
  },

  // PATCH请求
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, config).then((res) => res.data)
  },

  // DELETE请求
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, config).then((res) => res.data)
  },
}

export default apiClient
