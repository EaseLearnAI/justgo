/**
 * 领域常量：活动水平、强度映射等
 */

/** 用户 exerciseFeeling / preferredPostExerciseState → 决策引擎强度键 */
const FEELING_TO_INTENSITY = {
  relaxed: 'relaxed',
  moderate: 'moderate',
  intense: 'challenging',
  challenging: 'challenging',
  // 旧字段兼容
  easy: 'relaxed',
  hard: 'challenging'
};

/** 强度偏好合法值（决策引擎） */
const INTENSITY_KEYS = ['relaxed', 'moderate', 'challenging'];

/** 位置精度层级 */
const LOCATION_LEVEL = {
  L0: 'L0',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3'
};

/** 仅这些来源视为「粗定位」，禁止用城市中心做 place/around */
const COARSE_LOCATION_SOURCES = new Set([
  'ip_location',
  'ip',
  'default',
  'mock',
  'cache_l1'
]);

/**
 * 从用户文档读取统一强度偏好
 * 优先 exerciseFeeling，兼容旧名 exerciseIntensityPreference / preferredPostExerciseState
 */
function resolveIntensityPreference(user, requestFeeling) {
  const raw =
    requestFeeling ||
    user?.exerciseFeeling ||
    user?.preferredPostExerciseState ||
    user?.exerciseIntensityPreference ||
    'moderate';
  return FEELING_TO_INTENSITY[raw] || 'moderate';
}

module.exports = {
  FEELING_TO_INTENSITY,
  INTENSITY_KEYS,
  LOCATION_LEVEL,
  COARSE_LOCATION_SOURCES,
  resolveIntensityPreference
};
