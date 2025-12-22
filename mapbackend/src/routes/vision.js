/**
 * 视觉分析 API 路由
 * 提供基于图片的食物热量分析功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  analyzeImageCalories, 
  uploadAndAnalyzeImage,
  uploadBufferAndAnalyze 
} = require('../services/visionService');
const { uploadBuffer } = require('../services/ossService');
const { protect } = require('../middleware/auth');
const FoodRecord = require('../models/FoodRecord');

// 配置 multer 临时存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式，请使用 JPG/PNG/GIF/WEBP'));
    }
  }
});

/**
 * @route   POST /api/vision/analyze-food
 * @desc    上传图片并分析食物热量（自动保存记录）
 * @access  Private
 */
router.post('/analyze-food', protect, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const autoSave = req.body.autoSave !== 'false'; // 默认自动保存
    let analysisResult;

    // 方式1: 上传图片文件
    if (req.file) {
      analysisResult = await uploadBufferAndAnalyze(
        req.file.buffer,
        req.file.originalname,
        userId
      );
    }
    // 方式2: 提供图片 URL
    else if (req.body.imageUrl) {
      
      analysisResult = await analyzeImageCalories(req.body.imageUrl, userId);
      analysisResult.ossInfo = { url: req.body.imageUrl };
    }
    // 无效请求
    else {
      return res.status(400).json({
        success: false,
        message: '请上传图片或提供图片 URL'
      });
    }

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        message: analysisResult.error || '图片分析失败'
      });
    }

    // 自动保存记录到数据库
    let savedRecords = [];
    if (autoSave && analysisResult.foods && analysisResult.foods.length > 0) {
      
      for (const food of analysisResult.foods) {
        const record = new FoodRecord({
          user: userId,
          name: `${food.name} (${food.quantity || '1份'})`,
          type: 'intake',
          calories: food.calorie_estimated || food.calories || 0,
          calorieMin: food.calorie_min || Math.floor((food.calorie_estimated || food.calories || 0) * 0.85),
          calorieMax: food.calorie_max || Math.ceil((food.calorie_estimated || food.calories || 0) * 1.15),
          quantity: food.quantity || '1份',
          unit: food.unit || '份',
          imageUrl: analysisResult.ossInfo?.url || req.body.imageUrl,
          source: 'vision', // 标记来源为图片分析
          time: new Date()
        });

        await record.save();
        savedRecords.push({
          _id: record._id,
          name: record.name,
          type: record.type,
          calories: record.calories,
          calorieMin: record.calorieMin,
          calorieMax: record.calorieMax,
          time: record.time
        });

      }

    }

    res.json({
      success: true,
      message: '图片食物分析成功',
      data: {
        analysis: {
          success: true,
          foods: analysisResult.foods,
          totalCalories: analysisResult.totalCalories,
          summary: analysisResult.summary,
          scientificNote: analysisResult.scientificNote,
          imageDescription: analysisResult.imageDescription
        },
        imageUrl: analysisResult.ossInfo?.url || req.body.imageUrl,
        savedRecords: savedRecords,
        totalCalories: analysisResult.totalCalories?.estimated || 0,
        summary: analysisResult.summary,
        scientificNote: analysisResult.scientificNote
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片分析失败: ' + error.message
    });
  }
});

/**
 * @route   POST /api/vision/analyze-only
 * @desc    分析图片但不保存（预览模式）
 * @access  Private
 */
router.post('/analyze-only', protect, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    let analysisResult;

    if (req.file) {
      // 上传到 OSS 获取 URL
      const uploadResult = await uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        `temp-images/${userId}`
      );
      
      if (!uploadResult.success) {
        throw new Error('图片上传失败');
      }

      analysisResult = await analyzeImageCalories(uploadResult.url, userId);
      analysisResult.ossInfo = uploadResult;
    } else if (req.body.imageUrl) {
      analysisResult = await analyzeImageCalories(req.body.imageUrl, userId);
    } else {
      return res.status(400).json({
        success: false,
        message: '请上传图片或提供图片 URL'
      });
    }

    res.json({
      success: true,
      message: '图片分析成功（预览模式）',
      data: {
        analysis: analysisResult,
        saved: false
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片分析失败: ' + error.message
    });
  }
});

/**
 * @route   POST /api/vision/upload
 * @desc    仅上传图片到 OSS，返回 URL
 * @access  Private
 */
router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const userId = req.user.id;
    const uploadResult = await uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      `food-images/${userId}`
    );

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        url: uploadResult.url,
        objectName: uploadResult.objectName
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片上传失败: ' + error.message
    });
  }
});

module.exports = router;
