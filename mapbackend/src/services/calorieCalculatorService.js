/**
 * 热量计算服务
 * 基于科学公式计算 BMR、TDEE、NEAT 等
 * 参考: Mifflin-St Jeor 公式 (1990年, 现代公认最准确)
 */

/**
 * 活动系数配置
 * 用于计算 TDEE = BMR × 活动系数
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,        // 久坐不动（几乎不运动）
  light: 1.375,          // 轻度活动（每周轻度运动 1-3 天）
  moderate: 1.55,        // 中等活动（每周中等运动 3-5 天）
  active: 1.725,         // 高度活动（每天高强度运动或体力工作）
  very_active: 1.9       // 极高活动（运动员或重体力劳动者）
};

/**
 * 活动系数描述（中文）
 */
const ACTIVITY_LABELS = {
  sedentary: '久坐不动',
  light: '轻度活动',
  moderate: '中等活动',
  active: '高度活动',
  very_active: '极高活动'
};

/**
 * 计算基础代谢率 (BMR)
 * 使用 Mifflin-St Jeor 公式
 * 
 * @param {Object} bodyStats - 身体数据
 * @param {number} bodyStats.weight - 体重 (kg)
 * @param {number} bodyStats.height - 身高 (cm)
 * @param {number} bodyStats.age - 年龄
 * @param {string} bodyStats.gender - 性别 ('male' | 'female')
 * @returns {number} BMR (kcal/天)
 */
const calculateBMR = (bodyStats) => {
  const { weight, height, age, gender } = bodyStats;
  
  let bmr;
  if (gender === 'male') {
    // 男性: BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) + 5
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    // 女性: BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) - 161
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  const result = Math.round(bmr);
  
  return result;
};

/**
 * 计算每日总能量消耗 (TDEE)
 * TDEE = BMR × 活动系数
 * 
 * @param {number} bmr - 基础代谢率
 * @param {string} activityLevel - 活动水平
 * @returns {number} TDEE (kcal/天)
 */
const calculateTDEE = (bmr, activityLevel = 'moderate') => {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  const label = ACTIVITY_LABELS[activityLevel] || '中等活动';
  
  const tdee = Math.round(bmr * multiplier);
  
  return tdee;
};

/**
 * 计算基础代谢估算 (BMR + NEAT)
 * 即使不运动，日常活动也会消耗能量
 * 很多 App 显示的"基础"其实是 BMR + NEAT
 * 
 * @param {number} bmr - 基础代谢率
 * @param {string} activityLevel - 活动水平
 * @returns {number} 基础代谢估算 (kcal/天)
 */
const calculateBaseMetabolism = (bmr, activityLevel = 'moderate') => {
  // NEAT 系数：根据活动水平估算非运动性日常活动消耗
  // NEAT 通常占 TDEE 的 15-30%
  const neatMultipliers = {
    sedentary: 1.05,     // 久坐，NEAT 很低
    light: 1.15,         // 轻度，有一些日常活动
    moderate: 1.25,      // 中等，正常日常活动
    active: 1.35,        // 高度，较多日常活动
    very_active: 1.45    // 极高，大量日常活动
  };
  
  const neatMultiplier = neatMultipliers[activityLevel] || neatMultipliers.moderate;
  const label = ACTIVITY_LABELS[activityLevel] || '中等活动';
  
  const baseMetabolism = Math.round(bmr * neatMultiplier);
  
  return baseMetabolism;
};

/**
 * 计算净热量
 * 净热量 = 摄入热量 - 运动消耗 - 基础代谢估算
 * 
 * @param {number} intake - 摄入热量
 * @param {number} exercise - 运动消耗
 * @param {number} baseMetabolism - 基础代谢估算
 * @returns {number} 净热量 (kcal)
 */
const calculateNetCalories = (intake, exercise, baseMetabolism) => {
  const net = intake - exercise - baseMetabolism;
  
  return net;
};

/**
 * 计算运动消耗热量 (基于 MET)
 * 消耗 = MET值 × 体重(kg) × 时间(小时)
 * 
 * @param {string} exerciseType - 运动类型
 * @param {number} weight - 体重 (kg)
 * @param {number} duration - 时长 (分钟)
 * @returns {number} 消耗热量 (kcal)
 */
const calculateExerciseCalories = (exerciseType, weight, duration) => {
  // 常见运动 MET 值
  const MET_VALUES = {
    walk: 3.5,       // 步行 (5 km/h)
    run: 8.0,        // 跑步 (8 km/h)
    bike: 6.0,       // 骑行
    swim: 7.0,       // 游泳
    yoga: 2.5,       // 瑜伽
    strength: 5.0,   // 力量训练
    other: 4.0       // 其他
  };
  
  const met = MET_VALUES[exerciseType] || MET_VALUES.other;
  const hours = duration / 60;
  
  const calories = Math.round(met * weight * hours);
  
  return calories;
};

/**
 * 获取完整的用户热量统计
 * 
 * @param {Object} user - 用户对象
 * @param {Object} dailyStats - 今日统计 {intake, consume}
 * @returns {Object} 完整热量统计
 */
const getUserCalorieStats = (user, dailyStats) => {
  const bodyStats = user.bodyStats || { weight: 65, height: 170, age: 25, gender: 'male' };
  const activityLevel = user.activityLevel || 'moderate';
  
  // 1. 计算 BMR
  const bmr = calculateBMR(bodyStats);
  
  // 2. 计算 TDEE
  const tdee = calculateTDEE(bmr, activityLevel);
  
  // 3. 计算基础代谢估算 (BMR + NEAT)
  const baseMetabolism = calculateBaseMetabolism(bmr, activityLevel);
  
  // 4. 获取今日摄入和运动消耗
  const intake = dailyStats.intake || 0;
  const exercise = dailyStats.consume || 0;
  
  // 5. 计算净热量
  const netCalories = calculateNetCalories(intake, exercise, baseMetabolism);
  
  // 6. 计算目标进度
  const dailyCalorieGoal = user.goals?.dailyCalorie || 1500;
  const progress = Math.min(100, Math.round((intake / dailyCalorieGoal) * 100));
  
  return {
    bmr,
    tdee,
    baseMetabolism,
    intake,
    exercise,
    netCalories,
    dailyCalorieGoal,
    progress,
    activityLevel,
    activityLabel: ACTIVITY_LABELS[activityLevel] || '中等活动'
  };
};

module.exports = {
  ACTIVITY_MULTIPLIERS,
  ACTIVITY_LABELS,
  calculateBMR,
  calculateTDEE,
  calculateBaseMetabolism,
  calculateNetCalories,
  calculateExerciseCalories,
  getUserCalorieStats
};
