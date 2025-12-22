/**
 * 运动相关 API 模块
 * 提供运动路线、统计数据等功能
 */

import { get, post } from '../request'
import { API_ENDPOINTS } from '../config'

// 运动路线数据接口
export interface RouteData {
  routeId: string
  distance: string
  duration: number
  calories: number
  navigationUrl: string
  routeSuggestion?: any
  routeDetails?: any
}

/**
 * 获取运动路线详情
 * 用于 ExercisePlanModal 组件
 */
export const getRouteDetails = async (routeId: string) => {
  try {
    const response = await get<RouteData>(`${API_ENDPOINTS.ROUTE.BASE}/${routeId}`)
    
    return response
  } catch (error) {
    throw error
  }
}



