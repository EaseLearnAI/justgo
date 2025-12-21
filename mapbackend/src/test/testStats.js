/**
 * 热量统计服务测试
 * 测试 calorieCalculatorService 和 stats 路由
 */

require('dotenv').config();

const {
  calculateBMR,
  calculateTDEE,
  calculateBaseMetabolism,
  calculateNetCalories,
  calculateExerciseCalories,
  getUserCalorieStats,
  ACTIVITY_LABELS
} = require('../services/calorieCalculatorService');

console.log('=============================================');
console.log('🧪 热量统计服务测试');
console.log('=============================================\n');

// 测试用户身体数据
const testBodyStats = {
  weight: 70,
  height: 175,
  age: 30,
  gender: 'male'
};

// 测试女性用户
const testFemaleBodyStats = {
  weight: 55,
  height: 160,
  age: 28,
  gender: 'female'
};

console.log('📊 测试数据:');
console.log('   男性: 70kg, 175cm, 30岁');
console.log('   女性: 55kg, 160cm, 28岁');
console.log('');

// 测试 1: 计算男性 BMR
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 1: 计算男性 BMR (Mifflin-St Jeor 公式)');
console.log('═════════════════════════════════════════════');
const maleBMR = calculateBMR(testBodyStats);
console.log(`   期望公式: (10 × 70) + (6.25 × 175) - (5 × 30) + 5`);
console.log(`   期望结果: 700 + 1093.75 - 150 + 5 = 1648.75 ≈ 1649 kcal`);
console.log(`   实际结果: ${maleBMR} kcal`);
console.log(`   ✅ 测试${maleBMR === 1649 ? '通过' : '失败'}`);
console.log('');

// 测试 2: 计算女性 BMR
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 2: 计算女性 BMR (Mifflin-St Jeor 公式)');
console.log('═════════════════════════════════════════════');
const femaleBMR = calculateBMR(testFemaleBodyStats);
console.log(`   期望公式: (10 × 55) + (6.25 × 160) - (5 × 28) - 161`);
console.log(`   期望结果: 550 + 1000 - 140 - 161 = 1249 kcal`);
console.log(`   实际结果: ${femaleBMR} kcal`);
console.log(`   ✅ 测试${femaleBMR === 1249 ? '通过' : '失败'}`);
console.log('');

// 测试 3: 计算 TDEE（不同活动水平）
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 3: 计算 TDEE（不同活动水平）');
console.log('═════════════════════════════════════════════');
const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const expectedMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];

activityLevels.forEach((level, index) => {
  const tdee = calculateTDEE(maleBMR, level);
  const expected = Math.round(maleBMR * expectedMultipliers[index]);
  console.log(`   ${ACTIVITY_LABELS[level]}: ${tdee} kcal (期望: ${expected})`);
});
console.log('');

// 测试 4: 计算基础代谢估算 (BMR + NEAT)
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 4: 计算基础代谢估算 (BMR + NEAT)');
console.log('═════════════════════════════════════════════');
const baseMetabolism = calculateBaseMetabolism(maleBMR, 'moderate');
console.log(`   中等活动水平的基础代谢估算: ${baseMetabolism} kcal`);
console.log(`   说明: 基础代谢估算 = BMR × NEAT系数(1.25)`);
console.log(`   期望结果: 1649 × 1.25 = 2061.25 ≈ 2061 kcal`);
console.log(`   ✅ 测试${baseMetabolism === 2061 ? '通过' : '失败'}`);
console.log('');

// 测试 5: 计算净热量
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 5: 计算净热量');
console.log('═════════════════════════════════════════════');
const intake = 1800;
const exercise = 300;
const netCalories = calculateNetCalories(intake, exercise, baseMetabolism);
console.log(`   摄入: ${intake} kcal`);
console.log(`   运动消耗: ${exercise} kcal`);
console.log(`   基础代谢估算: ${baseMetabolism} kcal`);
console.log(`   净热量: ${netCalories} kcal`);
console.log(`   期望结果: 1800 - 300 - 2061 = -561 kcal`);
const expectedNet = intake - exercise - baseMetabolism;
console.log(`   ✅ 测试${netCalories === expectedNet ? '通过' : '失败'}`);
console.log('');

// 测试 6: 计算运动消耗 (MET)
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 6: 计算运动消耗 (MET 模型)');
console.log('═════════════════════════════════════════════');
const exerciseTypes = ['walk', 'run', 'bike', 'swim', 'yoga'];
exerciseTypes.forEach(type => {
  const calories = calculateExerciseCalories(type, 70, 30);
  console.log(`   ${type} (30分钟, 70kg): ${calories} kcal`);
});
console.log('');

// 测试 7: 完整用户统计
console.log('═════════════════════════════════════════════');
console.log('🔬 测试 7: 完整用户热量统计');
console.log('═════════════════════════════════════════════');
const mockUser = {
  bodyStats: testBodyStats,
  activityLevel: 'moderate',
  goals: { dailyCalorie: 2000 }
};
const mockDailyStats = {
  intake: 1500,
  consume: 400
};
const fullStats = getUserCalorieStats(mockUser, mockDailyStats);
console.log('');
console.log('📋 统计结果汇总:');
console.log(`   BMR: ${fullStats.bmr} kcal`);
console.log(`   TDEE: ${fullStats.tdee} kcal`);
console.log(`   基础代谢估算: ${fullStats.baseMetabolism} kcal`);
console.log(`   今日摄入: ${fullStats.intake} kcal`);
console.log(`   今日运动: ${fullStats.exercise} kcal`);
console.log(`   净热量: ${fullStats.netCalories} kcal`);
console.log(`   目标进度: ${fullStats.progress}%`);
console.log(`   活动水平: ${fullStats.activityLabel}`);

console.log('');
console.log('=============================================');
console.log('✅ 所有测试完成！');
console.log('=============================================');
console.log('');
console.log('💡 热量计算公式说明:');
console.log('   - BMR (基础代谢率): 维持生命所需最低能量');
console.log('   - TDEE (每日总消耗): BMR × 活动系数');
console.log('   - 基础代谢估算: BMR + NEAT (非运动性活动)');
console.log('   - 净热量: 摄入 - 运动消耗 - 基础代谢估算');
console.log('');
console.log('📖 参考: Mifflin-St Jeor 公式 (1990年, 现代公认最准确)');
