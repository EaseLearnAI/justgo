/**
 * 用户统计 API 模块
 * 提供热量统计、累计数据、目标进度等功能
 */

import { get, put } from '../request'
import { API_ENDPOINTS } from '../config'

// 今日热量摘要接口
export interface DailySummaryData {
  netCalories: number
  intake: number
  exercise: number
  baseMetabolism: number
  bmr: number
  tdee: number
  dailyCalorieGoal: number
  intakeProgress: number
  activityLevel: string
  activityLabel: string
  recordCount: number
}

// 用户累计统计接口
export interface UserStatsData {
  streakDays: number
  totalCaloriesBurned: number
  totalExerciseMinutes: number
  totalDistance: number
  formattedCalories: string
  formattedDistance: string
}

// 目标进度接口
export interface GoalProgressData {
  calorie: {
    goal: number
    current: number
    progress: number
    tdee?: number
    bmr?: number
  }
  exercise: {
    goal: number
    current: number
    progress: number
  }
  overall?: {
    progress: number
  }
  goalOrientation: string
  details?: {
    intake: number
    exerciseFromRecords: number
    exerciseFromRoutes: number
    totalExercise: number
    baseMetabolism: number
  }
}

/**
 * 获取今日热量摘要
 * 用于 DailySummaryCard 组件
 */
export const getDailySummary = async () => {
  console.log('===================================')
  console.log('📊 开始获取今日热量摘要')
  console.log('===================================')

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: GET /stats/daily-summary')
    console.log('-----------------------------------')

    const response = await get<DailySummaryData>(API_ENDPOINTS.STATS.DAILY_SUMMARY)

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 获取今日热量摘要成功!')
      console.log('📊 数据详情:')
      console.log(`   📥 今日摄入: ${response.data.intake} kcal`)
      console.log(`   🏃 今日运动: ${response.data.exercise} kcal`)
      console.log(`   🔋 基础代谢估算: ${response.data.baseMetabolism} kcal`)
      console.log(`   📈 今日净热量: ${response.data.netCalories} kcal`)
      console.log(`   🔥 BMR: ${response.data.bmr} kcal`)
      console.log(`   📊 TDEE: ${response.data.tdee} kcal`)
      console.log(`   🎯 目标进度: ${response.data.intakeProgress}%`)
      console.log(`   🏃 活动水平: ${response.data.activityLabel}`)
    } else {
      console.error('❌ 获取今日热量摘要失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 获取今日热量摘要流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取今日热量摘要异常:', error)
    console.log('===================================')
    console.log('🏁 获取今日热量摘要流程结束 (异常)')
    console.log('===================================')
    throw error
  }
}

/**
 * 获取用户累计统计
 * 用于 StatsCard 组件
 */
export const getUserStats = async () => {
  console.log('===================================')
  console.log('📋 开始获取用户累计统计')
  console.log('===================================')

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: GET /stats/user-stats')
    console.log('-----------------------------------')

    const response = await get<UserStatsData>(API_ENDPOINTS.STATS.USER_STATS)

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 获取用户累计统计成功!')
      console.log('📊 数据详情:')
      console.log(`   📅 打卡天数: ${response.data.streakDays} 天`)
      console.log(`   🔥 累计消耗: ${response.data.formattedCalories} kcal`)
      console.log(`   ⏱️ 运动时长: ${response.data.totalExerciseMinutes} 分钟`)
      console.log(`   📍 运动距离: ${response.data.formattedDistance} 公里`)
    } else {
      console.error('❌ 获取用户累计统计失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 获取用户累计统计流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取用户累计统计异常:', error)
    console.log('===================================')
    console.log('🏁 获取用户累计统计流程结束 (异常)')
    console.log('===================================')
    throw error
  }
}

/**
 * 获取目标完成进度
 */
export const getGoalProgress = async () => {
  console.log('===================================')
  console.log('🎯 开始获取目标完成进度')
  console.log('===================================')

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: GET /stats/goal-progress')
    console.log('-----------------------------------')

    const response = await get<GoalProgressData>(API_ENDPOINTS.STATS.GOAL_PROGRESS)

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 获取目标进度成功!')
      console.log('📊 数据详情:')
      console.log(`   🍽️ 热量目标: ${response.data.calorie.goal} kcal, 当前: ${response.data.calorie.current} kcal (${response.data.calorie.progress}%)`)
      console.log(`   🏃 运动目标: ${response.data.exercise.goal} 分钟, 当前: ${response.data.exercise.current} 分钟 (${response.data.exercise.progress}%)`)
      console.log(`   🎯 目标取向: ${response.data.goalOrientation}`)
    } else {
      console.error('❌ 获取目标进度失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 获取目标进度流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取目标进度异常:', error)
    console.log('===================================')
    console.log('🏁 获取目标进度流程结束 (异常)')
    console.log('===================================')
    throw error
  }
}

/**
 * 更新用户活动水平
 */
export const setActivityLevel = async (activityLevel: string) => {
  console.log('===================================')
  console.log('🏃 开始更新活动水平')
  console.log('===================================')
  console.log('📝 新活动水平:', activityLevel)

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: PUT /stats/activity-level')
    console.log('📤 请求数据:', JSON.stringify({ activityLevel }, null, 2))
    console.log('-----------------------------------')

    const response = await put<{
      activityLevel: string
      activityLabel: string
      bmr: number
      baseMetabolism: number
      tdee: number
    }>(API_ENDPOINTS.STATS.ACTIVITY_LEVEL, { activityLevel })

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 活动水平更新成功!')
      console.log('📊 更新后的数据:')
      console.log(`   🏃 活动水平: ${response.data.activityLabel}`)
      console.log(`   🔥 BMR: ${response.data.bmr} kcal`)
      console.log(`   🔋 基础代谢估算: ${response.data.baseMetabolism} kcal`)
      console.log(`   📈 TDEE: ${response.data.tdee} kcal`)
    } else {
      console.error('❌ 活动水平更新失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 更新活动水平流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 更新活动水平异常:', error)
    console.log('===================================')
    console.log('🏁 更新活动水平流程结束 (异常)')
    console.log('===================================')
    throw error
  }
}
