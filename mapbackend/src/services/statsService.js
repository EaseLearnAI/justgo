/**
 * 今日热量 / 运动摘要 — 唯一聚合入口
 * 供 /api/stats 与路线生成共用，避免 FoodRecord 查询字段不一致
 */

const FoodRecord = require('../models/FoodRecord');
const ExerciseRoute = require('../models/ExerciseRoute');
const User = require('../models/User');
const {
  calculateBMR,
  calculateTDEE,
  calculateBaseMetabolism,
  calculateNetCalories,
  ACTIVITY_LABELS
} = require('./calorieCalculatorService');

const VALID_ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const VALID_GOAL_ORIENTATIONS = ['lose', 'maintain', 'gain'];

const ACTIVITY_LEVEL_MAP = {
  high: 'active',
  low: 'sedentary',
  medium: 'moderate',
  very_high: 'very_active'
};

const GOAL_ORIENTATION_MAP = {
  slow_loss: 'lose',
  fast_loss: 'lose',
  slow_gain: 'gain',
  fast_gain: 'gain'
};

/**
 * 规范化用户枚举（读时修复，可选落库）
 */
async function normalizeUserEnums(user, { persist = true } = {}) {
  if (!user) return user;
  let needsSave = false;

  if (!VALID_ACTIVITY_LEVELS.includes(user.activityLevel)) {
    user.activityLevel = ACTIVITY_LEVEL_MAP[user.activityLevel] || 'moderate';
    needsSave = true;
  }
  if (!VALID_GOAL_ORIENTATIONS.includes(user.goalOrientation)) {
    user.goalOrientation = GOAL_ORIENTATION_MAP[user.goalOrientation] || 'maintain';
    needsSave = true;
  }

  if (persist && needsSave) {
    await user.save();
  }
  return user;
}

/**
 * 今日 FoodRecord 摄入/消耗（字段统一为 Schema 的 `user`）
 * @returns {{ intake: number, consume: number, net: number, recordCount: number }}
 */
async function getTodayIntakeConsume(userId) {
  return FoodRecord.getTodayStats(userId);
}

/**
 * 今日已开始/完成的路线热量与距离
 */
async function getTodayRouteStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRoutes = await ExerciseRoute.find({
    user: userId,
    $or: [
      { generatedAt: { $gte: today, $lt: tomorrow } },
      { startedAt: { $gte: today, $lt: tomorrow } },
      { completedAt: { $gte: today, $lt: tomorrow } }
    ]
  });

  const activeRoutes = todayRoutes.filter(
    (route) => route.status === 'started' || route.status === 'completed'
  );

  let routeCalories = 0;
  let routeDistance = 0;
  let routeDuration = 0;

  activeRoutes.forEach((route) => {
    routeCalories += route.actualCalories || route.estimatedCalories || 0;
    routeDistance += route.actualDistance || route.distance || 0;
    routeDuration += route.actualDuration || route.duration || 0;
  });

  return {
    routeCalories,
    routeDistance,
    routeDuration,
    routeCount: todayRoutes.length,
    activeRouteCount: activeRoutes.length,
    todayRoutes
  };
}

/**
 * 路线生成用的轻量今日统计（与 FoodRecord 一致，不含路线双计）
 */
async function getTodayStatsForRoute(userId) {
  const stats = await getTodayIntakeConsume(userId);
  return {
    intake: stats.intake,
    consume: stats.consume,
    net: stats.net,
    recordCount: stats.recordCount
  };
}

/**
 * 完整日摘要（DailySummaryCard）
 */
async function getDailySummary(userId) {
  let user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  user = await normalizeUserEnums(user);

  const bodyStats = user.bodyStats || {};
  const bmr = calculateBMR(bodyStats);
  const baseMetabolism = calculateBaseMetabolism(bmr, user.activityLevel);
  const tdee = calculateTDEE(bmr, user.activityLevel);

  const todayStats = await getTodayIntakeConsume(userId);
  const routeStats = await getTodayRouteStats(userId);

  // 合并 FoodRecord 与路线消耗（与现有 stats 行为一致）
  const totalExercise = todayStats.consume + routeStats.routeCalories;
  const netCalories = calculateNetCalories(
    todayStats.intake,
    totalExercise,
    baseMetabolism
  );

  const dailyCalorieGoal = 1500;
  const intakeProgress = Math.min(
    100,
    Math.round((todayStats.intake / dailyCalorieGoal) * 100)
  );

  return {
    user,
    bmr,
    tdee,
    baseMetabolism,
    netCalories,
    intake: todayStats.intake,
    exercise: totalExercise,
    exerciseFromRecords: todayStats.consume,
    exerciseFromRoutes: routeStats.routeCalories,
    exerciseDistance: parseFloat((routeStats.routeDistance / 1000).toFixed(2)),
    exerciseDuration: Math.round(routeStats.routeDuration / 60),
    routeCount: routeStats.routeCount,
    recordCount: todayStats.recordCount,
    dailyCalorieGoal,
    intakeProgress,
    activityLevel: user.activityLevel,
    activityLabel: ACTIVITY_LABELS[user.activityLevel] || '中等活动'
  };
}

module.exports = {
  normalizeUserEnums,
  getTodayIntakeConsume,
  getTodayRouteStats,
  getTodayStatsForRoute,
  getDailySummary,
  VALID_ACTIVITY_LEVELS,
  VALID_GOAL_ORIENTATIONS,
  ACTIVITY_LEVEL_MAP,
  GOAL_ORIENTATION_MAP
};
