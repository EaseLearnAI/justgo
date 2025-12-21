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
  console.log('-----------------------------------');
  console.log('🗺️ 调用高德地图 API');
  console.log('-----------------------------------');
  console.log('📍 端点:', endpoint);
  console.log('📝 参数:', JSON.stringify(params, null, 2));
  
  const url = new URL(AMAP_WEB_API.baseUrl + endpoint);
  url.searchParams.append('key', AMAP_WEB_API.key);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  console.log('🌐 请求 URL:', url.toString());
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('📥 高德 API 响应状态:', data.status);
    if (data.status === '1') {
      console.log('✅ 高德 API 调用成功');
    } else {
      console.log('⚠️ 高德 API 返回错误:', data.info);
    }
    
    return data;
  } catch (error) {
    console.error('❌ 高德 API 调用失败:', error.message);
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
  console.log('\n===================================');
  console.log('📍 获取周边 POI 信息');
  console.log('===================================');
  console.log('📍 中心坐标:', `${lng},${lat}`);
  console.log('📍 搜索类型:', types);
  console.log('📍 搜索半径:', radius, '米');
  
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.poiAround, {
    location: `${lng},${lat}`,
    types: types, // 公园广场 | 风景名胜
    radius: radius,
    offset: 10,
    extensions: 'all'
  });
  
  if (result.status === '1' && result.pois) {
    console.log('📋 找到 POI 数量:', result.pois.length);
    result.pois.slice(0, 3).forEach((poi, index) => {
      console.log(`   ${index + 1}. ${poi.name} (${poi.type})`);
    });
  }
  
  return result;
};

/**
 * 获取步行路线规划
 * @param {string} origin - 起点坐标 "lng,lat"
 * @param {string} destination - 终点坐标 "lng,lat"
 * @returns {Promise<Object>} - 路线信息
 */
const getWalkingRoute = async (origin, destination) => {
  console.log('\n===================================');
  console.log('🚶 获取步行路线规划');
  console.log('===================================');
  console.log('📍 起点:', origin);
  console.log('📍 终点:', destination);
  
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.walkingRoute, {
    origin,
    destination
  });
  
  if (result.status === '1' && result.route) {
    const path = result.route.paths[0];
    console.log('📏 步行距离:', path.distance, '米');
    console.log('⏱️ 预计时间:', path.duration, '秒');
  }
  
  return result;
};

/**
 * 获取骑行路线规划
 * @param {string} origin - 起点坐标 "lng,lat"
 * @param {string} destination - 终点坐标 "lng,lat"
 * @returns {Promise<Object>} - 路线信息
 */
const getBikingRoute = async (origin, destination) => {
  console.log('\n===================================');
  console.log('🚴 获取骑行路线规划');
  console.log('===================================');
  console.log('📍 起点:', origin);
  console.log('📍 终点:', destination);
  
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.bikingRoute, {
    origin,
    destination
  });
  
  if (result.status === '1' && result.data) {
    const path = result.data.paths[0];
    console.log('📏 骑行距离:', path.distance, '米');
    console.log('⏱️ 预计时间:', path.duration, '秒');
  }
  
  return result;
};

/**
 * 逆地理编码 - 获取地址信息
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<Object>} - 地址信息
 */
const reverseGeocode = async (lat, lng) => {
  console.log('\n===================================');
  console.log('📍 逆地理编码');
  console.log('===================================');
  console.log('📍 坐标:', `${lng},${lat}`);
  
  const result = await callAmapAPI(AMAP_WEB_API.endpoints.regeo, {
    location: `${lng},${lat}`,
    extensions: 'base'
  });
  
  if (result.status === '1' && result.regeocode) {
    console.log('📍 地址:', result.regeocode.formatted_address);
  }
  
  return result;
};

/**
 * 调用 LLM 生成路线建议
 * @param {Object} context - 路线上下文
 * @returns {Promise<Object>} - 路线建议
 */
