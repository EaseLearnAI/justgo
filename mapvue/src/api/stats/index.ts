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
  try {
    const response = await get<DailySummaryData>(API_ENDPOINTS.STATS.DAILY_SUMMARY)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 获取用户累计统计
 * 用于 StatsCard 组件
 */
export const getUserStats = async () => {
  try {
    const response = await get<UserStatsData>(API_ENDPOINTS.STATS.USER_STATS)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 获取目标完成进度
 */
export const getGoalProgress = async () => {
  try {
    const response = await get<GoalProgressData>(API_ENDPOINTS.STATS.GOAL_PROGRESS)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 更新用户活动水平
 */
export const setActivityLevel = async (activityLevel: string) => {
  try {
    const response = await put<{
      activityLevel: string
      activityLabel: string
      bmr: number
      baseMetabolism: number
      tdee: number
    }>(API_ENDPOINTS.STATS.ACTIVITY_LEVEL, { activityLevel })

    return response
  } catch (error) {
    throw error
  }
}
