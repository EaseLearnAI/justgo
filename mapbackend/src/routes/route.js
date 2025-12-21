const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { getUserLocation } = require('../services/locationService');
const { reverseGeocode } = require('../MCP/routeService');
const { generateExerciseRoute } = require('../MCP/routeService');
const FoodRecord = require('../models/FoodRecord');
const ExerciseRoute = require('../models/ExerciseRoute');

/**
 * @route   POST /api/route/generate
 * @desc    生成个性化运动路径
 * @access  Private
 */
router.post('/generate', protect, async (req, res, next) => {
  try {
    console.log('🚀 收到生成个性化路径请求');
    console.log('🔐 用户ID:', req.user._id);
    console.log('📄 请求体:', JSON.stringify(req.body, null, 2));
    
    const { preferences } = req.body;
    
    // 验证请求参数
    if (!preferences) {
      console.warn('❌ 请求参数缺失: preferences');
      return res.status(400).json({
        success: false,
        message: '缺少必要的参数: preferences'
      });
    }
    
    // 获取真实的用户数据
    const user = await User.findById(req.user._id);
    
    // 获取用户位置信息（优先从请求获取，否则使用IP定位）
    let location = await getUserLocation(req, user);
    console.log('📍 获取到的位置信息:', JSON.stringify(location, null, 2));
    
    // 如果城市信息是"未知"，调用逆地理编码获取城市信息
    if (!location.city || location.city === '未知') {
      console.log('📍 城市信息缺失，调用逆地理编码获取...');
      try {
        const regeoResult = await reverseGeocode(location.lat, location.lng);
        if (regeoResult.status === '1' && regeoResult.regeocode) {
          const addressComponent = regeoResult.regeocode.addressComponent;
          location.city = addressComponent?.city || addressComponent?.district || '未知';
          location.province = addressComponent?.province;
          location.address = regeoResult.regeocode.formatted_address;
          console.log('✅ 逆地理编码成功:', {
            city: location.city,
            province: location.province,
            address: location.address
          });
        }
      } catch (error) {
        console.warn('⚠️ 逆地理编码失败:', error.message);
      }
    }
    
    // 如果位置来源是请求或查询参数，更新用户数据库中的位置信息
    if ((location.source === 'request' || location.source === 'query') && user) {
      try {
        if (!user.location) {
          user.location = {};
        }
        user.location.lat = location.lat;
        user.location.lng = location.lng;
        user.location.city = location.city;
        await user.save();
        console.log('✅ 已更新用户数据库中的位置信息');
      } catch (error) {
        console.warn('⚠️ 更新用户位置信息失败:', error.message);
      }
    }
    
    // 获取今日统计信息
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = await FoodRecord.find({
      userId: req.user._id,
      time: { $gte: today }
    });
    
    const todayStats = {
      intake: todayRecords
        .filter(r => r.type === 'intake')
        .reduce((sum, r) => sum + (r.calories || 0), 0),
      consume: todayRecords
        .filter(r => r.type === 'consume')
        .reduce((sum, r) => sum + (r.calories || 0), 0)
    };
    
    // 准备运动选项
    const exerciseOptions = {
      sportType: preferences.sportType || 'walk',
      routePreferences: preferences.routeStyle || [],
      mood: preferences.mood || '放松'
    };
    
    // 生成个性化路径（使用 MCP/routeService.js 中的完整功能）
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   🗺️ 开始生成个性化运动路线                         ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    
    const routeData = await generateExerciseRoute(
      user,
      location,
      todayStats,
      exerciseOptions
    );
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   💾 开始保存路线到数据库                             ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    
    // 准备保存到数据库的路线数据
    const routeDistance = routeData.routeDetails?.distance || 0; // 米
    const routeDuration = routeData.routeDetails?.duration || 0; // 秒
    const estimatedCalories = routeData.routeSuggestion?.estimated_calories || 
      Math.round((routeDuration / 60) * 5.7); // 基于时间估算
    
    // 提取终点坐标（destination格式为"lng,lat"）
    let endLat = location.lat;
    let endLng = location.lng;
    
    if (routeData.routeDetails?.destination) {
      const destCoords = routeData.routeDetails.destination.split(',');
      if (destCoords.length >= 2) {
        endLng = parseFloat(destCoords[0]);
        endLat = parseFloat(destCoords[1]);
      }
    } else if (routeData.navigationUrl) {
      // 从导航URL中提取终点坐标
      const urlMatch = routeData.navigationUrl.match(/to=([^,]+),([^,&]+)/);
      if (urlMatch) {
        endLng = parseFloat(urlMatch[1]);
        endLat = parseFloat(urlMatch[2]);
      }
    }
    
    console.log('📊 路线数据摘要:');
    console.log('   距离:', (routeDistance / 1000).toFixed(2), 'km');
    console.log('   时长:', Math.round(routeDuration / 60), '分钟');
    console.log('   消耗:', estimatedCalories, 'kcal');
    console.log('   起点:', location.lat, ',', location.lng);
    console.log('   终点:', endLat, ',', endLng);
    
    // 调试：检查 nearbyPOIs 数据格式
    console.log('\n🔍 调试 nearbyPOIs 数据:');
    console.log('   - routeData.nearbyPOIs 类型:', typeof routeData.nearbyPOIs);
    console.log('   - 是否为数组:', Array.isArray(routeData.nearbyPOIs));
    if (routeData.nearbyPOIs) {
      if (Array.isArray(routeData.nearbyPOIs)) {
        console.log('   - 数组长度:', routeData.nearbyPOIs.length);
        if (routeData.nearbyPOIs.length > 0) {
          console.log('   - 第一个元素类型:', typeof routeData.nearbyPOIs[0]);
          console.log('   - 第一个元素:', JSON.stringify(routeData.nearbyPOIs[0], null, 2));
        }
      } else {
        console.log('   ⚠️ 不是数组，实际值:', String(routeData.nearbyPOIs).substring(0, 200));
      }
    } else {
      console.log('   - routeData.nearbyPOIs 为空');
    }
    
    // 准备保存的数据（先构建完整对象）
    const routeToSave = {
      user: req.user._id,
      sportType: exerciseOptions.sportType || 'walk',
      distance: routeDistance,
      duration: routeDuration,
      estimatedCalories: estimatedCalories,
      startLocation: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || routeData.locationInfo?.address,
        city: location.city
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
        routeStyle: preferences.routeStyle || [],
        mood: preferences.mood,
        preferredPostExerciseState: preferences.preferredPostExerciseState
      },
      selectedPOI: routeData.routeDetails?.selectedPOI ? {
        name: routeData.routeDetails.selectedPOI.name,
        type: routeData.routeDetails.selectedPOI.type,
        distance: parseFloat(routeData.routeDetails.selectedPOI.distance) || 0
      } : null,
      status: 'generated'
    };
    
    // 处理 nearbyPOIs（单独处理，确保格式正确）
    let processedPOIs = [];
    try {
      let pois = routeData.nearbyPOIs || [];
      
      // 如果是字符串，尝试解析
      if (typeof pois === 'string') {
        try {
          pois = JSON.parse(pois);
        } catch (e) {
          console.warn('⚠️ 无法解析 nearbyPOIs 字符串');
          pois = [];
        }
      }
      
      // 确保是数组
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
      
      console.log('✅ nearbyPOIs 处理完成:', processedPOIs.length, '个有效POI');
    } catch (poiError) {
      console.error('❌ 处理 nearbyPOIs 失败:', poiError.message);
      processedPOIs = [];
    }
    
    // 添加到保存对象（确保是纯对象数组）
    routeToSave.nearbyPOIs = processedPOIs.map(poi => ({
      name: String(poi.name || ''),
      type: String(poi.type || ''),
      distance: Number(poi.distance) || 0,
      location: {
        lat: Number(poi.location?.lat || 0),
        lng: Number(poi.location?.lng || 0)
      },
      address: String(poi.address || '')
    }));
    
    // 最终验证
    console.log('🔍 保存前数据验证:');
    console.log('   - nearbyPOIs 类型:', typeof routeToSave.nearbyPOIs);
    console.log('   - nearbyPOIs 是否为数组:', Array.isArray(routeToSave.nearbyPOIs));
    console.log('   - nearbyPOIs 长度:', routeToSave.nearbyPOIs.length);
    if (routeToSave.nearbyPOIs.length > 0) {
      console.log('   - 第一个POI类型:', typeof routeToSave.nearbyPOIs[0]);
      console.log('   - 第一个POI:', JSON.stringify(routeToSave.nearbyPOIs[0], null, 2));
    }
    console.log('   - navigationUrl:', routeToSave.navigationUrl ? '已设置' : '未设置');
    
    // 保存路线到数据库（使用 new ExerciseRoute() 确保数据格式正确）
    let savedRoute;
    try {
      // 确保所有数据都是纯 JavaScript 对象
      const cleanRouteData = {
        user: routeToSave.user,
        sportType: String(routeToSave.sportType || 'walk'),
        distance: Number(routeToSave.distance || 0),
        duration: Number(routeToSave.duration || 0),
        estimatedCalories: Number(routeToSave.estimatedCalories || 0),
        startLocation: {
          lat: Number(routeToSave.startLocation?.lat || 0),
          lng: Number(routeToSave.startLocation?.lng || 0),
          address: routeToSave.startLocation?.address ? String(routeToSave.startLocation.address) : undefined,
          city: routeToSave.startLocation?.city ? String(routeToSave.startLocation.city) : undefined
        },
        endLocation: {
          lat: Number(routeToSave.endLocation?.lat || 0),
          lng: Number(routeToSave.endLocation?.lng || 0),
          poiName: routeToSave.endLocation?.poiName ? String(routeToSave.endLocation.poiName) : undefined,
          poiType: routeToSave.endLocation?.poiType ? String(routeToSave.endLocation.poiType) : undefined
        },
        navigationUrl: String(routeToSave.navigationUrl || ''),
        routeDescription: routeToSave.routeDescription ? String(routeToSave.routeDescription) : undefined,
        routeHighlights: Array.isArray(routeToSave.routeHighlights) 
          ? routeToSave.routeHighlights.map(h => String(h))
          : [],
        safetyTips: Array.isArray(routeToSave.safetyTips)
          ? routeToSave.safetyTips.map(t => String(t))
          : [],
        motivationalMessage: routeToSave.motivationalMessage ? String(routeToSave.motivationalMessage) : undefined,
        preferences: {
          routeStyle: Array.isArray(routeToSave.preferences?.routeStyle)
            ? routeToSave.preferences.routeStyle.map(s => String(s))
            : [],
          mood: routeToSave.preferences?.mood ? String(routeToSave.preferences.mood) : undefined,
          preferredPostExerciseState: routeToSave.preferences?.preferredPostExerciseState 
            ? String(routeToSave.preferences.preferredPostExerciseState) 
            : undefined
        },
        nearbyPOIs: routeToSave.nearbyPOIs, // 已经是处理好的纯对象数组
        selectedPOI: routeToSave.selectedPOI ? {
          name: String(routeToSave.selectedPOI.name || ''),
          type: String(routeToSave.selectedPOI.type || ''),
          distance: Number(routeToSave.selectedPOI.distance || 0)
        } : undefined,
        status: 'started' // 生成路线即代表开始运动
      };
      
      const routeDoc = new ExerciseRoute(cleanRouteData);
      savedRoute = await routeDoc.save();
      
      // 设置开始时间
      savedRoute.startedAt = new Date();
      await savedRoute.save();
      
      console.log('✅ 路线已保存到数据库（状态：started）');
      console.log('   📝 路线ID:', savedRoute._id);
      console.log('   📅 生成时间:', savedRoute.generatedAt);
      console.log('   📅 开始时间:', savedRoute.startedAt);
      console.log('   📊 保存的数据:');
      console.log('      - 距离:', savedRoute.distance, '米');
      console.log('      - 时长:', savedRoute.duration, '秒');
      console.log('      - 消耗:', savedRoute.estimatedCalories, 'kcal');
      console.log('      - 状态:', savedRoute.status);
      console.log('      - POI数量:', savedRoute.nearbyPOIs?.length || 0);
      console.log('      - 导航链接:', savedRoute.navigationUrl ? '已保存' : '未保存');
      
      // 立即创建消耗记录和更新统计
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║                                                       ║');
      console.log('║   💾 创建消耗记录和更新统计                           ║');
      console.log('║                                                       ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      
      const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
      const exerciseName = typeNames[savedRoute.sportType] || '运动消耗';
      
      // 检查是否已存在今日的消耗记录（避免重复创建）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingRecord = await FoodRecord.findOne({
        user: req.user._id,
        type: 'consume',
        exerciseType: savedRoute.sportType,
        time: { $gte: today, $lt: tomorrow },
        'metadata.routeId': savedRoute._id
      });
      
      let consumeRecord;
      if (existingRecord) {
        // 如果已存在，更新它
        existingRecord.calories = savedRoute.estimatedCalories;
        existingRecord.duration = Math.round(savedRoute.duration / 60);
        existingRecord.distance = parseFloat((savedRoute.distance / 1000).toFixed(2));
        await existingRecord.save();
        consumeRecord = existingRecord;
        console.log('✅ 已更新现有消耗记录');
      } else {
        // 创建新的消耗记录
        consumeRecord = await FoodRecord.create({
          user: req.user._id,
          name: exerciseName,
          calories: savedRoute.estimatedCalories,
          type: 'consume',
          duration: Math.round(savedRoute.duration / 60), // 分钟
          distance: parseFloat((savedRoute.distance / 1000).toFixed(2)), // 公里
          exerciseType: savedRoute.sportType,
          metadata: { routeId: savedRoute._id },
          time: new Date()
        });
        console.log('✅ 已创建消耗记录');
        console.log('   📝 记录ID:', consumeRecord._id);
        console.log('   🔥 消耗:', consumeRecord.calories, 'kcal');
        console.log('   ⏱️ 时长:', consumeRecord.duration, '分钟');
        console.log('   📏 距离:', consumeRecord.distance, 'km');
      }
      
      // 更新用户累计统计
      const user = await User.findById(req.user._id);
      if (user && user.totalStats) {
        user.totalStats.totalCaloriesBurned = (user.totalStats.totalCaloriesBurned || 0) + savedRoute.estimatedCalories;
        user.totalStats.totalExerciseMinutes = (user.totalStats.totalExerciseMinutes || 0) + Math.round(savedRoute.duration / 60);
        user.totalStats.totalDistance = (user.totalStats.totalDistance || 0) + parseFloat((savedRoute.distance / 1000).toFixed(2));
        await user.save();
        console.log('✅ 已更新用户累计统计');
        console.log('   📊 累计消耗:', user.totalStats.totalCaloriesBurned, 'kcal');
        console.log('   📊 累计时长:', user.totalStats.totalExerciseMinutes, '分钟');
        console.log('   📊 累计距离:', user.totalStats.totalDistance, 'km');
      }
      
    } catch (saveError) {
      console.error('❌ 保存路线到数据库失败:', saveError.message);
      console.error('   错误堆栈:', saveError.stack);
      
      // 输出详细的错误信息
      if (saveError.errors) {
        console.error('   验证错误详情:');
        Object.keys(saveError.errors).forEach(key => {
          console.error(`      ${key}:`, saveError.errors[key].message);
        });
      }
      
      // 输出尝试保存的数据（用于调试）
      console.error('   尝试保存的 nearbyPOIs 数据:');
      try {
        const testPOIs = (routeData.nearbyPOIs || []);
        console.error('      - 类型:', typeof testPOIs, Array.isArray(testPOIs) ? '(数组)' : '(非数组)');
        console.error('      - 长度:', testPOIs.length);
        if (testPOIs.length > 0) {
          console.error('      - 第一个元素类型:', typeof testPOIs[0]);
          console.error('      - 第一个元素:', JSON.stringify(testPOIs[0], null, 2));
        }
      } catch (e) {
        console.error('      - 无法检查数据:', e.message);
      }
      
      // 不阻止响应，但记录错误
      savedRoute = null; // 确保 savedRoute 为 null
    }
    
    // 获取估算消耗（优先使用routeSuggestion中的，否则使用计算的）
    const responseEstimatedCalories = routeData.routeSuggestion?.estimated_calories || 
      (savedRoute?.estimatedCalories || Math.round((Math.round(routeDuration / 60)) * 5.7));
    
    // 转换数据格式以匹配前端期望
    const responseData = {
      routeId: savedRoute?._id?.toString(), // 返回路线ID，前端可以用来更新状态
      thinkingProcess: routeData.routeSuggestion?.description || routeData.motivation || '',
      routeSuggestion: {
        distance_km: routeData.routeSuggestion?.distance_km || (routeDistance / 1000).toFixed(2),
        duration_min: routeData.routeSuggestion?.duration_min || Math.round(routeDuration / 60),
        sportType: routeData.routeSuggestion?.sport_type || 'walking',
        intensity: routeData.routeSuggestion?.intensity_level || 'moderate',
        description: routeData.routeSuggestion?.route_description || routeData.routeSuggestion?.description || '',
        estimated_calories: responseEstimatedCalories // 添加估算消耗字段
      },
      routeDetails: {
        direction: routeData.routeSuggestion?.route_highlights?.[0] || 'northeast',
        landmarks: routeData.routeSuggestion?.route_highlights || [],
        terrain: 'flat',
        difficulty: 'easy',
        distance: routeDistance ? `${(routeDistance / 1000).toFixed(2)} km` : '0 km',
        duration: routeDuration ? `${Math.round(routeDuration / 60)} 分钟` : '0 分钟'
      },
      motivationalMessage: routeData.motivation || '开始你的运动之旅吧！',
      safetyTips: routeData.routeSuggestion?.safety_tips || ['注意安全', '保持水分补充'],
      navigation: {
        distance_km: parseFloat((routeDistance / 1000).toFixed(2)),
        duration_min: Math.round(routeDuration / 60),
        routeDetails: {
          direction: routeData.routeSuggestion?.route_highlights?.[0] || 'northeast',
          landmarks: routeData.routeSuggestion?.route_highlights || [],
          terrain: 'flat',
          difficulty: 'easy',
          distance: routeDistance,
          duration: routeDuration
        }
      },
      // 额外信息
      nearbyPOIs: routeData.nearbyPOIs || [],
      locationInfo: routeData.locationInfo || null,
      navigationUrl: routeData.navigationUrl || null, // 实际的导航链接（重要！）
      selectedPOI: routeData.routeDetails?.selectedPOI || null
    };
    
    // 确保导航链接存在
    if (!responseData.navigationUrl && routeData.navigationUrl) {
      responseData.navigationUrl = routeData.navigationUrl;
      console.log('✅ 已添加导航链接到响应数据');
    }
    
    console.log('📤 返回数据检查:');
    console.log('   - routeId:', responseData.routeId ? '已设置' : '未设置');
    console.log('   - navigationUrl:', responseData.navigationUrl ? '已设置' : '未设置');
    if (responseData.navigationUrl) {
      console.log('   - 导航链接:', responseData.navigationUrl.substring(0, 100) + '...');
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   ✅ 个性化路径生成并保存成功                       ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('📤 返回给前端的数据:');
    console.log('   - 路线ID:', responseData.routeId);
    console.log('   - 距离:', responseData.navigation.distance_km, 'km');
    console.log('   - 时长:', responseData.navigation.duration_min, '分钟');
    console.log('   - 消耗:', responseEstimatedCalories, 'kcal');
    console.log('   - 导航链接:', responseData.navigationUrl ? '已生成' : '未生成');
    
    res.status(200).json({
      success: true,
      message: '个性化路径生成成功',
      data: responseData,
      location: location  // 返回使用的位置信息，方便前端调试
    });
  } catch (error) {
    console.error('❌ 生成个性化路径失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/route/:routeId/start
 * @desc    开始运动（更新路线状态为started）
 * @access  Private
 */
router.post('/:routeId/start', protect, async (req, res, next) => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   🏃 用户开始运动                                     ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('🔐 用户ID:', req.user._id);
    console.log('📝 路线ID:', req.params.routeId);
    
    const route = await ExerciseRoute.findOne({
      _id: req.params.routeId,
      user: req.user._id
    });
    
    if (!route) {
      console.log('❌ 路线不存在或不属于该用户');
      return res.status(404).json({
        success: false,
        message: '路线不存在'
      });
    }
    
    // 更新路线状态为已开始
    await route.start();
    
    console.log('✅ 路线状态已更新为started');
    console.log('   📅 开始时间:', route.startedAt);
    console.log('   📊 路线信息:');
    console.log('      - 距离:', (route.distance / 1000).toFixed(2), 'km');
    console.log('      - 预计时长:', Math.round(route.duration / 60), '分钟');
    console.log('      - 预计消耗:', route.estimatedCalories, 'kcal');
    
    // 创建消耗记录（使用估算值，运动完成后会更新为实际值）
    const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
    const exerciseName = typeNames[route.sportType] || '运动消耗';
    
    // 检查是否已存在今日的消耗记录（避免重复创建）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingRecord = await FoodRecord.findOne({
      user: req.user._id,
      type: 'consume',
      name: exerciseName,
      time: { $gte: today, $lt: tomorrow },
      exerciseType: route.sportType
    });
    
    let consumeRecord;
    if (existingRecord) {
      // 如果已存在，更新它
      existingRecord.calories = route.estimatedCalories;
      existingRecord.duration = Math.round(route.duration / 60);
      existingRecord.distance = (route.distance / 1000).toFixed(2);
      await existingRecord.save();
      consumeRecord = existingRecord;
      console.log('✅ 已更新现有消耗记录');
    } else {
      // 创建新的消耗记录
      consumeRecord = await FoodRecord.create({
        user: req.user._id,
        name: exerciseName,
        calories: route.estimatedCalories,
        type: 'consume',
        duration: Math.round(route.duration / 60), // 分钟
        distance: (route.distance / 1000).toFixed(2), // 公里
        exerciseType: route.sportType,
        time: new Date()
      });
      console.log('✅ 已创建消耗记录');
    }
    
    // 更新用户累计统计
    const user = await User.findById(req.user._id);
    if (user.totalStats) {
      user.totalStats.totalCaloriesBurned = (user.totalStats.totalCaloriesBurned || 0) + route.estimatedCalories;
      user.totalStats.totalExerciseMinutes = (user.totalStats.totalExerciseMinutes || 0) + Math.round(route.duration / 60);
      user.totalStats.totalDistance = (user.totalStats.totalDistance || 0) + parseFloat((route.distance / 1000).toFixed(2));
      await user.save();
      console.log('✅ 已更新用户累计统计');
      console.log('   - 累计消耗:', user.totalStats.totalCaloriesBurned, 'kcal');
      console.log('   - 累计时长:', user.totalStats.totalExerciseMinutes, '分钟');
      console.log('   - 累计距离:', user.totalStats.totalDistance, 'km');
    }
    
    res.status(200).json({
      success: true,
      message: '运动已开始',
      data: {
        routeId: route._id,
        status: route.status,
        startedAt: route.startedAt,
        estimatedCalories: route.estimatedCalories,
        recordId: consumeRecord._id
      }
    });
  } catch (error) {
    console.error('❌ 更新路线状态失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/route/:routeId/complete
 * @desc    完成运动（更新路线状态为completed）
 * @access  Private
 */
router.post('/:routeId/complete', protect, async (req, res, next) => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   ✅ 用户完成运动                                     ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('🔐 用户ID:', req.user._id);
    console.log('📝 路线ID:', req.params.routeId);
    console.log('📄 请求体:', JSON.stringify(req.body, null, 2));
    
    const { actualDistance, actualDuration, actualCalories } = req.body;
    
    const route = await ExerciseRoute.findOne({
      _id: req.params.routeId,
      user: req.user._id
    });
    
    if (!route) {
      console.log('❌ 路线不存在或不属于该用户');
      return res.status(404).json({
        success: false,
        message: '路线不存在'
      });
    }
    
    // 计算实际消耗（如果未提供）
    const finalCalories = actualCalories || 
      (actualDuration ? Math.round((actualDuration / 60) * 5.7) : route.estimatedCalories);
    
    // 更新路线状态为已完成
    await route.complete({
      distance: actualDistance || route.distance,
      duration: actualDuration || route.duration,
      calories: finalCalories
    });
    
    // 创建消耗记录
    const FoodRecord = require('../models/FoodRecord');
    const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
    
    await FoodRecord.create({
      user: req.user._id,
      name: typeNames[route.sportType] || '运动消耗',
      calories: finalCalories,
      type: 'consume',
      duration: Math.round((actualDuration || route.duration) / 60),
      distance: ((actualDistance || route.distance) / 1000).toFixed(2),
      exerciseType: route.sportType
    });
    
    console.log('✅ 运动完成记录已保存');
    console.log('   📅 完成时间:', route.completedAt);
    console.log('   📊 实际数据:');
    console.log('      - 距离:', ((actualDistance || route.distance) / 1000).toFixed(2), 'km');
    console.log('      - 时长:', Math.round((actualDuration || route.duration) / 60), '分钟');
    console.log('      - 消耗:', finalCalories, 'kcal');
    
    res.status(200).json({
      success: true,
      message: '运动已完成',
      data: {
        routeId: route._id,
        status: route.status,
        completedAt: route.completedAt,
        actualDistance: actualDistance || route.distance,
        actualDuration: actualDuration || route.duration,
        actualCalories: finalCalories
      }
    });
  } catch (error) {
    console.error('❌ 完成运动失败:', error);
    next(error);
  }
});

/**
 * @route   GET /api/route/health
 * @desc    检查路由服务健康状态
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    console.log('❤️ 收到路由服务健康检查请求');
    
    // 检查MCP客户端连接状态
    const isMCPConnected = routeService.mcpClient ? true : false;
    
    console.log('✅ 路由服务健康检查完成');
    res.status(200).json({
      success: true,
      message: '路由服务运行正常',
      data: {
        mcpConnected: isMCPConnected,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 路由服务健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '路由服务健康检查失败',
      error: error.message
    });
  }
});

module.exports = router;