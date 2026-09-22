/**
 * 用户统计路由
 * 提供热量统计、目标进度、累计数据等 API
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FoodRecord = require('../models/FoodRecord');
const ExerciseRoute = require('../models/ExerciseRoute');
const { protect } = require('../middleware/auth');
const {
  calculateBMR,
  calculateTDEE,
  calculateBaseMetabolism,
  calculateNetCalories,
  ACTIVITY_LABELS
} = require('../services/calorieCalculatorService');
const {
  getDailySummary,
  normalizeUserEnums
} = require('../services/statsService');

// 所有路由都需要认证
router.use(protect);

// 有效的枚举值
const VALID_ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const VALID_GOAL_ORIENTATIONS = ['lose', 'maintain', 'gain'];

// 活动水平映射（修复旧数据）
const ACTIVITY_LEVEL_MAP = {
  'high': 'active',
  'low': 'sedentary',
  'medium': 'moderate',
  'very_high': 'very_active'
};

// 目标取向映射（修复旧数据）
const GOAL_ORIENTATION_MAP = {
  'slow_loss': 'lose',
  'fast_loss': 'lose',
  'slow_gain': 'gain',
  'fast_gain': 'gain'
};

/**
 * 修复用户数据中的无效枚举值
 */
const fixUserEnumValues = async (user) => normalizeUserEnums(user);

/**
 * @route   GET /api/stats/daily-summary
 * @desc    获取今日热量摘要（DailySummaryCard 使用）
 * @access  Private
 */
