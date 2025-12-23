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
  const response = await get<{ user: UserProfile }>(API_ENDPOINTS.USER.PROFILE)

  return response
}

/**
 * 更新用户基本信息（昵称、头像）
 */
export const updateProfile = async (data: UpdateProfileRequest) => {
  const response = await put<{ user: UserProfile }>(API_ENDPOINTS.USER.PROFILE, data)

  if (response.success && response.data) {
    if (data.name) {
      localStorage.setItem('userName', data.name)
    }
  }

  return response
}

/**
 * 更新身体数据
 */
export const updateBodyStats = async (data: UpdateBodyStatsRequest) => {
  const response = await put<{ bodyStats: BodyStats; bmr: number }>(
    API_ENDPOINTS.USER.BODY_STATS,
    data
  )

  return response
}

/**
 * 更新目标导向
 */
export const updateGoalOrientation = async (goalOrientation: GoalOrientation) => {
  const response = await put<{ goalOrientation: GoalOrientation }>(
    API_ENDPOINTS.USER.GOAL_ORIENTATION,
    { goalOrientation }
  )

  return response
}

/**
 * 更新活动水平
 */
export const updateActivityLevel = async (activityLevel: ActivityLevel) => {
  const response = await put<{ activityLevel: ActivityLevel }>(
    API_ENDPOINTS.USER.ACTIVITY_LEVEL,
    { activityLevel }
  )

  return response
}
