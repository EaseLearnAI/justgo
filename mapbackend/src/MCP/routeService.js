/**
 * 路线生成服务 - 核心业务逻辑（主推荐路径）
 *
 * 流程：ExecutionMemory → MapToolGateway 召回 → LocationRanker 选点
 *      → 路径规划 → LLM 仅润色已选真实点
 */

const {
  ROUTE_SYSTEM_PROMPT,
  generatePolishPrompt,
  buildRouteContext
} = require('./routePrompts');
const { AI_CONFIG } = require('../services/aiService');
const mapToolGateway = require('./mapToolGateway');
const { loadExecutionMemory } = require('./executionMemory');
const { rankLocationCandidates, resolvePoiTypes } = require('./locationRanker');

const getRandomDirection = () => {
  const directions = [
    { name: 'north', angle: 0 },
    { name: 'northeast', angle: 45 },
    { name: 'east', angle: 90 },
    { name: 'southeast', angle: 135 },
    { name: 'south', angle: 180 },
    { name: 'southwest', angle: 225 },
    { name: 'west', angle: 270 },
    { name: 'northwest', angle: 315 }
  ];
  const selected = directions[Math.floor(Math.random() * directions.length)];
  const angleVariation = (Math.random() - 0.5) * 30;
  return {
    name: selected.name,
    angle: selected.angle + angleVariation
  };
};

const calculateEndpoint = (lat, lng, distance, angle) => {
  const R = 6371;
  const angleRad = (angle * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const distRatio = distance / R;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distRatio) +
      Math.cos(latRad) * Math.sin(distRatio) * Math.cos(angleRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(angleRad) * Math.sin(distRatio) * Math.cos(latRad),
      Math.cos(distRatio) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI
  };
};

/** @deprecated 请使用 mapToolGateway.callAmapAPI */
const callAmapAPI = mapToolGateway.callAmapAPI;

const getNearbyPOI = async (lat, lng, types = '110000|150000', radius = 3000) => {
  const result = await mapToolGateway.around({ lng, lat, types, radius, limit: 10 });
  return result.raw || { status: result.ok ? '1' : '0', pois: result.pois || [] };
};

const getWalkingRoute = async (origin, destination) => {
  const result = await mapToolGateway.routeWalk({ origin, destination });
  return result.raw || result;
};

const getBikingRoute = async (origin, destination) => {
  const result = await mapToolGateway.routeBike({ origin, destination });
  return result.raw || result;
};

const reverseGeocode = async (lat, lng) => {
  const result = await mapToolGateway.regeo({ lat, lng });
  return result.raw || {
    status: result.ok ? '1' : '0',
    regeocode: result.ok
      ? {
          formatted_address: result.address,
          addressComponent: {
            city: result.city,
            province: result.province,
            adcode: result.adcode
          }
        }
      : undefined
  };
};

/**
 * LLM：仅润色已选终点与真实路径
 */
