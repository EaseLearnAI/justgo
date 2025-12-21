/**
 * 用户资料相关 API
 * 包括个人信息、身体数据、目标设置等功能
 */

import { get, put, post } from '../request'
import { API_ENDPOINTS } from '../config'

// 用户身体数据接口
export interface BodyStats {
  height: number
  weight: number
  age: number
  gender: 'male' | 'female'
}

// 目标导向类型
export type GoalOrientation = 'lose' | 'maintain' | 'gain'

// 活动水平类型
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

// 用户资料接口
export interface UserProfile {
  id: string
  phone: string
  name: string
  avatar: string
  bodyStats: BodyStats
  goalOrientation: GoalOrientation
  activityLevel: ActivityLevel
  streakDays: number
  lastCheckIn?: string
  createdAt?: string
}

// 更新个人信息请求
export interface UpdateProfileRequest {
  name?: string
  avatar?: string
}

// 更新身体数据请求
export interface UpdateBodyStatsRequest {
  height?: number
  weight?: number
  age?: number
  gender?: 'male' | 'female'
}

/**
 * 获取用户资料
 */
export const getUserProfile = async () => {
  console.log('===================================')
  console.log('👤 开始获取用户资料')
  console.log('===================================')

  const response = await get<{ user: UserProfile }>(API_ENDPOINTS.USER.PROFILE)

  if (response.success && response.data) {
    console.log('✅ 获取用户资料成功')
    console.log('👤 用户信息:', response.data.user)
  } else {
    console.error('❌ 获取用户资料失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 获取用户资料流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新用户基本信息（昵称、头像）
 */
export const updateProfile = async (data: UpdateProfileRequest) => {
  console.log('===================================')
  console.log('✏️ 开始更新用户基本信息')
  console.log('===================================')
  console.log('📝 更新数据:', data)

  const response = await put<{ user: UserProfile }>(API_ENDPOINTS.USER.PROFILE, data)

  if (response.success && response.data) {
    console.log('✅ 用户信息更新成功')
    console.log('👤 最新用户信息:', response.data.user)
    
    // 更新本地存储
    if (data.name) {
      localStorage.setItem('userName', data.name)
      console.log('💾 已更新本地存储的用户名:', data.name)
    }
  } else {
    console.error('❌ 用户信息更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新用户信息流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新身体数据
 */
export const updateBodyStats = async (data: UpdateBodyStatsRequest) => {
  console.log('===================================')
  console.log('📊 开始更新身体数据')
  console.log('===================================')
  console.log('📝 更新数据:', data)

  const response = await put<{ bodyStats: BodyStats; bmr: number }>(
    API_ENDPOINTS.USER.BODY_STATS,
    data
  )

  if (response.success && response.data) {
    console.log('✅ 身体数据更新成功')
    console.log('📊 最新身体数据:', response.data.bodyStats)
    console.log('🔥 基础代谢率 (BMR):', response.data.bmr, 'kcal')
  } else {
    console.error('❌ 身体数据更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新身体数据流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新目标导向
 */
export const updateGoalOrientation = async (goalOrientation: GoalOrientation) => {
  console.log('===================================')
  console.log('🎯 开始更新目标导向')
  console.log('===================================')
  console.log('📝 新目标导向:', goalOrientation)

  const response = await put<{ goalOrientation: GoalOrientation }>(
    API_ENDPOINTS.USER.GOAL_ORIENTATION,
    { goalOrientation }
  )

  if (response.success && response.data) {
    console.log('✅ 目标导向更新成功')
    console.log('🎯 最新目标导向:', response.data.goalOrientation)
  } else {
    console.error('❌ 目标导向更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新目标导向流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新活动水平
 */
export const updateActivityLevel = async (activityLevel: ActivityLevel) => {
  console.log('===================================')
  console.log('🏋️ 开始更新活动水平')
  console.log('===================================')
  console.log('📝 新活动水平:', activityLevel)

  const response = await put<{ activityLevel: ActivityLevel }>(
    API_ENDPOINTS.USER.ACTIVITY_LEVEL,
    { activityLevel }
  )

  if (response.success && response.data) {
    console.log('✅ 活动水平更新成功')
    console.log('🏋️ 最新活动水平:', response.data.activityLevel)
  } else {
    console.error('❌ 活动水平更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新活动水平流程结束')
  console.log('===================================')

  return response
}
