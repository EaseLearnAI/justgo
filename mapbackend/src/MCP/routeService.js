/**
 * 路线生成服务 - 核心业务逻辑
 * 
 * 整合用户数据、高德地图 MCP 和 LLM 生成个性化运动路线
 */

const { AMAP_WEB_API, EXERCISE_PARAMS, INTENSITY_PARAMS } = require('./mcpConfig');
const { ROUTE_SYSTEM_PROMPT, generateUserPrompt, buildRouteContext } = require('./routePrompts');
const { AI_CONFIG } = require('../services/aiService');

/**
 * 生成随机方向角度（0-360度）
 * 用于在没有合适POI时生成随机方向的终点
 */
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
  // Add some randomness to the angle (±15 degrees)
  const angleVariation = (Math.random() - 0.5) * 30;
  return {
    name: selected.name,
    angle: selected.angle + angleVariation
  };
};

/**
 * 根据角度和距离计算终点坐标
 * @param {number} lat - 起点纬度
 * @param {number} lng - 起点经度
 * @param {number} distance - 距离（公里）
 * @param {number} angle - 角度（度，0为北）
 */
const calculateEndpoint = (lat, lng, distance, angle) => {
  // 地球半径（公里）
  const R = 6371;
  
  // 转换为弧度
  const angleRad = (angle * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  
  // 计算新坐标
  const distRatio = distance / R;
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distRatio) +
    Math.cos(latRad) * Math.sin(distRatio) * Math.cos(angleRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(angleRad) * Math.sin(distRatio) * Math.cos(latRad),
    Math.cos(distRatio) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI
  };
};

/**
 * 调用高德地图 API
 * @param {string} endpoint - API 端点
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} - API 响应
 */
const callAmapAPI = async (endpoint, params) => {
  const url = new URL(AMAP_WEB_API.baseUrl + endpoint);
  url.searchParams.append('key', AMAP_WEB_API.key);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * 获取周边 POI 信息
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {string} types - POI 类型
 * @param {number} radius - 搜索半径（米）
 * @returns {Promise<Object>} - POI 列表
 */
const getNearbyPOI = async (lat, lng, types = '110000|150000', radius = 3000) => {
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.poiAround, {
    location: `${lng},${lat}`,
    types: types, // 公园广场 | 风景名胜
    radius: radius,
    offset: 10,
    extensions: 'all'
  });
  
  return result;
};

/**
 * 获取步行路线规划
 * @param {string} origin - 起点坐标 "lng,lat"
 * @param {string} destination - 终点坐标 "lng,lat"
 * @returns {Promise<Object>} - 路线信息
 */
const getWalkingRoute = async (origin, destination) => {
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.walkingRoute, {
    origin,
    destination
  });
  
  return result;
};

/**
 * 获取骑行路线规划
 * @param {string} origin - 起点坐标 "lng,lat"
 * @param {string} destination - 终点坐标 "lng,lat"
 * @returns {Promise<Object>} - 路线信息
 */
const getBikingRoute = async (origin, destination) => {
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.bikingRoute, {
    origin,
    destination
  });
  
  return result;
};

/**
 * 逆地理编码 - 获取地址信息
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<Object>} - 地址信息
 */
const reverseGeocode = async (lat, lng) => {
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.regeo, {
    location: `${lng},${lat}`,
    extensions: 'base'
  });
  
  return result;
};

/**
 * 调用 LLM 生成路线建议
 * @param {Object} context - 路线上下文
 * @param {Array} nearbyPOIs - 附近POI列表（可选）
 * @returns {Promise<Object>} - 路线建议
 */
