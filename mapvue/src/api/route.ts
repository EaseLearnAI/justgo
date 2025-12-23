/**
 * 路由相关 API
 * 包括个性化路径生成等功能
 */

import { post } from './request'
import { API_ENDPOINTS } from './config'

// 路由偏好接口
export interface RoutePreferences {
  preferredPostExerciseState: 'relaxed' | 'moderate' | 'intense'
  routeStyle?: string[]
  mood?: string
  sportType?: 'walk' | 'run' | 'bike'  // 运动类型
}

// 路径建议接口
export interface RouteSuggestion {
  distance_km: number
  duration_min: number
  sportType: string
  intensity: string
  description: string
}

// 路径详情接口
export interface RouteDetails {
  direction: string
  landmarks: string[]
  terrain: string
  difficulty: string
  distance: string
  duration: string
}

// 导航信息接口
export interface NavigationInfo {
  distance_km: number
  duration_min: number
  routeDetails: RouteDetails
}

// 路由响应接口
export interface RouteResponse {
  routeId?: string  // 路线ID
  thinkingProcess: string
  routeSuggestion: RouteSuggestion & {
    estimated_calories?: number  // 估算的热量消耗
  }
  routeDetails: RouteDetails
  motivationalMessage: string
  safetyTips: string[]
  navigation: NavigationInfo
  navigationUrl?: string  // 高德导航链接
  nearbyPOIs?: any[]
  locationInfo?: any
  selectedPOI?: any
}

// 位置信息接口
export interface LocationInfo {
  lat: number
  lng: number
  city?: string
}

// 生成个性化路径请求
export interface GenerateRouteRequest {
  preferences: RoutePreferences
  location?: LocationInfo  // 可选的位置信息
}

/**
 * 生成个性化运动路径
 * @param preferences 用户偏好
 * @param location 位置信息（可选，如果不提供会自动获取）
 */
export const generatePersonalizedRoute = async (
  preferences: RoutePreferences,
  location?: LocationInfo
) => {
  const requestBody: GenerateRouteRequest = {
    preferences
  }

  if (location) {
    requestBody.location = location
  }

  const response = await post<RouteResponse>(
    API_ENDPOINTS.ROUTE.GENERATE,
    requestBody
  )

  return response
}

/**
 * 开始运动（更新路线状态为started）
 */
export const startExercise = async (routeId: string) => {
  const response = await post<{ routeId: string; status: string; startedAt: string; estimatedCalories?: number; recordId?: string }>(
    `${API_ENDPOINTS.ROUTE.BASE}/${routeId}/start`,
    {}
  )
  
  return response
}

/**
 * 完成运动（更新路线状态为completed）
 */
export const completeExercise = async (
  routeId: string,
  actualData?: {
    actualDistance?: number
    actualDuration?: number
    actualCalories?: number
  }
) => {
  const response = await post<{
    routeId: string
    status: string
    completedAt: string
    actualDistance: number
    actualDuration: number
    actualCalories: number
  }>(
    `${API_ENDPOINTS.ROUTE.GENERATE}/${routeId}/complete`,
    actualData || {}
  )
  
  return response
}