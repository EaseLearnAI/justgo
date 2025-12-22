/**
 * 食物热量分析 API 模块
 * 基于后端 AI 服务进行智能热量分析
 */

import { get, post } from '../request'
import { API_ENDPOINTS } from '../config'

// 食物分析结果接口
export interface FoodItem {
  name: string
  quantity: string
  // 三值热量数据
  calorie_min: number
  calorie_estimated: number
  calorie_max: number
  // 兼容旧版本
  calories?: number
  unit: string
}

// 总热量接口
export interface TotalCalories {
  min: number
  estimated: number
  max: number
}

// AI 分析响应接口
export interface FoodAnalysisResult {
  success: boolean
  foods?: FoodItem[]
  totalCalories?: TotalCalories | number
  summary?: string
  scientificNote?: string
  error?: string
}

// 保存的记录接口
export interface SavedFoodRecord {
  _id: string
  name: string
  type: 'intake' | 'consume'
  calories: number
  calorieMin?: number
  calorieMax?: number
  quantity?: string
  unit?: string
  time: string
}

// 分析食物响应接口
export interface AnalyzeFoodResponse {
  analysis: FoodAnalysisResult
  savedRecords: SavedFoodRecord[]
  totalCalories: TotalCalories
  summary: string
  scientificNote?: string
}

/**
 * 分析食物热量并自动保存
 * @param text - 用户输入的食物描述
 * @param autoSave - 是否自动保存，默认 true
 */
export const analyzeFood = async (text: string, autoSave: boolean = true) => {
  try {
    const response = await post<AnalyzeFoodResponse>('/ai/analyze-food', {
      text,
      autoSave
    })

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 仅预览分析结果，不保存
 * @param text - 用户输入的食物描述
 */
export const previewFoodAnalysis = async (text: string) => {
  try {
    const response = await post<{ analysis: FoodAnalysisResult; saved: boolean }>('/ai/analyze-only', {
      text,
      type: 'food'
    })

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 获取今日食物记录
 */
export const getTodayRecords = async () => {
  try {
    const response = await get<{ records: SavedFoodRecord[] }>('/records/today')

    return response
  } catch (error) {
    throw error
  }
}

// 按日期获取记录的响应接口
export interface RecordsByDateResponse {
  records: SavedFoodRecord[]
  date: string
  stats: {
    intake: number
    consume: number
    net: number
    recordCount: number
  }
}

/**
 * 根据日期获取食物记录
 * @param date - 日期字符串 (YYYY-MM-DD 格式)
 */
export const getRecordsByDate = async (date: string) => {
  try {
    const response = await get<RecordsByDateResponse>(`/records/by-date?date=${date}`)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 根据日期获取统计数据
 * @param date - 日期字符串 (YYYY-MM-DD 格式)
 */
export const getStatsByDate = async (date: string) => {
  try {
    const response = await get<{
      date: string
      intake: number
      consume: number
      base: number
      net: number
      recordCount: number
    }>(`/records/by-date/stats?date=${date}`)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 获取今日热量统计
 */
export const getTodayStats = async () => {
  try {
    const response = await get<{
      intake: number
      consume: number
      base: number
      net: number
      recordCount: number
    }>('/records/today/stats')

    return response
  } catch (error) {
    throw error
  }
}
