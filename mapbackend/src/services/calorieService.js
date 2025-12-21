/**
 * 热量计算服务模块
 * 提供 BMR、TDEE、每日热量统计等计算功能
 * 
 * 基于科学公式:
 * - BMR: Mifflin-St Jeor 公式 (1990年, 目前公认最准确)
 * - TDEE: BMR × 活动系数
 * - 净消耗: 摄入 - 运动消耗 - 基础代谢估算
 */

const FoodRecord = require('../models/FoodRecord');
const User = require('../models/User');

/**
 * 活动水平标签映射
 */
const ACTIVITY_LABELS = {
  sedentary: '久坐（几乎不运动）',
  light: '轻度活动（每周轻度运动1-3天）',
  moderate: '中等活动（每周中等运动3-5天）',
  active: '高度活动（每天高强度运动或体力工作）',
  very_active: '极高活动（运动员或重体力劳动者）'
};

/**
 * 目标导向标签映射
 */
const GOAL_LABELS = {
  maintain: '维持体重',
  slow_loss: '缓慢减脂',
  increase_activity: '提升活动量'
};

/**
 * 获取用户完整的每日热量摘要
 * @param {string} userId - 用户ID
 * @param {boolean} logToConsole - 是否输出详细日志
 * @returns {Object} 包含所有热量数据的摘要对象
 */
const getDailySummary = async (userId, logToConsole = true) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 获取今日食物记录统计
  const todayStats = await FoodRecord.getTodayStats(userId);
  
  // 计算所有代谢数据（带日志输出）
  const calculations = user.calculateAllStats(logToConsole);
  
  // 计算净消耗
  const netCalories = todayStats.intake - todayStats.consume - calculations.restingCalories;
  
  if (logToConsole) {
    console.log('===================================');
    console.log('📈 今日热量收支计算');
    console.log('===================================');
    console.log(`🍽️ 今日摄入: ${todayStats.intake} kcal`);
    console.log(`🏃 今日运动消耗: ${todayStats.consume} kcal`);
    console.log(`🧘 基础代谢估算: ${calculations.restingCalories} kcal`);
    console.log('-----------------------------------');
    console.log(`📐 净消耗计算公式: 摄入 - 运动消耗 - 基础代谢估算`);
    console.log(`📐 计算过程: ${todayStats.intake} - ${todayStats.consume} - ${calculations.restingCalories}`);
    console.log(`📐 计算结果: ${netCalories} kcal`);
    console.log(`📊 解读: ${netCalories > 0 ? '今日热量盈余，可能导致体重增加' : netCalories < 0 ? '今日热量赤字，有利于减脂' : '今日热量平衡'}`);
    console.log('===================================');
  }
  
  return {
    // 今日数据
    intake: todayStats.intake,
    exercise: todayStats.consume,
    base: calculations.restingCalories, // 显示为"基础代谢估算"
    netCalories,
    recordCount: todayStats.recordCount,
    
    // 计算数据
    bmr: calculations.bmr,
    tdee: calculations.tdee,
    restingCalories: calculations.restingCalories,
    recommendedCalories: calculations.recommendedCalories,
    
    // 用户设置
    activityLevel: calculations.activityLevel,
    activityLabel: ACTIVITY_LABELS[calculations.activityLevel],
    goalOrientation: calculations.goalOrientation,
    goalLabel: GOAL_LABELS[calculations.goalOrientation],
    
    // 身体数据
    bodyStats: calculations.bodyStats
  };
};

/**
 * 获取用户累计统计数据
 * @param {string} userId - 用户ID
 * @param {boolean} logToConsole - 是否输出详细日志
 * @returns {Object} 累计统计数据
 */
const getUserStats = async (userId, logToConsole = true) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 获取所有记录统计
  const allRecords = await FoodRecord.find({ user: userId });
  
  let totalCaloriesConsumed = 0;
  let totalExerciseMinutes = 0;
  let totalExerciseKm = 0;
  let exerciseDays = new Set();
  
  allRecords.forEach(record => {
    if (record.type === 'consume') {
      totalCaloriesConsumed += record.calories;
      totalExerciseMinutes += record.duration || 0;
      totalExerciseKm += record.distance || 0;
      
      const dateStr = new Date(record.time).toDateString();
      exerciseDays.add(dateStr);
    }
  });
  
  const streakDays = user.streakDays || 0;
  
  if (logToConsole) {
    console.log('===================================');
    console.log('📊 用户累计统计数据');
    console.log('===================================');
    console.log(`📅 打卡天数: ${streakDays} 天`);
    console.log(`🔥 累计消耗热量: ${totalCaloriesConsumed} kcal`);
    console.log(`   (${(totalCaloriesConsumed / 1000).toFixed(1)}k kcal)`);
    console.log(`🏃 累计运动时长: ${totalExerciseMinutes} 分钟`);
    console.log(`📏 累计运动距离: ${totalExerciseKm.toFixed(1)} 公里`);
    console.log(`📆 运动天数: ${exerciseDays.size} 天`);
    console.log('===================================');
  }
  
  // 更新用户累计统计
  user.totalStats = {
    totalCaloriesConsumed,
    totalExerciseMinutes,
    totalExerciseKm
  };
  await user.save();
  
  return {
    streakDays,
    totalCaloriesConsumed,
    totalCaloriesConsumedFormatted: totalCaloriesConsumed >= 1000 
      ? `${(totalCaloriesConsumed / 1000).toFixed(1)}k` 
      : String(totalCaloriesConsumed),
    totalExerciseMinutes,
    totalExerciseKm: Math.round(totalExerciseKm),
    exerciseDays: exerciseDays.size
  };
};