const callRouteLLM = async (context) => {
  console.log('\n===================================');
  console.log('🤖 调用 LLM 生成路线建议');
  console.log('===================================');
  console.log('📤 请求模型:', AI_CONFIG.model);
  console.log('📝 用户上下文:');
  console.log(JSON.stringify(context, null, 2));
  
  const userPrompt = generateUserPrompt(context);
  console.log('\n📝 生成的用户提示词:');
  console.log(userPrompt);
  
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
    
    console.log('-----------------------------------');
    console.log('📥 LLM 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LLM API 错误:', errorText);
      throw new Error(`LLM API 调用失败: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('✅ LLM 响应成功');
    console.log('📥 原始响应:', content);
    
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
    console.log('✅ 解析后的路线建议:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ LLM 调用异常:', error.message);
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
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   🏃 开始生成个性化运动路线                           ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  console.log('\n===================================');
  console.log('📋 步骤 1: 构建路线上下文');
  console.log('===================================');
  
  // 1. 构建路线上下文
  const context = buildRouteContext(user, location, todayStats, exerciseOptions);
  console.log('📊 用户信息:', JSON.stringify(context.userProfile, null, 2));
  console.log('📍 位置信息:', JSON.stringify(context.location, null, 2));
  console.log('🔥 热量上下文:', JSON.stringify(context.calorieContext, null, 2));
  console.log('🏃 运动约束:', JSON.stringify(context.exerciseConstraints, null, 2));
  console.log('💡 路线偏好:', JSON.stringify(context.preferences, null, 2));
  console.log('📈 计算参数:', JSON.stringify(context._meta, null, 2));
  
  console.log('\n===================================');
  console.log('📋 步骤 2: 获取周边环境信息');
  console.log('===================================');
  
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
    
    console.log('🔍 搜索POI类型:', poiTypes);
    const poiResult = await getNearbyPOI(location.lat, location.lng, poiTypes, 5000); // 搜索半径5km
    if (poiResult.status === '1' && poiResult.pois) {
      nearbyPOIs = poiResult.pois.slice(0, 10).map(poi => ({
        name: poi.name,
        type: poi.type,
        distance: poi.distance,
        location: poi.location,
        address: poi.address
      }));
      console.log(`✅ 找到 ${nearbyPOIs.length} 个周边POI`);
      nearbyPOIs.slice(0, 5).forEach((poi, index) => {
        console.log(`   ${index + 1}. ${poi.name} (${(parseFloat(poi.distance) / 1000).toFixed(2)}km)`);
      });
    }
  } catch (error) {
    console.log('⚠️ 获取 POI 失败，继续生成路线:', error.message);
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
    console.log('⚠️ 获取地址失败，使用默认城市:', error.message);
  }
  
  console.log('\n===================================');
  console.log('📋 步骤 3: 调用 LLM 生成路线建议');
  console.log('===================================');
  
  // 4. 调用 LLM 生成路线建议
  const llmResult = await callRouteLLM(context);
  
  console.log('\n===================================');
  console.log('📋 步骤 4: 获取实际路线规划');
  console.log('===================================');
  
  // 5. 根据 LLM 建议的距离和周边POI，选择最佳终点并获取实际路线
  let routeDetails = null;
  const suggestedDistance = llmResult.route?.distance_km || 2;
  const sportType = exerciseOptions.sportType || 'walk';
  
  const origin = `${location.lng},${location.lat}`;
  let destination = null;
  let selectedPOI = null;
  
  // 优先使用周边POI作为终点
  if (nearbyPOIs && nearbyPOIs.length > 0) {
    console.log('📍 从周边POI中选择合适的终点...');
    
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
      
      console.log('✅ 选择POI作为终点:', {
        name: selectedPOI.name,
        type: selectedPOI.type,
        distance: (parseFloat(selectedPOI.distance) / 1000).toFixed(2) + 'km'
      });
    }
  }
  
  // 如果没有合适的POI，使用距离计算终点
  if (!destination) {
    console.log('⚠️ 未找到合适的POI，使用距离计算终点');
    const offsetLat = (suggestedDistance / 111) * 0.7; // 1度约等于111公里
    const offsetLng = (suggestedDistance / 111) * 0.7;
    const endLat = location.lat + offsetLat;
    const endLng = location.lng + offsetLng;
    destination = `${endLng},${endLat}`;
  }
  
  console.log('📍 起点:', origin);
  console.log('📍 终点:', destination);
  
  // 获取实际路线规划
  try {
    if (sportType === 'bike') {
      routeDetails = await getBikingRoute(origin, destination);
    } else {
      routeDetails = await getWalkingRoute(origin, destination);
    }
    
    if (routeDetails && routeDetails.status === '1') {
      console.log('✅ 路线规划成功');
    }
  } catch (error) {
    console.log('⚠️ 获取路线规划失败:', error.message);
  }
  
  console.log('\n===================================');
  console.log('📋 步骤 5: 组装最终结果');
  console.log('===================================');
  
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
  
  console.log('\n✅ 最终结果:');
  console.log(JSON.stringify({
    ...finalResult,
    _debug: '...(省略)'
  }, null, 2));
  
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   ✅ 运动路线生成完成                                 ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
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
  
  console.log('🔗 生成高德导航链接:', url);
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
