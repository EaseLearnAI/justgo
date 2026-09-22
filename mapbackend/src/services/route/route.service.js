/**
 * 路线域编排：定位 → 决策 →（可选）地图增强 → 落库
 */

const User = require('../../models/User');
const FoodRecord = require('../../models/FoodRecord');
const ExerciseRoute = require('../../models/ExerciseRoute');
const { getTodayStatsForRoute } = require('../statsService');
const { resolveLocation, canUseNearbyPOI } = require('./locationResolver');
const { decideExercisePlan } = require('./decision');
const { getCityPlaceHints } = require('./placeHints');
const { generateExerciseRoute, reverseGeocode } = require('../../MCP/routeService');
const { LOCATION_LEVEL } = require('../../config/constants');

/**
 * 缓存粗位置到 User.lastKnownLocation
 */
async function cacheLastKnownLocation(user, location) {
  if (!user || !location) return;
  try {
    const level = location.level || LOCATION_LEVEL.L1;
    // 仅缓存 L0/L1 或 IP 源；GPS 也可写入以便下次
    user.lastKnownLocation = {
      city: location.city,
      province: location.province,
      adcode: location.adcode,
      lat: location.lat,
      lng: location.lng,
      level,
      source: location.source,
      updatedAt: new Date()
    };
    await user.save();
  } catch (_) {
    // 非关键路径，忽略
  }
}

function processNearbyPOIs(rawPois) {
  let pois = rawPois || [];
  if (typeof pois === 'string') {
    try {
      pois = JSON.parse(pois);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(pois)) return [];

  return pois
    .map((poi) => {
      if (typeof poi !== 'object' || poi === null) return null;
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
        location: { lat, lng },
        address: String(poi.address || '')
      };
    })
    .filter((p) => p && p.name);
}

/**
 * 生成路线并落库（保持对外响应形状，增量 plan / location.level）
 */
