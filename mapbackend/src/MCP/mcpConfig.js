/**
 * 高德 / 运动参数配置 — 密钥仅来自环境变量
 */

const { env } = require('../config/env');

const AMAP_MCP_CONFIG = {
  server: {
    name: 'amap-maps',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server']
  },
  get apiKey() {
    return env.amapMapsApiKey;
  },
  get env() {
    return { AMAP_MAPS_API_KEY: env.amapMapsApiKey };
  }
};

const AMAP_WEB_API = {
  baseUrl: 'https://restapi.amap.com/v3',
  get key() {
    return env.amapMapsApiKey;
  },
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
