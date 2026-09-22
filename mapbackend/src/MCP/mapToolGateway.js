/**
 * MapToolGateway — 地图能力唯一出口（第一步：REST 适配）
 *
 * 工具名稳定；第二步可再挂 AmapMcpAdapter，业务侧无需改调用点。
 * 当前不把 mock MCP / SSE 当作已接通。
 */

const { AMAP_WEB_API } = require('./mcpConfig');

const logMaps = (tool, ok, detail = '') => {
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`[maps.${tool}] ${tag}${detail ? ` ${detail}` : ''}`);
};

/**
 * 底层 HTTP 调用高德 Web REST
 */
const callAmapAPI = async (endpoint, params = {}) => {
  if (!AMAP_WEB_API.key) {
    const err = new Error('AMAP_MAPS_API_KEY 未配置，无法调用高德 REST');
    logMaps('http', false, err.message);
    throw err;
  }

  const url = new URL(AMAP_WEB_API.baseUrl + endpoint);
  url.searchParams.append('key', AMAP_WEB_API.key);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
  const data = await response.json();
  return data;
};

/**
 * maps.regeo
 */
const regeo = async ({ lng, lat }) => {
  try {
    const data = await callAmapAPI(AMAP_WEB_API.endpoints.regeo, {
      location: `${lng},${lat}`,
      extensions: 'base'
    });
    const ok = data.status === '1';
    logMaps('regeo', ok, ok ? '' : `info=${data.info || data.infocode || ''}`);
    if (!ok) {
      return { ok: false, error: data.info || 'regeo failed', raw: data };
    }
    const component = data.regeocode?.addressComponent || {};
    return {
      ok: true,
      address: data.regeocode?.formatted_address || '',
      city: component.city || component.district || '',
      adcode: component.adcode || '',
      province: component.province || '',
      raw: data
    };
  } catch (error) {
    logMaps('regeo', false, error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * maps.around — 周边 POI 召回
 */
const around = async ({
  lng,
  lat,
  radius = 5000,
  types = '110000|150000',
  keywords,
  limit = 30
}) => {
  try {
    const data = await callAmapAPI(AMAP_WEB_API.endpoints.poiAround, {
      location: `${lng},${lat}`,
      types,
      keywords,
      radius,
      offset: Math.min(limit, 50),
      extensions: 'all'
    });
    const ok = data.status === '1';
    const pois = ok && Array.isArray(data.pois)
      ? data.pois.slice(0, limit).map((poi) => {
          const [plng, plat] = String(poi.location || '').split(',');
          return {
            id: poi.id || `${poi.name}_${poi.location}`,
            name: poi.name,
            type: poi.type || '',
            typecode: poi.typecode || '',
            lng: parseFloat(plng) || 0,
            lat: parseFloat(plat) || 0,
            distance: parseFloat(poi.distance) || 0,
            address: poi.address || '',
            location: poi.location
          };
        })
      : [];
    logMaps('around', ok, ok ? `pois=${pois.length}` : `info=${data.info || ''}`);
    if (!ok) {
      return { ok: false, error: data.info || 'around failed', pois: [], raw: data };
    }
    return { ok: true, pois, raw: data };
  } catch (error) {
    logMaps('around', false, error.message);
    return { ok: false, error: error.message, pois: [] };
  }
};

const normalizeRoutePath = (data) => {
  const path =
    data?.route?.paths?.[0] ||
    data?.data?.paths?.[0] ||
    data?.data?.route?.paths?.[0] ||
    null;
  if (!path) return null;
  return {
    distance_m: parseFloat(path.distance) || 0,
    duration_s: parseFloat(path.duration) || 0,
    polyline: path.steps
      ? path.steps.map((s) => s.polyline).filter(Boolean).slice(0, 3).join(';')
      : undefined
  };
};

/**
 * maps.route.walk
 */
const routeWalk = async ({ origin, destination }) => {
  try {
    const data = await callAmapAPI(AMAP_WEB_API.endpoints.walkingRoute, {
      origin,
      destination
    });
    const path = normalizeRoutePath(data);
    const ok = data.status === '1' && !!path;
    logMaps('route.walk', ok, ok ? `dist=${path.distance_m}m` : `info=${data.info || ''}`);
    if (!ok) {
      return { ok: false, error: data.info || 'walk route failed', raw: data };
    }
    return { ok: true, ...path, raw: data };
  } catch (error) {
    logMaps('route.walk', false, error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * maps.route.bike
 */
const routeBike = async ({ origin, destination }) => {
  try {
    const data = await callAmapAPI(AMAP_WEB_API.endpoints.bikingRoute, {
      origin,
      destination
    });
    const path = normalizeRoutePath(data);
    // 骑行接口部分环境 status 字段不一致，以 path 为准
    const ok = !!path && (data.status === '1' || data.errcode === 0 || data.errdetail === undefined || path.distance_m > 0);
    logMaps('route.bike', ok, ok ? `dist=${path.distance_m}m` : `info=${data.info || data.errdetail || ''}`);
    if (!ok) {
      return { ok: false, error: data.info || data.errdetail || 'bike route failed', raw: data };
    }
    return { ok: true, ...path, raw: data };
  } catch (error) {
    logMaps('route.bike', false, error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * 统一调度入口
 */
const invoke = async (tool, params) => {
  switch (tool) {
    case 'maps.regeo':
      return regeo(params);
    case 'maps.around':
      return around(params);
    case 'maps.route.walk':
      return routeWalk(params);
    case 'maps.route.bike':
      return routeBike(params);
    default:
      logMaps(tool, false, 'unknown tool');
      return { ok: false, error: `unknown tool: ${tool}` };
  }
};

module.exports = {
  callAmapAPI,
  invoke,
  regeo,
  around,
  routeWalk,
  routeBike
};
