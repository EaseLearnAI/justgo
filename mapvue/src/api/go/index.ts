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
  console.log('\n╔═══════════════════════════════════════════════════════╗')
  console.log('║                                                       ║')
  console.log('║   🗺️ 开始获取运动路线详情                             ║')
  console.log('║                                                       ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('📝 路线ID:', routeId)
  
  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: GET /api/route/:routeId')
    console.log('-----------------------------------')
    
    const response = await get<RouteData>(`${API_ENDPOINTS.ROUTE.BASE}/${routeId}`)
    
    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')
    
    if (response.success && response.data) {
      console.log('✅ 获取路线详情成功!')
      console.log('📊 路线数据:')
      console.log(`   📏 距离: ${response.data.distance} km`)
      console.log(`   ⏱️ 时长: ${response.data.duration} 分钟`)
      console.log(`   🔥 消耗: ${response.data.calories} kcal`)
      console.log(`   🔗 导航链接: ${response.data.navigationUrl ? '已设置' : '未设置'}`)
    } else {
      console.error('❌ 获取路线详情失败:', response.message)
    }
    
    console.log('===================================')
    console.log('🏁 获取路线详情流程结束')
    console.log('===================================\n')
    
    return response
  } catch (error) {
    console.error('❌ 获取路线详情异常:', error)
    console.log('===================================')
    console.log('🏁 获取路线详情流程结束 (异常)')
    console.log('===================================\n')
    throw error
  }
}