const callRouteLLM = async (context, nearbyPOIs = []) => {
  const userPrompt = generateUserPrompt(context, nearbyPOIs);
  
  const messages = [
    { role: 'system', content: ROUTE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];
  
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API 调用失败: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // 解析 JSON 响应
    let jsonStr = content;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const result = JSON.parse(jsonStr.trim());
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * 生成完整的运动路线
 * @param {Object} user - 用户对象（从数据库获取）
 * @param {Object} location - 位置信息 { lat, lng, city }
 * @param {Object} todayStats - 今日统计 { intake, consume }
 * @param {Object} exerciseOptions - 运动选项 { sportType, routePreferences, mood }
 * @returns {Promise<Object>} - 完整的路线信息
 */
const generateExerciseRoute = async (user, location, todayStats, exerciseOptions) => {
  // 1. 构建路线上下文（强度字段已统一；决策区间注入后 LLM 不得突破）
  const context = buildRouteContext(user, location, todayStats, exerciseOptions);

  // 决策引擎数字优先（若上层已算好）
  const decisionPlan = exerciseOptions.decisionPlan || null;
  const skipNearbyPOI = Boolean(exerciseOptions.skipNearbyPOI);

  // 2. 获取周边 POI — 仅 L2+；IP/默认粗定位禁止用城市中心做 place/around
  let nearbyPOIs = [];
  if (!skipNearbyPOI) {
    try {
      const routeStyle = exerciseOptions.routePreferences || [];
      let poiTypes = '110000|150000';

      if (routeStyle.some(s => s.includes('Citywalk') || s.includes('城市'))) {
        poiTypes = '110000|150000|060000|070000';
      } else if (routeStyle.some(s => s.includes('水') || s.includes('河'))) {
        poiTypes = '110000|150000|170000';
      } else if (routeStyle.some(s => s.includes('绿化') || s.includes('绿'))) {
        poiTypes = '110000|150000';
      }

      const poiResult = await getNearbyPOI(location.lat, location.lng, poiTypes, 5000);
      if (poiResult.status === '1' && poiResult.pois) {
        nearbyPOIs = poiResult.pois.slice(0, 10).map(poi => ({
          name: poi.name,
          type: poi.type,
          distance: poi.distance,
          location: poi.location,
          address: poi.address
        }));
      }
    } catch (error) {
      // 忽略错误，继续生成路线
    }
  }

  // 3. 获取地址信息（粗定位跳过逆地理，避免用假精点覆盖城市名）
  let addressInfo = null;
  if (!skipNearbyPOI) {
    try {
      const regeoResult = await reverseGeocode(location.lat, location.lng);
      if (regeoResult.status === '1' && regeoResult.regeocode) {
        addressInfo = {
          address: regeoResult.regeocode.formatted_address,
          city: regeoResult.regeocode.addressComponent?.city || context.location.city
        };
        context.location.city = addressInfo.city;
        context.location.address = addressInfo.address;
      }
    } catch (error) {
      // 忽略错误，使用默认城市
    }
  } else {
    addressInfo = {
      address: location.address || location.city,
      city: location.city
    };
  }

  // 4. 调用 LLM 生成路线建议（只润色；失败用模板）
  console.log('[路线生成] 当前位置:', { ...location, level: location.level });
  console.log('[路线生成] skipNearbyPOI:', skipNearbyPOI, 'POI数量:', nearbyPOIs.length);

  let llmResult;
  try {
    llmResult = await callRouteLLM(context, nearbyPOIs);
  } catch (error) {
    llmResult = buildTemplateLlmResult(decisionPlan, exerciseOptions, location);
  }

  // 用决策引擎数字覆盖 LLM 可能越权改写的时长/热量
  if (decisionPlan) {
    llmResult.route = llmResult.route || {};
    llmResult.route.duration_min = decisionPlan.targetDuration;
    llmResult.route.estimated_calories = decisionPlan.estimatedCalories;
    llmResult.route.intensity_level = decisionPlan.intensity;
    // 距离由目标时长 × 速度估算，供无 POI 时画终点
    const speed = (require('./mcpConfig').EXERCISE_PARAMS[exerciseOptions.sportType || 'walk'] || { speed: 5 }).speed;
    const estimatedKm = Math.max(0.5, (decisionPlan.targetDuration / 60) * speed);
    if (!llmResult.route.distance_km) {
      llmResult.route.distance_km = Number(estimatedKm.toFixed(2));
    }
    if (!llmResult.motivation) {
      llmResult.motivation = decisionPlan.reason;
    }
  }

  // 5. 根据建议距离和周边POI选择终点；粗定位不走方向 API（无可信起终点）
  let routeDetails = null;
  const suggestedDistance = llmResult.route?.distance_km ||
    (decisionPlan ? (decisionPlan.targetDuration / 60) * 5 : 2);
  const sportType = exerciseOptions.sportType || 'walk';

  const origin = `${location.lng},${location.lat}`;
  let destination = null;
  let selectedPOI = null;

  let selectedDirection = null;

  if (!skipNearbyPOI && nearbyPOIs && nearbyPOIs.length > 0) {
    // 根据用户偏好和距离筛选POI
    const routeStyle = exerciseOptions.routePreferences || [];
    const preferredTypes = [];
    
    // 根据路线偏好确定POI类型
    if (routeStyle.some(s => s.includes('Citywalk') || s.includes('城市'))) {
      preferredTypes.push('110000', '150000', '060000'); // 公园广场、风景名胜、购物服务
    }
    if (routeStyle.some(s => s.includes('水') || s.includes('河'))) {
      preferredTypes.push('110000', '150000'); // 公园、风景名胜（通常有水景）
    }
    if (routeStyle.some(s => s.includes('绿化') || s.includes('绿'))) {
      preferredTypes.push('110000'); // 公园广场
    }
    
    // 筛选符合条件的POI（距离在建议距离的0.3-2.0倍范围内，更宽松的筛选）
    const minDistance = (suggestedDistance * 0.3) * 1000; // 转换为米
    const maxDistance = (suggestedDistance * 2.0) * 1000;
    
    let suitablePOIs = nearbyPOIs.filter(poi => {
      const distance = parseFloat(poi.distance) || 0;
      const isInRange = distance >= minDistance && distance <= maxDistance;
      const matchesType = preferredTypes.length === 0 || 
        preferredTypes.some(type => poi.type?.includes(type));
      return isInRange && matchesType;
    });
    
    // 如果严格筛选没有结果，放宽条件只看距离
    if (suitablePOIs.length === 0) {
      suitablePOIs = nearbyPOIs.filter(poi => {
        const distance = parseFloat(poi.distance) || 0;
        return distance >= 200 && distance <= maxDistance * 1.5;
      });
    }
    
    if (suitablePOIs.length > 0) {
      // 随机选择一个合适的POI（增加多样性）
      // 首先按距离分组，然后从合适距离的组中随机选择
      const targetDistance = suggestedDistance * 1000;
      
      // 给每个POI计算权重（距离越接近目标，权重越高）
      const weightedPOIs = suitablePOIs.map(poi => {
        const poiDistance = parseFloat(poi.distance) || 0;
        const diff = Math.abs(poiDistance - targetDistance);
        // 使用指数衰减权重，距离差越小权重越大
        const weight = Math.exp(-diff / (targetDistance * 0.5));
        return { poi, weight };
      });
      
      // 根据权重随机选择
      const totalWeight = weightedPOIs.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const item of weightedPOIs) {
        random -= item.weight;
        if (random <= 0) {
          selectedPOI = item.poi;
          break;
        }
      }
      
      // 如果没选到，选第一个
      if (!selectedPOI) {
        selectedPOI = suitablePOIs[0];
      }
      
      const poiLocation = selectedPOI.location.split(',');
      destination = `${poiLocation[0]},${poiLocation[1]}`;
      
      console.log('[路线生成] 选择POI作为终点:', selectedPOI.name, '距离:', selectedPOI.distance, '米');
    }
  }
  
  // 粗定位：不伪造终点算路；仅返回规划卡数字
  if (skipNearbyPOI) {
    const durationSec = (decisionPlan?.targetDuration || llmResult.route?.duration_min || 12) * 60;
    const distanceM = Math.round(suggestedDistance * 1000);
    return {
      success: true,
      userId: user._id?.toString() || user.id,
      generatedAt: new Date().toISOString(),
      userSummary: {
        name: user.name,
        bodyStats: context.userProfile,
        intensityPreference: context._meta?.intensityPreference || decisionPlan?.intensity,
        goalOrientation: user.goalOrientation
      },
      routeSuggestion: llmResult.route,
      motivation: llmResult.motivation || decisionPlan?.reason,
      note: llmResult.note,
      nearbyPOIs: [],
      locationInfo: addressInfo,
      routeDetails: {
        origin,
        destination: null,
        distance: distanceM,
        duration: durationSec,
        selectedPOI: null
      },
      navigationUrl: null,
      _debug: { context, suggestedDistance, skipNearbyPOI: true }
    };
  }

  // 如果没有合适的POI，使用随机方向计算终点（仅 L2+）
  if (!destination) {
    selectedDirection = getRandomDirection();
    const endpoint = calculateEndpoint(
      location.lat,
      location.lng,
      suggestedDistance,
      selectedDirection.angle
    );
    destination = `${endpoint.lng},${endpoint.lat}`;
    console.log('[路线生成] 使用随机方向生成终点:', selectedDirection.name, '距离:', suggestedDistance, 'km');
  }

  // 获取实际路线规划（可选增强）
  try {
    if (sportType === 'bike') {
      routeDetails = await getBikingRoute(origin, destination);
    } else {
      routeDetails = await getWalkingRoute(origin, destination);
    }
  } catch (error) {
    // 忽略错误
  }

  const { resolveIntensityPreference } = require('../config/constants');
  const intensityPref = resolveIntensityPreference(user);

  // 6. 组装最终结果
  const finalResult = {
    success: true,
    userId: user._id?.toString() || user.id,
    generatedAt: new Date().toISOString(),
    userSummary: {
      name: user.name,
      bodyStats: context.userProfile,
      intensityPreference: intensityPref,
      goalOrientation: user.goalOrientation
    },
    routeSuggestion: llmResult.route,
    motivation: llmResult.motivation,
    note: llmResult.note,
    nearbyPOIs: nearbyPOIs,
    locationInfo: addressInfo,
    routeDetails: routeDetails ? {
      origin: origin,
      destination: destination,
      distance: routeDetails.route?.paths?.[0]?.distance || routeDetails.data?.paths?.[0]?.distance,
      duration: routeDetails.route?.paths?.[0]?.duration || routeDetails.data?.paths?.[0]?.duration,
      selectedPOI: selectedPOI ? {
        name: selectedPOI.name,
        type: selectedPOI.type,
        distance: selectedPOI.distance
      } : null
    } : {
      origin: origin,
      destination: destination,
      distance: Math.round(suggestedDistance * 1000),
      duration: (decisionPlan?.targetDuration || 12) * 60,
      selectedPOI: null
    },
    navigationUrl: destination ? (() => {
      const destLocation = destination.split(',');
      return generateAmapNavigationUrl(
        location,
        parseFloat(destLocation[1]),
        parseFloat(destLocation[0]),
        sportType
      );
    })() : null,
    _debug: {
      context: context,
      suggestedDistance: suggestedDistance
    }
  };

  return finalResult;
};

/**
 * LLM 失败时的模板文案（数字仍来自 decisionPlan）
 */
const buildTemplateLlmResult = (decisionPlan, exerciseOptions, location) => {
  const duration = decisionPlan?.targetDuration || 12;
  const calories = decisionPlan?.estimatedCalories || 50;
  const intensity = decisionPlan?.intensity || 'moderate';
  const sportType = exerciseOptions?.sportType || 'walk';
  const city = location?.city || '本地';
  return {
    route: {
      distance_km: Number(((duration / 60) * 5).toFixed(2)),
      duration_min: duration,
      sport_type: sportType === 'bike' ? 'biking' : sportType === 'run' ? 'running' : 'walking',
      intensity_level: intensity,
      route_description: `在${city}附近完成约 ${duration} 分钟的${sportType === 'bike' ? '骑行' : sportType === 'run' ? '跑步' : '步行'}`,
      description: decisionPlan?.reason || '今天先出门动一动',
      estimated_calories: calories,
      route_highlights: decisionPlan?.milestone ? [decisionPlan.milestone] : ['完成下限时长即达标'],
      safety_tips: ['注意交通安全', '量力而行', '及时补水']
    },
    motivation: decisionPlan?.reason || '开始你的运动之旅吧！',
    note: '基于决策引擎区间；开启定位后可推荐更近的点'
  };
};

/**
 * 生成高德导航 URL
 * @param {Object} location - 起点位置
 * @param {number} endLat - 终点纬度
 * @param {number} endLng - 终点经度
 * @param {string} sportType - 运动类型
 * @returns {string} - 高德导航 URL
 */
const generateAmapNavigationUrl = (location, endLat, endLng, sportType) => {
  // mode: 2=步行, 3=骑行
  const modeMap = { walk: 2, run: 2, bike: 3 };
  const mode = modeMap[sportType] || 2;
  
  const url = `https://uri.amap.com/navigation?from=${location.lng},${location.lat},我的位置&to=${endLng},${endLat},终点&mode=${mode}&policy=1&src=justgo&coordinate=gaode&callnative=1`;
  
  return url;
};

module.exports = {
  callAmapAPI,
  getNearbyPOI,
  getWalkingRoute,
  getBikingRoute,
  reverseGeocode,
  callRouteLLM,
  generateExerciseRoute,
  generateAmapNavigationUrl
};
