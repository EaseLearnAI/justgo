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
 * 更新目标设置（包括目标导向）
 */
export const updateGoals = async (data: UpdateGoalsRequest) => {
  console.log('===================================')
  console.log('🎯 开始更新目标设置')
  console.log('===================================')
  console.log('📝 更新数据:', data)

  const response = await put<{ goals: Goals; goalOrientation: GoalOrientation }>(API_ENDPOINTS.USER.GOALS, data)

  if (response.success && response.data) {
    console.log('✅ 目标设置更新成功')
    console.log('🎯 最新目标设置:', response.data.goals)
    if (response.data.goalOrientation) {
      console.log('🎯 目标导向:', response.data.goalOrientation)
    }
  } else {
    console.error('❌ 目标设置更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新目标设置流程结束')
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
 * 更新日常活动水平
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

/**
 * 用户签到
 */
export const checkIn = async () => {
  console.log('===================================')
  console.log('📅 开始签到')
  console.log('===================================')

  const response = await post<{ streakDays: number }>(API_ENDPOINTS.USER.CHECK_IN)

  if (response.success && response.data) {
    console.log('✅ 签到成功')
    console.log('🔥 连续打卡天数:', response.data.streakDays, '天')
  } else {
    console.error('❌ 签到失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 签到流程结束')
  console.log('===================================')

  return response
}

/**
 * 获取基础代谢率
 */
export const getBMR = async () => {
  console.log('===================================')
  console.log('🔥 开始获取基础代谢率')
  console.log('===================================')

  const response = await get<{ bmr: number; bodyStats: BodyStats }>(API_ENDPOINTS.USER.BMR)

  if (response.success && response.data) {
    console.log('✅ 获取基础代谢率成功')
    console.log('🔥 基础代谢率 (BMR):', response.data.bmr, 'kcal')
    console.log('📊 身体数据:', response.data.bodyStats)
  } else {
    console.error('❌ 获取基础代谢率失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 获取基础代谢率流程结束')
  console.log('===================================')

  return response
}

/**
 * 获取用户运动强度偏好
 */
export const getExerciseIntensity = async () => {
  console.log('===================================')
  console.log('💪 开始获取用户运动强度偏好')
  console.log('===================================')

  const response = await get<{ exerciseIntensityPreference: string }>(
    '/user/exercise-intensity'
  )

  if (response.success && response.data) {
    console.log('✅ 获取运动强度偏好成功')
    console.log('💪 用户运动强度偏好:', response.data.exerciseIntensityPreference)
  } else {
    console.error('❌ 获取运动强度偏好失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 获取运动强度偏好流程结束')
  console.log('===================================')

  return response
}

/**
 * 获取用户运动后状态偏好
 */
export const getPostExerciseState = async () => {
  console.log('===================================')
  console.log('🧘 开始获取用户运动后状态偏好')
  console.log('===================================')

  const response = await get<{ preferredPostExerciseState: string }>(
    '/user/post-exercise-state'
  )

  if (response.success && response.data) {
    console.log('✅ 获取运动后状态偏好成功')
    console.log('🧘 用户运动后状态偏好:', response.data.preferredPostExerciseState)
  } else {
    console.error('❌ 获取运动后状态偏好失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 获取运动后状态偏好流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新运动感受偏好
 */
export const updateExerciseFeeling = async (exerciseFeeling: ExerciseFeeling) => {
  console.log('===================================')
  console.log('😊 开始更新运动感受偏好')
  console.log('===================================')
  console.log('📝 新运动感受:', exerciseFeeling)

  const response = await put<{ exerciseFeeling: ExerciseFeeling }>(
    '/user/exercise-feeling',
    { exerciseFeeling }
  )

  if (response.success && response.data) {
    console.log('✅ 运动感受偏好更新成功')
    console.log('😊 最新运动感受:', response.data.exerciseFeeling)
  } else {
    console.error('❌ 运动感受偏好更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新运动感受偏好流程结束')
  console.log('===================================')

  return response
}

/**
 * 更新用户运动后状态偏好
 */
export const updatePostExerciseState = async (preferredPostExerciseState: PostExerciseState) => {
  console.log('===================================')
  console.log('🧘 开始更新用户运动后状态偏好')
  console.log('===================================')
  console.log('📝 新运动后状态:', preferredPostExerciseState)

  const response = await put<{ preferredPostExerciseState: PostExerciseState }>(
    '/user/post-exercise-state',
    { preferredPostExerciseState }
  )

  if (response.success && response.data) {
    console.log('✅ 运动后状态偏好更新成功')
    console.log('🧘 最新运动后状态:', response.data.preferredPostExerciseState)
  } else {
    console.error('❌ 运动后状态偏好更新失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 更新运动后状态偏好流程结束')
  console.log('===================================')

  return response
}

/**
 * 上传用户头像
 * @param file - 图片文件
 */
export const uploadAvatar = async (file: File) => {
  console.log('===================================')
  console.log('🖼️ 开始上传用户头像')
  console.log('===================================')
  console.log('📁 文件名:', file.name)
  console.log('📁 文件大小:', (file.size / 1024).toFixed(2), 'KB')
  console.log('📁 文件类型:', file.type)

  const formData = new FormData()
  formData.append('avatar', file)

  console.log('-----------------------------------')
  console.log('🌐 发起 API 请求: POST /user/avatar')
  console.log('-----------------------------------')

  const response = await upload<{ avatar: string; user: { id: string; name: string; avatar: string } }>(
    '/user/avatar',
    formData
  )

  if (response.success && response.data) {
    console.log('✅ 头像上传成功!')
    console.log('🔗 新头像 URL:', response.data.avatar)
  } else {
    console.error('❌ 头像上传失败:', response.message)
  }

  console.log('===================================')
  console.log('🏁 头像上传流程结束')
  console.log('===================================')

  return response
}
