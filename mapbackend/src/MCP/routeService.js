/**
 * 路线生成服务 - 核心业务逻辑
 * 
 * 整合用户数据、高德地图 MCP 和 LLM 生成个性化运动路线
 */

const { AMAP_WEB_API, EXERCISE_PARAMS, INTENSITY_PARAMS } = require('./mcpConfig');
const { ROUTE_SYSTEM_PROMPT, generateUserPrompt, buildRouteContext } = require('./routePrompts');
const { AI_CONFIG } = require('../services/aiService');

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
 * @returns {Promise<Object>} - 路线建议
 */
const callRouteLLM = async (context) => {
  const userPrompt = generateUserPrompt(context);
  
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
  // 1. 构建路线上下文
  const context = buildRouteContext(user, location, todayStats, exerciseOptions);
  
  // 2. 获取周边 POI（根据用户偏好搜索合适的类型）
  let nearbyPOIs = [];
  try {
    // 根据路线偏好确定POI类型
    const routeStyle = exerciseOptions.routePreferences || [];
    let poiTypes = '110000|150000'; // 默认：公园广场 | 风景名胜
    
    if (routeStyle.some(s => s.includes('Citywalk') || s.includes('城市'))) {
      poiTypes = '110000|150000|060000|070000'; // 公园、风景、购物、餐饮
    } else if (routeStyle.some(s => s.includes('水') || s.includes('河'))) {
      poiTypes = '110000|150000|170000'; // 公园、风景、水系
    } else if (routeStyle.some(s => s.includes('绿化') || s.includes('绿'))) {
      poiTypes = '110000|150000'; // 公园、风景
    }
    
    const poiResult = await getNearbyPOI(location.lat, location.lng, poiTypes, 5000); // 搜索半径5km
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
  
  // 3. 获取地址信息
  let addressInfo = null;
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
  
  // 4. 调用 LLM 生成路线建议
  const llmResult = await callRouteLLM(context);
  
  // 5. 根据 LLM 建议的距离和周边POI，选择最佳终点并获取实际路线
  let routeDetails = null;
  const suggestedDistance = llmResult.route?.distance_km || 2;
  const sportType = exerciseOptions.sportType || 'walk';
  
  const origin = `${location.lng},${location.lat}`;
  let destination = null;
  let selectedPOI = null;
  
  // 优先使用周边POI作为终点
  if (nearbyPOIs && nearbyPOIs.length > 0) {
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
    
    // 筛选符合条件的POI（距离在建议距离的0.5-1.5倍范围内）
    const minDistance = (suggestedDistance * 0.5) * 1000; // 转换为米
    const maxDistance = (suggestedDistance * 1.5) * 1000;
    
    const suitablePOIs = nearbyPOIs.filter(poi => {
      const distance = parseFloat(poi.distance) || 0;
      const isInRange = distance >= minDistance && distance <= maxDistance;
      const matchesType = preferredTypes.length === 0 || 
        preferredTypes.some(type => poi.type?.includes(type));
      return isInRange && matchesType;
    });
    
    if (suitablePOIs.length > 0) {
      // 选择距离最接近建议距离的POI
      selectedPOI = suitablePOIs.reduce((best, current) => {
        const bestDiff = Math.abs(parseFloat(best.distance) - suggestedDistance * 1000);
        const currentDiff = Math.abs(parseFloat(current.distance) - suggestedDistance * 1000);
        return currentDiff < bestDiff ? current : best;
      });
      
      const poiLocation = selectedPOI.location.split(',');
      destination = `${poiLocation[0]},${poiLocation[1]}`;
    }
  }
  
  // 如果没有合适的POI，使用距离计算终点
  if (!destination) {
    const offsetLat = (suggestedDistance / 111) * 0.7; // 1度约等于111公里
    const offsetLng = (suggestedDistance / 111) * 0.7;
    const endLat = location.lat + offsetLat;
    const endLng = location.lng + offsetLng;
    destination = `${endLng},${endLat}`;
  }
  
  // 获取实际路线规划
  try {
    if (sportType === 'bike') {
      routeDetails = await getBikingRoute(origin, destination);
    } else {
      routeDetails = await getWalkingRoute(origin, destination);
    }
  } catch (error) {
    // 忽略错误
  }
  
  // 6. 组装最终结果
  const finalResult = {
    success: true,
    userId: user._id?.toString() || user.id,
    generatedAt: new Date().toISOString(),
    
    // 用户信息摘要
    userSummary: {
      name: user.name,
      bodyStats: context.userProfile,
      intensityPreference: user.exerciseIntensityPreference,
      goalOrientation: user.goalOrientation
    },
    
    // 路线建议（来自 LLM）
    routeSuggestion: llmResult.route,
    motivation: llmResult.motivation,
    note: llmResult.note,
    
    // 周边环境
    nearbyPOIs: nearbyPOIs,
    locationInfo: addressInfo,
    
    // 路线详情（来自高德）
    routeDetails: routeDetails ? {
      origin: origin,
      destination: destination, // 格式: "lng,lat"
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
      distance: 0,
      duration: 0,
      selectedPOI: null
    },
    
    // 高德导航链接
    navigationUrl: routeDetails ? (() => {
      const destLocation = destination.split(',');
      return generateAmapNavigationUrl(
        location, 
        parseFloat(destLocation[1]), 
        parseFloat(destLocation[0]), 
        sportType
      );
    })() : null,
    
    // 计算参数（调试用）
    _debug: {
      context: context,
      suggestedDistance: suggestedDistance
    }
  };
  
  return finalResult;
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
