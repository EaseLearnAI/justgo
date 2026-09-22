/**
 * 位置解析 L0–L3：IP 粗定位优先，GPS 为增强
 */

const { env } = require('../../config/env');
const { AMAP_WEB_API } = require('../../MCP/mcpConfig');
const {
  LOCATION_LEVEL,
  COARSE_LOCATION_SOURCES
} = require('../../config/constants');

function getClientIP(req) {
  let ip = null;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  }
  if (!ip) {
    ip = req.headers['x-real-ip'] || null;
  }
  if (!ip) {
    ip = req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  }
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  return ip;
}

function isLocalIP(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  if (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return true;
  }
  return false;
}

function defaultLocation(warning) {
  return {
    lat: env.defaultLat,
    lng: env.defaultLng,
    city: env.defaultCity,
    province: env.defaultCity,
    adcode: env.defaultAdcode,
    level: LOCATION_LEVEL.L0,
    source: 'default',
    warning: warning || '使用默认城市兜底'
  };
}

function mockLocationIfConfigured() {
  if (!env.mockCity && env.mockLat == null) return null;
  return {
    lat: env.mockLat ?? env.defaultLat,
    lng: env.mockLng ?? env.defaultLng,
    city: env.mockCity || env.defaultCity,
    province: env.mockCity || env.defaultCity,
    adcode: env.mockAdcode || env.defaultAdcode,
    level: LOCATION_LEVEL.L1,
    source: 'mock'
  };
}

/**
 * 高德基础 IP：城市 / adcode / rectangle；不把 centroid 当精定位语义
 */
async function getLocationByIP(ip) {
  if (isLocalIP(ip)) {
    const mock = mockLocationIfConfigured();
    if (mock) return mock;
    throw new Error('本地 IP 无法定位');
  }

  if (!AMAP_WEB_API.key) {
    throw new Error('AMAP_MAPS_API_KEY 未配置');
  }

  const url = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.ipLocation);
  url.searchParams.append('key', AMAP_WEB_API.key);
  url.searchParams.append('ip', ip);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== '1') {
    throw new Error(data.info || 'IP 定位失败');
  }

  let province = data.province;
  let city = data.city;
  let adcode = data.adcode;
  let rectangle = data.rectangle;

  if (Array.isArray(province) || !province) province = '';
  if (Array.isArray(city) || !city) city = '';
  if (Array.isArray(adcode) || !adcode) adcode = '';
  if (Array.isArray(rectangle) || !rectangle) rectangle = '';

  if (!province && !city) {
    return defaultLocation('IP 未返回城市信息');
  }

  // 从 rectangle 取中心仅作可选坐标（导航增强用），语义仍为 L1
  let lat = env.defaultLat;
  let lng = env.defaultLng;
  if (rectangle && typeof rectangle === 'string' && rectangle.includes(';')) {
    const [p1, p2] = rectangle.split(';');
    const [lng1, lat1] = p1.split(',').map(Number);
    const [lng2, lat2] = p2.split(',').map(Number);
    if ([lng1, lat1, lng2, lat2].every((n) => !Number.isNaN(n))) {
      lng = (lng1 + lng2) / 2;
      lat = (lat1 + lat2) / 2;
    }
  } else {
    // 可选：地理编码取城市中心（仅作 L1 参考点，不用于 place/around）
    try {
      const address = `${province}${city}`;
      const geocodeUrl = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.geocode);
      geocodeUrl.searchParams.append('key', AMAP_WEB_API.key);
      geocodeUrl.searchParams.append('address', address);
      const geocodeResponse = await fetch(geocodeUrl.toString());
      const geocodeData = await geocodeResponse.json();
      if (geocodeData.status === '1' && geocodeData.geocodes?.[0]?.location) {
        const parts = geocodeData.geocodes[0].location.split(',');
        lng = parseFloat(parts[0]);
        lat = parseFloat(parts[1]);
      }
    } catch (_) {
      // keep defaults
    }
  }

  return {
    lat,
    lng,
    city: city || province,
    province: province || city,
    adcode,
    rectangle: rectangle || undefined,
    address: `${province}${city}`,
    level: LOCATION_LEVEL.L1,
    source: 'ip_location'
  };
}