/**
 * 获取今日目标进度
 * @param {string} userId - 用户ID
 * @param {boolean} logToConsole - 是否输出详细日志
 * @returns {Object} 目标进度数据
 */
const getGoalProgress = async (userId, logToConsole = true) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 获取今日数据
  const todayStats = await FoodRecord.getTodayStats(userId);
  const calculations = user.calculateAllStats(false);
  
  // 用户设定的目标
  const goals = user.goals;
  const goalOrientation = user.goalOrientation;
  
  // 计算各项进度
  let progress = 0;
  let progressLabel = '';
  let progressDetail = {};
  
  switch (goalOrientation) {
    case 'maintain':
      // 维持体重: 摄入接近 TDEE 为最佳
      const tdeeRatio = todayStats.intake / calculations.tdee;
      if (tdeeRatio >= 0.9 && tdeeRatio <= 1.1) {
        progress = 100;
        progressLabel = '热量摄入正好，保持得很好！';
      } else if (tdeeRatio < 0.9) {
        progress = Math.round(tdeeRatio * 100);
        progressLabel = `还需摄入 ${Math.round(calculations.tdee * 0.9 - todayStats.intake)} kcal`;
      } else {
        progress = Math.max(0, 100 - Math.round((tdeeRatio - 1.1) * 100));
        progressLabel = `已超出 ${Math.round(todayStats.intake - calculations.tdee * 1.1)} kcal`;
      }
      progressDetail = {
        target: calculations.tdee,
        current: todayStats.intake,
        type: '热量平衡'
      };
      break;
      
    case 'slow_loss':
      // 缓慢减脂: 摄入应低于 TDEE 约 300-500 kcal
      const targetIntake = calculations.tdee - 300;
      const deficit = calculations.tdee - todayStats.intake;
      
      if (deficit >= 300 && deficit <= 500) {
        progress = 100;
        progressLabel = '热量赤字完美，继续保持！';
      } else if (deficit < 300) {
        progress = Math.max(0, Math.round((deficit / 300) * 100));
        progressLabel = `还需减少 ${300 - deficit} kcal 摄入`;
      } else {
        progress = Math.max(50, 100 - Math.round((deficit - 500) / 10));
        progressLabel = '注意别过度节食哦！';
      }
      progressDetail = {
        targetDeficit: '300-500 kcal',
        currentDeficit: deficit,
        targetIntake,
        current: todayStats.intake,
        type: '热量赤字'
      };
      break;
      
    case 'increase_activity':
      // 提升活动量: 以运动时长和消耗为目标
      const exerciseGoal = goals.dailyExercise; // 分钟
      const todayExercise = await getTodayExerciseMinutes(userId);
      
      progress = Math.min(100, Math.round((todayExercise / exerciseGoal) * 100));
      if (progress >= 100) {
        progressLabel = '今日运动目标已达成！';
      } else {
        progressLabel = `还需运动 ${exerciseGoal - todayExercise} 分钟`;
      }
      progressDetail = {
        targetMinutes: exerciseGoal,
        currentMinutes: todayExercise,
        caloriesBurned: todayStats.consume,
        type: '运动目标'
      };
      break;
      
    default:
      progress = 0;
      progressLabel = '请设置目标导向';
  }
  
  if (logToConsole) {
    console.log('===================================');
    console.log('🎯 今日目标进度计算');
    console.log('===================================');
    console.log(`📌 目标导向: ${GOAL_LABELS[goalOrientation]}`);
    console.log(`📊 当前进度: ${progress}%`);
    console.log(`💬 进度说明: ${progressLabel}`);
    console.log('-----------------------------------');
    console.log('📋 详细数据:');
    Object.entries(progressDetail).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('===================================');
  }
  
  return {
    progress,
    progressLabel,
    progressDetail,
    goalOrientation,
    goalLabel: GOAL_LABELS[goalOrientation],
    goals
  };
};

/**
 * 获取今日运动分钟数
 */
const getTodayExerciseMinutes = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const records = await FoodRecord.find({
    user: userId,
    type: 'consume',
    time: { $gte: today, $lt: tomorrow }
  });
  
  let totalMinutes = 0;
  records.forEach(record => {
    totalMinutes += record.duration || 0;
  });
  
  return totalMinutes;
};

module.exports = {
  getDailySummary,
  getUserStats,
  getGoalProgress,
  ACTIVITY_LABELS,
  GOAL_LABELS
};