async function generateAndPersist(req) {
  const user = await User.findById(req.user._id);
  if (!user) {
    const err = new Error('用户不存在');
    err.statusCode = 404;
    throw err;
  }

  const { preferences } = req.body;
  if (!preferences) {
    const err = new Error('缺少必要的参数: preferences');
    err.statusCode = 400;
    throw err;
  }

  let location = await resolveLocation(req, user);

  // L2+ 且城市未知时补逆地理；L1 不依赖假精点逆地理强行改城市
  if (
    canUseNearbyPOI(location) &&
    (!location.city || location.city === '未知')
  ) {
    try {
      const regeoResult = await reverseGeocode(location.lat, location.lng);
      if (regeoResult.status === '1' && regeoResult.regeocode) {
        const addressComponent = regeoResult.regeocode.addressComponent;
        location.city =
          addressComponent?.city || addressComponent?.district || location.city;
        location.province = addressComponent?.province || location.province;
        location.address = regeoResult.regeocode.formatted_address;
      }
    } catch (_) {
      /* ignore */
    }
  }

  await cacheLastKnownLocation(user, location);

  const todayStats = await getTodayStatsForRoute(req.user._id);
  const plan = decideExercisePlan({
    user,
    todayStats,
    preferences
  });

  const place = canUseNearbyPOI(location)
    ? { mode: 'nearby', hints: [], pois: [] }
    : getCityPlaceHints(location.adcode, preferences.routeStyle || []);

  const exerciseOptions = {
    sportType: preferences.sportType || plan.sportType || 'walk',
    routePreferences: preferences.routeStyle || [],
    mood: preferences.mood || '放松',
    // 决策引擎数字传入，LLM 不得突破
    decisionPlan: plan,
    skipNearbyPOI: !canUseNearbyPOI(location)
  };

  const routeData = await generateExerciseRoute(
    user,
    location,
    todayStats,
    exerciseOptions
  );

  // 若跳过 POI，用城市 hint 覆盖 nearbyPOIs 展示语义
  if (exerciseOptions.skipNearbyPOI) {
    routeData.nearbyPOIs = [];
    routeData.place = place;
  } else {
    routeData.place = {
      mode: 'nearby',
      hints: place.hints || [],
      pois: routeData.nearbyPOIs || []
    };
  }

  const routeDistance = routeData.routeDetails?.distance || 0;
  const routeDuration =
    routeData.routeDetails?.duration || plan.targetDuration * 60;
  const estimatedCalories =
    routeData.routeSuggestion?.estimated_calories ||
    plan.estimatedCalories ||
    Math.round(routeDuration / 60) * 5.7;

  let endLat = location.lat;
  let endLng = location.lng;
  if (routeData.routeDetails?.destination) {
    const destCoords = routeData.routeDetails.destination.split(',');
    if (destCoords.length >= 2) {
      endLng = parseFloat(destCoords[0]);
      endLat = parseFloat(destCoords[1]);
    }
  } else if (routeData.navigationUrl) {
    const urlMatch = routeData.navigationUrl.match(/to=([^,]+),([^,&]+)/);
    if (urlMatch) {
      endLng = parseFloat(urlMatch[1]);
      endLat = parseFloat(urlMatch[2]);
    }
  }

  const processedPOIs = processNearbyPOIs(routeData.nearbyPOIs);

  const cleanRouteData = {
    user: req.user._id,
    sportType: String(exerciseOptions.sportType || 'walk'),
    distance: Number(routeDistance || 0),
    duration: Number(routeDuration || 0),
    estimatedCalories: Number(estimatedCalories || 0),
    startLocation: {
      lat: Number(location.lat || 0),
      lng: Number(location.lng || 0),
      address: location.address
        ? String(location.address)
        : routeData.locationInfo?.address
          ? String(routeData.locationInfo.address)
          : undefined,
      city: location.city ? String(location.city) : undefined
    },
    endLocation: {
      lat: Number(endLat || 0),
      lng: Number(endLng || 0),
      poiName: routeData.routeDetails?.selectedPOI?.name
        ? String(routeData.routeDetails.selectedPOI.name)
        : undefined,
      poiType: routeData.routeDetails?.selectedPOI?.type
        ? String(routeData.routeDetails.selectedPOI.type)
        : undefined
    },
    navigationUrl: String(routeData.navigationUrl || ''),
    routeDescription: routeData.routeSuggestion?.route_description
      ? String(routeData.routeSuggestion.route_description)
      : routeData.routeSuggestion?.description
        ? String(routeData.routeSuggestion.description)
        : undefined,
    routeHighlights: Array.isArray(routeData.routeSuggestion?.route_highlights)
      ? routeData.routeSuggestion.route_highlights.map((h) => String(h))
      : [],
    safetyTips: Array.isArray(routeData.routeSuggestion?.safety_tips)
      ? routeData.routeSuggestion.safety_tips.map((t) => String(t))
      : [],
    motivationalMessage: routeData.motivation
      ? String(routeData.motivation)
      : undefined,
    preferences: {
      routeStyle: Array.isArray(preferences.routeStyle)
        ? preferences.routeStyle.map((s) => String(s))
        : [],
      mood: preferences.mood ? String(preferences.mood) : undefined,
      preferredPostExerciseState: preferences.preferredPostExerciseState
        ? String(preferences.preferredPostExerciseState)
        : undefined
    },
    nearbyPOIs: processedPOIs,
    selectedPOI: routeData.routeDetails?.selectedPOI
      ? {
          name: String(routeData.routeDetails.selectedPOI.name || ''),
          type: String(routeData.routeDetails.selectedPOI.type || ''),
          distance: Number(routeData.routeDetails.selectedPOI.distance || 0)
        }
      : undefined,
    status: 'started'
  };

  let savedRoute = null;
  try {
    const routeDoc = new ExerciseRoute(cleanRouteData);
    savedRoute = await routeDoc.save();
    savedRoute.startedAt = new Date();
    await savedRoute.save();

    const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
    const exerciseName = typeNames[savedRoute.sportType] || '运动消耗';

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

    if (existingRecord) {
      existingRecord.calories = savedRoute.estimatedCalories;
      existingRecord.duration = Math.round(savedRoute.duration / 60);
      existingRecord.distance = parseFloat(
        (savedRoute.distance / 1000).toFixed(2)
      );
      await existingRecord.save();
    } else {
      await FoodRecord.create({
        user: req.user._id,
        name: exerciseName,
        calories: savedRoute.estimatedCalories,
        type: 'consume',
        duration: Math.round(savedRoute.duration / 60),
        distance: parseFloat((savedRoute.distance / 1000).toFixed(2)),
        exerciseType: savedRoute.sportType,
        metadata: { routeId: savedRoute._id },
        time: new Date()
      });
    }

    const freshUser = await User.findById(req.user._id);
    if (freshUser?.totalStats) {
      freshUser.totalStats.totalCaloriesBurned =
        (freshUser.totalStats.totalCaloriesBurned || 0) +
        savedRoute.estimatedCalories;
      freshUser.totalStats.totalExerciseMinutes =
        (freshUser.totalStats.totalExerciseMinutes || 0) +
        Math.round(savedRoute.duration / 60);
      freshUser.totalStats.totalDistance =
        (freshUser.totalStats.totalDistance || 0) +
        parseFloat((savedRoute.distance / 1000).toFixed(2));
      await freshUser.save();
    }
  } catch (_) {
    savedRoute = null;
  }

  const responseEstimatedCalories =
    routeData.routeSuggestion?.estimated_calories ||
    savedRoute?.estimatedCalories ||
    plan.estimatedCalories;

  const responseData = {
    routeId: savedRoute?._id?.toString(),
    thinkingProcess:
      routeData.routeSuggestion?.description || routeData.motivation || '',
    routeSuggestion: {
      distance_km:
        routeData.routeSuggestion?.distance_km ||
        (routeDistance / 1000).toFixed(2),
      duration_min:
        routeData.routeSuggestion?.duration_min ||
        Math.round(routeDuration / 60) ||
        plan.targetDuration,
      sportType: routeData.routeSuggestion?.sport_type || sportTypeLabel(exerciseOptions.sportType),
      intensity:
        routeData.routeSuggestion?.intensity_level || plan.intensity,
      description:
        routeData.routeSuggestion?.route_description ||
        routeData.routeSuggestion?.description ||
        plan.reason,
      estimated_calories: responseEstimatedCalories
    },
    routeDetails: {
      direction: routeData.routeSuggestion?.route_highlights?.[0] || 'northeast',
      landmarks: routeData.routeSuggestion?.route_highlights || [],
      terrain: 'flat',
      difficulty: 'easy',
      distance: routeDistance
        ? `${(routeDistance / 1000).toFixed(2)} km`
        : '0 km',
      duration: routeDuration
        ? `${Math.round(routeDuration / 60)} 分钟`
        : `${plan.targetDuration} 分钟`
    },
    motivationalMessage: routeData.motivation || plan.reason,
    safetyTips: routeData.routeSuggestion?.safety_tips || [
      '注意安全',
      '保持水分补充'
    ],
    navigation: {
      distance_km: parseFloat((routeDistance / 1000).toFixed(2)),
      duration_min: Math.round(routeDuration / 60) || plan.targetDuration,
      routeDetails: {
        direction:
          routeData.routeSuggestion?.route_highlights?.[0] || 'northeast',
        landmarks: routeData.routeSuggestion?.route_highlights || [],
        terrain: 'flat',
        difficulty: 'easy',
        distance: routeDistance,
        duration: routeDuration
      }
    },
    nearbyPOIs: processedPOIs,
    locationInfo: routeData.locationInfo || null,
    navigationUrl: routeData.navigationUrl || null,
    selectedPOI: routeData.routeDetails?.selectedPOI || null,
    // 增量字段（向前兼容）
    plan: {
      sportType: plan.sportType,
      durationRange: plan.durationRange,
      calorieRange: plan.calorieRange,
      intensity: plan.intensity,
      reason: plan.reason,
      milestone: plan.milestone,
      isRecoveryDay: plan.isRecoveryDay
    },
    place: routeData.place || place,
    enhancements: {
      canUpgradeWithGps: !canUseNearbyPOI(location),
      navigationAvailable: Boolean(routeData.navigationUrl) && canUseNearbyPOI(location)
    }
  };

  return {
    responseData,
    location: {
      ...location,
      level: location.level || LOCATION_LEVEL.L1
    }
  };
}

