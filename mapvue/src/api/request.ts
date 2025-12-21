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
 * 打印请求日志
 */
const logRequest = (url: string, options: RequestOptions, fullUrl: string) => {
  console.group('🚀 发起 API 请求')
  console.log('📍 请求地址:', fullUrl)
  console.log('📝 请求方法:', options.method || 'GET')
  console.log('📋 请求头:', options.headers)
  if (options.body) {
    console.log('📦 请求体:', options.body)
  }
  console.log('⏰ 请求时间:', new Date().toLocaleString('zh-CN'))
  console.groupEnd()
}

/**
 * 打印响应日志
 */
const logResponse = (url: string, response: any, duration: number, success: boolean) => {
  const emoji = success ? '✅' : '❌'
  console.group(`${emoji} API 响应 ${success ? '成功' : '失败'}`)
  console.log('📍 请求地址:', url)
  console.log('⏱️ 响应时间:', `${duration}ms`)
  console.log('📊 响应状态:', success ? 'SUCCESS' : 'FAILED')
  console.log('📦 响应数据:', response)
  console.log('⏰ 响应时间:', new Date().toLocaleString('zh-CN'))
  console.groupEnd()
}

/**
 * 打印错误日志
 */
const logError = (url: string, error: any, duration: number) => {
  console.group('❌ API 请求错误')
  console.log('📍 请求地址:', url)
  console.log('⏱️ 耗时:', `${duration}ms`)
  console.error('🔥 错误信息:', error)
  console.log('⏰ 错误时间:', new Date().toLocaleString('zh-CN'))
  console.groupEnd()
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

  // 打印请求日志
  logRequest(url, options, fullUrl)

  try {
    // 创建超时控制
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, options.timeout || REQUEST_TIMEOUT)

    // 发起请求
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // 解析响应
    const data = await response.json()
    const duration = Date.now() - startTime

    // 打印响应日志
    logResponse(fullUrl, data, duration, data.success)

    // 返回响应数据
    return data
  } catch (error: any) {
    const duration = Date.now() - startTime

    // 打印错误日志
    logError(fullUrl, error, duration)

    // 返回错误响应
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
  const startTime = Date.now()

  // 构建完整 URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  // 构建请求头（不设置 Content-Type，让浏览器自动处理）
  const headers: Record<string, string> = {
    ...options?.headers,
  }

  // 如果需要认证，添加 Token
  if (options?.requireAuth !== false) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  console.group('📤 发起文件上传请求')
  console.log('📍 请求地址:', fullUrl)
  console.log('📝 请求方法: POST')
  console.log('📋 请求类型: multipart/form-data')
  console.log('⏰ 请求时间:', new Date().toLocaleString('zh-CN'))
  console.groupEnd()

  try {
    // 创建超时控制
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, options?.timeout || UPLOAD_TIMEOUT)

    // 发起请求
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // 解析响应
    const data = await response.json()
    const duration = Date.now() - startTime

    // 打印响应日志
    logResponse(fullUrl, data, duration, data.success)

    return data
  } catch (error: any) {
    const duration = Date.now() - startTime

    // 打印错误日志
    logError(fullUrl, error, duration)

    return {
      success: false,
      message: error.message || '文件上传失败',
    }
  }
}
