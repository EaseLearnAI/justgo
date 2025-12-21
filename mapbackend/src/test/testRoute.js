const RouteService = require('../services/routeService');

async function runRouteTest() {
  console.log('🧪 开始路由服务测试...');
  
  try {
    // 初始化路由服务
    const routeService = new RouteService();
    
    // 等待MCP客户端初始化
    console.log('⏳ 等待MCP客户端初始化...');
    // 在实际测试中，可能需要等待初始化完成
    
    // 模拟用户数据
    const mockUserData = {
      userId: "test-user-001",
      location: {
        lat: 39.908823,
        lng: 116.397470,
        city: "北京"
      },
      profile: {
        age: 28,
        gender: "male",
        height_cm: 175,
        weight_kg: 70
      },
      calorie_context: {
        today_estimated_intake: 220,
        historical_backlog: 1800,
        recommended_burn_cap: 250
      },
      exercise_constraints: {
        max_duration_min: 30,
        sport_type: "walking"
      },
      preferences: {
        route_style: ["沿水路线", "绿化多", "安静"],
        mood: "放松",
        preferredPostExerciseState: "relaxed"
      }
    };
    
    console.log('📄 测试用户数据:', JSON.stringify(mockUserData, null, 2));
    
    // 测试生成个性化路径
    console.log('📍 调用生成个性化路径...');
    const routeResult = await routeService.generatePersonalizedRoute(mockUserData);
    
    console.log('✅ 路径生成成功!');
    console.log('📋 路径详情:');
    console.log(JSON.stringify(routeResult, null, 2));
    
    // 测试根据用户ID生成路径
    console.log('📍 测试根据用户ID生成路径...');
    const userRouteResult = await routeService.generateRouteForUser(
      "test-user-001", 
      { preferredPostExerciseState: "moderate" }
    );
    
    console.log('✅ 用户路径生成成功!');
    console.log('📋 用户路径详情:');
    console.log(JSON.stringify(userRouteResult, null, 2));
    
    console.log('🎉 所有测试完成!');
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  runRouteTest();
}

module.exports = { runRouteTest };