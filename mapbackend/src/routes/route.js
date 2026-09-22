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
    
    const { preferences } = req.body;
    
    // 验证请求参数
    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的参数: preferences'
      });
    }
    
    // 获取真实的用户数据
    const user = await User.findById(req.user._id);
    
    // 获取用户位置信息（优先从请求获取，否则使用IP定位）
    let location = await getUserLocation(req, user);
    
    // 如果城市信息是"未知"，调用逆地理编码获取城市信息
    if (!location.city || location.city === '未知') {
      try {
        const regeoResult = await reverseGeocode(location.lat, location.lng);
        if (regeoResult.status === '1' && regeoResult.regeocode) {
          const addressComponent = regeoResult.regeocode.addressComponent;
          location.city = addressComponent?.city || addressComponent?.district || '未知';
          location.province = addressComponent?.province;
          location.address = regeoResult.regeocode.formatted_address;
        }
      } catch (error) {
        // 逆地理编码失败，使用默认值
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
      } catch (error) {
        // 更新用户位置信息失败
      }
    }
    
    // 获取今日统计信息
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // FoodRecord 字段为 user（非 userId）
    const todayRecords = await FoodRecord.find({
      user: req.user._id,
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
    const routeData = await generateExerciseRoute(
      user,
      location,
      todayStats,
      exerciseOptions
    );
    
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
    
    
    // 调试：检查 nearbyPOIs 数据格式
    
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
      
    } catch (poiError) {
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
        // 生成仅落库候选；消耗只在 complete 入账（避免未完成双计）
        status: 'generated'
      };
      
      const routeDoc = new ExerciseRoute(cleanRouteData);
      savedRoute = await routeDoc.save();
      
    } catch (saveError) {
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
    }
    
    res.status(200).json({
      success: true,
      message: '个性化路径生成成功',
      data: responseData,
      location: location  // 返回使用的位置信息，方便前端调试
    });
  } catch (error) {
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
    const route = await ExerciseRoute.findOne({
      _id: req.params.routeId,
      user: req.user._id
    });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: '路线不存在'
      });
    }
    
    // 仅更新状态；热量消耗在 complete 唯一入账
    await route.start();
    
    res.status(200).json({
      success: true,
      message: '运动已开始',
      data: {
        routeId: route._id,
        status: route.status,
        startedAt: route.startedAt,
        estimatedCalories: route.estimatedCalories
      }
    });
  } catch (error) {
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
    const { actualDistance, actualDuration, actualCalories } = req.body;
    
    const route = await ExerciseRoute.findOne({
      _id: req.params.routeId,
      user: req.user._id
    });
    
    if (!route) {
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
    
    // complete 唯一入账（按 routeId upsert，避免重复）
    const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
    const durationMin = Math.round((actualDuration || route.duration) / 60);
    const distanceKm = parseFloat(((actualDistance || route.distance) / 1000).toFixed(2));

    let consumeRecord = await FoodRecord.findOne({
      user: req.user._id,
      type: 'consume',
      routeId: route._id
    });

    const wasNewConsume = !consumeRecord;
    if (consumeRecord) {
      consumeRecord.calories = finalCalories;
      consumeRecord.duration = durationMin;
      consumeRecord.distance = distanceKm;
      await consumeRecord.save();
    } else {
      consumeRecord = await FoodRecord.create({
        user: req.user._id,
        name: typeNames[route.sportType] || '运动消耗',
        calories: finalCalories,
        type: 'consume',
        duration: durationMin,
        distance: distanceKm,
        exerciseType: route.sportType,
        routeId: route._id,
        time: new Date()
      });
    }

    if (wasNewConsume) {
      const userDoc = await User.findById(req.user._id);
      if (userDoc?.totalStats) {
        userDoc.totalStats.totalCaloriesBurned =
          (userDoc.totalStats.totalCaloriesBurned || 0) + finalCalories;
        userDoc.totalStats.totalExerciseMinutes =
          (userDoc.totalStats.totalExerciseMinutes || 0) + durationMin;
        userDoc.totalStats.totalDistance =
          (userDoc.totalStats.totalDistance || 0) + distanceKm;
        await userDoc.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: '运动已完成',
      data: {
        routeId: route._id,
        status: route.status,
        completedAt: route.completedAt,
        actualDistance: actualDistance || route.distance,
        actualDuration: actualDuration || route.duration,
        actualCalories: finalCalories,
        recordId: consumeRecord._id
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/route/ip-location
 * @desc    通过 IP 地址获取用户位置
 * @access  Public
 */
router.get('/ip-location', async (req, res) => {
  try {
    const { getClientIP, isLocalIP, getLocationByIP } = require('../services/locationService');
    
    // 获取客户端 IP
    const clientIP = getClientIP(req);
    console.log('[IP定位] 客户端IP:', clientIP);
    
    // 检查是否为本地 IP
    if (isLocalIP(clientIP)) {
      console.log('[IP定位] 检测到本地IP，使用默认位置');
      return res.status(200).json({
        success: true,
        message: '本地IP，使用默认位置',
        data: {
          lat: 39.908823,
          lng: 116.397470,
          city: '北京',
          province: '北京',
          source: 'default',
          clientIP: clientIP
        }
      });
    }
    
    // 调用 IP 定位
    try {
      const location = await getLocationByIP(clientIP);
      console.log('[IP定位] 定位成功:', location);
      
      return res.status(200).json({
        success: true,
        message: 'IP定位成功',
        data: {
          lat: location.lat,
          lng: location.lng,
          city: location.city,
          province: location.province,
          address: location.address,
          adcode: location.adcode,
          source: 'ip_location',
          clientIP: clientIP
        }
      });
    } catch (ipError) {
      console.error('[IP定位] 定位失败:', ipError.message);
      // IP 定位失败，返回默认位置
      return res.status(200).json({
        success: true,
        message: 'IP定位失败，使用默认位置',
        data: {
          lat: 39.908823,
          lng: 116.397470,
          city: '北京',
          province: '北京',
          source: 'default',
          clientIP: clientIP,
          error: ipError.message
        }
      });
    }
  } catch (error) {
    console.error('[IP定位] 服务错误:', error);
    res.status(500).json({
      success: false,
      message: 'IP定位服务错误',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/route/health
 * @desc    检查路由服务健康状态
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // 主路径走 MapToolGateway + 高德 REST；真 MCP 适配为第二步，此处不谎报已连通
    const { AMAP_WEB_API } = require('../MCP/mcpConfig');
    res.status(200).json({
      success: true,
      message: '路由服务运行正常',
      data: {
        mapGateway: 'amap-rest',
        amapKeyConfigured: Boolean(AMAP_WEB_API.key),
        mcpConnected: false,
        mcpNote: 'AmapMcpAdapter 为第二步；勿将 services/routeService mock 视为已接通',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '路由服务健康检查失败',
      error: error.message
    });
  }
});

module.exports = router;