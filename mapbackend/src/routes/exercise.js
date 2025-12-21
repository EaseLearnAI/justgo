const express = require('express');
const router = express.Router();
const { ExercisePlan, FoodRecord, DailySummary, User } = require('../models');
const { 
  auth, 
  asyncHandler, 
  exercisePlanValidation 
} = require('../middleware');

/**
 * @route   POST /api/exercise/calculate
 * @desc    计算运动方案
 * @access  Private
 */
router.post('/calculate', auth, asyncHandler(async (req, res) => {
  const { calories } = req.body;

  if (!calories || calories <= 0) {
    return res.status(400).json({
      success: false,
      message: '请输入有效的热量值'
    });
  }

  const user = req.user;
  const weight = user.weight || 70;

  // 计算不同运动方式所需时间
  // 基于 MET 值计算
  const exerciseTimes = {
    walk: Math.max(10, Math.round(calories / (0.079 * weight))),  // MET 3.5
    run: Math.max(5, Math.round(calories / (0.143 * weight))),    // MET 7
    bike: Math.max(5, Math.round(calories / (0.114 * weight)))    // MET 5.5
  };

  res.json({
    success: true,
    data: {
      calories,
      exerciseTimes,
      message: '已为您计算运动方案'
    }
  });
}));

/**
 * @route   POST /api/exercise/generate-route
 * @desc    生成运动路线
 * @access  Private
 */
router.post('/generate-route', auth, exercisePlanValidation, asyncHandler(async (req, res) => {
  const { type, duration, preferences = [], location } = req.body;
  const user = req.user;
  const weight = user.weight || 70;

  // 计算距离和热量
  const distance = ExercisePlan.calculateDistance(type, duration);
  const calories = ExercisePlan.calculateCalories(type, duration, weight);

  // 默认位置（如果未提供）
  const startLocation = location || {
    lat: 39.908823,
    lng: 116.397470
  };

  // 根据运动距离计算终点（简化版本）
  const endLocation = {
    lat: startLocation.lat + (distance / 111) * 0.5,  // 约111km = 1度纬度
    lng: startLocation.lng + (distance / 85) * 0.5    // 约85km = 1度经度（北京纬度）
  };

  // 生成高德地图链接
  const amapUrl = ExercisePlan.generateAmapUrl(startLocation, endLocation, type);

  // 保存运动计划
  const plan = await ExercisePlan.create({
    userId: user._id,
    type,
    duration,
    distance,
    calories,
    preferences,
    startLocation,
    endLocation,
    amapUrl,
    status: 'pending'
  });

  res.json({
    success: true,
    data: {
      route: {
        _id: plan._id,
        type: plan.type,
        duration: plan.duration,
        distance: plan.distance,
        calories: plan.calories,
        preferences: plan.preferences,
        startLocation: plan.startLocation,
        endLocation: plan.endLocation,
        amapUrl: plan.amapUrl
      }
    }
  });
}));

/**
 * @route   POST /api/exercise/complete
 * @desc    完成运动打卡
 * @access  Private
 */
router.post('/complete', auth, asyncHandler(async (req, res) => {
  const { planId, actualDuration, actualDistance } = req.body;
  const user = req.user;

  // 查找运动计划
  const plan = await ExercisePlan.findOne({
    _id: planId,
    userId: user._id
  });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: '运动计划不存在'
    });
  }

  if (plan.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: '该运动计划已完成'
    });
  }

  // 使用实际数据或计划数据
  const finalDuration = actualDuration || plan.duration;
  const finalDistance = actualDistance || plan.distance;
  const finalCalories = ExercisePlan.calculateCalories(plan.type, finalDuration, user.weight || 70);

  // 更新运动计划状态
  plan.status = 'completed';
  plan.actualDuration = finalDuration;
  plan.actualDistance = finalDistance;
  plan.actualCalories = finalCalories;
  plan.completedAt = new Date();
  await plan.save();

  // 创建消耗记录
  const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
  
  const record = await FoodRecord.create({
    userId: user._id,
    name: typeNames[plan.type],
    calories: finalCalories,
    type: 'consume',
    duration: finalDuration,
    distance: finalDistance,
    exerciseType: plan.type
  });

  // 更新用户统计
  await updateUserStats(user, finalCalories, finalDistance);

  // 获取今日统计
  const todaySummary = await FoodRecord.getTodaySummary(user._id);

  res.json({
    success: true,
    message: '🎉 完成目标！',
    data: {
      record: {
        _id: record._id,
        name: record.name,
        calories: record.calories,
        type: record.type,
        duration: record.duration,
        distance: record.distance,
        time: record.time
      },
      stats: {
        todayCaloriesBurned: todaySummary.totalConsume,
        streakDays: user.streakDays
      }
    }
  });
}));

/**
 * @route   GET /api/exercise/plans
 * @desc    获取用户的运动计划列表
 * @access  Private
 */
router.get('/plans', auth, asyncHandler(async (req, res) => {
  const { status, limit = 10 } = req.query;

  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }

  const plans = await ExercisePlan.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: plans
  });
}));

/**
 * @route   GET /api/exercise/plans/:id
 * @desc    获取单个运动计划详情
 * @access  Private
 */
router.get('/plans/:id', auth, asyncHandler(async (req, res) => {
  const plan = await ExercisePlan.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: '运动计划不存在'
    });
  }

  res.json({
    success: true,
    data: plan
  });
}));

/**
 * @route   DELETE /api/exercise/plans/:id
 * @desc    取消运动计划
 * @access  Private
 */
router.delete('/plans/:id', auth, asyncHandler(async (req, res) => {
  const plan = await ExercisePlan.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: '运动计划不存在'
    });
  }

  if (plan.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: '已完成的计划无法取消'
    });
  }

  plan.status = 'cancelled';
  await plan.save();

  res.json({
    success: true,
    message: '运动计划已取消'
  });
}));

/**
 * 辅助函数：更新用户统计数据
 */
async function updateUserStats(user, calories, distance) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastExercise = user.lastExerciseDate ? new Date(user.lastExerciseDate) : null;
  
  // 更新累计数据
  user.totalCaloriesBurned += calories;
  user.totalDistance += distance;

  // 计算连续打卡天数
  if (lastExercise) {
    lastExercise.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastExercise) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // 同一天，不增加
    } else if (diffDays === 1) {
      // 连续一天
      user.streakDays += 1;
      user.totalExerciseDays += 1;
    } else {
      // 断了，重新开始
      user.streakDays = 1;
      user.totalExerciseDays += 1;
    }
  } else {
    // 第一次运动
    user.streakDays = 1;
    user.totalExerciseDays = 1;
    
    // 解锁第一次运动成就
    if (!user.achievements.find(a => a.id === 'first_exercise')) {
      user.achievements.push({
        id: 'first_exercise',
        name: '初次运动',
        icon: '🏃',
        unlockedAt: new Date()
      });
    }
  }

  user.lastExerciseDate = today;

  // 检查连续7天成就
  if (user.streakDays >= 7 && !user.achievements.find(a => a.id === '7_day_streak')) {
    user.achievements.push({
      id: '7_day_streak',
      name: '连续7天',
      icon: '🔥',
      unlockedAt: new Date()
    });
  }

  // 检查连续30天成就
  if (user.streakDays >= 30 && !user.achievements.find(a => a.id === '30_day_streak')) {
    user.achievements.push({
      id: '30_day_streak',
      name: '连续30天',
      icon: '🏆',
      unlockedAt: new Date()
    });
  }

  await user.save();
}

module.exports = router;
