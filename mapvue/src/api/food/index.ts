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
  console.log('===================================')
  console.log('🍽️ 开始分析食物热量')
  console.log('===================================')
  console.log('📝 用户输入:', text)
  console.log('💾 自动保存:', autoSave ? '是' : '否')

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: POST /ai/analyze-food')
    console.log('📤 请求数据:', JSON.stringify({ text, autoSave }, null, 2))
    console.log('-----------------------------------')

    const response = await post<AnalyzeFoodResponse>('/ai/analyze-food', {
      text,
      autoSave
    })

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 食物热量分析成功!')
      console.log('📊 分析结果:')
      console.log('   - 食物列表:', JSON.stringify(response.data.analysis.foods, null, 2))
      console.log('   - 总热量:', response.data.totalCalories, 'kcal')
      console.log('   - 营养建议:', response.data.summary)
      
      if (response.data.savedRecords && response.data.savedRecords.length > 0) {
        console.log('💾 已保存记录:')
        response.data.savedRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.name} - ${record.calories} kcal`)
        })
      }
    } else {
      console.error('❌ 食物热量分析失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 食物热量分析流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 食物热量分析异常:', error)
    console.log('===================================')
    console.log('🏁 食物热量分析流程结束 (异常)')
    console.log('===================================')
    throw error
  }
}

/**
 * 仅预览分析结果，不保存
 * @param text - 用户输入的食物描述
 */
export const previewFoodAnalysis = async (text: string) => {
  console.log('===================================')
  console.log('🔍 开始预览食物热量分析')
  console.log('===================================')
  console.log('📝 用户输入:', text)

  try {
    console.log('-----------------------------------')
    console.log('🌐 发起 API 请求: POST /ai/analyze-only')
    console.log('📤 请求数据:', JSON.stringify({ text, type: 'food' }, null, 2))
    console.log('-----------------------------------')

    const response = await post<{ analysis: FoodAnalysisResult; saved: boolean }>('/ai/analyze-only', {
      text,
      type: 'food'
    })

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 预览分析成功!')
      console.log('📊 分析结果:', JSON.stringify(response.data.analysis, null, 2))
      console.log('💾 已保存:', response.data.saved ? '是' : '否')
    } else {
      console.error('❌ 预览分析失败:', response.message)
    }

    console.log('===================================')
    console.log('🏁 预览分析流程结束')
    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 预览分析异常:', error)
    throw error
  }
}

/**
 * 获取今日食物记录
 */
export const getTodayRecords = async () => {
  console.log('===================================')
  console.log('📋 获取今日食物记录')
  console.log('===================================')

  try {
    console.log('🌐 发起 API 请求: GET /records/today')

    const response = await get<{ records: SavedFoodRecord[] }>('/records/today')

    if (response.success && response.data) {
      console.log('✅ 获取成功!')
      console.log('📊 今日记录数:', response.data.records.length)
    } else {
      console.error('❌ 获取失败:', response.message)
    }

    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取今日记录异常:', error)
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
  console.log('===================================')
  console.log('📅 获取指定日期食物记录')
  console.log('===================================')
  console.log('📆 查询日期:', date)

  try {
    console.log(`🌐 发起 API 请求: GET /records/by-date?date=${date}`)

    const response = await get<RecordsByDateResponse>(`/records/by-date?date=${date}`)

    if (response.success && response.data) {
      console.log('✅ 获取成功!')
      console.log('📊 记录数:', response.data.records.length)
      console.log('📊 统计:', response.data.stats)
    } else {
      console.error('❌ 获取失败:', response.message)
    }

    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取指定日期记录异常:', error)
    throw error
  }
}

/**
 * 根据日期获取统计数据
 * @param date - 日期字符串 (YYYY-MM-DD 格式)
 */
export const getStatsByDate = async (date: string) => {
  console.log('===================================')
  console.log('📊 获取指定日期统计数据')
  console.log('===================================')
  console.log('📆 查询日期:', date)

  try {
    console.log(`🌐 发起 API 请求: GET /records/by-date/stats?date=${date}`)

    const response = await get<{
      date: string
      intake: number
      consume: number
      base: number
      net: number
      recordCount: number
    }>(`/records/by-date/stats?date=${date}`)

    if (response.success && response.data) {
      console.log('✅ 获取成功!')
      console.log('📈 摄入:', response.data.intake, 'kcal')
      console.log('📉 消耗:', response.data.consume, 'kcal')
    } else {
      console.error('❌ 获取失败:', response.message)
    }

    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取指定日期统计异常:', error)
    throw error
  }
}

/**
 * 获取今日热量统计
 */
export const getTodayStats = async () => {
  console.log('===================================')
  console.log('📊 获取今日热量统计')
  console.log('===================================')

  try {
    console.log('🌐 发起 API 请求: GET /records/today/stats')

    const response = await get<{
      intake: number
      consume: number
      base: number
      net: number
      recordCount: number
    }>('/records/today/stats')

    if (response.success && response.data) {
      console.log('✅ 获取成功!')
      console.log('📈 今日摄入:', response.data.intake, 'kcal')
      console.log('📉 今日消耗:', response.data.consume, 'kcal')
      console.log('🔥 基础代谢:', response.data.base, 'kcal')
      console.log('📊 净摄入:', response.data.net, 'kcal')
    } else {
      console.error('❌ 获取失败:', response.message)
    }

    console.log('===================================')

    return response
  } catch (error) {
    console.error('❌ 获取今日统计异常:', error)
    throw error
  }
}
