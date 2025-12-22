/**
 * 认证相关 API
 * 包括用户注册、登录等功能
 */

import { post } from './request'
import { API_ENDPOINTS, USER_KEY } from './config'
import { setToken } from './request'

// 用户信息接口
export interface User {
  id: string
  phone: string
  name: string
  avatar: string
  bodyStats: {
    height: number
    weight: number
    age: number
    gender: 'male' | 'female'
  }
  goals: {
    dailyCalorie: number
    dailyExercise: number
    weeklyDays: number
  }
  streakDays: number
}

// 注册请求参数
export interface RegisterRequest {
  phone: string
  password: string
}

// 登录请求参数
export interface LoginRequest {
  phone: string
  password: string
}

// 认证响应数据
export interface AuthResponse {
  token: string
  user: User
}

/**
 * 用户注册
 * @param data 注册信息
 */
export const register = async (data: RegisterRequest) => {
  const response = await post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data, {
    requireAuth: false,
  })

  if (response.success && response.data) {
    setToken(response.data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user))
  }

  return response
}

/**
 * 用户登录
 * @param data 登录信息
 */
export const login = async (data: LoginRequest) => {
  const response = await post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, data, {
    requireAuth: false,
  })

  if (response.success && response.data) {
    setToken(response.data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user))
    localStorage.setItem('userName', response.data.user.name)
    localStorage.setItem('userPhone', response.data.user.phone)
  }

  return response
}

/**
 * 用户登出
 */
export const logout = () => {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('userName')
  localStorage.removeItem('userPhone')
  localStorage.removeItem('token')
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch (error) {
      return null
    }
  }
  return null
}

/**
 * 检查是否已登录
 */
export const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem(USER_KEY)
  return !!(token && user)
}
