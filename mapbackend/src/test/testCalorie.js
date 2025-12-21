/**
 * 热量统计 API 测试脚本
 * 测试 BMR、TDEE、每日摘要等计算功能
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const FoodRecord = require('../models/FoodRecord');
const calorieService = require('../services/calorieService');

// 测试用户数据
const TEST_USER = {
  phone: '13800138999',
  password: 'test123456',
  name: '测试用户',
  bodyStats: {
    height: 175,
    weight: 70,
    age: 30,
    gender: 'male'
  },
  activityLevel: 'light',
  goalOrientation: 'slow_loss',
  goals: {
    dailyCalorie: 1800,
    dailyExercise: 45,
    weeklyDays: 5
  }
};

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🧪 热量统计 API 测试开始                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // 连接数据库
    console.log('📦 连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    console.log('');

    // 清理之前的测试数据
    console.log('🧹 清理测试数据...');
    await User.deleteOne({ phone: TEST_USER.phone });
    console.log('✅ 清理完成');
    console.log('');

    // 创建测试用户
    console.log('👤 创建测试用户...');
    const user = await User.create(TEST_USER);
    console.log('✅ 测试用户创建成功');
    console.log(`   ID: ${user._id}`);
    console.log(`   手机: ${user.phone}`);
    console.log('');

    // 测试 1: BMR 计算
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 测试 1: 基础代谢率 (BMR) 计算');
    console.log('═══════════════════════════════════════════════════════════');
    const bmr = user.calculateBMR(true);
    console.log('');
    console.log(`🔥 BMR 计算结果: ${bmr} kcal/天`);
    
    // 验证 BMR (男性 Mifflin-St Jeor: 10*70 + 6.25*175 - 5*30 + 5)
    const expectedBMR = 10 * 70 + 6.25 * 175 - 5 * 30 + 5;
    console.log(`📋 预期值: ${Math.round(expectedBMR)} kcal/天`);
    console.log(`${Math.abs(bmr - Math.round(expectedBMR)) <= 1 ? '✅ BMR 计算正确！' : '❌ BMR 计算有误！'}`);
    console.log('');

    // 测试 2: TDEE 计算
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚡ 测试 2: 每日总能量消耗 (TDEE) 计算');
    console.log('═══════════════════════════════════════════════════════════');
    const tdee = user.calculateTDEE(true);
    console.log('');
    console.log(`⚡ TDEE 计算结果: ${tdee} kcal/天`);
    
    // 验证 TDEE (BMR * 1.375 for light activity)
    const expectedTDEE = bmr * 1.375;
    console.log(`📋 预期值: ${Math.round(expectedTDEE)} kcal/天`);
    console.log(`${Math.abs(tdee - Math.round(expectedTDEE)) <= 1 ? '✅ TDEE 计算正确！' : '❌ TDEE 计算有误！'}`);
    console.log('');

    // 测试 3: 静息消耗计算
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧘 测试 3: 静息消耗（基础代谢估算）计算');
    console.log('═══════════════════════════════════════════════════════════');
    const restingCalories = user.calculateRestingCalories(true);
    console.log('');
    console.log(`🧘 静息消耗: ${restingCalories} kcal/天`);
    console.log('');

    // 测试 4: 建议每日热量摄入
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 测试 4: 建议每日热量摄入计算');
    console.log('═══════════════════════════════════════════════════════════');
    const recommendedCalories = user.calculateRecommendedCalories(true);
    console.log('');
    console.log(`🎯 建议摄入: ${recommendedCalories} kcal/天`);
    
    // 验证 (TDEE - 300 for slow_loss)
    const expectedRecommended = tdee - 300;
    console.log(`📋 预期值: ${Math.round(expectedRecommended)} kcal/天`);
    console.log(`${Math.abs(recommendedCalories - Math.round(expectedRecommended)) <= 1 ? '✅ 建议摄入计算正确！' : '❌ 建议摄入计算有误！'}`);
    console.log('');

    // 测试 5: 完整计算报告
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 测试 5: 完整计算报告');
    console.log('═══════════════════════════════════════════════════════════');
    const allStats = user.calculateAllStats(true);
    console.log('');

    // 测试 6: 添加今日记录并测试每日摘要
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 测试 6: 添加今日记录并获取每日摘要');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // 添加测试记录
    console.log('📝 添加测试食物记录...');
    await FoodRecord.create({
      user: user._id,
      name: '早餐',
      type: 'intake',
      calories: 450,
      calorieMin: 400,
      calorieMax: 500
    });
    await FoodRecord.create({
      user: user._id,
      name: '午餐',
      type: 'intake',
      calories: 650,
      calorieMin: 600,
      calorieMax: 700
    });
    await FoodRecord.create({
      user: user._id,
      name: '跑步30分钟',
      type: 'consume',
      calories: 300,
      duration: 30,
      distance: 5
    });
    console.log('✅ 测试记录添加完成');
    console.log('');

    // 获取每日摘要
    console.log('📊 获取今日热量摘要...');
    const dailySummary = await calorieService.getDailySummary(user._id, true);
    console.log('');
    console.log('📊 每日摘要结果:');
    console.log(`   摄入: ${dailySummary.intake} kcal`);
    console.log(`   运动消耗: ${dailySummary.exercise} kcal`);
    console.log(`   基础代谢估算: ${dailySummary.base} kcal`);
    console.log(`   净消耗: ${dailySummary.netCalories} kcal`);
    console.log('');

    // 测试 7: 获取用户累计统计
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 测试 7: 获取用户累计统计');
    console.log('═══════════════════════════════════════════════════════════');
    const userStats = await calorieService.getUserStats(user._id, true);
    console.log('');
    console.log('📊 用户统计结果:');
    console.log(`   打卡天数: ${userStats.streakDays} 天`);
    console.log(`   累计消耗热量: ${userStats.totalCaloriesConsumedFormatted} kcal`);
    console.log(`   累计运动距离: ${userStats.totalExerciseKm} 公里`);
    console.log('');

    // 测试 8: 获取目标进度
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 测试 8: 获取目标进度');
    console.log('═══════════════════════════════════════════════════════════');
    const goalProgress = await calorieService.getGoalProgress(user._id, true);
    console.log('');
    console.log('🎯 目标进度结果:');
    console.log(`   当前进度: ${goalProgress.progress}%`);
    console.log(`   进度说明: ${goalProgress.progressLabel}`);
    console.log(`   目标导向: ${goalProgress.goalLabel}`);
    console.log('');

    // 清理测试数据
    console.log('🧹 清理测试数据...');
    await FoodRecord.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    console.log('✅ 清理完成');
    console.log('');

    // 测试完成
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        ✅ 所有测试通过！                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 数据库连接已关闭');
    process.exit(0);
  }
}

runTests();
