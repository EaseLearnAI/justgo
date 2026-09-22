/**
 * MCP / 地图相关配置
 *
 * 密钥一律走环境变量 AMAP_MAPS_API_KEY（见 .env.example）。
 * npx / SSE MCP 适配为第二步；当前主路径只用 REST Gateway。
 */

const AMAP_API_KEY = process.env.AMAP_MAPS_API_KEY || '';

// 高德地图 MCP 配置（第二步再用；密钥不硬编码）
const AMAP_MCP_CONFIG = {
  server: {
    name: 'amap-maps',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server']
  },
  apiKey: AMAP_API_KEY,
  env: {
    AMAP_MAPS_API_KEY: AMAP_API_KEY
  }
};

// 高德地图 Web API 配置（MapToolGateway REST 适配）
const AMAP_WEB_API = {
  baseUrl: 'https://restapi.amap.com/v3',
  key: AMAP_API_KEY,

  endpoints: {
    geocode: '/geocode/geo',
    regeo: '/geocode/regeo',
    walkingRoute: '/direction/walking',
    bikingRoute: '/direction/bicycling',
    drivingRoute: '/direction/driving',
    poiAround: '/place/around',
    poiText: '/place/text',
    weather: '/weather/weatherInfo',
    ipLocation: '/ip'
  }
};

const EXERCISE_PARAMS = {
  walk: {
    name: '步行',
    speed: 5,
    met: 3.5,
    caloriesPerMin: 5.5
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

const INTENSITY_PARAMS = {
  relaxed: {
    name: '轻松',
    emoji: '😌',
    description: '还能继续聊天，不喘',
    durationMultiplier: 0.7,
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

const GOAL_STRATEGIES = {
  lose: {
    name: '减脂',
    strategy: '频率优先，强度保守',
    calorieMultiplier: 1.1
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