router.get('/daily-summary', async (req, res, next) => {
  try {
    const summary = await getDailySummary(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        netCalories: summary.netCalories,
        intake: summary.intake,
        exercise: summary.exercise,
        baseMetabolism: summary.baseMetabolism,
        exerciseFromRecords: summary.exerciseFromRecords,
        exerciseFromRoutes: summary.exerciseFromRoutes,
        exerciseDistance: summary.exerciseDistance,
        exerciseDuration: summary.exerciseDuration,
        routeCount: summary.routeCount,
        bmr: summary.bmr,
        tdee: summary.tdee,
        dailyCalorieGoal: summary.dailyCalorieGoal,
        intakeProgress: summary.intakeProgress,
        activityLevel: summary.activityLevel,
        activityLabel: summary.activityLabel,
        recordCount: summary.recordCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats/user-stats
 * @desc    获取用户累计统计（StatsCard 使用）
 * @access  Private
 */
router.get('/user-stats', async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    
    // 修复无效的枚举值
    user = await fixUserEnumValues(user);
    
    // 获取打卡天数
    const streakDays = user.streakDays || 0;
    
    // 获取累计消耗热量（从所有 consume 类型记录计算）
    const allConsumeRecords = await FoodRecord.find({
      user: req.user._id,
      type: 'consume'
    });
    
    let totalCaloriesBurned = 0;
    let totalExerciseMinutes = 0;
    let totalDistance = 0; // 公里
    
    allConsumeRecords.forEach(record => {
      totalCaloriesBurned += record.calories || 0;
      totalExerciseMinutes += record.duration || 0;
      // FoodRecord 中的 distance 是字符串格式的公里数
      const distance = typeof record.distance === 'string' 
        ? parseFloat(record.distance) || 0
        : (record.distance || 0);
      totalDistance += distance;
    });
    
    // 获取所有已开始或已完成的运动路线（包括已开始的，因为已经开始运动就应该计入统计）
    const completedRoutes = await ExerciseRoute.find({
      user: req.user._id,
      status: { $in: ['started', 'completed'] }
    });
    
    let routeCalories = 0;
    let routeMinutes = 0;
    let routeDistanceKm = 0;
    
    completedRoutes.forEach((route, index) => {
      // 优先使用实际消耗，否则使用估算消耗
      const calories = route.actualCalories || route.estimatedCalories || 0;
      const distance = route.actualDistance || route.distance || 0; // 米
      const duration = route.actualDuration || route.duration || 0; // 秒
      
      routeCalories += calories;
      routeMinutes += Math.round(duration / 60);
      routeDistanceKm += distance / 1000; // 转换为公里
    });
    
    // 合并 FoodRecord 和 ExerciseRoute 的累计数据
    totalCaloriesBurned += routeCalories;
    totalExerciseMinutes += routeMinutes;
    totalDistance += routeDistanceKm;
    
    // 更新用户累计统计
    if (user.totalStats) {
      user.totalStats.totalCaloriesBurned = totalCaloriesBurned;
      user.totalStats.totalExerciseMinutes = totalExerciseMinutes;
      user.totalStats.totalDistance = totalDistance;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        streakDays,
        totalCaloriesBurned,
        totalExerciseMinutes,
        totalDistance: parseFloat(totalDistance.toFixed(1)),
        // 格式化显示
        formattedCalories: totalCaloriesBurned >= 1000 
          ? `${(totalCaloriesBurned / 1000).toFixed(1)}k` 
          : totalCaloriesBurned.toString(),
        formattedDistance: totalDistance >= 100 
          ? `${Math.round(totalDistance)}` 
          : totalDistance.toFixed(1)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/stats/goal-progress
 * @desc    获取目标完成进度
 * @access  Private
 */
router.get('/goal-progress', async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    
    // 修复无效的枚举值
    user = await fixUserEnumValues(user);
    
    // 获取今日统计（包含 ExerciseRoute）
    const todayStats = await FoodRecord.getTodayStats(req.user._id);
    
    // 获取今日运动路线
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 查询今日的所有路线（包括所有状态）
    const todayRoutes = await ExerciseRoute.find({
      user: req.user._id,
      $or: [
        { generatedAt: { $gte: today, $lt: tomorrow } },
        { startedAt: { $gte: today, $lt: tomorrow } },
        { completedAt: { $gte: today, $lt: tomorrow } }
      ]
    });
    
    // 只统计已开始或已完成的路线
    const activeRoutes = todayRoutes.filter(route => 
      route.status === 'started' || route.status === 'completed'
    );
    
    // 计算今日运动消耗和时长（只统计已开始或已完成的路线）
    let routeCalories = 0;
    let routeMinutes = 0;
    activeRoutes.forEach(route => {
      const calories = route.actualCalories || route.estimatedCalories || 0;
      const minutes = Math.round((route.actualDuration || route.duration || 0) / 60);
      routeCalories += calories;
      routeMinutes += minutes;
    });
    
    // 获取今日运动记录
    const todayExerciseRecords = await FoodRecord.find({
      user: req.user._id,
      type: 'consume',
      time: { $gte: today, $lt: tomorrow }
    });
    
    let recordMinutes = 0;
    todayExerciseRecords.forEach(record => {
      recordMinutes += record.duration || 0;
    });
    
    const totalExerciseMinutes = routeMinutes + recordMinutes;
    const totalExerciseCalories = todayStats.consume + routeCalories;
    
    // 计算 BMR 和 TDEE
    const bmr = user.calculateBMR();
    const tdee = user.calculateTDEE();
    const baseMetabolism = user.calculateBaseMetabolism();
    
    // 根据目标取向计算目标
    let dailyCalorieGoal = 1500; // 默认值
    let dailyExerciseGoal = 45; // 默认值（分钟）
    
    const goalOrientation = user.goalOrientation || 'maintain';
    
    // 根据目标取向和目标体重计算热量目标
    if (goalOrientation === 'lose') {
      // 减重：TDEE - 500 kcal（每周减重约0.5kg）
      dailyCalorieGoal = Math.max(1200, Math.round(tdee - 500));
      dailyExerciseGoal = 60; // 减重需要更多运动
    } else if (goalOrientation === 'gain') {
      // 增重：TDEE + 500 kcal（每周增重约0.5kg）
      dailyCalorieGoal = Math.round(tdee + 500);
      dailyExerciseGoal = 30; // 增重时运动量可以少一些
    } else {
      // 维持：TDEE
      dailyCalorieGoal = Math.round(tdee);
      dailyExerciseGoal = 45; // 标准运动量
    }
    
    // 计算进度
    // 对于减重：进度 = (消耗的热量 / 目标消耗) * 100
    // 对于增重：进度 = (摄入的热量 / 目标摄入) * 100
    // 对于维持：进度 = (运动消耗 / 目标消耗) * 100
    let calorieProgress = 0;
    if (goalOrientation === 'lose') {
      // 减重：看消耗进度（运动 + 基础代谢）
      const totalBurn = totalExerciseCalories + baseMetabolism;
      calorieProgress = Math.min(100, Math.round((totalBurn / dailyCalorieGoal) * 100));
    } else if (goalOrientation === 'gain') {
      // 增重：看摄入进度
      calorieProgress = Math.min(100, Math.round((todayStats.intake / dailyCalorieGoal) * 100));
    } else {
      // 维持：看运动消耗进度
      calorieProgress = Math.min(100, Math.round((totalExerciseCalories / (dailyCalorieGoal * 0.3)) * 100));
    }
    
    const exerciseProgress = Math.min(100, Math.round((totalExerciseMinutes / dailyExerciseGoal) * 100));
    
    // 综合进度（取热量和运动的平均值，或根据目标取向调整权重）
    let overallProgress = 0;
    if (goalOrientation === 'lose') {
      // 减重：运动权重更高
      overallProgress = Math.round(calorieProgress * 0.6 + exerciseProgress * 0.4);
    } else if (goalOrientation === 'gain') {
      // 增重：热量摄入权重更高
      overallProgress = Math.round(calorieProgress * 0.7 + exerciseProgress * 0.3);
    } else {
      // 维持：平衡
      overallProgress = Math.round((calorieProgress + exerciseProgress) / 2);
    }

    res.status(200).json({
      success: true,
      data: {
        calorie: {
          goal: dailyCalorieGoal,
          current: goalOrientation === 'lose' ? (totalExerciseCalories + baseMetabolism) : todayStats.intake,
          progress: calorieProgress,
          tdee: tdee,
          bmr: bmr
        },
        exercise: {
          goal: dailyExerciseGoal,
          current: totalExerciseMinutes,
          progress: exerciseProgress
        },
        overall: {
          progress: overallProgress
        },
        goalOrientation: goalOrientation,
        // 详细数据
        details: {
          intake: todayStats.intake,
          exerciseFromRecords: todayStats.consume,
          exerciseFromRoutes: routeCalories,
          totalExercise: totalExerciseCalories,
          baseMetabolism: baseMetabolism
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/stats/activity-level
 * @desc    更新活动水平
 * @access  Private
 */
router.put('/activity-level', async (req, res, next) => {
  try {
    const { activityLevel } = req.body;
    
    const validLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
    if (!validLevels.includes(activityLevel)) {
      return res.status(400).json({
        success: false,
        message: '无效的活动水平'
      });
    }
    
    const user = await User.findById(req.user._id);
    user.activityLevel = activityLevel;
    await user.save();
    


    res.status(200).json({
      success: true,
      message: '活动水平更新成功',
      data: {
        activityLevel: user.activityLevel,
        activityLabel: ACTIVITY_LABELS[activityLevel],
        bmr: user.calculateBMR(),
        baseMetabolism: user.calculateBaseMetabolism(),
        tdee: user.calculateTDEE()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
