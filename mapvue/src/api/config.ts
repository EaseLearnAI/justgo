/**
 * API 配置文件
 * 包含基础 URL 和其他全局配置
 */

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// API 端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
  },
  // 用户相关
  USER: {
    PROFILE: '/user/profile',
    BODY_STATS: '/user/body-stats',
    GOALS: '/user/goals',
    GOAL_ORIENTATION: '/user/goal-orientation',
    ACTIVITY_LEVEL: '/user/activity-level',
    CHECK_IN: '/user/check-in',
    BMR: '/user/bmr',
  },
  // 记录相关
  RECORDS: {
    LIST: '/records',
    TODAY: '/records/today',
    TODAY_STATS: '/records/today/stats',
    CREATE: '/records',
    UPDATE: (id: string) => `/records/${id}`,
    DELETE: (id: string) => `/records/${id}`,
  },
  // 统计相关
  STATS: {
    DAILY_SUMMARY: '/stats/daily-summary',
    USER_STATS: '/stats/user-stats',
    GOAL_PROGRESS: '/stats/goal-progress',
    ACTIVITY_LEVEL: '/stats/activity-level',
  },
  // 路由相关
  ROUTE: {
    BASE: '/route',
    GENERATE: '/route/generate',
    START: (routeId: string) => `/route/${routeId}/start`,
    COMPLETE: (routeId: string) => `/route/${routeId}/complete`,
    HEALTH: '/route/health',
  },
  // 健康检查
  HEALTH: '/health',
}

// HTTP 方法
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const

// 请求超时时间（毫秒）
export const REQUEST_TIMEOUT = 10000

// 上传请求超时时间（毫秒）- AI 分析需要更长时间
export const UPLOAD_TIMEOUT = 60000

// Token 存储 key
export const TOKEN_KEY = 'token'
export const USER_KEY = 'user'
