/**
 * LocationRanker — 规则打分选终点（LLM 不参与主分）
 */

const { coarseType, poiKey } = require('./executionMemory');

/**
 * @param {Array} candidates - Gateway 返回的 pois
 * @param {Object} options
 * @param {number} options.targetDistanceM - 目标距离（米）
 * @param {string[]} options.routePreferences
 * @param {Object} options.executionMemory
 * @param {number} [options.hour] - 当前小时，默认本地时间
 * @returns {{ ranked: Array, selected: Object|null, scores: Array }}
 */
const rankLocationCandidates = (candidates = [], options = {}) => {
  const {
    targetDistanceM = 2000,
    routePreferences = [],
    executionMemory = {},
    hour = new Date().getHours()
  } = options;

  if (!candidates.length) {
    return { ranked: [], selected: null, scores: [] };
  }

  const preferredCoarse = preferencesToCoarse(routePreferences);
  const typePriors = executionMemory.typePriors || {};
  const recentNames = new Set(executionMemory.recentPoiNames || []);
  const recentKeys = new Set(executionMemory.recentPoiKeys || []);
  const preferFamiliar = !!executionMemory.preferFamiliarTypes;
  const preferNear = !!executionMemory.preferNear;
  const isEvening = hour >= 19 || hour < 6;

  const scored = candidates.map((poi) => {
    const distance = parseFloat(poi.distance) || 0;
    const typeStr = `${poi.type || ''} ${poi.typecode || ''}`;
    const cType = coarseType(typeStr);

    // 距离贴合（高斯）
    const sigma = Math.max(targetDistanceM * 0.45, 400);
    let distanceScore = Math.exp(-((distance - targetDistanceM) ** 2) / (2 * sigma * sigma));
    if (preferNear && distance <= targetDistanceM) {
      distanceScore *= 1.15;
    }

    // 类型匹配偏好
    let typeScore = preferredCoarse.length === 0 ? 0.5 : 0.15;
    if (preferredCoarse.includes(cType)) typeScore = 1;

    // 执行友好：历史完成类型先验
    let priorScore = 0.5;
    const priorCount = typePriors[cType] || 0;
    const priorTotal = Object.values(typePriors).reduce((a, b) => a + b, 0) || 0;
    if (priorTotal > 0) {
      priorScore = preferFamiliar
        ? 0.4 + 0.6 * (priorCount / priorTotal)
        : 0.5 + 0.3 * (priorCount / priorTotal);
    }

    // 新鲜度：近 N 次去过降权
    const key = poiKey(poi.name, { lat: poi.lat, lng: poi.lng });
    let freshnessScore = 1;
    if (recentKeys.has(key) || recentNames.has(poi.name)) {
      freshnessScore = 0.15;
    }

    // 晚间：偏好人流/照明较好的类型（公园+商场近似）
    let timeScore = 0.5;
    if (isEvening) {
      timeScore = ['shopping', 'food', 'park'].includes(cType) ? 0.9 : 0.35;
    }

    const score =
      0.4 * distanceScore +
      0.25 * typeScore +
      0.2 * priorScore +
      0.1 * freshnessScore +
      0.05 * timeScore;

    return {
      poi,
      score,
      breakdown: {
        distanceScore,
        typeScore,
        priorScore,
        freshnessScore,
        timeScore,
        coarseType: cType
      }
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // 同分时加一点随机打破，避免总选同一 Top-1；但不破坏新鲜度主序
  const topBand = scored.filter((s) => s.score >= scored[0].score * 0.92);
  let selectedEntry = scored[0];
  if (topBand.length > 1) {
    selectedEntry = topBand[Math.floor(Math.random() * Math.min(topBand.length, 3))];
  }

  return {
    ranked: scored.map((s) => s.poi),
    selected: selectedEntry?.poi || null,
    scores: scored
  };
};

const preferencesToCoarse = (routePreferences = []) => {
  const set = new Set();
  routePreferences.forEach((s) => {
    const text = String(s);
    if (/Citywalk|城市|街/.test(text)) {
      set.add('shopping');
      set.add('park');
      set.add('scenic');
    }
    if (/水|河|湖|江/.test(text)) {
      set.add('water');
      set.add('scenic');
      set.add('park');
    }
    if (/绿化|绿|公园/.test(text)) {
      set.add('park');
    }
    if (/安静|风景/.test(text)) {
      set.add('scenic');
      set.add('park');
    }
  });
  return [...set];
};

/**
 * 根据偏好推断 around 搜索 types
 */
const resolvePoiTypes = (routePreferences = []) => {
  let poiTypes = '110000|150000';
  if (routePreferences.some((s) => /Citywalk|城市/.test(String(s)))) {
    poiTypes = '110000|150000|060000|070000';
  } else if (routePreferences.some((s) => /水|河|湖/.test(String(s)))) {
    poiTypes = '110000|150000|170000';
  }
  return poiTypes;
};

module.exports = {
  rankLocationCandidates,
  preferencesToCoarse,
  resolvePoiTypes
};
