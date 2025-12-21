/**
 * AI 热量分析 API 测试脚本
 * 
 * 使用说明：
 * 1. 确保后端服务正在运行 (npm start)
 * 2. 运行测试: node src/test/testAI.js
 */

const BASE_URL = 'http://localhost:3000';

// 测试用户凭证
let authToken = '';
const testUser = {
  phone: '13800138001',
  password: '123456'
};

/**
 * 发起 HTTP 请求
 */
const request = async (method, path, data = null, needAuth = false) => {
  console.log('-----------------------------------');
  console.log(`📤 ${method} ${path}`);
  if (data) console.log('📝 请求数据:', JSON.stringify(data, null, 2));
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (needAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const result = await response.json();
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));
    
    return { status: response.status, data: result };
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return { status: 500, error: error.message };
  }
};

/**
 * 测试: 注册/登录获取 Token
 */
const testAuth = async () => {
  console.log('\n===================================');
  console.log('🔐 测试 1: 用户认证');
  console.log('===================================');
  
  // 尝试登录
  console.log('\n📌 尝试登录...');
  let result = await request('POST', '/api/auth/login', testUser);
  
  if (result.data.success) {
    authToken = result.data.data.token;
    console.log('✅ 登录成功!');
    return true;
  }
  
  // 登录失败则注册
  console.log('\n📌 登录失败，尝试注册...');
  result = await request('POST', '/api/auth/register', testUser);
  
  if (result.data.success) {
    authToken = result.data.data.token;
    console.log('✅ 注册成功!');
    return true;
  }
  
  console.error('❌ 认证失败');
  return false;
};

/**
 * 测试: 食物热量分析（预览模式）
 */
const testAnalyzeOnly = async () => {
  console.log('\n===================================');
  console.log('🔍 测试 2: 热量分析（预览模式）');
  console.log('===================================');
  
  const testCases = [
    { text: '我早上吃了一个包子和一个鸡蛋', type: 'food' },
    { text: '我跑步30分钟', type: 'exercise' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📌 测试: ${testCase.text} (类型: ${testCase.type})`);
    const result = await request('POST', '/api/ai/analyze-only', testCase, true);
    
    if (result.data.success) {
      console.log('✅ 分析成功!');
    } else {
      console.log('⚠️ 分析失败:', result.data.message);
    }
  }
};

/**
 * 测试: 食物热量分析并保存
 */
const testAnalyzeFood = async () => {
  console.log('\n===================================');
  console.log('🍽️ 测试 3: 食物热量分析并保存');
  console.log('===================================');
  
  const testCases = [
    '我今天早上吃了一个包子和一个鸡蛋',
    '午餐吃了一碗米饭和红烧肉',
    '喝了一杯拿铁咖啡'
  ];
  
  for (const text of testCases) {
    console.log(`\n📌 测试: ${text}`);
    const result = await request('POST', '/api/ai/analyze-food', { 
      text, 
      autoSave: true 
    }, true);
    
    if (result.data.success) {
      console.log('✅ 分析并保存成功!');
      console.log('📊 总热量:', result.data.data.totalCalories, 'kcal');
      console.log('💾 保存记录数:', result.data.data.savedRecords?.length || 0);
    } else {
      console.log('⚠️ 分析失败:', result.data.message);
    }
  }
};

/**
 * 测试: 运动消耗分析并保存
 */
const testAnalyzeExercise = async () => {
  console.log('\n===================================');
  console.log('🏃 测试 4: 运动消耗分析并保存');
  console.log('===================================');
  
  const testCases = [
    '我跑步了5公里，用时30分钟',
    '骑自行车1小时',
    '做了40分钟瑜伽'
  ];
  
  for (const text of testCases) {
    console.log(`\n📌 测试: ${text}`);
    const result = await request('POST', '/api/ai/analyze-exercise', { 
      text, 
      autoSave: true 
    }, true);
    
    if (result.data.success) {
      console.log('✅ 分析并保存成功!');
      console.log('🔥 消耗热量:', result.data.data.totalCalories, 'kcal');
      console.log('⏱️ 总时长:', result.data.data.totalDuration, '分钟');
      console.log('💾 保存记录数:', result.data.data.savedRecords?.length || 0);
    } else {
      console.log('⚠️ 分析失败:', result.data.message);
    }
  }
};

/**
 * 测试: 获取今日记录验证
 */
const testGetTodayRecords = async () => {
  console.log('\n===================================');
  console.log('📋 测试 5: 获取今日记录');
  console.log('===================================');
  
  const result = await request('GET', '/api/records/today', null, true);
  
  if (result.data.success) {
    console.log('✅ 获取成功!');
    console.log('📊 今日记录数:', result.data.data.records?.length || 0);
  } else {
    console.log('⚠️ 获取失败:', result.data.message);
  }
};

/**
 * 测试: 获取今日统计
 */
const testGetTodayStats = async () => {
  console.log('\n===================================');
  console.log('📊 测试 6: 获取今日统计');
  console.log('===================================');
  
  const result = await request('GET', '/api/records/today/stats', null, true);
  
  if (result.data.success) {
    console.log('✅ 获取成功!');
    console.log('📈 今日摄入:', result.data.data.intake, 'kcal');
    console.log('📉 今日消耗:', result.data.data.consume, 'kcal');
    console.log('📊 净摄入:', result.data.data.net, 'kcal');
  } else {
    console.log('⚠️ 获取失败:', result.data.message);
  }
};

/**
 * 运行所有测试
 */
const runAllTests = async () => {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   🧪 AI 热量分析 API 测试                             ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  // 1. 认证测试
  const authSuccess = await testAuth();
  if (!authSuccess) {
    console.error('\n❌ 认证失败，无法继续测试');
    return;
  }
  
  // 2. 预览模式分析
  await testAnalyzeOnly();
  
  // 3. 食物热量分析
  await testAnalyzeFood();
  
  // 4. 运动消耗分析
  await testAnalyzeExercise();
  
  // 5. 获取今日记录
  await testGetTodayRecords();
  
  // 6. 获取今日统计
  await testGetTodayStats();
  
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   ✅ 所有测试完成                                     ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
};

// 运行测试
runAllTests().catch(console.error);