function sportTypeLabel(sportType) {
  const map = { walk: 'walking', run: 'running', bike: 'biking' };
  return map[sportType] || 'walking';
}

/**
 * 开始运动
 */
async function startRoute(userId, routeId) {
  const route = await ExerciseRoute.findOne({ _id: routeId, user: userId });
  if (!route) {
    const err = new Error('路线不存在');
    err.statusCode = 404;
    throw err;
  }

  await route.start();

  const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
  const exerciseName = typeNames[route.sportType] || '运动消耗';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingRecord = await FoodRecord.findOne({
    user: userId,
    type: 'consume',
    name: exerciseName,
    time: { $gte: today, $lt: tomorrow },
    exerciseType: route.sportType
  });

  let consumeRecord;
  if (existingRecord) {
    existingRecord.calories = route.estimatedCalories;
    existingRecord.duration = Math.round(route.duration / 60);
    existingRecord.distance = (route.distance / 1000).toFixed(2);
    await existingRecord.save();
    consumeRecord = existingRecord;
  } else {
    consumeRecord = await FoodRecord.create({
      user: userId,
      name: exerciseName,
      calories: route.estimatedCalories,
      type: 'consume',
      duration: Math.round(route.duration / 60),
      distance: (route.distance / 1000).toFixed(2),
      exerciseType: route.sportType,
      time: new Date()
    });
  }

  const user = await User.findById(userId);
  if (user?.totalStats) {
    user.totalStats.totalCaloriesBurned =
      (user.totalStats.totalCaloriesBurned || 0) + route.estimatedCalories;
    user.totalStats.totalExerciseMinutes =
      (user.totalStats.totalExerciseMinutes || 0) +
      Math.round(route.duration / 60);
    user.totalStats.totalDistance =
      (user.totalStats.totalDistance || 0) +
      parseFloat((route.distance / 1000).toFixed(2));
    await user.save();
  }

  return {
    routeId: route._id,
    status: route.status,
    startedAt: route.startedAt,
    estimatedCalories: route.estimatedCalories,
    recordId: consumeRecord._id
  };
}

