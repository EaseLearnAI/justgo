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
  try {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('autoSave', autoSave.toString())

    const response = await upload<VisionAnalyzeResponse>('/vision/analyze-food', formData)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 图片分析预览（不保存）
 * @param file - 图片文件
 */
export const previewImageAnalysis = async (file: File): Promise<ApiResponse<{ analysis: VisionAnalysisResult; saved: boolean }>> => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await upload<{ analysis: VisionAnalysisResult; saved: boolean }>('/vision/analyze-only', formData)

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 通过 URL 分析图片食物热量
 * @param imageUrl - 图片 URL
 * @param autoSave - 是否自动保存，默认 true
 */
export const analyzeImageByUrl = async (imageUrl: string, autoSave: boolean = true): Promise<ApiResponse<VisionAnalyzeResponse>> => {
  try {
    const response = await post<VisionAnalyzeResponse>('/vision/analyze-food', {
      imageUrl,
      autoSave
    })

    return response
  } catch (error) {
    throw error
  }
}

/**
 * 仅上传图片（不分析）
 * @param file - 图片文件
 */
export const uploadImage = async (file: File): Promise<ApiResponse<UploadImageResponse>> => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await upload<UploadImageResponse>('/vision/upload', formData)

    return response
  } catch (error) {
    throw error
  }
}
