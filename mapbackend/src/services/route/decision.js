/**
 * 决策引擎：时长 / 热量区间（纯函数，LLM 不得改写这些数字）
 */

const { EXERCISE_PARAMS } = require('../../MCP/mcpConfig');
const { resolveIntensityPreference } = require('../../config/constants');

const ABSOLUTE_MIN_DURATION = 5;
const ABSOLUTE_MAX_DURATION = 45;
const ABSOLUTE_MIN_CALORIE = 20;

/**
 * @typedef {Object} DecisionInput
 * @property {Object} user
 * @property {{ intake?: number, consume?: number }} todayStats
 * @property {Object} [preferences] - 当次请求偏好
 * @property {number} [recentExerciseMinutes] - 近几日运动分钟（可选）
 */

/**
 * 是否恢复日：热量明显为负，或近几日运动偏高（轻量启发式）
 */
function isRecoveryDay(todayStats, recentExerciseMinutes = 0) {
  const intake = todayStats?.intake || 0;
  const consume = todayStats?.consume || 0;
  const balance = intake - consume;
  if (balance < -300) return true;
  if (recentExerciseMinutes >= 90) return true;
  return false;
}

/**
 * 计算今日运动规划区间
 * @param {DecisionInput} input
 * @returns {Object} plan
 */
function decideExercisePlan(input) {
  const { user, todayStats = {}, preferences = {}, recentExerciseMinutes = 0 } = input;

  const sportType = preferences.sportType || 'walk';
  const intensity = resolveIntensityPreference(
    user,
    preferences.preferredPostExerciseState || preferences.exerciseFeeling
  );
  const goalOrientation = user?.goalOrientation || 'maintain';
  const recovery = isRecoveryDay(todayStats, recentExerciseMinutes);

  const sportParams = EXERCISE_PARAMS[sportType] || EXERCISE_PARAMS.walk;
  const weight = user?.bodyStats?.weight || 65;
  const caloriesPerMin = (sportParams.met * weight) / 60;

  // 意图系数
  const intentMap = { relaxed: 0.6, moderate: 0.85, challenging: 1.05 };
  let intent = intentMap[intensity] || 0.85;
  if (recovery) intent *= 0.7;
  if (goalOrientation === 'lose' && !recovery) intent *= 1.05;
  if (goalOrientation === 'gain') intent *= 0.95;

  const baseMax = 30;
  const rawTarget = Math.round(baseMax * intent);

  let durationMin;
  let durationMax;

  if (recovery || intensity === 'relaxed') {
    durationMin = 8;
    durationMax = Math.max(durationMin + 2, Math.min(15, Math.round(rawTarget * 0.7)));
  } else if (intensity === 'moderate') {
    durationMin = 12;
    durationMax = Math.max(durationMin + 3, Math.min(22, Math.round(rawTarget * 0.85)));
  } else {
    durationMin = 18;
    durationMax = Math.max(durationMin + 4, Math.min(30, Math.round(rawTarget)));
  }

  // 今日摄入偏高时略抬上限（减脂取向且非恢复日）
  const intake = todayStats.intake || 0;
  if (!recovery && intake > 1800 && goalOrientation === 'lose') {
    durationMax = Math.min(ABSOLUTE_MAX_DURATION, durationMax + 4);
  }

  durationMin = Math.max(ABSOLUTE_MIN_DURATION, durationMin);
  durationMax = Math.min(ABSOLUTE_MAX_DURATION, Math.max(durationMin + 2, durationMax));

  const calorieMin = Math.max(
    ABSOLUTE_MIN_CALORIE,
    Math.round(durationMin * caloriesPerMin)
  );
  const calorieMax = Math.max(
    calorieMin + 10,
    Math.round(durationMax * caloriesPerMin)
  );

  // burn_cap：避免单日运动消耗超过合理上限
  const burnCap = Math.max(
    calorieMax,
    Math.round((user?.cachedStats?.tdee || 2000) * 0.25)
  );

  const reason = buildReason({
    recovery,
    intensity,
    intake,
    consume: todayStats.consume || 0,
    goalOrientation
  });

  const milestone =
    intensity === 'relaxed' || recovery
      ? '走到第一个公园入口或完成下限时长，就算完成今日目标'
      : '完成建议时长下限即可达标，状态好再加一段';

  return {
    sportType,
    intensity,
    isRecoveryDay: recovery,
    durationRange: [durationMin, durationMax],
    calorieRange: [calorieMin, Math.min(calorieMax, burnCap)],
    targetDuration: Math.round((durationMin + durationMax) / 2),
    estimatedCalories: Math.round((calorieMin + Math.min(calorieMax, burnCap)) / 2),
    burnCap,
    maxDuration: durationMax,
    reason,
    milestone,
    goalOrientation
  };
}

function buildReason({ recovery, intensity, intake, consume, goalOrientation }) {
  if (recovery) {
    return '近期负荷或热量偏紧，今天先轻松出门走一小段即可';
  }
  if (intake > 0 && intake < 800) {
    return '今天摄入偏低，先出门走一小节保持节奏';
  }
  if (intake > 2000 && goalOrientation === 'lose') {
    return '今天吃得偏多，用一段可控时长帮你把节奏拉回来';
  }
  if (intensity === 'relaxed') {
    return '你选了轻松模式，重点是出门而不是拉满';
  }
  if (intensity === 'challenging') {
    return '你愿意累一点，今天给到有挑战但仍可完成的区间';
  }
  if (consume > 0) {
    return '今天已有一些消耗，建议用中等区间稳稳完成';
  }
  return '根据你的目标和偏好，给出今天可完成的时长与热量区间';
}

module.exports = {
  decideExercisePlan,
  isRecoveryDay,
  ABSOLUTE_MIN_DURATION,
  ABSOLUTE_MAX_DURATION,
  ABSOLUTE_MIN_CALORIE
};
