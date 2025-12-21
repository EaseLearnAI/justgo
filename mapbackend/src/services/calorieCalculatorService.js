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
  console.log('-----------------------------------');
  console.log('🔥 开始计算基础代谢率 (BMR)');
  console.log('-----------------------------------');
  console.log('📊 输入身体数据:');
  console.log(`   体重: ${bodyStats.weight} kg`);
  console.log(`   身高: ${bodyStats.height} cm`);
  console.log(`   年龄: ${bodyStats.age} 岁`);
  console.log(`   性别: ${bodyStats.gender === 'male' ? '男' : '女'}`);

  const { weight, height, age, gender } = bodyStats;
  
  let bmr;
  if (gender === 'male') {
    // 男性: BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) + 5
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    console.log('📐 使用男性公式: BMR = (10 × 体重) + (6.25 × 身高) - (5 × 年龄) + 5');
  } else {
    // 女性: BMR = (10 × 体重kg) + (6.25 × 身高cm) - (5 × 年龄) - 161
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    console.log('📐 使用女性公式: BMR = (10 × 体重) + (6.25 × 身高) - (5 × 年龄) - 161');
  }
  
  const result = Math.round(bmr);
  console.log(`✅ BMR 计算结果: ${result} kcal/天`);
  console.log('-----------------------------------');
  
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
  console.log('-----------------------------------');
  console.log('📈 开始计算每日总能量消耗 (TDEE)');
  console.log('-----------------------------------');
  
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  const label = ACTIVITY_LABELS[activityLevel] || '中等活动';
  
  console.log(`📊 输入参数:`);
  console.log(`   BMR: ${bmr} kcal`);
  console.log(`   活动水平: ${label} (${activityLevel})`);
  console.log(`   活动系数: ${multiplier}`);
  console.log('📐 公式: TDEE = BMR × 活动系数');
  
  const tdee = Math.round(bmr * multiplier);
  
  console.log(`✅ TDEE 计算结果: ${tdee} kcal/天`);
  console.log('-----------------------------------');
  
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
  console.log('-----------------------------------');
  console.log('🔋 开始计算基础代谢估算 (BMR + NEAT)');
  console.log('-----------------------------------');
  
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
  
  console.log(`📊 输入参数:`);
  console.log(`   BMR: ${bmr} kcal`);
  console.log(`   活动水平: ${label}`);
  console.log(`   NEAT 系数: ${neatMultiplier}`);
  console.log('📐 公式: 基础代谢估算 = BMR × NEAT系数');
  
  const baseMetabolism = Math.round(bmr * neatMultiplier);
  
  console.log(`✅ 基础代谢估算结果: ${baseMetabolism} kcal/天`);
  console.log('   💡 说明: 此值为 BMR + NEAT (非运动性日常活动)');
  console.log('-----------------------------------');
  
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
  console.log('-----------------------------------');
  console.log('📊 开始计算净热量');
  console.log('-----------------------------------');
  console.log(`📥 摄入: ${intake} kcal`);
  console.log(`🏃 运动消耗: ${exercise} kcal`);
  console.log(`🔋 基础代谢估算: ${baseMetabolism} kcal`);
  console.log('📐 公式: 净热量 = 摄入 - 运动消耗 - 基础代谢估算');
  
  const net = intake - exercise - baseMetabolism;
  
  console.log(`✅ 净热量: ${net} kcal`);
  if (net < 0) {
    console.log(`   💡 说明: 今日处于热量赤字状态，有利于减脂`);
  } else if (net > 0) {
    console.log(`   💡 说明: 今日热量盈余，可能增加体重`);
  } else {
    console.log(`   💡 说明: 今日热量平衡`);
  }
  console.log('-----------------------------------');
  
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
  console.log('-----------------------------------');
  console.log('🏃 开始计算运动消耗热量 (MET)');
  console.log('-----------------------------------');
  
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
  
  console.log(`📊 输入参数:`);
  console.log(`   运动类型: ${exerciseType}`);
  console.log(`   MET 值: ${met}`);
  console.log(`   体重: ${weight} kg`);
  console.log(`   时长: ${duration} 分钟 (${hours.toFixed(2)} 小时)`);
  console.log('📐 公式: 消耗 = MET × 体重 × 时间(小时)');
  
  const calories = Math.round(met * weight * hours);
  
  console.log(`✅ 运动消耗: ${calories} kcal`);
  console.log('-----------------------------------');
  
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
  console.log('===================================');
  console.log('📊 开始计算用户完整热量统计');
  console.log('===================================');
  
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
  
  console.log('===================================');
  console.log('📋 用户热量统计汇总:');
  console.log('===================================');
  console.log(`   🔥 BMR (基础代谢率): ${bmr} kcal`);
  console.log(`   📈 TDEE (每日总消耗): ${tdee} kcal`);
  console.log(`   🔋 基础代谢估算: ${baseMetabolism} kcal`);
  console.log(`   📥 今日摄入: ${intake} kcal`);
  console.log(`   🏃 今日运动: ${exercise} kcal`);
  console.log(`   📊 今日净热量: ${netCalories} kcal`);
  console.log(`   🎯 目标进度: ${progress}%`);
  console.log('===================================');
  
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
