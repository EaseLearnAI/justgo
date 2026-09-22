/**
 * 位置获取服务 — 兼容层，实现迁至 services/route/locationResolver
 */

const {
  getClientIP,
  isLocalIP,
  getLocationByIP,
  resolveLocation,
  defaultLocation,
  canUseNearbyPOI,
  isCoarseLocation,
  LOCATION_LEVEL
} = require('./route/locationResolver');

/** @deprecated 请使用 resolveLocation；保留 getUserLocation 名称以兼容旧引用 */
const getUserLocation = resolveLocation;

module.exports = {
  getUserLocation,
  getLocationByIP,
  getClientIP,
  isLocalIP,
  resolveLocation,
  defaultLocation,
  canUseNearbyPOI,
  isCoarseLocation,
  LOCATION_LEVEL
};
