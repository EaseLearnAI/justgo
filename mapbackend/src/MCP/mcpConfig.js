/**
 * MCP 配置文件 - 高德地图 MCP 服务配置
 * 
 * 用于配置高德地图 MCP 服务器和相关 API 参数
 */

// 高德地图 MCP 配置
const AMAP_MCP_CONFIG = {
  // MCP 服务器配置
  server: {
    name: 'amap-maps',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server'],
  },
  // API Key
  apiKey: '8675340586e27a73c7b6178e64f37583',
  // 环境变量
  env: {
    AMAP_MAPS_API_KEY: '8675340586e27a73c7b6178e64f37583'
  }
};

// 高德地图 Web API 配置（用于直接 HTTP 调用）
const AMAP_WEB_API = {
  baseUrl: 'https://restapi.amap.com/v3',
  key: '8675340586e27a73c7b6178e64f37583',
  
  // API 端点
  endpoints: {
    // 地理编码
    geocode: '/geocode/geo',
    // 逆地理编码
    regeo: '/geocode/regeo',
    // 步行路线规划
    walkingRoute: '/direction/walking',
    // 骑行路线规划
    bikingRoute: '/direction/bicycling',
    // 驾车路线规划（可用于估算距离）
    drivingRoute: '/direction/driving',
    // 周边搜索 POI
    poiAround: '/place/around',
    // 关键词搜索 POI
    poiText: '/place/text',
    // 天气查询
    weather: '/weather/weatherInfo',
    // IP 定位
    ipLocation: '/ip',
  }
};

// 运动类型对应的速度（km/h）和 MET 值
const EXERCISE_PARAMS = {
  walk: {
    name: '步行',
    speed: 5,           // km/h
    met: 3.5,           // MET 值
    caloriesPerMin: 5.5 // 每分钟消耗热量 (基于 65kg)
  },
  run: {
    name: '跑步',
    speed: 8,
    met: 8.0,
    caloriesPerMin: 10
  },
  bike: {
    name: '骑行',
    speed: 15,
    met: 6.0,
    caloriesPerMin: 8
  }
};

// 运动强度偏好对应的参数
const INTENSITY_PARAMS = {
  relaxed: {
    name: '轻松',
    emoji: '😌',
    description: '还能继续聊天，不喘',
    durationMultiplier: 0.7,   // 相对标准时长的倍数
    intensityLevel: 'low',
    heartRateZone: '50-60%'
  },
  moderate: {
    name: '微微累',
    emoji: '🙂',
    description: '出汗，但还能坚持',
    durationMultiplier: 1.0,
    intensityLevel: 'moderate',
    heartRateZone: '60-70%'
  },
  challenging: {
    name: '明显累',
    emoji: '😤',
    description: '挑战一下自己',
    durationMultiplier: 1.3,
    intensityLevel: 'high',
    heartRateZone: '70-80%'
  }
};

// 目标导向对应的策略
const GOAL_STRATEGIES = {
  lose: {
    name: '减脂',
    strategy: '频率优先，强度保守',
    calorieMultiplier: 1.1  // 消耗目标稍微提高
  },
  maintain: {
    name: '维持',
    strategy: '稳定输出，波动小',
    calorieMultiplier: 1.0
  },
  gain: {
    name: '增肌',
    strategy: '强度可波动，次数不能少',
    calorieMultiplier: 0.9
  }
};

module.exports = {
  AMAP_MCP_CONFIG,
  AMAP_WEB_API,
  EXERCISE_PARAMS,
  INTENSITY_PARAMS,
  GOAL_STRATEGIES
};
