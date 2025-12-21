/**
 * 视觉图片分析 API 模块
 * 基于后端视觉 AI 服务进行图片食物热量分析
 */

import { upload, post } from '../request'
import type { ApiResponse } from '../request'
import type { FoodItem, TotalCalories, SavedFoodRecord } from '../food'

// 视觉分析结果接口
export interface VisionAnalysisResult {
  success: boolean
  foods?: FoodItem[]
  totalCalories?: TotalCalories
  summary?: string
  scientificNote?: string
  imageDescription?: string
  error?: string
}

// 视觉分析响应接口
export interface VisionAnalyzeResponse {
  analysis: VisionAnalysisResult
  imageUrl: string
  savedRecords?: SavedFoodRecord[]
  totalCalories: number
  summary: string
  scientificNote?: string
}

// 上传图片响应接口
export interface UploadImageResponse {
  url: string
  objectName: string
}

/**
 * 图片食物热量分析（自动保存）
 * @param file - 图片文件
 * @param autoSave - 是否自动保存，默认 true
 */
export const analyzeImageFood = async (file: File, autoSave: boolean = true): Promise<ApiResponse<VisionAnalyzeResponse>> => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('                 📸 开始图片食物热量分析                 ')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('�� 图片信息:')
  console.log('   - 文件名:', file.name)
  console.log('   - 文件大小:', (file.size / 1024).toFixed(2), 'KB')
  console.log('   - 文件类型:', file.type)
  console.log('   - 自动保存:', autoSave ? '是' : '否')
  console.log('')

  try {
    // 创建 FormData
    const formData = new FormData()
    formData.append('image', file)
    formData.append('autoSave', autoSave.toString())

    console.log('---------------------------------------------------')
    console.log('🌐 发起 API 请求: POST /vision/analyze-food')
    console.log('📤 请求类型: multipart/form-data')
    console.log('---------------------------------------------------')
    console.log('')

    const response = await upload<VisionAnalyzeResponse>('/vision/analyze-food', formData)

    console.log('')
    console.log('---------------------------------------------------')
    console.log('📥 收到后端响应')
    console.log('---------------------------------------------------')
    console.log('')

    if (response.success && response.data) {
      console.log('✅ 图片食物热量分析成功!')
      console.log('')
      console.log('📊 分析结果:')
      
      if (response.data.analysis.foods && response.data.analysis.foods.length > 0) {
        console.log('🍽️ 识别的食物:')
        response.data.analysis.foods.forEach((food, index) => {
          console.log('   ' + (index + 1) + '. ' + food.name)
          console.log('      - 数量: ' + food.quantity)
          console.log('      - 热量: ≈ ' + (food.calorie_estimated || food.calories) + ' kcal')
          console.log('      - 范围: ' + food.calorie_min + ' - ' + food.calorie_max + ' kcal')
        })
      }
      
      if (response.data.analysis.totalCalories) {
        const tc = response.data.analysis.totalCalories
        console.log('')
        console.log('🔥 总热量:')
        console.log('   - 最小: ' + tc.min + ' kcal')
        console.log('   - 估算: ≈ ' + tc.estimated + ' kcal')
        console.log('   - 最大: ' + tc.max + ' kcal')
      }
      
      if (response.data.analysis.summary) {
        console.log('')
        console.log('💡 营养建议:', response.data.analysis.summary)
      }
      
      if (response.data.savedRecords && response.data.savedRecords.length > 0) {
        console.log('')
        console.log('💾 已保存记录:')
        response.data.savedRecords.forEach((record, index) => {
          console.log('   ' + (index + 1) + '. ' + record.name + ' - ' + record.calories + ' kcal')
        })
      }

      console.log('')
      console.log('��️ 图片 URL:', response.data.imageUrl)
    } else {
      console.error('❌ 图片食物热量分析失败:', response.message)
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('                 🏁 图片分析流程结束                    ')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    return response
  } catch (error) {
    console.error('❌ 图片食物热量分析异常:', error)
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('                 🏁 图片分析流程结束 (异常)              ')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    throw error
  }
}

/**
 * 图片分析预览（不保存）
 * @param file - 图片文件
 */
