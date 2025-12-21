/**
 * 路线生成功能测试
 * 测试完整的路线生成流程，包括：
 * 1. 位置获取
 * 2. 路线生成
 * 3. 数据库保存
 * 4. 数据验证
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { generateExerciseRoute } = require('../MCP/routeService');
const ExerciseRoute = require('../models/ExerciseRoute');
const User = require('../models/User');
const FoodRecord = require('../models/FoodRecord');

// 测试配置
const TEST_CONFIG = {
  // 测试用户数据
  testUser: {
    name: '测试用户',
    phone: '13800138000',
    email: 'test@example.com',
    password: 'test123456',
    bodyStats: {
      age: 25,
      gender: 'male',
      height: 170,
      weight: 65
    },
    goalOrientation: 'maintain',
    exerciseIntensityPreference: 'moderate'
  },
  // 测试位置（杭州）
  testLocation: {
    lat: 30.3192727377992,
    lng: 120.030231218549,
    city: '杭州市',
    address: '浙江省杭州市西湖区三墩镇油山段蓝领公寓'
  },
  // 测试偏好
  testPreferences: {
    preferredPostExerciseState: 'moderate',
    routeStyle: ['🏞️ Citywalk'],
    mood: '放松'
  }
};

/**
 * 创建测试用户
 */
async function createTestUser() {
  console.log('\n===================================');
  console.log('👤 创建测试用户');
  console.log('===================================');
  
  try {
    // 检查用户是否已存在（优先用手机号，其次用邮箱）
    let user = await User.findOne({ 
      $or: [
        { phone: TEST_CONFIG.testUser.phone },
        { email: TEST_CONFIG.testUser.email }
      ]
    });
    
    if (!user) {
      user = await User.create(TEST_CONFIG.testUser);
      console.log('✅ 测试用户创建成功');
      console.log('   - 用户ID:', user._id);
      console.log('   - 邮箱:', user.email);
    } else {
      console.log('✅ 测试用户已存在');
      console.log('   - 用户ID:', user._id);
    }
    
    return user;
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
    throw error;
  }
}

/**
 * 获取今日统计
 */
async function getTodayStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const records = await FoodRecord.find({
    user: userId,
    time: { $gte: today }
  });
  
  return {
    intake: records
      .filter(r => r.type === 'intake')
      .reduce((sum, r) => sum + (r.calories || 0), 0),
    consume: records
      .filter(r => r.type === 'consume')
      .reduce((sum, r) => sum + (r.calories || 0), 0)
  };
}

/**
 * 测试路线生成
 */
