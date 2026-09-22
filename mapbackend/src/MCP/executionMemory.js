/**
 * ExecutionMemory — 从 ExerciseRoute 聚合近 N 次执行信号（第一步无新表）
 */

const DEFAULT_LIMIT = 7;

/**
 * @param {string|ObjectId} userId
 * @param {number} limit
 * @returns {Promise<Object>}
 */
const loadExecutionMemory = async (userId, limit = DEFAULT_LIMIT) => {
  if (!userId) {
    return emptyMemory();
  }

  // 懒加载，便于纯函数单测不依赖 mongoose
  const ExerciseRoute = require('../models/ExerciseRoute');
  const routes = await ExerciseRoute.find({ user: userId })
    .sort({ generatedAt: -1 })
    .limit(limit)
    .lean();

  return buildMemoryFromRoutes(routes);
};

const emptyMemory = () => ({
  sampleSize: 0,
  completionRate: null,
  cancelOrIdleRate: null,
  avgActualVsPlanDistance: null,
  typePriors: {},
  recentPoiKeys: [],
  recentPoiNames: [],
  distanceMultiplier: 1,
  preferFamiliarTypes: false,
  preferNear: false
});

/**
 * 纯函数：便于单测
 * @param {Array} routes
 */
const buildMemoryFromRoutes = (routes = []) => {
  const memory = emptyMemory();
  memory.sampleSize = routes.length;
  if (!routes.length) return memory;

  let completed = 0;
  let cancelledOrIdle = 0;
  let ratioSum = 0;
  let ratioCount = 0;
  const typeCounts = {};

  routes.forEach((route) => {
    const status = route.status;
    if (status === 'completed') completed += 1;
    if (status === 'cancelled' || status === 'generated') cancelledOrIdle += 1;

    const planned = route.distance || 0;
    const actual = route.actualDistance;
    if (status === 'completed' && planned > 0 && actual != null) {
      ratioSum += actual / planned;
      ratioCount += 1;
    }

    const typeKey =
      route.selectedPOI?.type ||
      route.endLocation?.poiType ||
      '';
    if (typeKey && status === 'completed') {
      const coarse = coarseType(typeKey);
      typeCounts[coarse] = (typeCounts[coarse] || 0) + 1;
    }

    const poiName = route.selectedPOI?.name || route.endLocation?.poiName;
    if (poiName) {
      memory.recentPoiNames.push(poiName);
      memory.recentPoiKeys.push(poiKey(poiName, route.endLocation));
    }
  });

  memory.completionRate = completed / routes.length;
  memory.cancelOrIdleRate = cancelledOrIdle / routes.length;
  memory.avgActualVsPlanDistance = ratioCount > 0 ? ratioSum / ratioCount : null;
  memory.typePriors = typeCounts;

  // 完成率低 → 缩短目标、偏好近距/熟悉类型
  if (memory.completionRate < 0.4) {
    memory.distanceMultiplier = 0.7;
    memory.preferFamiliarTypes = true;
    memory.preferNear = true;
  } else if (memory.avgActualVsPlanDistance != null && memory.avgActualVsPlanDistance < 0.6) {
    memory.distanceMultiplier = 0.8;
  } else if (
    memory.avgActualVsPlanDistance != null &&
    memory.avgActualVsPlanDistance > 1.1 &&
    memory.completionRate >= 0.6
  ) {
    memory.distanceMultiplier = 1.1;
  }

  return memory;
};

const coarseType = (typeStr = '') => {
  // 高德 type 形如 "风景名胜;公园广场;公园" 或 typecode "110101"
  if (/公园|广场|绿|110/.test(typeStr)) return 'park';
  if (/风景|名胜|150/.test(typeStr)) return 'scenic';
  if (/购物|商场|060/.test(typeStr)) return 'shopping';
  if (/餐|食|070/.test(typeStr)) return 'food';
  if (/水|河|湖|170/.test(typeStr)) return 'water';
  return 'other';
};

const poiKey = (name, endLocation) => {
  if (endLocation?.lat != null && endLocation?.lng != null) {
    return `${name}|${Number(endLocation.lng).toFixed(4)},${Number(endLocation.lat).toFixed(4)}`;
  }
  return String(name);
};

module.exports = {
  loadExecutionMemory,
  buildMemoryFromRoutes,
  coarseType,
  poiKey,
  emptyMemory
};