function inferLevelFromRequest(location) {
  if (location.level) return location.level;
  if (location.accuracy != null) {
    if (location.accuracy <= 100) return LOCATION_LEVEL.L3;
    if (location.accuracy <= 1000) return LOCATION_LEVEL.L2;
    return LOCATION_LEVEL.L2;
  }
  // 前端显式标记
  if (location.precise === true || location.highAccuracy === true) {
    return LOCATION_LEVEL.L3;
  }
  // 有 GPS 坐标但未标明精度 → 保守按 L2
  return LOCATION_LEVEL.L2;
}

/**
 * 解析用户位置（IP 优先默认路径；请求内 GPS 为增强）
 * 优先级：请求 GPS(L2/L3) > 缓存粗位置 > IP(L1) > mock > L0
 */
async function resolveLocation(req, user) {
  // 1. 请求体精确/粗 GPS
  if (req.body?.location?.lat && req.body?.location?.lng) {
    const loc = req.body.location;
    const level = inferLevelFromRequest(loc);
    return {
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lng),
      city: loc.city || '未知',
      province: loc.province,
      adcode: loc.adcode,
      address: loc.address,
      level,
      source: 'request'
    };
  }

  // 2. 查询参数
  if (req.query?.lat && req.query?.lng) {
    return {
      lat: parseFloat(req.query.lat),
      lng: parseFloat(req.query.lng),
      city: req.query.city || '未知',
      level: LOCATION_LEVEL.L2,
      source: 'query'
    };
  }

  // 3. 用户粗位置缓存（L1）
  const cached = user?.lastKnownLocation;
  if (cached?.city && cached?.level) {
    const ageMs = cached.updatedAt
      ? Date.now() - new Date(cached.updatedAt).getTime()
      : Infinity;
    // 24h 内缓存可用
    if (ageMs < 24 * 60 * 60 * 1000) {
      return {
        lat: cached.lat ?? env.defaultLat,
        lng: cached.lng ?? env.defaultLng,
        city: cached.city,
        province: cached.province,
        adcode: cached.adcode,
        level: cached.level || LOCATION_LEVEL.L1,
        source: 'cache_l1'
      };
    }
  }

  // 兼容旧 user.location（若有）
  if (user?.location?.lat && user?.location?.lng) {
    return {
      lat: parseFloat(user.location.lat),
      lng: parseFloat(user.location.lng),
      city: user.location.city || '未知',
      level: LOCATION_LEVEL.L2,
      source: 'database'
    };
  }

  // 4. IP → L1
  try {
    const clientIP = getClientIP(req);
    if (isLocalIP(clientIP)) {
      const mock = mockLocationIfConfigured();
      if (mock) return mock;
      throw new Error('本地 IP');
    }
    return await getLocationByIP(clientIP);
  } catch (error) {
    const mock = mockLocationIfConfigured();
    if (mock) return mock;
    return defaultLocation(error.message);
  }
}

function isCoarseLocation(location) {
  if (!location) return true;
  if (location.level === LOCATION_LEVEL.L0 || location.level === LOCATION_LEVEL.L1) {
    return true;
  }
  if (COARSE_LOCATION_SOURCES.has(location.source)) {
    return true;
  }
  return false;
}

/** 是否允许 place/around（需 L2+） */
function canUseNearbyPOI(location) {
  return !isCoarseLocation(location) &&
    (location.level === LOCATION_LEVEL.L2 || location.level === LOCATION_LEVEL.L3);
}

module.exports = {
  getClientIP,
  isLocalIP,
  getLocationByIP,
  resolveLocation,
  isCoarseLocation,
  canUseNearbyPOI,
  defaultLocation,
  LOCATION_LEVEL
};
