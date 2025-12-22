/**
 * HTTP 请求工具函数
 * 封装 fetch API，提供统一的请求/响应处理和日志打印
 */

import { API_BASE_URL, TOKEN_KEY, REQUEST_TIMEOUT, UPLOAD_TIMEOUT } from './config'

// 请求选项接口
export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
  requireAuth?: boolean
}

// 通用响应接口
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

/**
 * 获取存储的 Token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 保存 Token
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除 Token
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}



/**
 * 通用请求函数
 */
export const request = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const startTime = Date.now()

  // 构建完整 URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // 如果需要认证，添加 Token
  if (options.requireAuth !== false) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // 构建请求配置
  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  }

  // 添加请求体
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, options.timeout || REQUEST_TIMEOUT)

    const response = await fetch(fullUrl, {
      ...fetchOptions,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await response.json()

    return data
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '网络请求失败',
    }
  }
}

/**
 * GET 请求
 */
export const get = <T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> => {
  return request<T>(url, { ...options, method: 'GET' })
}

/**
 * POST 请求
 */
export const post = <T = any>(
  url: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> => {
  return request<T>(url, { ...options, method: 'POST', body })
}

/**
 * PUT 请求
 */
export const put = <T = any>(
  url: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> => {
  return request<T>(url, { ...options, method: 'PUT', body })
}

/**
 * DELETE 请求
 */
export const del = <T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> => {
  return request<T>(url, { ...options, method: 'DELETE' })
}

/**
 * 文件上传请求（FormData）
 * 不设置 Content-Type，让浏览器自动设置 multipart/form-data
 */
export const upload = async <T = any>(
  url: string,
  formData: FormData,
  options?: Omit<RequestOptions, 'body'>
): Promise<ApiResponse<T>> => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  const headers: Record<string, string> = {
    ...options?.headers,
  }

  if (options?.requireAuth !== false) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, options?.timeout || UPLOAD_TIMEOUT)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await response.json()

    return data
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '文件上传失败',
    }
  }
}