const callRouteLLM = async (context, selection) => {
  const userPrompt = generatePolishPrompt(context, selection);

  const messages = [
    { role: 'system', content: ROUTE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        stream: false,
        temperature: 0.6,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    let jsonStr = content;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    // 润色失败时回退为基于真实选点的模板文案，避免阻断导航
    const poiName = selection?.selectedPOI?.name || '选定终点';
    const distKm = selection?.routeMetrics?.distance_m
      ? (selection.routeMetrics.distance_m / 1000).toFixed(2)
      : (context.targetDistanceKm || 2).toFixed(2);
    const durMin = selection?.routeMetrics?.duration_s
      ? Math.round(selection.routeMetrics.duration_s / 60)
      : context.exerciseConstraints.max_duration_min;

    return {
      success: true,
      route: {
        sport_type: context.exerciseConstraints.sport_type,
        distance_km: parseFloat(distKm),
        duration_min: durMin,
        estimated_calories: Math.min(
          context.calorieContext.burn_cap,
          Math.round(durMin * (context._meta?.caloriesPerMin || 5.5))
        ),
        intensity_level: 'moderate',
        route_description: `从当前位置前往「${poiName}」，全程约 ${distKm} 公里。`,
        route_highlights: [poiName],
        safety_tips: ['注意交通安全', '量力而行，及时补水']
      },
      motivation: '终点已备好，迈出第一步就好！',
      note: '文案为本地回退模板；热量仅为估算。',
      _llmFallback: true,
      _llmError: error.message
    };
  }
};

/**
 * 生成完整的运动路线
 */
const generateExerciseRoute = async (user, location, todayStats, exerciseOptions) => {
  const userId = user._id || user.id;
  const executionMemory = await loadExecutionMemory(userId, 7);

  const context = buildRouteContext(
    user,
    location,
    todayStats,
    exerciseOptions,
    executionMemory
  );

  const routeStyle = exerciseOptions.routePreferences || [];
  const poiTypes = resolvePoiTypes(routeStyle);
  const targetDistanceM = Math.max(
    400,
    Math.round((context.targetDistanceKm || 2) * 1000)
  );
  // 搜索半径与目标距离挂钩，完成率低时略收紧
  const searchRadius = Math.min(
    8000,
    Math.max(1500, Math.round(targetDistanceM * (executionMemory.preferNear ? 1.2 : 1.8)))
  );

  let nearbyPOIs = [];
  const aroundResult = await mapToolGateway.around({
    lng: location.lng,
    lat: location.lat,
    types: poiTypes,
    radius: searchRadius,
    limit: 30
  });
  if (aroundResult.ok) {
    nearbyPOIs = aroundResult.pois;
  } else {
    console.log('[路线生成] maps.around 无候选，将回退随机方位终点');
  }

  let addressInfo = null;
  const regeoResult = await mapToolGateway.regeo({
    lat: location.lat,
    lng: location.lng
  });
  if (regeoResult.ok) {
    addressInfo = {
      address: regeoResult.address,
      city: regeoResult.city || context.location.city
    };
    context.location.city = addressInfo.city;
    context.location.address = addressInfo.address;
  }

  const { selected, scores } = rankLocationCandidates(nearbyPOIs, {
    targetDistanceM,
    routePreferences: routeStyle,
    executionMemory
  });

  let selectedPOI = selected;
  let destination = null;
  let selectedDirection = null;
  const origin = `${location.lng},${location.lat}`;

  if (selectedPOI) {
    destination = `${selectedPOI.lng},${selectedPOI.lat}`;
    console.log(
      '[路线生成] LocationRanker 选中:',
      selectedPOI.name,
      'score=',
      scores[0]?.score?.toFixed?.(3)
    );
  } else {
    selectedDirection = getRandomDirection();
    const endpoint = calculateEndpoint(
      location.lat,
      location.lng,
      context.targetDistanceKm || 2,
      selectedDirection.angle
    );
    destination = `${endpoint.lng},${endpoint.lat}`;
    console.log('[路线生成] 无 POI，随机方位:', selectedDirection.name);
  }

  const sportType = exerciseOptions.sportType || 'walk';
  let routeMetrics = null;
  let routeDetailsRaw = null;

  // 主选失败时尝试次优候选
  const tryDestinations = [];
  if (selectedPOI) {
    tryDestinations.push({
      destination: `${selectedPOI.lng},${selectedPOI.lat}`,
      poi: selectedPOI
    });
    scores.slice(1, 4).forEach((s) => {
      tryDestinations.push({
        destination: `${s.poi.lng},${s.poi.lat}`,
        poi: s.poi
      });
    });
  } else {
    tryDestinations.push({ destination, poi: null });
  }

  for (const cand of tryDestinations) {
    const planned =
      sportType === 'bike'
        ? await mapToolGateway.routeBike({ origin, destination: cand.destination })
        : await mapToolGateway.routeWalk({ origin, destination: cand.destination });

    if (planned.ok) {
      routeMetrics = {
        distance_m: planned.distance_m,
        duration_s: planned.duration_s,
        polyline: planned.polyline
      };
      routeDetailsRaw = planned.raw;
      destination = cand.destination;
      selectedPOI = cand.poi;
      break;
    }
  }

  const allowedPlaceNames = [
    selectedPOI?.name,
    ...(nearbyPOIs.slice(0, 5).map((p) => p.name) || [])
  ].filter(Boolean);

  // 用真实路径指标覆盖 context 中的展示距离（LLM 不得改终点）
  const llmResult = await callRouteLLM(context, {
    selectedPOI,
    routeMetrics,
    allowedPlaceNames: [...new Set(allowedPlaceNames)]
  });

  // 强制文案距离/时长与真实规划一致（若有）
  if (routeMetrics && llmResult.route) {
    llmResult.route.distance_km = parseFloat((routeMetrics.distance_m / 1000).toFixed(2));
    llmResult.route.duration_min = Math.round(routeMetrics.duration_s / 60);
  }

  const finalResult = {
    success: true,
    userId: userId?.toString?.() || userId,
    generatedAt: new Date().toISOString(),

    userSummary: {
      name: user.name,
      bodyStats: context.userProfile,
      intensityPreference: user.exerciseIntensityPreference,
      goalOrientation: user.goalOrientation
    },

    routeSuggestion: llmResult.route,
    motivation: llmResult.motivation,
    note: llmResult.note,

    nearbyPOIs,
    locationInfo: addressInfo,

    routeDetails: {
      origin,
      destination,
      distance: routeMetrics?.distance_m || 0,
      duration: routeMetrics?.duration_s || 0,
      selectedPOI: selectedPOI
        ? {
            name: selectedPOI.name,
            type: selectedPOI.type,
            distance: selectedPOI.distance,
            location: selectedPOI.location || `${selectedPOI.lng},${selectedPOI.lat}`
          }
        : null
    },

    navigationUrl: (() => {
      const destLocation = destination.split(',');
      return generateAmapNavigationUrl(
        location,
        parseFloat(destLocation[1]),
        parseFloat(destLocation[0]),
        sportType
      );
    })(),

    _debug: {
      context,
      targetDistanceM,
      searchRadius,
      executionMemory: {
        sampleSize: executionMemory.sampleSize,
        completionRate: executionMemory.completionRate,
        distanceMultiplier: executionMemory.distanceMultiplier
      },
      rankTop: (scores || []).slice(0, 5).map((s) => ({
        name: s.poi.name,
        score: Number(s.score.toFixed(4)),
        breakdown: s.breakdown
      })),
      mapsRouteOk: !!routeMetrics,
      llmFallback: !!llmResult._llmFallback
    }
  };

  return finalResult;
};

const generateAmapNavigationUrl = (location, endLat, endLng, sportType) => {
  const modeMap = { walk: 2, run: 2, bike: 3 };
  const mode = modeMap[sportType] || 2;
  return `https://uri.amap.com/navigation?from=${location.lng},${location.lat},我的位置&to=${endLng},${endLat},终点&mode=${mode}&policy=1&src=justgo&coordinate=gaode&callnative=1`;
};

module.exports = {
  callAmapAPI,
  getNearbyPOI,
  getWalkingRoute,
  getBikingRoute,
  reverseGeocode,
  callRouteLLM,
  generateExerciseRoute,
  generateAmapNavigationUrl,
  mapToolGateway
};