export const previewImageAnalysis = async (file: File): Promise<ApiResponse<{ analysis: VisionAnalysisResult; saved: boolean }>> => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('                 🔍 图片分析预览模式                     ')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('📋 图片信息:')
  console.log('   - 文件名:', file.name)
  console.log('   - 文件大小:', (file.size / 1024).toFixed(2), 'KB')
  console.log('   - 文件类型:', file.type)
  console.log('')

  try {
    const formData = new FormData()
    formData.append('image', file)

    console.log('---------------------------------------------------')
    console.log('🌐 发起 API 请求: POST /vision/analyze-only')
    console.log('📤 请求类型: multipart/form-data')
    console.log('---------------------------------------------------')
    console.log('')

    const response = await upload<{ analysis: VisionAnalysisResult; saved: boolean }>('/vision/analyze-only', formData)

    console.log('')
    console.log('---------------------------------------------------')
    console.log('📥 收到后端响应')
    console.log('---------------------------------------------------')
    console.log('')

    if (response.success && response.data) {
      console.log('✅ 预览分析成功!')
      console.log('📊 分析结果:', JSON.stringify(response.data.analysis, null, 2))
      console.log('💾 已保存:', response.data.saved ? '是' : '否')
    } else {
      console.error('❌ 预览分析失败:', response.message)
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('                 🏁 预览分析流程结束                    ')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    return response
  } catch (error) {
    console.error('❌ 预览分析异常:', error)
    throw error
  }
}

/**
 * 通过 URL 分析图片食物热量
 * @param imageUrl - 图片 URL
 * @param autoSave - 是否自动保存，默认 true
 */
export const analyzeImageByUrl = async (imageUrl: string, autoSave: boolean = true): Promise<ApiResponse<VisionAnalyzeResponse>> => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('                 🌐 通过 URL 分析图片                   ')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('🔗 图片 URL:', imageUrl)
  console.log('💾 自动保存:', autoSave ? '是' : '否')
  console.log('')

  try {
    console.log('---------------------------------------------------')
    console.log('🌐 发起 API 请求: POST /vision/analyze-food')
    console.log('📤 请求类型: application/json')
    console.log('📤 请求数据:', JSON.stringify({ imageUrl, autoSave }, null, 2))
    console.log('---------------------------------------------------')
    console.log('')

    const response = await post<VisionAnalyzeResponse>('/vision/analyze-food', {
      imageUrl,
      autoSave
    })

    console.log('')
    console.log('---------------------------------------------------')
    console.log('📥 收到后端响应')
    console.log('---------------------------------------------------')
    console.log('')

    if (response.success && response.data) {
      console.log('✅ URL 图片分析成功!')
      console.log('📊 分析结果:', JSON.stringify(response.data.analysis, null, 2))
    } else {
      console.error('❌ URL 图片分析失败:', response.message)
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('                 🏁 URL 分析流程结束                   ')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    return response
  } catch (error) {
    console.error('❌ URL 图片分析异常:', error)
    throw error
  }
}

/**
 * 仅上传图片（不分析）
 * @param file - 图片文件
 */
export const uploadImage = async (file: File): Promise<ApiResponse<UploadImageResponse>> => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('                 �� 上传图片                           ')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('📋 图片信息:')
  console.log('   - 文件名:', file.name)
  console.log('   - 文件大小:', (file.size / 1024).toFixed(2), 'KB')
  console.log('   - 文件类型:', file.type)
  console.log('')

  try {
    const formData = new FormData()
    formData.append('image', file)

    console.log('---------------------------------------------------')
    console.log('🌐 发起 API 请求: POST /vision/upload')
    console.log('📤 请求类型: multipart/form-data')
    console.log('---------------------------------------------------')
    console.log('')

    const response = await upload<UploadImageResponse>('/vision/upload', formData)

    console.log('')
    console.log('---------------------------------------------------')
    console.log('📥 收到后端响应')
    console.log('---------------------------------------------------')
    console.log('')

    if (response.success && response.data) {
      console.log('✅ 图片上传成功!')
      console.log('�� 图片 URL:', response.data.url)
      console.log('📁 对象名称:', response.data.objectName)
    } else {
      console.error('❌ 图片上传失败:', response.message)
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('                 🏁 上传流程结束                       ')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    return response
  } catch (error) {
    console.error('❌ 图片上传异常:', error)
    throw error
  }
}
