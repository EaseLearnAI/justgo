/**
 * 用户资料相关 API
 * 包括个人信息、身体数据、目标设置等功能
 */

import { get, put, post, upload } from './request'
import { API_ENDPOINTS } from './config'

// 用户身体数据接口
export interface BodyStats {
  height: number
  weight: number
  age: number
  gender: 'male' | 'female'
}

// 用户目标设置接口
export interface Goals {
  dailyCalorie: number
  dailyExercise: number
  weeklyDays: number
}

// 目标导向类型
export type GoalOrientation = 'lose' | 'maintain' | 'gain'

// 活动水平类型
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

// 运动感受类型
export type ExerciseFeeling = 'relaxed' | 'moderate' | 'intense'

// 运动后状态类型
export type PostExerciseState = 'relaxed' | 'moderate' | 'intense'

// 用户资料接口
export interface UserProfile {
  id: string
  phone: string
  name: string
  avatar: string
  bodyStats: BodyStats
  goals: Goals
  goalOrientation: GoalOrientation
  activityLevel: ActivityLevel
  exerciseFeeling: ExerciseFeeling
  preferredPostExerciseState: PostExerciseState
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

// 更新目标设置请求
export interface UpdateGoalsRequest {
  dailyCalorie?: number
  dailyExercise?: number
  weeklyDays?: number
  goalOrientation?: GoalOrientation
}

// 更新活动水平请求
export interface UpdateActivityLevelRequest {
  activityLevel: ActivityLevel
}

// 更新运动感受请求
export interface UpdateExerciseFeelingRequest {
  exerciseFeeling: ExerciseFeeling
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
 * 更新目标设置（包括目标导向）
 */
export const updateGoals = async (data: UpdateGoalsRequest) => {
  const response = await put<{ goals: Goals; goalOrientation: GoalOrientation }>(API_ENDPOINTS.USER.GOALS, data)

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
 * 更新日常活动水平
 */
export const updateActivityLevel = async (activityLevel: ActivityLevel) => {
  const response = await put<{ activityLevel: ActivityLevel }>(
    API_ENDPOINTS.USER.ACTIVITY_LEVEL,
    { activityLevel }
  )

  return response
}

/**
 * 用户签到
 */
export const checkIn = async () => {
  const response = await post<{ streakDays: number }>(API_ENDPOINTS.USER.CHECK_IN)

  return response
}

/**
 * 获取基础代谢率
 */
export const getBMR = async () => {
  const response = await get<{ bmr: number; bodyStats: BodyStats }>(API_ENDPOINTS.USER.BMR)

  return response
}

/**
 * 获取用户运动强度偏好
 */
export const getExerciseIntensity = async () => {
  const response = await get<{ exerciseIntensityPreference: string }>(
    '/user/exercise-intensity'
  )

  return response
}

/**
 * 获取用户运动后状态偏好
 */
export const getPostExerciseState = async () => {
  const response = await get<{ preferredPostExerciseState: string }>(
    '/user/post-exercise-state'
  )

  return response
}

/**
 * 更新运动感受偏好
 */
export const updateExerciseFeeling = async (exerciseFeeling: ExerciseFeeling) => {
  const response = await put<{ exerciseFeeling: ExerciseFeeling }>(
    '/user/exercise-feeling',
    { exerciseFeeling }
  )

  return response
}

/**
 * 更新用户运动后状态偏好
 */
export const updatePostExerciseState = async (preferredPostExerciseState: PostExerciseState) => {
  const response = await put<{ preferredPostExerciseState: PostExerciseState }>(
    '/user/post-exercise-state',
    { preferredPostExerciseState }
  )

  return response
}

/**
 * 上传用户头像
 * @param file - 图片文件
 */
export const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await upload<{ avatar: string; user: { id: string; name: string; avatar: string } }>(
    '/user/avatar',
    formData
  )

  return response
}
