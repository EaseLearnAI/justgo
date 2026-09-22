const express = require('express');
const router = express.Router();
const { DailySummary, FoodRecord, User } = require('../models');
const { 
  auth, 
  asyncHandler, 
  monthQueryValidation 
} = require('../middleware');

/**
 * @route   GET /api/daily/summary
 * @desc    获取今日摘要
 * @access  Private
 */
router.get('/summary', auth, asyncHandler(async (req, res) => {
  const user = req.user;
  const today = new Date().toISOString().split('T')[0];
  const baseBMR = user.calculateBMR();

  // 获取今日记录摘要
  const recordSummary = await FoodRecord.getTodaySummary(user._id);

  // 计算净热量
  const totalBurn = recordSummary.totalConsume + baseBMR;
  const netCalories = recordSummary.totalIntake - totalBurn;
  
  // 计算目标进度
  const goalProgress = Math.min(100, Math.round((totalBurn / (recordSummary.totalIntake + baseBMR)) * 100));

  // 更新或创建每日摘要
  const summary = await DailySummary.findOneAndUpdate(
    { userId: user._id, date: today },
    {
      intake: recordSummary.totalIntake,
      exercise: recordSummary.totalConsume,
      base: baseBMR,
      netCalories,
      duration: recordSummary.totalDuration,
      distance: recordSummary.totalDistance,
      completed: recordSummary.totalConsume > 0,
      goalProgress
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: {
      date: today,
      intake: summary.intake,
      exercise: summary.exercise,
      base: summary.base,
      netCalories: summary.netCalories,
      goalProgress: summary.goalProgress,
      completed: summary.completed
    }
  });
}));

/**
 * @route   GET /api/daily/history
 * @desc    获取历史统计
 * @access  Private
 */
router.get('/history', auth, monthQueryValidation, asyncHandler(async (req, res) => {
  const user = req.user;
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  // 获取月度统计
  const stats = await DailySummary.getMonthlyStats(user._id, month);

  res.json({
    success: true,
    data: {
      month,
      completedDays: stats.completedDays,
      currentStreak: user.streakDays,
      totalCaloriesBurned: stats.totalCalories,
      totalDistance: stats.totalDistance,
      dailyData: stats.dailyData
    }
  });
}));

/**
 * @route   GET /api/daily/date/:date
 * @desc    获取指定日期的摘要
 * @access  Private
 */
router.get('/date/:date', auth, asyncHandler(async (req, res) => {
  const { date } = req.params;
  const user = req.user;

  // 验证日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: '日期格式必须是 YYYY-MM-DD'
    });
  }

  const summary = await DailySummary.findOne({
    userId: user._id,
    date
  });

  if (!summary) {
    return res.json({
      success: true,
      data: {
        date,
        completed: false,
        calories: 0,
        duration: 0,
        distance: 0
      }
    });
  }

  res.json({
    success: true,
    data: {
      date: summary.date,
      completed: summary.completed,
      calories: summary.exercise,
      duration: summary.duration,
      distance: summary.distance,
      intake: summary.intake,
      netCalories: summary.netCalories,
      goalProgress: summary.goalProgress
    }
  });
}));

/**
 * @route   GET /api/daily/week
 * @desc    获取本周统计
 * @access  Private
 */
router.get('/week', auth, asyncHandler(async (req, res) => {
  const user = req.user;
  
  // 计算本周起始日期（周一）
  const today = new Date();
  const dayOfWeek = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = today.toISOString().split('T')[0];

  // 获取本周数据
  const summaries = await DailySummary.find({
    userId: user._id,
    date: { $gte: weekStart, $lte: weekEnd }
  }).sort({ date: 1 });

  const completedDays = summaries.filter(s => s.completed).length;
  const totalCalories = summaries.reduce((sum, s) => sum + s.exercise, 0);
  const totalDistance = summaries.reduce((sum, s) => sum + s.distance, 0);
  const totalDuration = summaries.reduce((sum, s) => sum + s.duration, 0);

  // 生成每天数据
  const dailyData = {};
  for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const summary = summaries.find(s => s.date === dateStr);
    dailyData[dateStr] = summary ? {
      completed: summary.completed,
      calories: summary.exercise,
      duration: summary.duration,
      distance: summary.distance
    } : {
      completed: false,
      calories: 0,
      duration: 0,
      distance: 0
    };
  }

  res.json({
    success: true,
    data: {
      weekStart,
      weekEnd,
      completedDays,
      targetDays: user.weeklyDaysGoal,
      totalCalories,
      totalDistance,
      totalDuration,
      dailyData
    }
  });
}));

module.exports = router;
