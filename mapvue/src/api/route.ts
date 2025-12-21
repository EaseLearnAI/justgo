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
  console.log('===================================')
  console.log('🗺️ 开始生成个性化运动路径')
  console.log('===================================')
  console.log('📝 用户偏好:', preferences)
  console.log('📍 位置信息:', location || '未提供，后端将自动获取')

  const requestBody: GenerateRouteRequest = {
    preferences
  }

  // 如果提供了位置信息，添加到请求中
  if (location) {
    requestBody.location = location
  }

  const response = await post<RouteResponse>(
    API_ENDPOINTS.ROUTE.GENERATE,
    requestBody
  )

  if (response.success && response.data) {
    console.log('✅ 个性化路径生成成功')
    console.log('📍 路径建议:')
    console.log('   距离:', response.data.routeSuggestion.distance_km, 'km')
    console.log('   时间:', response.data.routeSuggestion.duration_min, '分钟')
    console.log('   类型:', response.data.routeSuggestion.sportType)
    console.log('   强度:', response.data.routeSuggestion.intensity)
  } else {
    console.error('❌ 个性化路径生成失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 生成个性化路径流程结束')
  console.log('===================================')

  return response
}

/**
 * 开始运动（更新路线状态为started）
 */
export const startExercise = async (routeId: string) => {
  console.log('\n╔═══════════════════════════════════════════════════════╗')
  console.log('║                                                       ║')
  console.log('║   🏃 开始运动                                         ║')
  console.log('║                                                       ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('📝 路线ID:', routeId)
  console.log('-----------------------------------')
  console.log('🌐 发起 API 请求: POST /api/route/:routeId/start')
  console.log('-----------------------------------')
  
  const response = await post<{ routeId: string; status: string; startedAt: string; estimatedCalories?: number; recordId?: string }>(
    `${API_ENDPOINTS.ROUTE.BASE}/${routeId}/start`,
    {}
  )
  
  console.log('-----------------------------------')
  console.log('📥 收到后端响应')
  console.log('-----------------------------------')
  
  if (response.success) {
    console.log('✅ 运动已开始')
  } else {
    console.error('❌ 开始运动失败:', response.message)
  }
  
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
  console.log('✅ 完成运动，路线ID:', routeId)
  console.log('📊 实际数据:', actualData)
  
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
  
  if (response.success) {
    console.log('✅ 运动已完成并保存')
  } else {
    console.error('❌ 完成运动失败:', response.message)
  }
  
  return response
}