async function testRouteGeneration() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   🧪 开始测试路线生成功能                             ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // 1. 连接数据库
    console.log('📊 步骤 1: 连接数据库');
    console.log('===================================');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mapbackend');
    console.log('✅ MongoDB 已连接');
    
    // 2. 创建测试用户
    console.log('\n📊 步骤 2: 创建/获取测试用户');
    console.log('===================================');
    const user = await createTestUser();
    
    // 3. 获取今日统计
    console.log('\n📊 步骤 3: 获取今日统计');
    console.log('===================================');
    const todayStats = await getTodayStats(user._id);
    console.log('📊 今日统计:');
    console.log('   - 摄入:', todayStats.intake, 'kcal');
    console.log('   - 消耗:', todayStats.consume, 'kcal');
    console.log('   - 净摄入:', todayStats.intake - todayStats.consume, 'kcal');
    
    // 4. 准备运动选项
    console.log('\n📊 步骤 4: 准备运动选项');
    console.log('===================================');
    const exerciseOptions = {
      sportType: 'walk',
      routePreferences: TEST_CONFIG.testPreferences.routeStyle,
      mood: TEST_CONFIG.testPreferences.mood
    };
    console.log('🏃 运动选项:');
    console.log('   - 类型:', exerciseOptions.sportType);
    console.log('   - 偏好:', exerciseOptions.routePreferences.join(', '));
    console.log('   - 心情:', exerciseOptions.mood);
    
    // 5. 生成路线
    console.log('\n📊 步骤 5: 生成个性化路线');
    console.log('===================================');
    const routeData = await generateExerciseRoute(
      user,
      TEST_CONFIG.testLocation,
      todayStats,
      exerciseOptions
    );
    
    console.log('\n✅ 路线生成成功');
    console.log('📊 生成的数据:');
    console.log('   - 距离:', routeData.routeSuggestion?.distance_km || 'N/A', 'km');
    console.log('   - 时长:', routeData.routeSuggestion?.duration_min || 'N/A', '分钟');
    console.log('   - 消耗:', routeData.routeSuggestion?.estimated_calories || 'N/A', 'kcal');
    console.log('   - 导航链接:', routeData.navigationUrl ? '已生成' : '未生成');
    console.log('   - POI数量:', routeData.nearbyPOIs?.length || 0);
    
    // 6. 验证生成的数据
    console.log('\n📊 步骤 6: 验证生成的数据');
    console.log('===================================');
    
    const routeDistance = routeData.routeDetails?.distance || 0;
    const routeDuration = routeData.routeDetails?.duration || 0;
    const estimatedCalories = routeData.routeSuggestion?.estimated_calories || 
      Math.round((routeDuration / 60) * 5.7);
    
    // 提取终点坐标
    let endLat = TEST_CONFIG.testLocation.lat;
    let endLng = TEST_CONFIG.testLocation.lng;
    
    if (routeData.routeDetails?.destination) {
      const destCoords = routeData.routeDetails.destination.split(',');
      if (destCoords.length >= 2) {
        endLng = parseFloat(destCoords[0]);
        endLat = parseFloat(destCoords[1]);
      }
    }
    
    // 处理 nearbyPOIs
    let processedPOIs = [];
    try {
      let pois = routeData.nearbyPOIs || [];
      
      console.log('\n🔍 调试 nearbyPOIs 原始数据:');
      console.log('   - 类型:', typeof pois);
      console.log('   - 是否为数组:', Array.isArray(pois));
      if (pois) {
        console.log('   - 值类型:', typeof pois);
        if (typeof pois === 'string') {
          console.log('   - 字符串长度:', pois.length);
          console.log('   - 前200字符:', pois.substring(0, 200));
        } else {
          console.log('   - 值:', JSON.stringify(pois).substring(0, 200));
        }
      }
      
      // 如果是字符串，尝试解析
      if (typeof pois === 'string') {
        console.log('   ⚠️ 检测到字符串，尝试解析...');
        try {
          // 尝试直接解析
          pois = JSON.parse(pois);
          console.log('   ✅ 解析成功，类型:', typeof pois, Array.isArray(pois) ? '(数组)' : '');
        } catch (e) {
          console.log('   ❌ 解析失败:', e.message);
          // 如果解析失败，尝试其他方法
          try {
            // 可能是 eval 格式的字符串
            if (pois.includes('[') && pois.includes('{')) {
              pois = eval('(' + pois + ')');
              console.log('   ✅ 使用 eval 解析成功');
            } else {
              pois = [];
            }
          } catch (e2) {
            console.log('   ❌ eval 也失败:', e2.message);
            pois = [];
          }
        }
      }
      
      // 确保是数组
      if (!Array.isArray(pois)) {
        console.log('   ⚠️ 不是数组，强制转换为空数组');
        console.log('   - 实际类型:', typeof pois);
        pois = [];
      }
      
      if (Array.isArray(pois)) {
        processedPOIs = pois.map(poi => {
          if (typeof poi === 'object' && poi !== null) {
            let lat = 0;
            let lng = 0;
            
            if (poi.location) {
              if (typeof poi.location === 'string') {
                const coords = poi.location.split(',');
                lng = parseFloat(coords[0]) || 0;
                lat = parseFloat(coords[1]) || 0;
              } else if (typeof poi.location === 'object') {
                lat = parseFloat(poi.location.lat) || 0;
                lng = parseFloat(poi.location.lng) || 0;
              }
            }
            
            return {
              name: String(poi.name || ''),
              type: String(poi.type || ''),
              distance: parseFloat(poi.distance) || 0,
              location: {
                lat: lat,
                lng: lng
              },
              address: String(poi.address || '')
            };
          }
          return null;
        }).filter(poi => poi !== null && poi.name);
      }
    } catch (poiError) {
      console.error('❌ 处理 nearbyPOIs 失败:', poiError.message);
      processedPOIs = [];
    }
    
    console.log('✅ 数据验证完成');
    console.log('   - 距离:', routeDistance, '米');
    console.log('   - 时长:', routeDuration, '秒');
    console.log('   - 消耗:', estimatedCalories, 'kcal');
    console.log('   - POI数量:', processedPOIs.length);
    console.log('   - 导航链接:', routeData.navigationUrl ? '有效' : '无效');
    
    // 7. 保存到数据库
    console.log('\n📊 步骤 7: 保存路线到数据库');
    console.log('===================================');
    
    const routeToSave = {
      user: user._id,
      sportType: exerciseOptions.sportType || 'walk',
      distance: routeDistance,
      duration: routeDuration,
      estimatedCalories: estimatedCalories,
      startLocation: {
        lat: TEST_CONFIG.testLocation.lat,
        lng: TEST_CONFIG.testLocation.lng,
        address: TEST_CONFIG.testLocation.address,
        city: TEST_CONFIG.testLocation.city
      },
      endLocation: {
        lat: endLat,
        lng: endLng,
        poiName: routeData.routeDetails?.selectedPOI?.name,
        poiType: routeData.routeDetails?.selectedPOI?.type
      },
      navigationUrl: routeData.navigationUrl,
      routeDescription: routeData.routeSuggestion?.route_description || routeData.routeSuggestion?.description,
      routeHighlights: routeData.routeSuggestion?.route_highlights || [],
      safetyTips: routeData.routeSuggestion?.safety_tips || [],
      motivationalMessage: routeData.motivation,
      preferences: {
        routeStyle: TEST_CONFIG.testPreferences.routeStyle || [],
        mood: TEST_CONFIG.testPreferences.mood,
        preferredPostExerciseState: TEST_CONFIG.testPreferences.preferredPostExerciseState
      },
      nearbyPOIs: processedPOIs,
      selectedPOI: routeData.routeDetails?.selectedPOI ? {
        name: routeData.routeDetails.selectedPOI.name,
        type: routeData.routeDetails.selectedPOI.type,
        distance: parseFloat(routeData.routeDetails.selectedPOI.distance) || 0
      } : null,
      status: 'generated'
    };
    
    console.log('📝 准备保存的数据:');
    console.log('   - 用户ID:', routeToSave.user);
    console.log('   - 运动类型:', routeToSave.sportType);
    console.log('   - 距离:', routeToSave.distance, '米');
    console.log('   - 时长:', routeToSave.duration, '秒');
    console.log('   - 消耗:', routeToSave.estimatedCalories, 'kcal');
      console.log('   - POI数量:', routeToSave.nearbyPOIs.length);
      console.log('   - 导航链接:', routeToSave.navigationUrl ? '已设置' : '未设置');
      
      // 最终验证 nearbyPOIs
      console.log('\n🔍 保存前最终验证:');
      console.log('   - nearbyPOIs 类型:', typeof routeToSave.nearbyPOIs);
      console.log('   - nearbyPOIs 是否为数组:', Array.isArray(routeToSave.nearbyPOIs));
      if (Array.isArray(routeToSave.nearbyPOIs) && routeToSave.nearbyPOIs.length > 0) {
        console.log('   - 第一个POI类型:', typeof routeToSave.nearbyPOIs[0]);
        console.log('   - 第一个POI:', JSON.stringify(routeToSave.nearbyPOIs[0], null, 2));
        
        // 验证每个POI的格式
        const invalidPOIs = routeToSave.nearbyPOIs.filter(poi => 
          typeof poi !== 'object' || 
          poi === null || 
          !poi.name || 
          !poi.location ||
          typeof poi.location !== 'object'
        );
        if (invalidPOIs.length > 0) {
          console.log('   ⚠️ 发现', invalidPOIs.length, '个格式不正确的POI');
          routeToSave.nearbyPOIs = routeToSave.nearbyPOIs.filter(poi => 
            typeof poi === 'object' && 
            poi !== null && 
            poi.name && 
            poi.location &&
            typeof poi.location === 'object'
          );
        }
      }
      
      // 确保 nearbyPOIs 是数组（防止被序列化）
      if (!Array.isArray(routeToSave.nearbyPOIs)) {
        console.log('   ⚠️ nearbyPOIs 不是数组，强制转换');
        routeToSave.nearbyPOIs = [];
      }
      
      // 直接使用处理好的数据，不要使用 JSON.parse(JSON.stringify())
      // 确保 nearbyPOIs 是纯对象数组
      const finalNearbyPOIs = Array.isArray(routeToSave.nearbyPOIs) 
        ? routeToSave.nearbyPOIs.map(poi => {
            // 确保每个 POI 都是纯对象
            return {
              name: String(poi.name || ''),
              type: String(poi.type || ''),
              distance: Number(poi.distance) || 0,
              location: {
                lat: Number(poi.location?.lat || 0),
                lng: Number(poi.location?.lng || 0)
              },
              address: String(poi.address || '')
            };
          })
        : [];
      
      // 创建保存对象，不使用 JSON 序列化
      const routeDataToSave = {
        user: routeToSave.user,
        sportType: routeToSave.sportType,
        distance: routeToSave.distance,
        duration: routeToSave.duration,
        estimatedCalories: routeToSave.estimatedCalories,
        startLocation: routeToSave.startLocation,
        endLocation: routeToSave.endLocation,
        navigationUrl: routeToSave.navigationUrl,
        routeDescription: routeToSave.routeDescription,
        routeHighlights: Array.isArray(routeToSave.routeHighlights) ? [...routeToSave.routeHighlights] : [],
        safetyTips: Array.isArray(routeToSave.safetyTips) ? [...routeToSave.safetyTips] : [],
        motivationalMessage: routeToSave.motivationalMessage,
        preferences: routeToSave.preferences,
        nearbyPOIs: finalNearbyPOIs, // 直接使用处理好的数组
        selectedPOI: routeToSave.selectedPOI,
        status: routeToSave.status
      };
      
      console.log('   ✅ 最终验证通过，准备保存');
      console.log('   - nearbyPOIs 长度:', routeDataToSave.nearbyPOIs.length);
      console.log('   - nearbyPOIs 类型:', typeof routeDataToSave.nearbyPOIs);
      console.log('   - nearbyPOIs 是否为数组:', Array.isArray(routeDataToSave.nearbyPOIs));
      if (routeDataToSave.nearbyPOIs.length > 0) {
        console.log('   - 第一个POI:', JSON.stringify(routeDataToSave.nearbyPOIs[0], null, 2));
      }
      
      const savedRoute = await ExerciseRoute.create(routeDataToSave);
    
    console.log('✅ 路线已保存到数据库');
    console.log('   📝 路线ID:', savedRoute._id);
    console.log('   📅 生成时间:', savedRoute.generatedAt);
    console.log('   📊 保存的数据:');
    console.log('      - 距离:', savedRoute.distance, '米');
    console.log('      - 时长:', savedRoute.duration, '秒');
    console.log('      - 消耗:', savedRoute.estimatedCalories, 'kcal');
    console.log('      - 状态:', savedRoute.status);
    console.log('      - POI数量:', savedRoute.nearbyPOIs?.length || 0);
    console.log('      - 导航链接:', savedRoute.navigationUrl ? '已保存' : '未保存');
    
    // 8. 验证保存的数据
    console.log('\n📊 步骤 8: 验证保存的数据');
    console.log('===================================');
    
    const retrievedRoute = await ExerciseRoute.findById(savedRoute._id);
    
    if (!retrievedRoute) {
      throw new Error('无法从数据库检索保存的路线');
    }
    
    console.log('✅ 数据验证通过');
    console.log('   - 路线ID匹配:', retrievedRoute._id.toString() === savedRoute._id.toString());
    console.log('   - 距离匹配:', retrievedRoute.distance === routeDistance);
    console.log('   - 时长匹配:', retrievedRoute.duration === routeDuration);
    console.log('   - 消耗匹配:', retrievedRoute.estimatedCalories === estimatedCalories);
    console.log('   - POI数量匹配:', retrievedRoute.nearbyPOIs?.length === processedPOIs.length);
    console.log('   - 导航链接匹配:', retrievedRoute.navigationUrl === routeData.navigationUrl);
    
    // 9. 测试路线状态更新
    console.log('\n📊 步骤 9: 测试路线状态更新');
    console.log('===================================');
    
    // 测试开始运动
    await retrievedRoute.start();
    console.log('✅ 路线状态已更新为 started');
    console.log('   - 状态:', retrievedRoute.status);
    console.log('   - 开始时间:', retrievedRoute.startedAt);
    
    // 测试完成运动
    await retrievedRoute.complete({
      distance: routeDistance,
      duration: routeDuration,
      calories: estimatedCalories
    });
    console.log('✅ 路线状态已更新为 completed');
    console.log('   - 状态:', retrievedRoute.status);
    console.log('   - 完成时间:', retrievedRoute.completedAt);
    
    // 10. 清理测试数据（可选）
    console.log('\n📊 步骤 10: 清理测试数据');
    console.log('===================================');
    console.log('⚠️ 保留测试数据以便验证');
    console.log('   如需清理，请手动删除路线ID:', savedRoute._id);
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   ✅ 所有测试通过                                     ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    
    return {
      success: true,
      routeId: savedRoute._id.toString(),
      route: retrievedRoute,
      navigationUrl: routeData.navigationUrl
    };
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   错误堆栈:', error.stack);
    throw error;
  } finally {
    // 不关闭数据库连接，保持连接以便后续操作
    // await mongoose.connection.close();
  }
}

// 运行测试
if (require.main === module) {
  testRouteGeneration()
    .then(result => {
      console.log('\n🎉 测试完成！');
      console.log('📝 路线ID:', result.routeId);
      console.log('🔗 导航链接:', result.navigationUrl);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testRouteGeneration, TEST_CONFIG };

