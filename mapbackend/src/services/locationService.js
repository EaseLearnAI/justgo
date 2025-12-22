/**
 * 位置获取服务
 * 
 * 支持多种方式获取用户位置：
 * 1. 从请求中获取（前端通过浏览器定位API获取）
 * 2. 从用户数据库中获取
 * 3. 使用高德地图 IP 定位 API
 */

const { AMAP_WEB_API } = require('../MCP/mcpConfig');

/**
 * 从请求中提取客户端 IP 地址
 * @param {Object} req - Express 请求对象
 * @returns {string} - IP 地址
 */
const getClientIP = (req) => {
  // 优先从 X-Forwarded-For 获取（代理服务器）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // 从 X-Real-IP 获取
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // 从连接中获取
  const ip = req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  
  // 处理 IPv6 本地回环地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  return ip;
};

/**
 * 检查是否为本地 IP 地址
 * @param {string} ip - IP 地址
 * @returns {boolean} - 是否为本地 IP
 */
const isLocalIP = (ip) => {
  if (!ip) return true;
  
  // IPv4 本地地址
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  
  // IPv6 本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // 内网地址范围
  if (ip.startsWith('192.168.') || 
      ip.startsWith('10.') || 
      ip.startsWith('172.16.') || 
      ip.startsWith('172.17.') || 
      ip.startsWith('172.18.') || 
      ip.startsWith('172.19.') || 
      ip.startsWith('172.20.') || 
      ip.startsWith('172.21.') || 
      ip.startsWith('172.22.') || 
      ip.startsWith('172.23.') || 
      ip.startsWith('172.24.') || 
      ip.startsWith('172.25.') || 
      ip.startsWith('172.26.') || 
      ip.startsWith('172.27.') || 
      ip.startsWith('172.28.') || 
      ip.startsWith('172.29.') || 
      ip.startsWith('172.30.') || 
      ip.startsWith('172.31.')) {
    return true;
  }
  
  return false;
};

/**
 * 调用高德地图 IP 定位 API
 * @param {string} ip - IP 地址
 * @returns {Promise<Object>} - 位置信息 { lat, lng, city, province, adcode }
 */
const getLocationByIP = async (ip) => {
  // 检查是否为本地 IP
  if (isLocalIP(ip)) {
    throw new Error('本地 IP 地址无法定位，请通过请求传递位置信息');
  }
  
  try {
    const url = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.ipLocation);
    url.searchParams.append('key', AMAP_WEB_API.key);
    url.searchParams.append('ip', ip);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    // 检查返回数据格式
    if (data.status !== '1') {
      throw new Error(data.info || 'IP 定位失败');
    }
    
    // 安全地获取城市和省份信息
    const province = data.province || '';
    const city = typeof data.city === 'string' ? data.city : (data.city || '');
    const adcode = data.adcode || '';
    
    if (!province || !city) {
      throw new Error('IP 定位返回数据不完整');
    }
    
    // 高德 IP 定位返回的是城市信息，需要再次调用地理编码获取坐标
    const cityName = typeof city === 'string' ? city.replace(/市$/, '') : city; // 移除"市"后缀
    const address = `${province}${city}`;
    
    // 调用地理编码获取该城市的中心坐标
    const geocodeUrl = new URL(AMAP_WEB_API.baseUrl + AMAP_WEB_API.endpoints.geocode);
    geocodeUrl.searchParams.append('key', AMAP_WEB_API.key);
    geocodeUrl.searchParams.append('address', address);
    
    const geocodeResponse = await fetch(geocodeUrl.toString());
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.status === '1' && geocodeData.geocodes && geocodeData.geocodes.length > 0) {
      const location = geocodeData.geocodes[0].location.split(',');
      const result = {
        lat: parseFloat(location[1]),
        lng: parseFloat(location[0]),
        city: city,
        province: province,
        adcode: adcode,
        address: address
      };
        
      return result;
    } else {
      // 如果地理编码失败，返回城市信息但使用默认坐标
      return {
        lat: 39.908823,
        lng: 116.397470,
        city: city || '北京',
        province: province || '北京',
        adcode: adcode || '110000',
        address: address
      };
    }
  } catch (error) {
    throw error;
  }
};

/**
 * 获取用户位置信息
 * 优先级：请求中的位置 > 用户数据库中的位置 > IP 定位
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} user - 用户对象（从数据库获取）
 * @returns {Promise<Object>} - 位置信息 { lat, lng, city }
 */
const getUserLocation = async (req, user) => {
  // 1. 优先从请求体中获取位置（前端通过浏览器定位API获取）
  if (req.body?.location) {
    const location = req.body.location;
    if (location.lat && location.lng) {
      return {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        city: location.city || '未知',
        source: 'request'
      };
    }
  }
  
  // 2. 从请求查询参数中获取位置
  if (req.query?.lat && req.query?.lng) {
    const location = {
      lat: parseFloat(req.query.lat),
      lng: parseFloat(req.query.lng),
      city: req.query.city || '未知',
      source: 'query'
    };
    return location;
  }
  
  // 3. 从用户数据库中获取位置
  if (user?.location?.lat && user?.location?.lng) {
    const location = {
      lat: parseFloat(user.location.lat),
      lng: parseFloat(user.location.lng),
      city: user.location.city || '未知',
      source: 'database'
    };
    return location;
  }
  
  // 4. 使用 IP 定位（最后的手段）
  try {
    const clientIP = getClientIP(req);
    
    // 检查是否为本地 IP
    if (isLocalIP(clientIP)) {
      throw new Error('本地 IP 无法定位，请通过请求传递位置信息');
    }
    
    const ipLocation = await getLocationByIP(clientIP);
    return {
      lat: ipLocation.lat,
      lng: ipLocation.lng,
      city: ipLocation.city,
      province: ipLocation.province,
      adcode: ipLocation.adcode,
      source: 'ip_location'
    };
  } catch (error) {
    // 最后的默认值
    return {
      lat: 39.908823,
      lng: 116.397470,
      city: '北京',
      source: 'default',
      warning: '无法获取用户位置，使用默认位置（北京）。本地开发时请通过请求传递位置信息。'
    };
  }
};

module.exports = {
  getUserLocation,
  getLocationByIP,
  getClientIP,
  isLocalIP
};