/**
 * 完成运动
 */
async function completeRoute(userId, routeId, body = {}) {
  const { actualDistance, actualDuration, actualCalories } = body;

  const route = await ExerciseRoute.findOne({ _id: routeId, user: userId });
  if (!route) {
    const err = new Error('路线不存在');
    err.statusCode = 404;
    throw err;
  }

  const finalCalories =
    actualCalories ||
    (actualDuration
      ? Math.round((actualDuration / 60) * 5.7)
      : route.estimatedCalories);

  await route.complete({
    distance: actualDistance || route.distance,
    duration: actualDuration || route.duration,
    calories: finalCalories
  });

  const typeNames = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' };
  await FoodRecord.create({
    user: userId,
    name: typeNames[route.sportType] || '运动消耗',
    calories: finalCalories,
    type: 'consume',
    duration: Math.round((actualDuration || route.duration) / 60),
    distance: ((actualDistance || route.distance) / 1000).toFixed(2),
    exerciseType: route.sportType
  });

  return {
    routeId: route._id,
    status: route.status,
    completedAt: route.completedAt,
    actualDistance: actualDistance || route.distance,
    actualDuration: actualDuration || route.duration,
    actualCalories: finalCalories
  };
}

module.exports = {
  generateAndPersist,
  startRoute,
  completeRoute,
  cacheLastKnownLocation
};
