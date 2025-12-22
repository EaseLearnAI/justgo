/**
 * AI 路由模块 - 智能热量分析相关 API
 * 提供基于大模型的食物热量和运动消耗分析功能
 */

const express = require('express');
const router = express.Router();
const { analyzeCalories, analyzeExercise } = require('../services/aiService');
const FoodRecord = require('../models/FoodRecord');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/ai/analyze-food
 * @desc    分析食物热量并自动创建记录
 * @access  需要认证
 */
router.post('/analyze-food', protect, async (req, res) => {
  try {
    const { text, autoSave = true } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请输入食物描述'
      });
    }

    // 调用 AI 分析
    const analysis = await analyzeCalories(text);

    if (!analysis.success) {
      return res.status(500).json({
        success: false,
        message: 'AI 分析失败',
        error: analysis.error
      });
    }

    let savedRecords = [];

    // 如果开启自动保存，则创建记录
    if (autoSave && analysis.foods && analysis.foods.length > 0) {
      for (const food of analysis.foods) {
        const record = new FoodRecord({
          user: req.user._id,
          name: `${food.name}${food.quantity ? ` (${food.quantity})` : ''}`,
          type: 'intake',
          calories: food.calorie_estimated || food.calories || 0,
          calorieMin: food.calorie_min || 0,
          calorieMax: food.calorie_max || 0,
          quantity: food.quantity || '1份',
          unit: food.unit || '份',
          duration: 0,
          distance: 0,
          exerciseType: 'other',
          preferences: [],
          time: new Date()
        });

        await record.save();
        savedRecords.push(record);
      }
    }

    res.status(200).json({
      success: true,
      message: '食物热量分析成功',
      data: {
        analysis: analysis,
        savedRecords: savedRecords,
        totalCalories: analysis.totalCalories,
        summary: analysis.summary,
        scientificNote: analysis.scientificNote || '基于常见食物标准热量估算，实际热量可能因食材大小、配料、制作方式等因素而有所不同'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/analyze-exercise
 * @desc    分析运动消耗并自动创建记录
 * @access  需要认证
 */
router.post('/analyze-exercise', protect, async (req, res) => {
  try {
    const { text, autoSave = true } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请输入运动描述'
      });
    }

    // 调用 AI 分析
    const analysis = await analyzeExercise(text);

    if (!analysis.success) {
      return res.status(500).json({
        success: false,
        message: 'AI 分析失败',
        error: analysis.error
      });
    }

    let savedRecords = [];

    // 如果开启自动保存，则创建记录
    if (autoSave && analysis.exercises && analysis.exercises.length > 0) {
      for (const exercise of analysis.exercises) {
        const record = new FoodRecord({
          user: req.user._id,
          name: exercise.name,
          type: 'consume',
          calories: exercise.calories,
          duration: exercise.duration || 0,
          distance: exercise.distance || 0,
          exerciseType: exercise.exerciseType || 'other',
          preferences: [],
          time: new Date()
        });

        await record.save();
        savedRecords.push(record);
      }
    }

    res.status(200).json({
      success: true,
      message: '运动消耗分析成功',
      data: {
        analysis: analysis,
        savedRecords: savedRecords,
        totalCalories: analysis.totalCalories,
        totalDuration: analysis.totalDuration,
        summary: analysis.summary
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/analyze-only
 * @desc    仅分析热量，不保存记录（预览模式）
 * @access  需要认证
 */
router.post('/analyze-only', protect, async (req, res) => {
  try {
    const { text, type = 'food' } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请输入描述内容'
      });
    }

    let analysis;
    if (type === 'exercise') {
      analysis = await analyzeExercise(text);
    } else {
      analysis = await analyzeCalories(text);
    }

    res.status(200).json({
      success: true,
      message: '分析成功（预览模式）',
      data: {
        analysis: analysis,
        saved: false
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

module.exports = router;
